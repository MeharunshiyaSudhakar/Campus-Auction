import React from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Clock,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: '🏷️' },
  { id: 'cycle', label: 'Cycles', icon: '🚲' },
  { id: 'calculator', label: 'Calculators', icon: '🔢' },
  { id: 'books', label: 'Books', icon: '📚' },
  { id: 'electronics', label: 'Electronics', icon: '💻' },
];

const CONDITIONS = [
  { id: 'all', label: 'All Grades' },
  { id: 'New', label: 'New' },
  { id: 'Like new', label: 'Like New' },
  { id: 'Good', label: 'Good' },
  { id: 'Fair', label: 'Fair' },
  { id: 'Poor', label: 'Poor' },
];

const SORT_OPTIONS = [
  { id: 'closing_soon', label: 'Closing Soonest (Anti-Sniping)' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'newest', label: 'Newest Listed' },
  { id: 'most_bids', label: 'Most Active Bids' },
];

export default function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  totalCount,
  isMobileDrawer = false,
  onCloseMobile,
}) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    (filters.category && filters.category !== 'all') ||
    (filters.condition && filters.condition !== 'all') ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    Boolean(filters.closingSoon);

  return (
    <aside
      className={`bg-warm-white-paper rounded-2xl border-2 border-sage/60 p-5 space-y-6 shadow-xs ${
        isMobileDrawer ? 'h-full overflow-y-auto' : ''
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-sage/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-forest text-amber flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-amber" />
          </div>
          <div>
            <h3 className="font-black text-forest text-base">Search & Filters</h3>
            <p className="text-xs text-charcoal-muted">
              {totalCount !== undefined ? `${totalCount} active items` : 'Campus filters'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-amber-hover hover:underline inline-flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {isMobileDrawer && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-charcoal hover:bg-sage/20 cursor-pointer"
            >
              <X className="w-5 h-5 text-forest" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Keyword Search */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-amber" />
          <span>Keyword Search</span>
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search cycle, Casio, CLRS, charger..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-sage/60 bg-warm-white text-charcoal text-sm placeholder:text-charcoal-muted/60 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-medium"
          />
          <Search className="w-4 h-4 text-forest absolute left-3 top-3 pointer-events-none" />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-2.5 top-2.5 text-charcoal-muted hover:text-charcoal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber" />
          <span>Category</span>
        </label>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = (!filters.category && cat.id === 'all') || filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onFilterChange('category', cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-forest text-warm-white shadow-xs font-black'
                    : 'bg-warm-white text-charcoal hover:bg-sage/20 border border-sage/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-amber"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Mandatory Condition Grade Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber" />
          <span>Condition Grade</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {CONDITIONS.map((cond) => {
            const isSelected = (!filters.condition && cond.id === 'all') || filters.condition === cond.id;
            return (
              <button
                key={cond.id}
                type="button"
                onClick={() => onFilterChange('condition', cond.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer border ${
                  isSelected
                    ? 'bg-amber text-forest border-amber/80 shadow-xs font-black'
                    : 'bg-warm-white text-charcoal hover:bg-sage/20 border-sage/50'
                }`}
              >
                {cond.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Price Range Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-amber" />
          <span>Price Range (₹)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-charcoal-muted uppercase font-bold block mb-1">Min (₹)</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice || ''}
              onChange={(e) => onFilterChange('minPrice', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-sage/60 bg-warm-white text-charcoal text-xs focus:outline-none focus:border-forest font-semibold"
            />
          </div>
          <div>
            <span className="text-[10px] text-charcoal-muted uppercase font-bold block mb-1">Max (₹)</span>
            <input
              type="number"
              min="0"
              placeholder="5000"
              value={filters.maxPrice || ''}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-sage/60 bg-warm-white text-charcoal text-xs focus:outline-none focus:border-forest font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 5. Urgency: Closing Soon Toggle */}
      <div className="pt-2 border-t border-sage/40">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber" />
            <div>
              <span className="text-xs font-black text-forest block">Closing Soon</span>
              <span className="text-[10px] text-charcoal-muted block">Next 24 hours only</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(filters.closingSoon)}
            onChange={(e) => onFilterChange('closingSoon', e.target.checked)}
            className="w-4 h-4 rounded text-forest focus:ring-forest accent-forest cursor-pointer"
          />
        </label>
      </div>

      {/* 6. Sort Option */}
      <div className="space-y-2 pt-2 border-t border-sage/40">
        <label className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-amber" />
          <span>Sort By</span>
        </label>
        <select
          value={filters.sort || 'closing_soon'}
          onChange={(e) => onFilterChange('sort', e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-sage/60 bg-warm-white text-forest text-xs font-bold focus:outline-none focus:border-forest cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile Apply Button */}
      {isMobileDrawer && (
        <div className="pt-4">
          <button
            onClick={onCloseMobile}
            className="w-full py-3 rounded-xl bg-forest text-warm-white font-black text-sm shadow-md hover:bg-forest-light active:scale-95 transition-all"
          >
            Show {totalCount !== undefined ? `${totalCount} Results` : 'Filtered Auctions'}
          </button>
        </div>
      )}
    </aside>
  );
}
