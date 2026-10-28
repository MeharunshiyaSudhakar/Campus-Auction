import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  ShieldCheck,
  Check,
  X,
  Star,
  RefreshCw,
  HelpCircle,
  FileImage,
} from 'lucide-react';
import ItemImage from '../components/ItemImage';
import ImageCropModal from '../components/ImageCropModal';

export default function GuidedSellPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [draftId, setDraftId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [photosList, setPhotosList] = useState([]);

  // File Upload & 1:1 Cropping states
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [croppedFilesAccumulator, setCroppedFilesAccumulator] = useState([]);

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autosaved, setAutosaved] = useState(true);

  // Review Screen state
  const [isReviewScreen, setIsReviewScreen] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [finalDescription, setFinalDescription] = useState('');
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);
  const [honestyDeclaration, setHonestyDeclaration] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Initialize or resume draft
  useEffect(() => {
    const initDraft = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.post('/sell/drafts');
        if (res.data?.success) {
          const draft = res.data.data;
          setDraftId(draft._id);
          setAnswers(draft.answers || {});

          // Fetch current question
          const qRes = await api.get(`/sell/drafts/${draft._id}/next`);
          if (qRes.data?.success) {
            handleStepUpdate(qRes.data.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start guided sell session');
      } finally {
        setLoading(false);
      }
    };

    initDraft();
  }, []);

  const handleStepUpdate = (stepData) => {
    setCurrentStep(stepData.currentStep);
    setTotalSteps(stepData.totalSteps);
    setCurrentQuestion(stepData.currentQuestion);
    setAnswers(stepData.answers || {});

    if (stepData.isCompleted) {
      loadReviewScreen(stepData.draftId);
    } else if (stepData.currentQuestion) {
      const existingVal = stepData.answers[stepData.currentQuestion.key];
      if (stepData.currentQuestion.type === 'photos') {
        setPhotosList(Array.isArray(existingVal) ? existingVal : []);
      } else if (stepData.currentQuestion.type === 'multiselect') {
        setCurrentInput(Array.isArray(existingVal) ? existingVal : (stepData.currentQuestion.default || []));
      } else {
        setCurrentInput(existingVal !== undefined ? existingVal : (stepData.currentQuestion.default || ''));
      }
    }
  };

  const loadReviewScreen = async (id = draftId) => {
    setIsReviewScreen(true);
    setLoading(true);
    try {
      const res = await api.post(`/sell/drafts/${id}/review`);
      if (res.data?.success) {
        setReviewData(res.data.data);
        setFinalDescription(res.data.data.rephrasedDescription || '');
      }
    } catch (err) {
      setError('AI service unavailable; using rule-based template description.');
    } finally {
      setLoading(false);
    }
  };

  // 1:1 Square Crop Workflow & Upload via Multer
  const handleFileUpload = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setError('');

    const filesArray = Array.from(filesList);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of filesArray) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: "${file.name}". Only JPEG, PNG, and WebP images are allowed.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`File too large: "${file.name}". Maximum size allowed is 5 MB per photo.`);
        return;
      }
    }

    if (photosList.length + filesArray.length > 6) {
      setError(`Maximum 6 photos allowed per listing (currently ${photosList.length} uploaded).`);
      return;
    }

    // Queue files for 1:1 square cropping before uploading to server
    const queue = filesArray.map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
      name: file.name,
    }));
    setCroppedFilesAccumulator([]);
    setCropIndex(0);
    setCropQueue(queue);
  };

  const handleConfirmCrop = async (croppedFile) => {
    const updatedAccumulator = [...croppedFilesAccumulator, croppedFile];
    setCroppedFilesAccumulator(updatedAccumulator);

    if (cropIndex + 1 < cropQueue.length) {
      setCropIndex((prev) => prev + 1);
    } else {
      // All files in queue have been 1:1 cropped
      cropQueue.forEach((item) => URL.revokeObjectURL(item.objectUrl));
      setCropQueue([]);
      setCropIndex(0);
      setCroppedFilesAccumulator([]);
      await uploadCroppedFiles(updatedAccumulator);
    }
  };

  const handleCancelCrop = () => {
    cropQueue.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    setCropQueue([]);
    setCropIndex(0);
    setCroppedFilesAccumulator([]);
  };

  const uploadCroppedFiles = async (filesArray) => {
    const formData = new FormData();
    filesArray.forEach((f) => formData.append('photos', f));

    try {
      setUploadingPhotos(true);
      setUploadProgress(25);

      const res = await api.post(`/sell/drafts/${draftId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (res.data?.success) {
        setPhotosList(res.data.data.photos);
        setUploadProgress(100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo(s).');
    } finally {
      setUploadingPhotos(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  };

  // Delete a Photo
  const handleDeletePhoto = async (photoUrl) => {
    setError('');
    try {
      const res = await api.delete(`/sell/drafts/${draftId}/photos`, {
        data: { photoUrl },
      });
      if (res.data?.success) {
        setPhotosList(res.data.data.photos);
      }
    } catch (err) {
      // Fallback
      setPhotosList(photosList.filter((p) => p !== photoUrl));
    }
  };

  // Mark one photo as the cover (moves to front)
  const handleSetCoverPhoto = (index) => {
    if (index === 0) return;
    const reordered = [...photosList];
    const [selected] = reordered.splice(index, 1);
    reordered.unshift(selected);
    setPhotosList(reordered);
  };

  const handleSaveAndNext = async (e) => {
    if (e) e.preventDefault();
    if (!currentQuestion) return;

    setError('');
    let valueToSave = currentInput;

    if (currentQuestion.type === 'photos') {
      if (photosList.length < 2) {
        setError('At least 2 photos are required for buyers to inspect item condition');
        return;
      }
      valueToSave = photosList;
    } else if (currentQuestion.type === 'number') {
      const numVal = Number(currentInput);
      if (isNaN(numVal) || numVal < (currentQuestion.min || 1)) {
        setError(`Please enter a valid amount (minimum ₹${currentQuestion.min || 1})`);
        return;
      }
      valueToSave = numVal;
    } else if (currentQuestion.type === 'datetime') {
      if (!currentInput || new Date(currentInput) <= new Date()) {
        setError('Auction closing time must be set in the future');
        return;
      }
    } else if (currentQuestion.type === 'multiselect') {
      const selected = Array.isArray(currentInput) ? currentInput : (currentQuestion.default || []);
      if (selected.length === 0) {
        setError('Please select at least one option to continue');
        return;
      }
      valueToSave = selected;
    } else if (currentQuestion.key === 'defects') {
      const grade = answers.conditionGrade;
      if (['Fair', 'Poor'].includes(grade)) {
        if (!currentInput || currentInput.trim().length < 8) {
          setError('Detailed disclosure of known defects (min 8 characters) is mandatory for Fair or Poor condition');
          return;
        }
      }
    }

    setSaving(true);
    setAutosaved(false);

    try {
      const res = await api.put(`/sell/drafts/${draftId}/answer`, {
        key: currentQuestion.key,
        value: valueToSave,
      });

      if (res.data?.success) {
        setAutosaved(true);
        // Fetch next question
        const qRes = await api.get(`/sell/drafts/${draftId}/next`);
        if (qRes.data?.success) {
          handleStepUpdate(qRes.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save answer');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (isReviewScreen) {
      setIsReviewScreen(false);
      const qRes = await api.get(`/sell/drafts/${draftId}/next`);
      if (qRes.data?.success) {
        handleStepUpdate(qRes.data.data);
      }
      return;
    }

    if (currentStep <= 0) return;
    setSaving(true);
    try {
      const res = await api.post(`/sell/drafts/${draftId}/back`);
      if (res.data?.success) {
        const qRes = await api.get(`/sell/drafts/${draftId}/next`);
        if (qRes.data?.success) {
          handleStepUpdate(qRes.data.data);
        }
      }
    } catch (err) {
      setError('Failed to go back');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptSuggestion = (suggestion) => {
    if (!acceptedSuggestions.includes(suggestion)) {
      setAcceptedSuggestions([...acceptedSuggestions, suggestion]);
      setFinalDescription((prev) => `${prev}\n• Note: ${suggestion}`);
    }
  };

  const handleDismissSuggestion = (suggestion) => {
    if (!dismissedSuggestions.includes(suggestion)) {
      setDismissedSuggestions([...dismissedSuggestions, suggestion]);
    }
  };

  const handlePublish = async () => {
    if (!honestyDeclaration) {
      setError('You must check the seller honesty declaration before publishing');
      return;
    }

    setPublishing(true);
    setError('');

    const payload = {
      title: answers.title,
      category: answers.category,
      itemType: answers.itemType || answers.itemSubtype || answers.category,
      brand: answers.brand || '',
      conditionGrade: answers.conditionGrade,
      ageOfItem: answers.ageOfItem,
      workingStatus: answers.workingStatus,
      defects: answers.defects || '',
      accessories: answers.accessories || '',
      finalDescription: finalDescription || reviewData?.rephrasedDescription || answers.sellerDescription || '',
      acceptedSuggestions: acceptedSuggestions || [],
      acceptedPaymentMethods: answers.acceptedPaymentMethods || ['upi_direct', 'cash_on_pickup'],
      fulfilment: answers.fulfilment || ['campus_pickup'],
      startingPrice: Number(answers.startingPrice),
      minIncrement: Number(answers.minIncrement) || 10,
      closingTime: answers.closingTime,
      photos: photosList && photosList.length > 0 ? photosList : (answers.photos || []),
      honestyDeclaration: true,
      ...answers,
    };

    try {
      const res = await api.post(`/sell/drafts/${draftId}/publish`, payload);

      if (res.data?.success) {
        const listing = res.data.data;
        navigate('/my-listings', {
          state: {
            newListingId: listing._id,
            successMessage: 'Auction listing successfully published and live!'
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish auction listing');
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !draftId) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-forest border-t-transparent rounded-full animate-spin" />
        <span className="text-body font-semibold text-charcoal-muted">Initializing AI-Guided Sell Session...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 pb-28 sm:pb-16">
      {/* Header & Autosave Badge */}
      <div className="flex items-center justify-between gap-4 border-b border-sage/40 pb-4">
        <div>
          <h1 className="text-section-heading font-heading text-forest flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber stroke-[2.5]" />
            AI-Guided Sell Flow
          </h1>
          <p className="text-metadata text-charcoal/75 mt-0.5">
            100% honest disclosure &bull; One question at a time &bull; Senior to junior campus handoff
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-50 text-forest border border-sage/60 text-metadata font-semibold shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
          <span>{autosaved ? 'Autosaved' : 'Saving...'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {!isReviewScreen && totalSteps > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-metadata font-semibold text-charcoal-muted">
            <span>Question {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-sage/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-charcoal transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-body flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* --- QUESTION FLOW CARD --- */}
      {!isReviewScreen && currentQuestion && (
        <div className="bg-warm-white-paper border-2 border-sage rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <form onSubmit={handleSaveAndNext} className="space-y-6">
            <div>
              <div className="text-metadata font-bold uppercase tracking-wider text-amber mb-1">
                Step {currentStep + 1}
              </div>
              <h2 className="text-card-title font-heading text-charcoal">
                {currentQuestion.label}
              </h2>
              {currentQuestion.helper && (
                <p className="text-metadata text-charcoal-muted mt-1 leading-relaxed">
                  {currentQuestion.helper}
                </p>
              )}
            </div>

            {/* Input Types */}
            <div>
              {/* SELECT INPUT */}
              {currentQuestion.type === 'select' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = currentInput === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCurrentInput(opt.value)}
                        className={`p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between text-body cursor-pointer ${
                          isSelected
                            ? 'border-charcoal bg-sage-100 text-charcoal font-bold shadow-xs'
                            : 'border-sage/50 bg-warm-white hover:border-charcoal/50 text-charcoal'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-charcoal stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* MULTISELECT INPUT (Payment methods & Fulfilment) */}
              {currentQuestion.type === 'multiselect' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt) => {
                    const currentArray = Array.isArray(currentInput) ? currentInput : (currentQuestion.default || []);
                    const isSelected = currentArray.includes(opt.value);
                    const toggleOption = () => {
                      if (isSelected) {
                        if (currentArray.length > 1) {
                          setCurrentInput(currentArray.filter((v) => v !== opt.value));
                        }
                      } else {
                        setCurrentInput([...currentArray, opt.value]);
                      }
                    };
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={toggleOption}
                        className={`p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between text-body cursor-pointer ${
                          isSelected
                            ? 'border-charcoal bg-sage-100 text-charcoal font-bold shadow-xs'
                            : 'border-sage/50 bg-warm-white hover:border-charcoal/50 text-charcoal'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-charcoal border-charcoal text-warm-white' : 'border-sage/80 bg-warm-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TEXT INPUT */}
              {currentQuestion.type === 'text' && (
                <input
                  type="text"
                  required={currentQuestion.required}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Type your answer...'}
                  className="w-full px-4 py-3 rounded-xl border-2 border-sage/60 focus:border-charcoal focus:outline-none text-body bg-warm-white text-charcoal placeholder:text-charcoal/40"
                />
              )}

              {/* TEXTAREA INPUT */}
              {currentQuestion.type === 'textarea' && (
                <textarea
                  rows={4}
                  required={currentQuestion.required}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Provide accurate details...'}
                  className="w-full px-4 py-3 rounded-xl border-2 border-sage/60 focus:border-forest focus:outline-none text-body bg-warm-white text-charcoal placeholder:text-charcoal/40"
                />
              )}

              {/* NUMBER INPUT */}
              {currentQuestion.type === 'number' && (
                <div className="flex items-center gap-3">
                  <span className="text-bid-price font-heading text-forest">₹</span>
                  <input
                    type="number"
                    min={currentQuestion.min || 1}
                    required={currentQuestion.required}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder={currentQuestion.placeholder || '100'}
                    className="w-full px-4 py-3 rounded-xl border-2 border-sage/60 focus:border-forest focus:outline-none text-bid-price bg-warm-white text-charcoal placeholder:text-charcoal/40 font-bold"
                  />
                </div>
              )}

              {/* DATETIME INPUT */}
              {currentQuestion.type === 'datetime' && (
                <input
                  type="datetime-local"
                  required={currentQuestion.required}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-sage/60 focus:border-forest focus:outline-none text-body bg-warm-white text-charcoal"
                />
              )}

              {/* REAL PHOTO UPLOAD WITH MULTER & DRAG-AND-DROP */}
              {currentQuestion.type === 'photos' && (
                <div className="space-y-4">
                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-forest bg-forest-50 scale-[1.01]'
                        : 'border-sage/80 bg-warm-white hover:border-forest hover:bg-forest-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-full bg-forest-50 text-forest flex items-center justify-center">
                      <Upload className="w-6 h-6 text-forest" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-body font-bold text-forest">
                        Drag & drop photos here, or <span className="underline decoration-amber underline-offset-4">browse</span>
                      </p>
                      <p className="text-metadata text-charcoal-muted">
                        JPEG, PNG, or WebP &bull; Max 5 MB each &bull; Up to 6 photos
                      </p>
                    </div>

                    {/* Prominent Defect Disclosure Hint */}
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-forest text-metadata font-bold border border-amber/40">
                      <ShieldCheck className="w-4 h-4 text-amber" />
                      <span>Honesty rule: Add a close-up of any defects or wear</span>
                    </div>
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadingPhotos && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-forest-50 border border-forest/20 animate-fadeIn">
                      <div className="flex justify-between text-metadata font-bold text-forest">
                        <span>Uploading real photos to server...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-sage/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Thumbnails Grid with Cover Badge and Reorder */}
                  {photosList.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-metadata font-bold text-forest flex items-center justify-between">
                        <span>Uploaded Photos ({photosList.length} of 6):</span>
                        <span className="text-xs text-charcoal-muted font-normal">Click any photo to make it the Cover Photo</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {photosList.map((url, i) => (
                          <div
                            key={url + i}
                            className={`group relative rounded-xl overflow-hidden border-2 aspect-square bg-warm-white transition-all ${
                              i === 0 ? 'border-amber shadow-sm ring-2 ring-amber/30' : 'border-sage/60 hover:border-charcoal'
                            }`}
                          >
                            <ItemImage
                              src={url}
                              alt={`Item photo ${i + 1}`}
                              useThumbnail={true}
                              containerClassName="w-full h-full"
                            />

                            {/* Cover Photo Badge */}
                            {i === 0 ? (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber text-charcoal text-xs font-black flex items-center gap-1 shadow-md z-10">
                                <Star className="w-3 h-3 fill-charcoal text-charcoal" />
                                <span>Cover Photo</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetCoverPhoto(i)}
                                className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-charcoal/80 text-warm-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-charcoal z-10 cursor-pointer"
                                title="Set as main cover photo"
                              >
                                Set as Cover
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(url)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-all active:scale-90 cursor-pointer z-10"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Minimum 2 Photos Indicator */}
                  <div className="flex items-center gap-2 text-metadata font-bold">
                    {photosList.length >= 2 ? (
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ✓ {photosList.length} photos uploaded (Ready to proceed)
                      </span>
                    ) : (
                      <span className="text-amber-hover flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber" />
                        Minimum 2 photos required ({photosList.length} currently uploaded)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sage/40">
              <button
                type="button"
                disabled={currentStep === 0 || saving}
                onClick={handleBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-btn font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={saving || (currentQuestion.type === 'photos' && photosList.length < 2)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white text-btn font-bold transition-all shadow-md shadow-charcoal/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 border border-charcoal"
              >
                <span>{currentStep >= totalSteps - 1 ? 'Proceed to Review' : 'Next Question'}</span>
                <ArrowRight className="w-4 h-4 text-amber" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- REVIEW SCREEN --- */}
      {isReviewScreen && (
        <div className="space-y-6">
          <div className="bg-warm-white-paper border-2 border-sage rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-section-heading font-heading text-charcoal flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-charcoal" />
                Listing Review & AI Verification
              </h2>

              {/* Explicit AI vs Template Fallback Source Flag Banner */}
              {reviewData?.source === 'template' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-hover border border-amber/40 text-metadata font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  AI unavailable, showing a basic version
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-100 text-charcoal border border-sage text-metadata font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber" />
                  Groq AI Verified (Facts Only)
                </span>
              )}
            </div>

            {/* Structured Facts Summary */}
            <div className="bg-sage-50 p-4 sm:p-5 rounded-xl border border-sage/60 space-y-3">
              <h3 className="text-metadata font-bold uppercase tracking-wider text-charcoal">
                Disclosed Condition Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-metadata">
                <div><span className="font-bold text-charcoal">Title:</span> {answers.title}</div>
                <div><span className="font-bold text-charcoal">Category:</span> {answers.category?.toUpperCase()}</div>
                <div>
                  <span className="font-bold text-charcoal">Condition:</span>{' '}
                  <span className="px-2 py-0.5 rounded bg-amber text-charcoal font-black text-xs">
                    {answers.conditionGrade}
                  </span>
                </div>
                <div><span className="font-bold text-charcoal">Duration of Use:</span> {answers.ageOfItem}</div>
                <div><span className="font-bold text-charcoal">Working Status:</span> {answers.workingStatus}</div>
                <div><span className="font-bold text-charcoal">Defects Disclosed:</span> {answers.defects || 'None reported'}</div>
                <div><span className="font-bold text-charcoal">Starting Price:</span> ₹{answers.startingPrice}</div>
                <div><span className="font-bold text-charcoal">Min Increment:</span> ₹{answers.minIncrement || 10}</div>
                <div><span className="font-bold text-charcoal">Closing Time:</span> {new Date(answers.closingTime).toLocaleString()}</div>
                <div><span className="font-bold text-charcoal">Real Photos:</span> {answers.photos?.length || photosList.length} attached</div>
              </div>
            </div>

            {/* Side-by-Side Descriptions: Original vs AI Rephrased */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Seller Wording */}
              <div className="border border-sage/50 rounded-xl p-4 bg-warm-white space-y-2">
                <h4 className="text-metadata font-bold uppercase tracking-wider text-charcoal-muted">
                  Your Original Wording
                </h4>
                <p className="text-body text-charcoal/80 whitespace-pre-wrap leading-relaxed">
                  {reviewData?.originalDescription || answers.sellerDescription || 'No personal notes provided.'}
                </p>
              </div>

              {/* AI Rephrased Description */}
              <div className="border-2 border-charcoal rounded-xl p-4 bg-warm-white-paper space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-metadata font-bold uppercase tracking-wider text-charcoal">
                    AI-Rephrased Description (Facts Only)
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sage-100 text-charcoal border border-sage">
                    {reviewData?.source === 'ai' ? 'Groq AI Rephrase' : 'Template Basic'}
                  </span>
                </div>
                <p className="text-body text-charcoal whitespace-pre-wrap leading-relaxed">
                  {reviewData?.rephrasedDescription}
                </p>
              </div>
            </div>

            {/* AI Category Suggestions (Accept or Reject) */}
            {reviewData?.suggestions && reviewData.suggestions.length > 0 && (
              <div className="bg-amber-50/60 border border-amber/40 rounded-xl p-4 sm:p-5 space-y-3">
                <h4 className="text-metadata font-bold text-forest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber" />
                  Category Suggestions (Buyers Usually Ask These Questions)
                </h4>
                <p className="text-xs text-charcoal-muted">
                  Review these common buyer questions. You can accept to include them in your description or dismiss them.
                </p>

                <div className="space-y-2">
                  {reviewData.suggestions
                    .filter((sug) => !dismissedSuggestions.includes(sug))
                    .map((sug, idx) => {
                      const isAccepted = acceptedSuggestions.includes(sug);
                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-warm-white-paper border border-amber/30 text-metadata"
                        >
                          <span className="text-charcoal font-medium">{sug}</span>
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAcceptSuggestion(sug)}
                              disabled={isAccepted}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isAccepted
                                  ? 'bg-sage-50 text-forest border border-sage'
                                  : 'bg-forest text-warm-white hover:bg-forest-light'
                              }`}
                            >
                              {isAccepted ? '✓ Included' : '+ Include in Description'}
                            </button>
                            {!isAccepted && (
                              <button
                                type="button"
                                onClick={() => handleDismissSuggestion(sug)}
                                className="p-1 rounded-lg text-charcoal-muted hover:text-rose-600 transition-colors"
                                title="Dismiss suggestion"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Editable Final Description */}
            <div className="space-y-1.5">
              <label className="block text-metadata font-bold text-charcoal">
                Final Description (You can polish or add any extra details before publishing):
              </label>
              <textarea
                rows={5}
                value={finalDescription}
                onChange={(e) => setFinalDescription(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-sage/60 focus:border-charcoal focus:outline-none text-body bg-warm-white text-charcoal leading-relaxed"
              />
            </div>

            {/* Mandatory Honesty Declaration Checkbox */}
            <div className="bg-sage-50/70 border-2 border-charcoal rounded-xl p-4 sm:p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={honestyDeclaration}
                  onChange={(e) => setHonestyDeclaration(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-charcoal focus:ring-charcoal accent-charcoal"
                />
                <div className="text-body text-charcoal leading-relaxed">
                  <strong className="text-charcoal font-bold">Seller Honesty & Accuracy Declaration *</strong>
                  <p className="text-metadata text-charcoal/80 mt-0.5">
                    I declare that all condition disclosures, known defects, and wear are genuine. I understand that concealing defects will cause the buyer to reject the item at campus pickup.
                  </p>
                </div>
              </label>
            </div>

            {/* Review Error Display */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-body flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Review Screen Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sage/40">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-sage/60 hover:bg-sage-100 text-charcoal text-btn font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Questions</span>
              </button>

              <button
                type="button"
                disabled={publishing || !honestyDeclaration}
                onClick={handlePublish}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-amber hover:bg-amber-hover text-charcoal text-btn font-black transition-all shadow-md shadow-amber/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 border border-amber/40"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-charcoal" />
                    <span>Publishing Auction...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-charcoal" />
                    <span>Publish Verified Auction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1:1 Square Crop Modal */}
      {cropQueue.length > 0 && cropQueue[cropIndex] && (
        <ImageCropModal
          imageSrc={cropQueue[cropIndex].objectUrl}
          fileName={cropQueue[cropIndex].name}
          currentIndex={cropIndex + 1}
          totalQueue={cropQueue.length}
          onConfirmCrop={handleConfirmCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}
