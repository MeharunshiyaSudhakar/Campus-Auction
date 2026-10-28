import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Package,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Gavel,
  ShieldCheck,
  X,
} from 'lucide-react';
import api from '../api/client';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for debounced search
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract current filter values from URL searchParams
  const currentFilters = {
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || 'all',
    condition: searchParams.get('condition') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    closingSoon: searchParams.get('closingSoon') === 'true',
    sort: searchParams.get('sort') || 'closing_soon',
    page: parseInt(searchParams.get('page'), 10) || 1,
  };

  // Sync searchQuery with URL param if changed externally
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Debounced search input handler
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (searchQuery !== currentQ) {
        handleFilterChange('q', searchQuery);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch listings whenever URL searchParams change
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const queryObj = {};
    if (searchParams.get('q')) queryObj.q = searchParams.get('q');
    if (searchParams.get('category') && searchParams.get('category') !== 'all') {
      queryObj.category = searchParams.get('category');
    }
    if (searchParams.get('condition') && searchParams.get('condition') !== 'all') {
      queryObj.condition = searchParams.get('condition');
    }
    if (searchParams.get('minPrice')) queryObj.minPrice = searchParams.get('minPrice');
    if (searchParams.get('maxPrice')) queryObj.maxPrice = searchParams.get('maxPrice');
    if (searchParams.get('closingSoon')) queryObj.closingSoon = searchParams.get('closingSoon');
    if (searchParams.get('sort')) queryObj.sort = searchParams.get('sort');
    if (searchParams.get('page')) queryObj.page = searchParams.get('page');
    queryObj.limit = 12;

    api.get('/listings', { params: queryObj })
      .then((res) => {
        if (!isSubscribed) return;
        const data = res.data?.data;
        if (data?.listings) {
          setListings(data.listings);
          setPagination(data.pagination || { total: data.listings.length, page: 1, totalPages: 1 });
        } else if (Array.isArray(data)) {
          setListings(data);
          setPagination({ total: data.length, page: 1, totalPages: 1 });
        } else {
          setListings([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.error('Failed to load listings:', err);
        setError('Failed to fetch campus auctions. Please verify your connection.');
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [searchParams]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === false) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    // Reset to page 1 on filter changes unless changing page itself
    if (key !== 'page') {
      newParams.delete('page');
    }
    startTransition(() => {
      setSearchParams(newParams);
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [
    Boolean(currentFilters.search),
    currentFilters.category !== 'all',
    currentFilters.condition !== 'all',
    Boolean(currentFilters.minPrice),
    Boolean(currentFilters.maxPrice),
    Boolean(currentFilters.closingSoon),
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header & Quick Category Pills */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-forest text-xs font-black uppercase tracking-wider border border-amber/40 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber" />
              Live Campus Auctions
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-forest">
              Explore Active Student Listings
            </h1>
            <p className="text-xs sm:text-sm text-charcoal/80">
              Verified condition disclosures, transparent bid histories, and anti-sniping timers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest text-warm-white font-bold text-xs shadow-sm hover:bg-forest-light cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber text-forest font-black flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Link
              to="/sell"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber hover:bg-amber-hover text-forest font-black text-xs shadow-sm shadow-amber/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-forest" />
              <span>Sell Item</span>
            </Link>
          </div>
        </div>

        {/* Quick Category Bar (Horizontal Scrolling on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Items', icon: '🏷️' },
            { id: 'cycle', label: 'Cycles', icon: '🚲' },
            { id: 'calculator', label: 'Calculators', icon: '🔢' },
            { id: 'books', label: 'Books', icon: '📚' },
            { id: 'electronics', label: 'Electronics', icon: '💻' },
          ].map((cat) => {
            const isSelected = (!currentFilters.category && cat.id === 'all') || currentFilters.category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleFilterChange('category', cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-forest text-warm-white border-forest shadow-xs font-black'
                    : 'bg-warm-white text-forest hover:bg-sage/20 border-sage/50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar (1 Column) */}
        <div className="hidden lg:block lg:col-span-1 sticky top-24">
          <FilterSidebar
            filters={{
              search: searchQuery,
              category: currentFilters.category,
              condition: currentFilters.condition,
              minPrice: currentFilters.minPrice,
              maxPrice: currentFilters.maxPrice,
              closingSoon: currentFilters.closingSoon,
              sort: currentFilters.sort,
            }}
            onFilterChange={(key, val) => {
              if (key === 'search') {
                setSearchQuery(val);
              } else {
                handleFilterChange(key, val);
              }
            }}
            onReset={handleResetFilters}
            totalCount={pagination.total}
          />
        </div>

        {/* Listings Display Area (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center flex-wrap gap-2 p-3 rounded-xl bg-warm-white-paper border border-sage/40 text-xs">
              <span className="font-extrabold text-forest">Active Filters:</span>

              {currentFilters.search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest text-warm-white text-[11px] font-bold">
                  Keyword: "{currentFilters.search}"
                  <button onClick={() => handleFilterChange('q', '')} className="hover:text-amber">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {currentFilters.category !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest text-warm-white text-[11px] font-bold">
                  Category: {currentFilters.category}
                  <button onClick={() => handleFilterChange('category', 'all')} className="hover:text-amber">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {currentFilters.condition !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber text-forest text-[11px] font-black">
                  Condition: {currentFilters.condition}
                  <button onClick={() => handleFilterChange('condition', 'all')} className="hover:text-forest">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(currentFilters.minPrice || currentFilters.maxPrice) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage-50 text-forest border border-sage text-[11px] font-bold">
                  Price: ₹{currentFilters.minPrice || 0} - ₹{currentFilters.maxPrice || '∞'}
                  <button
                    onClick={() => {
                      handleFilterChange('minPrice', '');
                      handleFilterChange('maxPrice', '');
                    }}
                    className="hover:text-amber-hover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {currentFilters.closingSoon && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber text-forest text-[11px] font-black">
                  Closing Soon (&lt; 24h)
                  <button onClick={() => handleFilterChange('closingSoon', false)} className="hover:text-forest">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-amber-hover font-bold hover:underline ml-auto flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </button>
            </div>
          )}

          {/* Listings Grid or Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border-2 border-sage/40 bg-warm-white-paper p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-4/3 rounded-xl bg-sage/20 w-full" />
                  <div className="h-4 bg-sage/20 rounded w-3/4" />
                  <div className="h-3 bg-sage/15 rounded w-1/2" />
                  <div className="h-8 bg-sage/20 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-amber-50 border-2 border-amber/40 space-y-3">
              <p className="font-extrabold text-forest">{error}</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-forest text-warm-white text-xs font-bold"
              >
                Reset Filters & Retry
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-warm-white-paper border-2 border-dashed border-sage/80 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-sage/20 flex items-center justify-center text-forest">
                <Package className="w-8 h-8 text-forest" />
              </div>
              <h3 className="text-lg font-black text-forest">No Campus Auctions Found</h3>
              <p className="text-xs sm:text-sm text-charcoal/70 max-w-md mx-auto">
                No active auctions match your search or filter criteria. Try adjusting your search term, clearing filters, or be the first senior to list an item!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-warm-white border border-forest text-forest font-bold text-xs hover:bg-sage/20"
                >
                  Clear All Filters
                </button>
                <Link
                  to="/sell"
                  className="px-5 py-2.5 rounded-xl bg-amber hover:bg-amber-hover text-forest font-black text-xs shadow-xs"
                >
                  Sell an Item Now
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map((item) => (
                  <ListingCard key={item._id} listing={item} />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="pt-6 border-t border-sage/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs font-bold text-charcoal-muted">
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    <span className="text-forest font-black">{pagination.total}</span> active items
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-xl border border-sage/60 bg-warm-white-paper text-forest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sage/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(pagination.totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        const isCurrent = pageNum === pagination.page;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handleFilterChange('page', pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-forest text-warm-white font-black shadow-xs'
                                : 'bg-warm-white text-forest hover:bg-sage/20 border border-sage/40'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-xl border border-sage/60 bg-warm-white-paper text-forest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sage/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 max-w-full w-full sm:w-96 bg-warm-white shadow-2xl p-4 flex flex-col">
            <FilterSidebar
              filters={{
                search: searchQuery,
                category: currentFilters.category,
                condition: currentFilters.condition,
                minPrice: currentFilters.minPrice,
                maxPrice: currentFilters.maxPrice,
                closingSoon: currentFilters.closingSoon,
                sort: currentFilters.sort,
              }}
              onFilterChange={(key, val) => {
                if (key === 'search') {
                  setSearchQuery(val);
                } else {
                  handleFilterChange(key, val);
                }
              }}
              onReset={handleResetFilters}
              totalCount={pagination.total}
              isMobileDrawer={true}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
