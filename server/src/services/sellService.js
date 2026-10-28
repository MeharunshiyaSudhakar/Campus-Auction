const SellDraft = require('../models/SellDraft');
const Listing = require('../models/Listing');
const AiService = require('./aiService');
const { getQuestionsForCategory, validateCategory, VALID_CATEGORY_KEYS } = require('../config/categoryConfig');
const { FileStorageHelper } = require('../utils/fileStorage');

class SellService {
  /**
   * Start or resume an active sell draft
   */
  static async startDraft(sellerId, initialData = {}) {
    // Check if an incomplete draft already exists for this seller
    let draft = await SellDraft.findOne({ seller: sellerId, status: 'draft' }).sort({ updatedAt: -1 });

    if (!draft) {
      const category = initialData.category ? validateCategory(initialData.category) : 'vehicles';
      const defaultItemType = initialData.itemType || (category === 'vehicles' ? 'cycle' : (category === 'stationery' ? 'calculator' : category));
      draft = await SellDraft.create({
        seller: sellerId,
        category,
        answers: {
          category,
          itemType: defaultItemType,
          acceptedPaymentMethods: ['upi', 'cash_on_pickup'],
          fulfilment: ['campus_pickup'],
        },
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

    if (!key) {
      const error = new Error('Question key is required');
      error.statusCode = 400;
      throw error;
    }

    // --- Strict Server-Side Validation Rules ---
    if (key === 'category') {
      const validatedCategory = validateCategory(value);
      draft.category = validatedCategory;
      if (!draft.answers) draft.answers = {};
      draft.answers.category = validatedCategory;
      if (value === 'cycle' && !draft.answers.itemType) draft.answers.itemType = 'cycle';
      if (value === 'calculator' && !draft.answers.itemType) draft.answers.itemType = 'calculator';
    }

    if (key === 'title') {
      if (typeof value !== 'string' || value.trim().length < 3) {
        const error = new Error('Title must be at least 3 characters long');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'itemType') {
      if (typeof value !== 'string' || value.trim().length < 2) {
        const error = new Error('Item type must be at least 2 characters long');
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

    if (key === 'acceptedPaymentMethods') {
      if (!Array.isArray(value) || value.length === 0) {
        const error = new Error('At least one accepted payment method is required');
        error.statusCode = 400;
        throw error;
      }
    }

    if (key === 'fulfilment') {
      if (!Array.isArray(value) || value.length === 0) {
        const error = new Error('At least one fulfilment option is required');
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

    // Dynamically recompute questions based on current draft category
    const questions = getQuestionsForCategory(draft.category);

    // Advance step: advance to at least after the answered question index
    const qIndex = questions.findIndex((q) => q.key === key);
    if (qIndex !== -1) {
      if (qIndex >= draft.currentStep) {
        draft.currentStep = Math.min(questions.length, qIndex + 1);
      }
    }
    // When closingTime is answered and remaining questions have defaults, mark draft step completed
    if (key === 'closingTime' && draft.answers.acceptedPaymentMethods && draft.answers.fulfilment) {
      draft.currentStep = questions.length;
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
  /**
   * Upload real photos to draft (up to 6 photos per draft, random filenames)
   * Auto-rotates via EXIF, center-crops to 1080x1080, strips metadata, outputs webp and 400x400 thumbnail
   */
  static async uploadPhotos(sellerId, draftId, files) {
    const draft = await this.getDraft(sellerId, draftId);

    if (!draft.answers) draft.answers = {};
    if (!Array.isArray(draft.answers.photos)) draft.answers.photos = [];
    if (!Array.isArray(draft.answers.photoThumbnails)) draft.answers.photoThumbnails = [];

    // Max 6 photos per draft limit check
    if (draft.answers.photos.length + files.length > 6) {
      const error = new Error('A draft can have at most 6 photos in total.');
      error.statusCode = 400;
      throw error;
    }

    const processed = await FileStorageHelper.processUploadedFiles(files);
    const newPhotos = processed.map((p) => p.url);
    const newThumbs = processed.map((p) => p.thumbnailUrl);

    draft.answers.photos.push(...newPhotos);
    draft.answers.photoThumbnails.push(...newThumbs);
    draft.markModified('answers');
    await draft.save();

    return {
      photos: draft.answers.photos,
      thumbnails: draft.answers.photoThumbnails,
      uploaded: processed.map((p) => ({
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
      })),
    };
  }

  /**
   * Delete a photo from draft (owner only, cleans up storage and companion thumbnail)
   */
  static async deletePhoto(sellerId, draftId, photoUrl) {
    const draft = await this.getDraft(sellerId, draftId);

    if (!draft.answers || !Array.isArray(draft.answers.photos)) {
      return { photos: [] };
    }

    const index = draft.answers.photos.indexOf(photoUrl);
    if (index !== -1) {
      draft.answers.photos.splice(index, 1);
      if (Array.isArray(draft.answers.photoThumbnails) && draft.answers.photoThumbnails.length > index) {
        draft.answers.photoThumbnails.splice(index, 1);
      }
      draft.markModified('answers');
      await draft.save();

      // Clean up local file and its thumbnail
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
    const draftAnswers = draft.answers || {};

    // 1. Honesty declaration validation
    if (options.honestyDeclaration !== true && draftAnswers.honestyDeclaration !== true) {
      const error = new Error('You must check the seller honesty declaration before publishing');
      error.statusCode = 400;
      throw error;
    }

    // Merge: client-supplied reviewed values override draft answers; client-supplied seller or status are strictly ignored
    const title = (options.title !== undefined ? options.title : draftAnswers.title || '').trim();
    const rawCategory = options.category || draftAnswers.category || draft.category;
    const category = validateCategory(rawCategory);
    const itemType = (options.itemType || draftAnswers.itemType || draftAnswers.itemSubtype || (category === 'vehicles' ? 'cycle' : category)).trim();
    const brand = (options.brand !== undefined ? options.brand : draftAnswers.brand || '').trim();

    // Condition fields
    const conditionGrade = options.conditionGrade || options.condition?.grade || draftAnswers.conditionGrade;
    const ageOfItem = options.ageOfItem || options.condition?.age || draftAnswers.ageOfItem;
    const workingStatus = options.workingStatus || options.condition?.workingStatus || draftAnswers.workingStatus;
    const defects = options.defects !== undefined
      ? options.defects
      : (options.condition?.defects !== undefined ? options.condition.defects : draftAnswers.defects);
    const accessories = options.accessories !== undefined
      ? options.accessories
      : (options.condition?.accessories !== undefined ? options.condition.accessories : draftAnswers.accessories);

    // Photos
    const photos = Array.isArray(options.photos) && options.photos.length > 0
      ? options.photos
      : (Array.isArray(options.photoUrls) && options.photoUrls.length > 0 ? options.photoUrls : draftAnswers.photos);

    // Pricing & Timing
    const startingPrice = options.startingPrice !== undefined ? Number(options.startingPrice) : Number(draftAnswers.startingPrice);
    const minIncrement = options.minIncrement !== undefined ? Number(options.minIncrement) : (Number(draftAnswers.minIncrement) || 10);
    const closingTime = options.closingTime || draftAnswers.closingTime;

    // Payment methods & Fulfilment
    const acceptedPaymentMethods = Array.isArray(options.acceptedPaymentMethods) && options.acceptedPaymentMethods.length > 0
      ? options.acceptedPaymentMethods
      : (Array.isArray(options.paymentMethods) && options.paymentMethods.length > 0
          ? options.paymentMethods
          : (Array.isArray(draftAnswers.acceptedPaymentMethods) && draftAnswers.acceptedPaymentMethods.length > 0
              ? draftAnswers.acceptedPaymentMethods
              : ['upi', 'cash_on_pickup']));

    const fulfilment = Array.isArray(options.fulfilment) && options.fulfilment.length > 0
      ? options.fulfilment
      : (Array.isArray(options.fulfilmentOptions) && options.fulfilmentOptions.length > 0
          ? options.fulfilmentOptions
          : (Array.isArray(draftAnswers.fulfilment) && draftAnswers.fulfilment.length > 0
              ? draftAnswers.fulfilment
              : ['campus_pickup']));

    // Description precedence: seller-edited final text -> AI rephrase -> seller notes
    const finalDescription = (
      options.finalDescription ||
      options.description ||
      draft.aiReview?.rephrasedDescription ||
      draftAnswers.sellerDescription ||
      ''
    ).trim();

    // 2. Validate all mandatory fields
    if (!title || title.length < 3) {
      const error = new Error('Missing mandatory field: title (must be at least 3 characters)');
      error.statusCode = 400;
      throw error;
    }
    if (!category) {
      const error = new Error('Missing mandatory field: category');
      error.statusCode = 400;
      throw error;
    }
    if (!conditionGrade) {
      const error = new Error('Missing mandatory field: conditionGrade');
      error.statusCode = 400;
      throw error;
    }
    if (!ageOfItem) {
      const error = new Error('Missing mandatory field: ageOfItem');
      error.statusCode = 400;
      throw error;
    }
    if (!workingStatus) {
      const error = new Error('Missing mandatory field: workingStatus');
      error.statusCode = 400;
      throw error;
    }
    if (['Fair', 'Poor'].includes(conditionGrade)) {
      if (!defects || String(defects).trim().length < 8) {
        const error = new Error('Known defects description (min 8 chars) is mandatory for Fair or Poor items');
        error.statusCode = 400;
        throw error;
      }
    }
    if (!Array.isArray(photos) || photos.length < 2) {
      const error = new Error('A minimum of 2 photos is required to publish');
      error.statusCode = 400;
      throw error;
    }
    if (isNaN(startingPrice) || startingPrice < 1) {
      const error = new Error('Starting price must be a positive number (minimum ₹1)');
      error.statusCode = 400;
      throw error;
    }
    const closeDate = new Date(closingTime);
    if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
      const error = new Error('Closing time must be set in the future');
      error.statusCode = 400;
      throw error;
    }
    if (!finalDescription) {
      const error = new Error('Description is required');
      error.statusCode = 400;
      throw error;
    }

    // 3. Assemble categoryDetails from all category-specific answers
    const mergedAnswers = { ...draftAnswers, ...options };
    const categoryDetails = {};
    for (const [k, v] of Object.entries(mergedAnswers)) {
      if (k.includes('_')) {
        categoryDetails[k] = v;
      }
    }
    // Backward-compatible structured subdocuments
    categoryDetails.cycle = {
      geared: mergedAnswers.cycle_gears === 'Geared (Multi-speed)' || (mergedAnswers.vehicles_gears && mergedAnswers.vehicles_gears.includes('Multi-speed')),
      brakes: mergedAnswers.cycle_brakes || mergedAnswers.vehicles_brakes || 'N/A',
      tyres: mergedAnswers.cycle_tyres || mergedAnswers.vehicles_tyres || 'N/A',
      lastServiced: mergedAnswers.cycle_lastServiced || mergedAnswers.vehicles_lastServiced || '',
    };
    categoryDetails.calculator = {
      modelType: mergedAnswers.calculator_model || mergedAnswers.stationery_model || 'Scientific',
      display: mergedAnswers.calculator_display || mergedAnswers.stationery_displayBattery || 'N/A',
      battery: mergedAnswers.calculator_battery || mergedAnswers.stationery_displayBattery || 'N/A',
    };
    categoryDetails.books = {
      edition: mergedAnswers.books_edition || '',
      markedPages: mergedAnswers.books_markedPages || 'Clean / No marks',
      binding: mergedAnswers.books_missingPages || 'Intact / Tight',
    };
    categoryDetails.electronics = {
      batteryHealth: mergedAnswers.electronics_batteryHealth || 'Standard',
      chargerIncluded: mergedAnswers.electronics_charger === 'Original charger included',
      screenCondition: conditionGrade,
      portsFunctional: workingStatus === 'Fully functional',
    };

    // 4. Create official Listing ignoring client-supplied seller or status
    const listing = await Listing.create({
      seller: sellerId, // Strictly enforced from verified JWT token
      title,
      category,
      itemType,
      brand,
      itemSubtype: itemType,
      description: finalDescription,
      photos,
      photoThumbnails: Array.isArray(draft.answers?.photoThumbnails) && draft.answers.photoThumbnails.length === photos.length
        ? draft.answers.photoThumbnails
        : photos.map((p) => (p.includes('-thumb.') ? p : p.replace(/\.webp$/, '-thumb.webp'))),
      defectPhotoIncluded: !!mergedAnswers.defectPhotoIncluded,
      condition: {
        grade: conditionGrade,
        age: ageOfItem,
        workingStatus,
        defects: defects ? String(defects).trim() : 'None reported',
        accessories: typeof accessories === 'string'
          ? accessories.split(',').map((s) => s.trim()).filter(Boolean)
          : (Array.isArray(accessories) ? accessories : []),
        categoryDetails,
      },
      acceptedPaymentMethods,
      fulfilment,
      honestyDeclaration: true,
      startingPrice,
      minIncrement: minIncrement || 10,
      currentPrice: startingPrice, // Strictly enforced initial state
      closingTime: closeDate,
      status: 'active', // Strictly enforced initial state
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
