import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { getThumbnailUrl } from '../config/imageConfig';
import { getCategoryConfig } from '../config/categoryConfig';

/**
 * Reusable 1:1 Square Item Image Component
 * Ensures uniform 1:1 aspect ratio, center object-fit cover, and category icon placeholder on error/empty.
 * 
 * @param {string} src - Full resolution image URL
 * @param {string} thumbnailSrc - Optional explicit thumbnail URL
 * @param {string} alt - Alt description
 * @param {string} category - Category key for contextual fallback icon
 * @param {boolean} useThumbnail - When true, prefers the 400x400 thumbnail for lists/grids
 * @param {string} className - Additional CSS classes applied to <img>
 * @param {string} containerClassName - Additional CSS classes applied to outer container
 * @param {Function} onClick - Optional click handler
 */
export default function ItemImage({
  src,
  thumbnailSrc,
  alt = 'Auction item',
  category,
  useThumbnail = false,
  className = '',
  containerClassName = '',
  onClick,
}) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Compute final image source
  let finalSrc = src;
  if (useThumbnail) {
    finalSrc = thumbnailSrc || getThumbnailUrl(src) || src;
  }

  const isInvalid = !finalSrc || hasError;
  const categoryConfig = category ? getCategoryConfig(category) : null;

  const handleImageError = () => {
    if (import.meta.env?.DEV || process.env.NODE_ENV !== 'production') {
      console.warn(`[ItemImage] Failed to load image at URL: "${finalSrc}" for item "${alt}"`);
    }
    setHasError(true);
  };

  return (
    <div
      onClick={onClick}
      style={{ aspectRatio: '1 / 1' }}
      className={`relative w-full overflow-hidden flex items-center justify-center bg-warm-white-paper select-none ${containerClassName} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {isInvalid ? (
        // Clean category icon placeholder with uniform 1:1 square
        <div className="w-full h-full flex flex-col items-center justify-center bg-warm-white text-charcoal border border-sage/40 p-4 select-none">
          {categoryConfig?.icon ? (
            <span className="text-3xl sm:text-4xl leading-none mb-1.5" role="img" aria-label={categoryConfig.label}>
              {categoryConfig.icon}
            </span>
          ) : (
            <Package className="w-10 h-10 text-sage/70 stroke-[1.5] mb-1" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal/60 text-center">
            {categoryConfig?.label || 'Campus Item'}
          </span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-sage-50 animate-pulse flex items-center justify-center">
              <Package className="w-8 h-8 text-sage/40" />
            </div>
          )}
          <img
            src={finalSrc}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
            style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </>
      )}
    </div>
  );
}
