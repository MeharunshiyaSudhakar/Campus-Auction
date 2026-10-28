import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Gavel,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Camera,
  Bike,
  Calculator,
  BookOpen,
  Laptop
} from 'lucide-react';
import ItemImage from '../components/ItemImage';

const CONDITION_GRADES = [
  { value: 'New', desc: 'Brand new, unused, in original packaging' },
  { value: 'Like new', desc: 'Barely used, zero noticeable flaws or marks' },
  { value: 'Good', desc: 'Normal gentle wear, fully functional' },
  { value: 'Fair', desc: 'Noticeable wear, scratches, or cosmetic flaws' },
  { value: 'Poor', desc: 'Heavy wear or needs maintenance/repair' },
];

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Basic Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cycle');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('10');
  
  // Closing time default (2 days from now)
  const defaultClose = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [closingTime, setClosingTime] = useState(defaultClose);

  // Photos
  const [photoInput, setPhotoInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [defectPhotoIncluded, setDefectPhotoIncluded] = useState(false);

  // Structured Condition
  const [conditionGrade, setConditionGrade] = useState('Good');
  const [age, setAge] = useState('1 year');
  const [workingStatus, setWorkingStatus] = useState('Fully functional');
  const [defects, setDefects] = useState('');
  const [accessories, setAccessories] = useState('');

  // Category Specific Specs
  const [cycleSpecs, setCycleSpecs] = useState({
    brakes: 'Good',
    tyres: 'Good tread',
    frameSize: 'Medium (26")',
    geared: true,
  });

  const [calcSpecs, setCalcSpecs] = useState({
    display: 'Flawless',
    battery: 'Working',
    modelType: 'Scientific',
  });

  const [bookSpecs, setBookSpecs] = useState({
    edition: 'Latest Edition',
    markedPages: 'Clean / No marks',
    binding: 'Intact / Tight',
  });

  const [electronicsSpecs, setElectronicsSpecs] = useState({
    batteryHealth: 'Holds charge well (4+ hrs)',
    chargerIncluded: true,
    screenCondition: 'Clean, no cracks',
    portsFunctional: true,
  });

  // Honesty Checkbox
  const [honestyDeclaration, setHonestyDeclaration] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Quick photo add helper
  const handleAddPhoto = () => {
    if (!photoInput.trim()) return;
    try {
      new URL(photoInput);
      if (!photos.includes(photoInput.trim())) {
        setPhotos([...photos, photoInput.trim()]);
        setPhotoInput('');
      }
    } catch {
      setError('Please provide a valid image URL');
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Sample photo helpers for quick testing during hackathon
  const handleAddSamplePhotos = () => {
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
    setPhotos(samples[category] || samples.cycle);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (photos.length < 2) {
      setError('A minimum of 2 photos is mandatory so buyers can inspect condition');
      return;
    }

    if (['Fair', 'Poor'].includes(conditionGrade) && (!defects || defects.trim().length < 8)) {
      setError('Detailed disclosure of known defects (min 8 characters) is required for Fair or Poor items');
      return;
    }

    if (!honestyDeclaration) {
      setError('You must check the honesty declaration before publishing');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title,
        category,
        description,
        photos,
        defectPhotoIncluded,
        condition: {
          grade: conditionGrade,
          age,
          workingStatus,
          defects: defects.trim() || 'None reported',
          accessories: accessories ? accessories.split(',').map((s) => s.trim()).filter(Boolean) : [],
          categoryDetails: {
            cycle: cycleSpecs,
            calculator: calcSpecs,
            books: bookSpecs,
            electronics: electronicsSpecs,
          },
        },
        honestyDeclaration: true,
        startingPrice: Number(startingPrice),
        minIncrement: Number(minIncrement),
        closingTime: new Date(closingTime).toISOString(),
      };

      const res = await api.post('/listings', payload);
      if (res.data && res.data.success) {
        navigate('/my-listings');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="space-y-2 border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <Gavel className="w-3.5 h-3.5" />
          <span>New Campus Listing</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          List an Item for Auction
        </h1>
        <p className="text-sm text-slate-500">
          Buyers are your campus peers. Disclose exact wear, age, and specs so buyers bid with confidence.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Item Basic Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>1. Basic Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hero Sprint 26T Geared Cycle or Casio fx-991CW Calculator"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Category *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cycle', label: 'Cycle', icon: Bike },
                  { id: 'calculator', label: 'Calculator', icon: Calculator },
                  { id: 'books', label: 'Books', icon: BookOpen },
                  { id: 'electronics', label: 'Electronics', icon: Laptop },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-semibold shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Auction Closing Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Server clock enforces exact closing time and anti-sniping extensions.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Starting Price (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Minimum Bid Increment (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                placeholder="e.g. 20"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Item Description *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe why you are selling, history of use, and pickup instructions on campus..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Photos (Minimum 2 required) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <span>2. Photo Evidence (Min 2 required)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clear photos show buyers the genuine item condition.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSamplePhotos}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              + Use Sample Photos
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              placeholder="Paste public image URL (https://...)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAddPhoto}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Add Photo
            </button>
          </div>

          {/* Photo Preview Grid (1:1 Ratio) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {photos.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                <ItemImage src={url} alt={`Preview ${idx + 1}`} useThumbnail={true} containerClassName="w-full h-full" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white opacity-90 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                  Photo #{idx + 1}
                </span>
              </div>
            ))}

            {photos.length < 2 && (
              <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-amber-50/50 aspect-video">
                <ImageIcon className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-xs font-semibold text-amber-800">
                  {photos.length === 0 ? 'Add at least 2 photos' : 'Add 1 more photo'}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={defectPhotoIncluded}
                onChange={(e) => setDefectPhotoIncluded(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>
                <strong>Defect Close-up:</strong> I have included at least one photo focusing on wear, scratches, or defects.
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 3: Mandatory Structured Condition Form (Core Principle) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Core Principle: Mandatory Condition Disclosure</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              3. Structured Item Condition
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Buyers must know the exact condition before placing a bid.
            </p>
          </div>

          {/* Condition Grade Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Condition Grade *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {CONDITION_GRADES.map((g) => {
                const isSelected = conditionGrade === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setConditionGrade(g.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm">{g.value}</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">{g.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age & Working Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Approximate Age / Duration of Use *
              </label>
              <input
                type="text"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 6 months, 2 semesters, 1.5 years"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Working Status *
              </label>
              <select
                value={workingStatus}
                onChange={(e) => setWorkingStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                <option value="Fully functional">Fully functional (100% working)</option>
                <option value="Partially functional">Partially functional (Some features impaired)</option>
                <option value="Needs repair / For parts">Needs repair / For parts</option>
              </select>
            </div>
          </div>

          {/* Known Defects (Mandatory for Fair / Poor) */}
          <div className={['Fair', 'Poor'].includes(conditionGrade) ? 'p-4 rounded-xl bg-amber-50/70 border border-amber-200' : ''}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Known Defects & Wear {['Fair', 'Poor'].includes(conditionGrade) && <span className="text-amber-700 font-bold">* (MANDATORY)</span>}</span>
              {['Fair', 'Poor'].includes(conditionGrade) && (
                <span className="text-[11px] text-amber-700 font-medium">
                  Fair/Poor condition requires explicit defect description
                </span>
              )}
            </label>
            <textarea
              rows={2}
              required={['Fair', 'Poor'].includes(conditionGrade)}
              value={defects}
              onChange={(e) => setDefects(e.target.value)}
              placeholder={
                ['Fair', 'Poor'].includes(conditionGrade)
                  ? "Describe all dents, scratches, missing screws, loose parts, or functional defects (min 8 chars)..."
                  : "List any small cosmetic scratches, paint chips, etc. (or leave blank if none)"
              }
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          {/* Included Accessories */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Included Accessories (Comma-separated)
            </label>
            <input
              type="text"
              value={accessories}
              onChange={(e) => setAccessories(e.target.value)}
              placeholder="e.g. Cycle lock, helmet, Casio hard case, charging cord"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          {/* Dynamic Category Specific Fields */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              {category.toUpperCase()} Technical Attributes
            </h3>

            {category === 'cycle' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Brakes Condition</label>
                  <select
                    value={cycleSpecs.brakes}
                    onChange={(e) => setCycleSpecs({ ...cycleSpecs, brakes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Good">Good / Responsive</option>
                    <option value="Needs adjustment">Needs adjustment / Loose cable</option>
                    <option value="Needs pad replacement">Needs pad replacement</option>
                    <option value="N/A">Not applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tyres Condition</label>
                  <select
                    value={cycleSpecs.tyres}
                    onChange={(e) => setCycleSpecs({ ...cycleSpecs, tyres: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Like new">Like new</option>
                    <option value="Good tread">Good tread</option>
                    <option value="Worn">Worn tread</option>
                    <option value="Punctured / Needs replacement">Punctured / Needs replacement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Frame Size</label>
                  <input
                    type="text"
                    value={cycleSpecs.frameSize}
                    onChange={(e) => setCycleSpecs({ ...cycleSpecs, frameSize: e.target.value })}
                    placeholder="e.g. 26T, 27.5T"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            )}

            {category === 'calculator' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Display Contrast</label>
                  <select
                    value={calcSpecs.display}
                    onChange={(e) => setCalcSpecs({ ...calcSpecs, display: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Flawless">Flawless (Clean digits)</option>
                    <option value="Faint / Low contrast">Faint / Low contrast</option>
                    <option value="Lines missing">Lines missing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Battery Status</label>
                  <select
                    value={calcSpecs.battery}
                    onChange={(e) => setCalcSpecs({ ...calcSpecs, battery: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Working">Working</option>
                    <option value="Needs replacement">Needs replacement</option>
                    <option value="Solar only">Solar only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Calculator Type</label>
                  <select
                    value={calcSpecs.modelType}
                    onChange={(e) => setCalcSpecs({ ...calcSpecs, modelType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Scientific">Scientific (fx-991, etc.)</option>
                    <option value="Graphing">Graphing</option>
                    <option value="Basic">Basic</option>
                  </select>
                </div>
              </div>
            )}

            {category === 'books' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Edition</label>
                  <input
                    type="text"
                    value={bookSpecs.edition}
                    onChange={(e) => setBookSpecs({ ...bookSpecs, edition: e.target.value })}
                    placeholder="e.g. 5th Edition"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Page Annotations</label>
                  <select
                    value={bookSpecs.markedPages}
                    onChange={(e) => setBookSpecs({ ...bookSpecs, markedPages: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Clean / No marks">Clean / No marks</option>
                    <option value="Light pencil notes">Light pencil notes</option>
                    <option value="Heavy pen / Highlighting">Heavy pen / Highlighting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Binding Condition</label>
                  <select
                    value={bookSpecs.binding}
                    onChange={(e) => setBookSpecs({ ...bookSpecs, binding: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Intact / Tight">Intact / Tight</option>
                    <option value="Loose pages">Loose pages</option>
                    <option value="Cover torn / taped">Cover torn / taped</option>
                  </select>
                </div>
              </div>
            )}

            {category === 'electronics' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Battery Backup Health</label>
                  <input
                    type="text"
                    value={electronicsSpecs.batteryHealth}
                    onChange={(e) => setElectronicsSpecs({ ...electronicsSpecs, batteryHealth: e.target.value })}
                    placeholder="e.g. 4+ hours, or Weak (needs wall power)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Screen / Exterior Flaws</label>
                  <input
                    type="text"
                    value={electronicsSpecs.screenCondition}
                    onChange={(e) => setElectronicsSpecs({ ...electronicsSpecs, screenCondition: e.target.value })}
                    placeholder="e.g. Clean screen, scratches on bottom case"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Honesty Declaration Checkbox */}
        <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={honestyDeclaration}
              onChange={(e) => setHonestyDeclaration(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-sm text-indigo-950 leading-relaxed">
              <span className="font-bold">Seller Honesty & Accuracy Declaration *</span>
              <p className="text-xs text-indigo-800 mt-0.5">
                I hereby declare that the photos and structured condition details provided are accurate to the best of my knowledge. I understand that misrepresenting working condition, omitting defects, or hiding faults can result in cancellation of the sale and loss of campus handover privileges.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/my-listings')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-colors flex items-center gap-2"
          >
            <Gavel className="w-4 h-4" />
            <span>{submitting ? 'Publishing Auction...' : 'Publish Auction'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
