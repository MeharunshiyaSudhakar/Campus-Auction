import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Camera,
  Trash2,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

export default function GuidedSellPage() {
  const navigate = useNavigate();

  const [draftId, setDraftId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [photosList, setPhotosList] = useState([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');

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
      valueToSave = Number(currentInput);
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

  const handleAddPhoto = () => {
    if (!photoInputUrl.trim()) return;
    try {
      new URL(photoInputUrl.trim());
      if (!photosList.includes(photoInputUrl.trim())) {
        setPhotosList([...photosList, photoInputUrl.trim()]);
        setPhotoInputUrl('');
      }
    } catch {
      setError('Please provide a valid image URL (e.g. https://...)');
    }
  };

  const handleUseSamplePhotos = () => {
    const category = answers.category || 'cycle';
    const samples = {
      cycle: [
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80',
      ],
      calculator: [
        'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80',
      ],
      books: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      ],
      electronics: [
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
      ],
    };
    setPhotosList(samples[category] || samples.cycle);
  };

  const handleAcceptSuggestion = (suggestion) => {
    if (!acceptedSuggestions.includes(suggestion)) {
      setAcceptedSuggestions([...acceptedSuggestions, suggestion]);
      setFinalDescription((prev) => `${prev}\n• Note: ${suggestion}`);
    }
  };

  const handlePublish = async () => {
    if (!honestyDeclaration) {
      setError('You must check the seller honesty declaration before publishing');
      return;
    }

    setPublishing(true);
    setError('');

    try {
      const res = await api.post(`/sell/drafts/${draftId}/publish`, {
        honestyDeclaration: true,
        finalDescription,
      });

      if (res.data?.success) {
        navigate('/my-listings');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish auction');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', textAlign: 'center', color: 'var(--charcoal)' }}>
        <RefreshCw className="animate-spin inline-block w-8 h-8 mb-2" style={{ color: 'var(--forest)' }} />
        <p>Loading AI-Guided Sell Flow...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '30px auto', padding: '0 16px' }}>
      {/* Header & Autosave Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles style={{ color: 'var(--amber)' }} className="w-6 h-6" />
            AI-Guided Sell Flow
          </h1>
          <span style={{ fontSize: 13, color: 'var(--charcoal)', opacity: 0.8 }}>
            100% honest disclosure &bull; One question at a time
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--sage)', color: 'var(--charcoal)', padding: '4px 10px', borderRadius: 20 }}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{autosaved ? 'Draft Autosaved' : 'Saving...'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {!isReviewScreen && totalSteps > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--charcoal)', marginBottom: 6 }}>
            <span>Question {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
          </div>
          <div style={{ height: 6, background: 'var(--sage)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'var(--forest)',
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', padding: 12, borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --- QUESTION FLOW CARD --- */}
      {!isReviewScreen && currentQuestion && (
        <div
          style={{
            background: '#fff',
            border: '2px solid var(--sage)',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 4px 12px rgba(31, 77, 58, 0.06)',
          }}
        >
          <form onSubmit={handleSaveAndNext} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Step {currentStep + 1}
              </div>
              <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: 'var(--forest)' }}>
                {currentQuestion.label}
              </h2>
              {currentQuestion.helper && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--charcoal)', opacity: 0.75 }}>
                  {currentQuestion.helper}
                </p>
              )}
            </div>

            {/* Input Types */}
            <div>
              {/* SELECT INPUT */}
              {currentQuestion.type === 'select' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {currentQuestion.options.map((opt) => {
                    const isSelected = currentInput === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCurrentInput(opt.value)}
                        style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          borderRadius: 10,
                          border: isSelected ? '2px solid var(--forest)' : '1px solid var(--sage)',
                          background: isSelected ? 'var(--warm-white)' : '#fff',
                          color: 'var(--charcoal)',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4" style={{ color: 'var(--forest)' }} />}
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
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--sage)',
                    fontSize: 15,
                    boxSizing: 'border-box',
                    color: 'var(--charcoal)',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--sage)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    color: 'var(--charcoal)',
                  }}
                />
              )}

              {/* NUMBER INPUT */}
              {currentQuestion.type === 'number' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--forest)' }}>₹</span>
                  <input
                    type="number"
                    min={currentQuestion.min || 1}
                    required={currentQuestion.required}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder={currentQuestion.placeholder || '100'}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--sage)',
                      fontSize: 16,
                      boxSizing: 'border-box',
                      color: 'var(--charcoal)',
                    }}
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
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--sage)',
                    fontSize: 15,
                    boxSizing: 'border-box',
                    color: 'var(--charcoal)',
                  }}
                />
              )}

              {/* PHOTOS INPUT */}
              {currentQuestion.type === 'photos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="url"
                      value={photoInputUrl}
                      onChange={(e) => setPhotoInputUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--sage)',
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      style={{
                        padding: '10px 16px',
                        background: 'var(--forest)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: 13,
                      }}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={handleUseSamplePhotos}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--sage)',
                        color: 'var(--charcoal)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      Use Sample Photos
                    </button>
                  </div>

                  {/* Thumbnail grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                    {photosList.map((url, i) => (
                      <div key={i} style={{ position: 'relative', height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--sage)' }}>
                        <img src={url} alt={`Item ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setPhotosList(photosList.filter((_, idx) => idx !== i))}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: 3,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <span style={{ fontSize: 12, color: photosList.length >= 2 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                    {photosList.length >= 2 ? `✓ ${photosList.length} photos added` : `At least 2 photos required (${photosList.length} added)`}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation buttons (Responsive: stack on mobile, row on tablet/desktop) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sage/30">
              <button
                type="button"
                disabled={currentStep === 0 || saving}
                onClick={handleBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white text-sm font-bold shadow-md shadow-forest/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>{currentStep === totalSteps - 1 ? 'Go to Review Screen' : 'Save & Next'}</span>
                <ArrowRight className="w-4 h-4 text-amber" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- REVIEW SCREEN --- */}
      {isReviewScreen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#fff', border: '2px solid var(--sage)', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(31, 77, 58, 0.06)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 20, color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck className="w-6 h-6" style={{ color: 'var(--forest)' }} />
              Listing Review & AI Verification
            </h2>

            {/* Structured Facts Summary */}
            <div style={{ background: 'var(--warm-white)', padding: 16, borderRadius: 10, border: '1px solid var(--sage)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--charcoal)' }}>
                Structured Condition Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 13 }}>
                <div><strong>Title:</strong> {answers.title}</div>
                <div><strong>Category:</strong> {answers.category?.toUpperCase()}</div>
                <div><strong>Condition:</strong> <span style={{ background: 'var(--amber)', color: 'var(--charcoal)', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{answers.conditionGrade}</span></div>
                <div><strong>Duration of Use:</strong> {answers.ageOfItem}</div>
                <div><strong>Working Status:</strong> {answers.workingStatus}</div>
                <div><strong>Defects:</strong> {answers.defects || 'None reported'}</div>
                <div><strong>Starting Price:</strong> ₹{answers.startingPrice}</div>
                <div><strong>Min Increment:</strong> ₹{answers.minIncrement || 10}</div>
                <div><strong>Closing Date:</strong> {new Date(answers.closingTime).toLocaleString()}</div>
                <div><strong>Photos:</strong> {answers.photos?.length || 0} attached</div>
              </div>
            </div>

            {/* Side-by-Side Descriptions: Original vs AI Rephrased */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* Original Seller Wording */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#6b7280' }}>YOUR ORIGINAL WORDING</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {reviewData?.originalDescription || answers.sellerDescription || 'No personal notes provided.'}
                </p>
              </div>

              {/* AI Rephrased Description */}
              <div style={{ border: '2px solid var(--forest)', borderRadius: 8, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: 'var(--forest)', fontWeight: 'bold' }}>
                    AI-REPHRASED (FACTS ONLY)
                  </h4>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--sage)', color: 'var(--charcoal)' }}>
                    {reviewData?.provider === 'template_fallback' ? 'Template Engine' : 'AI Verified'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--charcoal)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {reviewData?.rephrasedDescription}
                </p>
              </div>
            </div>

            {/* AI Category Suggestions */}
            {reviewData?.suggestions && reviewData.suggestions.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Category Suggestions (What Buyers Usually Ask)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reviewData.suggestions.map((sug, idx) => {
                    const isAccepted = acceptedSuggestions.includes(sug);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          background: '#fff',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #fef3c7',
                        }}
                      >
                        <span style={{ color: '#78350f' }}>{sug}</span>
                        <button
                          type="button"
                          onClick={() => handleAcceptSuggestion(sug)}
                          disabled={isAccepted}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: 'none',
                            background: isAccepted ? 'var(--sage)' : 'var(--forest)',
                            color: isAccepted ? 'var(--charcoal)' : '#fff',
                            fontSize: 11,
                            fontWeight: 'bold',
                            cursor: isAccepted ? 'default' : 'pointer',
                          }}
                        >
                          {isAccepted ? '✓ Included' : '+ Include in Description'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editable Final Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', color: 'var(--forest)', marginBottom: 6 }}>
                Final Description (You can edit or polish before publishing):
              </label>
              <textarea
                rows={5}
                value={finalDescription}
                onChange={(e) => setFinalDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--sage)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                  color: 'var(--charcoal)',
                }}
              />
            </div>

            {/* Mandatory Honesty Declaration Checkbox */}
            <div style={{ background: 'var(--warm-white)', border: '2px solid var(--forest)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  required
                  checked={honestyDeclaration}
                  onChange={(e) => setHonestyDeclaration(e.target.checked)}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--forest)' }}
                />
                <div style={{ fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--forest)' }}>Seller Honesty & Accuracy Declaration *</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.85 }}>
                    I declare that all condition disclosures, known defects, and wear are genuine. I understand that concealing defects will cause the buyer to reject the item at campus pickup.
                  </p>
                </div>
              </label>
            </div>

            {/* Review Screen Actions (Responsive: stack on mobile, row on tablet/desktop) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sage/30">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Questions</span>
              </button>

              <button
                type="button"
                disabled={publishing || !honestyDeclaration}
                onClick={handlePublish}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest hover:bg-forest-hover disabled:bg-sage disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base shadow-md shadow-forest/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>{publishing ? 'Publishing Auction...' : 'Publish Auction Now'}</span>
                <CheckCircle2 className="w-5 h-5 text-amber" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
