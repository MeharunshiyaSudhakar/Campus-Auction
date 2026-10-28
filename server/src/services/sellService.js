const SellDraft = require('../models/SellDraft');
const Listing = require('../models/Listing');
const AiService = require('./aiService');
const { getQuestionsForCategory } = require('../config/questionsConfig');
const { FileStorageHelper } = require('../utils/fileStorage');

class SellService {
  /**
   * Start or resume an active sell draft
   */
  static async startDraft(sellerId, initialData = {}) {
    // Check if an incomplete draft already exists for this seller
    let draft = await SellDraft.findOne({ seller: sellerId, status: 'draft' }).sort({ updatedAt: -1 });

    if (!draft) {
      const category = initialData.category || 'cycle';
      draft = await SellDraft.create({
        seller: sellerId,
        category,
        answers: { category },
        currentStep: 0,
        status: 'draft',
      });
    }

    return draft;
  }

  /**
   * Get draft by ID with ownership verification
   */
  static async getDraft(sellerId, draftId) {
    const draft = await SellDraft.findById(draftId);
    if (!draft) {
      const error = new Error('Sell draft not found');
      error.statusCode = 404;
      throw error;
    }

    if (draft.seller.toString() !== sellerId.toString()) {
      const error = new Error('Not authorized to access this draft');
      error.statusCode = 403;
      throw error;
    }

    return draft;
  }

  /**
   * Get current question & step progress for the draft
   */
  static async getNextQuestion(sellerId, draftId) {
    const draft = await this.getDraft(sellerId, draftId);
    const questions = getQuestionsForCategory(draft.category);

    const currentStep = draft.currentStep || 0;
    const isCompleted = currentStep >= questions.length;
    const currentQuestion = !isCompleted ? questions[currentStep] : null;

    return {
      draftId: draft._id,
      category: draft.category,
      currentStep,
      totalSteps: questions.length,
      currentQuestion,
      answers: draft.answers || {},
      isCompleted,
      aiReview: draft.aiReview || null,
    };
  }

  /**
   * Save an answer to the draft with strict server-side validation
   */
  static async saveAnswer(sellerId, draftId, { key, value }) {
    const draft = await this.getDraft(sellerId, draftId);
    const questions = getQuestionsForCategory(draft.category);

    if (!key) {
      const error = new Error('Question key is required');
      error.statusCode = 400;
      throw error;
    }

    // --- Strict Server-Side Validation Rules ---
    if (key === 'category') {
      if (!['cycle', 'calculator', 'books', 'electronics'].includes(value)) {
        const error = new Error('Invalid item category');
        error.statusCode = 400;
        throw error;
      }
      draft.category = value;
    }

    if (key === 'title') {
      if (typeof value !== 'string' || value.trim().length < 3) {
        const error = new Error('Title must be at least 3 characters long');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'conditionGrade') {
      if (!['New', 'Like new', 'Good', 'Fair', 'Poor'].includes(value)) {
        const error = new Error('Invalid condition grade');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'defects') {
      const currentGrade = draft.answers?.conditionGrade;
      if (['Fair', 'Poor'].includes(currentGrade)) {
        if (!value || typeof value !== 'string' || value.trim().length < 8) {
          const error = new Error(
            'Detailed disclosure of known defects (min 8 characters) is mandatory for Fair or Poor condition'
          );
          error.statusCode = 400;
          throw error;
        }
      }
    }

    if (key === 'startingPrice') {
      const price = Number(value);
      if (isNaN(price) || price < 1) {
        const error = new Error('Starting price must be a positive number (minimum ₹1)');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'minIncrement') {
      const inc = Number(value);
      if (isNaN(inc) || inc < 1) {
        const error = new Error('Minimum increment must be at least ₹1');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'closingTime') {
      const closeDate = new Date(value);
      if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
        const error = new Error('Auction closing time must be set in the future');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'photos') {
      if (!Array.isArray(value) || value.length < 2) {
        const error = new Error('A minimum of 2 photos is required so buyers can inspect item condition');
        error.statusCode = 400;
        throw error;
      }
    }

    // Update answers map
    draft.answers = {
      ...draft.answers,
      [key]: value,
    };
    draft.markModified('answers');

    // Advance step if currently at this question
    const qIndex = questions.findIndex((q) => q.key === key);
    if (qIndex === draft.currentStep) {
      draft.currentStep = Math.min(questions.length, draft.currentStep + 1);
    }

    await draft.save();

    return {
      draftId: draft._id,
      currentStep: draft.currentStep,
      totalSteps: questions.length,
      answers: draft.answers,
      isCompleted: draft.currentStep >= questions.length,
    };
  }

  /**
   * Step backwards in the guided flow
   */
  static async goBack(sellerId, draftId) {
    const draft = await this.getDraft(sellerId, draftId);
    draft.currentStep = Math.max(0, draft.currentStep - 1);
    await draft.save();

    const questions = getQuestionsForCategory(draft.category);
    return {
      draftId: draft._id,
      currentStep: draft.currentStep,
      totalSteps: questions.length,
      currentQuestion: questions[draft.currentStep] || null,
      answers: draft.answers,
    };
  }

  /**
   * Upload real photos to draft (up to 6 photos per draft, random filenames)
   */
  static async uploadPhotos(sellerId, draftId, files) {
    const draft = await this.getDraft(sellerId, draftId);

    if (!draft.answers) draft.answers = {};
    if (!Array.isArray(draft.answers.photos)) draft.answers.photos = [];

    // Max 6 photos per draft limit check
    if (draft.answers.photos.length + files.length > 6) {
      files.forEach((f) => FileStorageHelper.deleteFile(`/uploads/${f.filename}`));
      const error = new Error('A draft can have at most 6 photos in total.');
      error.statusCode = 400;
      throw error;
    }

    const newPhotoUrls = files.map((f) => FileStorageHelper.getPublicUrl(f.filename));
    draft.answers.photos.push(...newPhotoUrls);
    draft.markModified('answers');
    await draft.save();

    return {
      photos: draft.answers.photos,
      uploaded: newPhotoUrls,
    };
  }

  /**
   * Delete a photo from draft (owner only, cleans up storage)
   */
  static async deletePhoto(sellerId, draftId, photoUrl) {
    const draft = await this.getDraft(sellerId, draftId);

    if (!draft.answers || !Array.isArray(draft.answers.photos)) {
      return { photos: [] };
    }

    const index = draft.answers.photos.indexOf(photoUrl);
    if (index !== -1) {
      draft.answers.photos.splice(index, 1);
      draft.markModified('answers');
      await draft.save();

      // Clean up local file
      FileStorageHelper.deleteFile(photoUrl);
    }

    return {
      photos: draft.answers.photos,
    };
  }

  /**
   * Generate AI review (facts-only rephrase + category suggestions)
   */
  static async generateReview(sellerId, draftId) {
    const draft = await this.getDraft(sellerId, draftId);
    const answers = draft.answers || {};

    const aiResult = await AiService.rephraseListing(answers);

    draft.aiReview = {
      originalDescription: answers.sellerDescription || '',
      rephrasedDescription: aiResult.rephrasedDescription,
      suggestions: aiResult.suggestions || [],
      source: aiResult.source || 'template',
      provider: aiResult.provider,
      generatedAt: new Date(),
    };
    draft.markModified('aiReview');
    await draft.save();

    return {
      draftId: draft._id,
      originalDescription: draft.aiReview.originalDescription,
      rephrasedDescription: draft.aiReview.rephrasedDescription,
      suggestions: draft.aiReview.suggestions,
      source: aiResult.source || 'template',
      provider: aiResult.provider,
    };
  }

  /**
   * Publish the draft into a public Listing
   */
  static async publishDraft(sellerId, draftId, options = {}) {
    const draft = await this.getDraft(sellerId, draftId);
    const answers = draft.answers || {};

    // 1. Honesty declaration validation
    if (options.honestyDeclaration !== true) {
      const error = new Error('You must check the seller honesty declaration before publishing');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate all mandatory fields
    const requiredKeys = ['title', 'category', 'conditionGrade', 'ageOfItem', 'workingStatus', 'photos', 'startingPrice', 'closingTime'];
    for (const key of requiredKeys) {
      if (!answers[key]) {
        const error = new Error(`Missing mandatory field: ${key}`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (['Fair', 'Poor'].includes(answers.conditionGrade)) {
      if (!answers.defects || answers.defects.trim().length < 8) {
        const error = new Error('Known defects description (min 8 chars) is mandatory for Fair or Poor items');
        error.statusCode = 400;
        throw error;
      }
    }

    if (!Array.isArray(answers.photos) || answers.photos.length < 2) {
      const error = new Error('A minimum of 2 photos is required to publish');
      error.statusCode = 400;
      throw error;
    }

    const closeDate = new Date(answers.closingTime);
    if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
      const error = new Error('Closing time must be set in the future');
      error.statusCode = 400;
      throw error;
    }

    // 3. Assemble categoryDetails from answers
    const categoryDetails = {
      cycle: {
        geared: answers.cycle_gears === 'Geared (Multi-speed)',
        brakes: answers.cycle_brakes || 'N/A',
        tyres: answers.cycle_tyres || 'N/A',
        lastServiced: answers.cycle_lastServiced || '',
      },
      calculator: {
        modelType: answers.calculator_model || 'Scientific',
        display: answers.calculator_display || 'N/A',
        battery: answers.calculator_battery || 'N/A',
      },
      books: {
        edition: answers.books_edition || '',
        markedPages: answers.books_markedPages || 'Clean / No marks',
        binding: answers.books_missingPages || 'Intact / Tight',
      },
      electronics: {
        batteryHealth: answers.electronics_batteryHealth || 'Standard',
        chargerIncluded: answers.electronics_charger === 'Original charger included',
        screenCondition: answers.conditionGrade,
        portsFunctional: answers.workingStatus === 'Fully functional',
      },
    };

    // Description precedence: seller-edited final text -> AI rephrase -> seller notes
    const finalDescription = (options.finalDescription || draft.aiReview?.rephrasedDescription || answers.sellerDescription || '').trim();

    // 4. Create the official Listing
    const listing = await Listing.create({
      seller: sellerId,
      title: answers.title.trim(),
      category: answers.category,
      description: finalDescription,
      photos: answers.photos,
      defectPhotoIncluded: !!answers.defectPhotoIncluded,
      condition: {
        grade: answers.conditionGrade,
        age: answers.ageOfItem,
        workingStatus: answers.workingStatus,
        defects: answers.defects ? answers.defects.trim() : 'None reported',
        accessories: answers.accessories ? answers.accessories.split(',').map((s) => s.trim()).filter(Boolean) : [],
        categoryDetails,
      },
      honestyDeclaration: true,
      startingPrice: Number(answers.startingPrice),
      minIncrement: Number(answers.minIncrement) || 10,
      currentPrice: Number(answers.startingPrice),
      closingTime: closeDate,
      status: 'active',
      bidCount: 0,
      leadingBid: null,
      leadingBidder: null,
      staleNoBidsAlertSent: false,
      unsoldAlertSent: false,
    });

    // 5. Mark draft as completed and delete
    await SellDraft.findByIdAndDelete(draftId);

    return await listing.populate('seller', 'name');
  }
}

module.exports = SellService;
