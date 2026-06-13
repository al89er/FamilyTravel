import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, ImageOff, Loader2 } from "lucide-react";
import { Modal, Button } from "../components/ui";

interface GalleryLightboxProps {
  mediaItems: any[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onRemoveMediaItem: (id: string) => Promise<void>;
}

export function GalleryLightbox({
  mediaItems,
  initialIndex,
  isOpen,
  onClose,
  isOwner,
  onRemoveMediaItem
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [removeCandidate, setRemoveCandidate] = useState<any>(null);
  const [removing, setRemoving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Sync state if initialIndex changes when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setRemoveCandidate(null);
      setImageLoaded(false);
    }
  }, [initialIndex, isOpen]);

  // Reset image loaded state when navigating between images
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  }, [mediaItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (removeCandidate) return; // Disable main navigation when modal is open
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose, removeCandidate]);

  if (!isOpen || mediaItems.length === 0) return null;

  const currentItem = mediaItems[currentIndex];
  if (!currentItem) return null;

  const now = Date.now();
  let hasValidUrl = false;
  let imageUrl = "";

  if (currentItem.cachedBaseUrl && currentItem.cachedBaseUrlExpiresAt) {
    const expires = new Date(currentItem.cachedBaseUrlExpiresAt).getTime();
    if (expires > now) {
      hasValidUrl = true;
      imageUrl = `${currentItem.cachedBaseUrl}=w1600-h1600`;
    }
  }

  async function handleConfirmRemove() {
    if (!removeCandidate) return;
    setRemoving(true);
    try {
      await onRemoveMediaItem(removeCandidate.id);
      setRemoveCandidate(null);
      // Close lightbox if it was the last item, otherwise stay on current index (which will now point to the next item in the array)
      if (mediaItems.length <= 1) {
        onClose();
      } else {
        if (currentIndex >= mediaItems.length - 1) {
          setCurrentIndex(mediaItems.length - 2);
        }
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to remove photo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex-1">
          <p className="text-white/80 text-xs font-medium">
            {currentIndex + 1} of {mediaItems.length}
          </p>
        </div>
        <div className="flex gap-4">
          {isOwner && (
            <button
              type="button"
              onClick={() => setRemoveCandidate(currentItem)}
              className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
              title="Remove from trip gallery"
              aria-label="Remove from trip gallery"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close viewer"
            aria-label="Close viewer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-16" onClick={(e) => {
        // Close if clicking the backdrop directly
        if (e.target === e.currentTarget) onClose();
      }}>
        {hasValidUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="h-12 w-12 text-white/50 animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={currentItem.caption || currentItem.filename || "Trip photo"}
              className={`max-h-full max-w-full object-contain pointer-events-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/50">
            <ImageOff className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Image unavailable</p>
            <p className="text-sm opacity-70">The thumbnail URL has expired.</p>
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {mediaItems.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            aria-label="Next photo"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Bottom Bar: Metadata */}
      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto">
          {currentItem.caption && (
            <p className="text-white text-base md:text-lg font-medium mb-1 drop-shadow-md">
              {currentItem.caption}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70 drop-shadow-md">
            {currentItem.filename && <span>{currentItem.filename}</span>}
            {currentItem.takenAt && (
              <span>• {new Date(currentItem.takenAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
            {currentItem.uploadedByName && (
              <span>• By {currentItem.uploadedByName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!removeCandidate}
        onClose={() => setRemoveCandidate(null)}
        title="Remove photo from trip gallery?"
      >
        <div className="p-6">
          <p className="text-sm font-medium text-clay-secondary mb-8">
            This will hide the photo from the shared trip gallery. It will remain in Google Photos and can be managed manually there.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setRemoveCandidate(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRemove}
              disabled={removing}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
