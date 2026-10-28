import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Tag, ArrowUpRight, Camera, Gavel, User } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import ItemImage from './ItemImage';
import { categoryEmojiMap } from '../config/categoryConfig';

export default function ListingCard({ listing }) {
  if (!listing) return null;

  const categoryEmoji = categoryEmojiMap[listing.category?.toLowerCase()] || `🏷️ ${listing.category}`;

  // Condition Badge styling using the 4-color palette
  const conditionColorMap = {
    'New': 'bg-sage/25 text-forest border-sage font-black',
    'Like new': 'bg-sage/25 text-forest border-sage font-black',
    'Good': 'bg-forest/10 text-forest border-forest/30 font-extrabold',
    'Fair': 'bg-amber/20 text-amber-hover border-amber/50 font-black',
    'Poor': 'bg-red-50 text-red-700 border-red-300 font-black',
  };
  const conditionBadgeStyle = conditionColorMap[listing.condition?.grade] || 'bg-sage/20 text-forest border-sage';

  const photo = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos[0] : null;
  const thumb = Array.isArray(listing.photoThumbnails) && listing.photoThumbnails.length > 0 ? listing.photoThumbnails[0] : null;

  return (
    <div className="group bg-warm-white-paper rounded-2xl border-2 border-sage/60 hover:border-forest shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top Image Preview & Badges (1:1 Ratio) */}
      <div className="relative w-full overflow-hidden">
        <ItemImage
          src={photo}
          thumbnailSrc={thumb}
          useThumbnail={true}
          alt={listing.title}
          category={listing.category}
          className="group-hover:scale-105 transition-transform duration-300"
        />

        {/* Category Pill (Top Left) */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal text-warm-white text-xs font-bold shadow-xs">
            {categoryEmoji}
          </span>
        </div>

        {/* Condition Grade Pill (Top Right) */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border shadow-2xs ${conditionBadgeStyle}`}>
            <ShieldCheck className="w-3 h-3 text-charcoal" />
            {listing.condition?.grade || 'Inspected'}
          </span>
        </div>

        {/* Defect Photo Indicator (Bottom Left) */}
        {listing.defectPhotoIncluded && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber text-charcoal text-[11px] font-black shadow-xs">
              <Camera className="w-3 h-3 text-charcoal" />
              Defect Photo
            </span>
          </div>
        )}

        {/* Timer Badge (Bottom Right) */}
        <div className="absolute bottom-2.5 right-2.5">
          <CountdownTimer targetDate={listing.closingTime} compact={true} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Title */}
          <Link to={`/listings/${listing._id}`}>
            <h3 className="font-extrabold text-charcoal text-base sm:text-lg line-clamp-2 group-hover:text-sage-dark transition-colors leading-snug">
              {listing.title}
            </h3>
          </Link>

          {/* Structured Condition Specs Quick Row */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-charcoal/80 font-medium">
            <span className="bg-sage-50 px-2 py-0.5 rounded text-charcoal font-semibold border border-sage/40">
              Age: {listing.condition?.age || 'Campus used'}
            </span>
            <span>&bull;</span>
            <span className="bg-sage-50 px-2 py-0.5 rounded text-charcoal font-semibold border border-sage/40">
              {listing.condition?.workingStatus || 'Functional'}
            </span>
          </div>

          {/* Honest Defect Disclosure Highlight (Core Principle) */}
          {listing.condition?.defects && listing.condition.defects !== 'None' && listing.condition.defects !== 'None reported' ? (
            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber/40 text-xs text-amber-hover font-medium flex items-start gap-1.5 line-clamp-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                <strong className="font-bold text-charcoal">Honest Defect:</strong> {listing.condition.defects}
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-sage-50 border border-sage/50 text-xs text-charcoal font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sage-dark shrink-0" />
              <span>Clean condition &bull; Zero major defects</span>
            </div>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="pt-3 border-t border-sage/40 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
              {listing.bidCount > 0 ? 'Current Leading Bid' : 'Starting Bid'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-charcoal flex items-baseline gap-1">
              <span>₹{listing.currentPrice || listing.startingPrice}</span>
              <span className="text-[11px] font-bold text-charcoal/70">
                ({listing.bidCount || 0} {listing.bidCount === 1 ? 'bid' : 'bids'})
              </span>
            </div>
          </div>

          <Link
            to={`/listings/${listing._id}`}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white font-black text-xs shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <span>Bid</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-sage" />
          </Link>
        </div>
      </div>
    </div>
  );
}
