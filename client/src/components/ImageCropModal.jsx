import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * Utility to extract cropped image from canvas
 */
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * 1:1 Square Image Cropping Modal
 * Allows seller to drag and zoom to choose square framing with defect hint
 */
export default function ImageCropModal({
  imageSrc,
  fileName = 'photo.jpg',
  currentIndex = 1,
  totalQueue = 1,
  onConfirmCrop,
  onCancel,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropCompleteCallback = useCallback((croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      setProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      onConfirmCrop(croppedFile);
    } catch (err) {
      console.error('Failed to crop image:', err);
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-warm-white-paper rounded-3xl border-2 border-sage max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-charcoal text-warm-white flex items-center justify-between border-b-2 border-sage">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage text-charcoal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-charcoal" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm tracking-tight">
                Square 1:1 Framing {totalQueue > 1 ? `(${currentIndex} of ${totalQueue})` : ''}
              </h3>
              <p className="text-[11px] text-sage-light">Choose photo crop before uploading</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-sage-light hover:text-amber rounded-lg hover:bg-charcoal-700 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Honesty Hint */}
        <div className="bg-amber-50 px-4 py-2.5 border-b border-amber/30 flex items-center gap-2 text-xs font-bold text-charcoal">
          <ShieldAlert className="w-4 h-4 text-amber shrink-0" />
          <span>Keep any defect, wear, or cosmetic scratch visible in the frame.</span>
        </div>

        {/* Cropper Viewport Container (Fixed 1:1 Aspect Ratio) */}
        <div className="relative w-full h-[320px] bg-charcoal/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
            showGrid={true}
            cropShape="rect"
          />
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-3 bg-sage-50 border-t border-sage/40 flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-charcoal flex items-center gap-1.5 shrink-0">
            <ZoomIn className="w-4 h-4 text-sage-dark" />
            <span>Zoom</span>
          </span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-charcoal cursor-pointer"
          />
          <span className="text-xs font-black text-charcoal w-10 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-warm-white flex items-center justify-end gap-3 border-t border-sage/30">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-100 text-charcoal text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="px-5 py-2 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white text-xs font-black shadow-md border border-charcoal flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {processing ? (
              <span>Cropping...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-amber" />
                <span>Confirm 1:1 Crop</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
