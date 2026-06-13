import { Images, ExternalLink, Settings as SettingsIcon, Cloud, UploadCloud, X, FileImage, RefreshCw, Image as ImageIcon, Trash2, CheckCircle2, Circle, Download, Share2, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { AppData, TripGalleryAlbum, TripGalleryMediaItem, GooglePhotosConnectionStatus } from "../types";
import { AppView } from "../hooks/useAppState";
import { Card, Button, EmptyState, LoadingState, Modal } from "../components/ui";
import { 
  getTripGalleryAlbum, 
  listTripGalleryMediaItems,
  getGooglePhotosConnectionStatus,
  startGooglePhotosOAuth,
  uploadGooglePhotosMedia,
  refreshGooglePhotosMedia,
  createGooglePhotosAlbum,
  removeTripGalleryMediaItem,
  disconnectGooglePhotos
} from "../lib/supabase";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryPageSkeleton } from "./GallerySkeletons";
import { getCachedThumbnailUrl, fetchAndCacheThumbnail, deleteCachedThumbnail, clearGalleryThumbnailCache } from "../lib/galleryThumbnailCache";
import { prepareExportFiles, downloadAsZip, ExportProgress } from "../lib/exportGallery";

function GalleryHeader({ title, subtitle, icon: Icon, colorClass }: { title: string, subtitle: string, icon: any, colorClass: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 px-4 lg:px-0">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${colorClass} shadow-clay-card text-white shrink-0`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-clay-primary">{title}</h2>
        <p className="text-sm font-bold text-clay-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

function GallerySetupPanel({ connection, album, actionLoading, handleConnect, handleCreateAlbum }: any) {
  return (
    <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-clay-recessed shadow-clay-pressed rounded-[24px] flex items-center justify-center mb-6">
        <Cloud className="h-10 w-10 text-blue-500" />
      </div>
      {!connection?.connected ? (
        <>
          <h3 className="text-xl font-black text-clay-primary mb-2">Connect Google Photos</h3>
          <p className="text-sm font-medium text-clay-secondary mb-6 max-w-sm mx-auto">
            Securely link your Google account so the app can manage a dedicated trip album.
          </p>
          <Button onClick={handleConnect} disabled={actionLoading}>
            {actionLoading ? "Connecting..." : "Connect Account"}
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-xl font-black text-clay-primary mb-2">Create Trip Album</h3>
          <p className="text-sm font-medium text-clay-secondary mb-6 max-w-sm mx-auto">
            Your account is linked. Now create a dedicated album in your Google Photos to store this trip's memories.
          </p>
          <Button onClick={handleCreateAlbum} disabled={actionLoading}>
            {actionLoading ? "Creating..." : "Create Album"}
          </Button>
        </>
      )}
    </Card>
  );
}

function GalleryUploadPanel({ selectedFiles, caption, uploading, handleFileSelect, removeFile, setCaption, handleUpload, fileInputRef, clearFiles }: any) {
  return (
    <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
      <div className="space-y-4">
        <div>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={uploading || selectedFiles.length >= 10}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || selectedFiles.length >= 10}
            className="w-full justify-center"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Select Photos (Max 10)
          </Button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="bg-clay-recessed rounded-[16px] p-4 shadow-clay-pressed space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-clay-primary">{selectedFiles.length} file(s) selected</span>
              <button onClick={clearFiles} className="text-xs text-clay-secondary hover:text-red-500 font-bold uppercase tracking-wider" disabled={uploading}>Clear All</button>
            </div>
            <ul className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {selectedFiles.map((f: File, i: number) => (
                <li key={i} className="flex justify-between items-center text-sm text-clay-secondary bg-clay-surface p-2 rounded-lg shadow-sm">
                  <span className="truncate max-w-[200px]">{f.name}</span>
                  <button onClick={() => removeFile(i)} disabled={uploading} className="p-1 hover:bg-clay-recessed rounded-full transition-colors"><X className="h-3 w-3 text-red-500" /></button>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-clay-secondary mb-2 ml-1">Optional Caption</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a description for these photos..."
                disabled={uploading}
                className="w-full rounded-[16px] border-0 bg-clay-surface px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-pressed placeholder:text-clay-secondary/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0} className="w-full sm:w-auto">
                {uploading ? "Uploading..." : "Upload Photos"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function GalleryEmptyState({ canUploadPhotos }: { canUploadPhotos: boolean }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-20 h-20 bg-clay-recessed shadow-clay-pressed rounded-[24px] flex items-center justify-center mx-auto mb-6">
        <Images className="h-10 w-10 text-clay-secondary/40" />
      </div>
      <p className="text-xl font-black text-clay-primary mb-2">No photos yet</p>
      <p className="text-sm font-medium text-clay-secondary mb-8 max-w-xs mx-auto">
        {canUploadPhotos 
          ? "Upload your first memories to the trip album." 
          : "The trip owner hasn't uploaded any photos yet."}
      </p>
    </div>
  );
}

function GalleryThumbnail({ item, tripId }: { item: any; tripId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    
    async function load() {
      // 1. Try to get from cache first
      const cachedUrl = await getCachedThumbnailUrl(tripId, item.id);
      if (cachedUrl) {
        if (active) {
          objectUrl = cachedUrl;
          setSrc(cachedUrl);
        } else {
          URL.revokeObjectURL(cachedUrl);
        }
      }
      
      // 2. If valid baseUrl, fetch and cache it
      const now = Date.now();
      const isValid = item.cachedBaseUrl && item.cachedBaseUrlExpiresAt && (new Date(item.cachedBaseUrlExpiresAt).getTime() > now);
      
      if (isValid) {
        const url = `${item.cachedBaseUrl}=w400-h400-c`;
        const freshUrl = await fetchAndCacheThumbnail(tripId, item.id, url);
        if (freshUrl && active) {
          if (objectUrl && objectUrl !== freshUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = freshUrl;
          setSrc(freshUrl);
        } else if (freshUrl && !active) {
          URL.revokeObjectURL(freshUrl);
        }
      }
    }
    
    load();
    
    return () => { 
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item, tripId]);
  
  if (!src) {
    return (
      <div className="flex-1 flex items-center justify-center bg-clay-surface/50 animate-pulse">
        <ImageIcon className="h-8 w-8 text-clay-secondary/40" />
      </div>
    );
  }
  return <img src={src} alt={item.caption || item.filename || "Trip photo"} className="w-full h-full object-cover" />;
}

function GalleryGrid({ tripId, tripTitle, mediaItems, handleManualRefresh, actionLoading, canUploadPhotos, isOwner, onRemoveMediaItem, onImageClick }: any) {
  const [itemsToRemove, setItemsToRemove] = useState<any[]>([]);
  const [removing, setRemoving] = useState(false);
  
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Sync selected IDs if items are removed
  useEffect(() => {
    const currentIds = new Set(mediaItems.map((m: any) => m.id));
    let changed = false;
    const nextSet = new Set<string>();
    for (const id of selectedMediaIds) {
      if (currentIds.has(id)) {
        nextSet.add(id);
      } else {
        changed = true;
      }
    }
    if (changed) {
      setSelectedMediaIds(nextSet);
      if (nextSet.size === 0 && isSelectionMode) {
        setIsSelectionMode(false);
      }
    }
  }, [mediaItems, selectedMediaIds, isSelectionMode]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setIsSelectionMode(false);
      } else {
        next.add(id);
        setIsSelectionMode(true);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedMediaIds.size === mediaItems.length) {
      setSelectedMediaIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedMediaIds(new Set(mediaItems.map((m: any) => m.id)));
      setIsSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedMediaIds(new Set());
    setIsSelectionMode(false);
  };

  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (id: string) => {
    longPressTriggered.current = false;
    touchTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (!isSelectionMode) {
        if ("vibrate" in navigator) navigator.vibrate(50);
        setSelectedMediaIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setIsSelectionMode(true);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  const handleClick = (e: React.MouseEvent, id: string, index: number) => {
    if (longPressTriggered.current) return;
    if (isSelectionMode) {
      toggleSelection(id);
    } else {
      onImageClick?.(index);
    }
  };

  const handleBatchExport = async (forceZip = false) => {
    const selectedItems = mediaItems.filter((m: any) => selectedMediaIds.has(m.id));
    
    if (selectedItems.length === 0) return;
    
    if (!forceZip && selectedItems.length > 10) {
      alert(`Please select up to 10 photos for native sharing (you selected ${selectedItems.length}). For larger batches, use ZIP download.`);
      return;
    }
    
    if (forceZip && selectedItems.length > 25) {
      alert(`Please select up to 25 photos for ZIP download (you selected ${selectedItems.length}).`);
      return;
    }
    
    try {
      setExportProgress({ current: 0, total: selectedItems.length, message: "Starting export..." });
      
      const result = await prepareExportFiles(tripId, selectedItems, (progress) => {
        setExportProgress(progress);
      });
      
      if (result.files.length === 0) {
        alert("Could not prepare any files for export.");
        return;
      }
      
      let warning = "";
      if (result.failedCount > 0) {
        warning = `\nNote: ${result.failedCount} file(s) failed to download.`;
      }
      
      // canShare only reliably works on modern mobile browsers.
      const canShareNative = navigator.canShare && navigator.canShare({ files: result.files });
      
      if (!forceZip && canShareNative) {
        setExportProgress({ current: result.files.length, total: result.files.length, message: "Opening share sheet..." });
        
        try {
          await navigator.share({
            files: result.files,
            title: "Trip photos",
            text: "Selected photos from Family Travel"
          });
        } catch (e: any) {
          if (e.name !== "AbortError") {
            console.error("Native share failed", e);
            const useZip = window.confirm(`Native sharing failed or was not supported. Download as ZIP instead?${warning}`);
            if (useZip) {
              setExportProgress({ current: result.files.length, total: result.files.length, message: "Creating ZIP..." });
              await downloadAsZip(tripTitle, result.files);
            }
          }
        }
      } else {
        // Force ZIP or unsupported native share
        setExportProgress({ current: result.files.length, total: result.files.length, message: "Creating ZIP..." });
        if (!forceZip && warning) alert(`${result.files.length} photos ready.${warning}`);
        await downloadAsZip(tripTitle, result.files);
      }
      
      // Do not clear selection after export so user can do another action if they want
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to export photos.");
    } finally {
      setExportProgress(null);
    }
  };

  async function handleConfirmRemove() {
    if (itemsToRemove.length === 0) return;
    setRemoving(true);
    try {
      await Promise.all(itemsToRemove.map(async item => {
        await onRemoveMediaItem(item.id);
        await deleteCachedThumbnail(tripId, item.id);
      }));
      setItemsToRemove([]);
      clearSelection();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to remove photo(s).");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 lg:px-0">
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <Button variant="secondary" onClick={handleSelectAll} className="text-[11px] py-1.5 px-3">
              {selectedMediaIds.size === mediaItems.length ? "Deselect All" : "Select All"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setIsSelectionMode(true)} className="text-[11px] py-1.5 px-3">
              Select
            </Button>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary/70 ml-2">
            {mediaItems.length} Photo{mediaItems.length !== 1 && "s"}
          </p>
        </div>
        {canUploadPhotos && (
          <Button variant="secondary" onClick={handleManualRefresh} disabled={actionLoading} className="text-[11px] py-1.5 px-3">
            <RefreshCw className={`h-3 w-3 mr-1.5 ${actionLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4 lg:px-0">
        {mediaItems.map((item: any, index: number) => {
          const now = Date.now();
          let hasValidThumbnail = false;
          if (item.cachedBaseUrl && item.cachedBaseUrlExpiresAt) {
            const expires = new Date(item.cachedBaseUrlExpiresAt).getTime();
            if (expires > now) {
              hasValidThumbnail = true;
            }
          }

          const isSelected = selectedMediaIds.has(item.id);

          return (
            <div 
              key={item.id} 
              className={`group relative bg-clay-recessed rounded-[20px] shadow-clay-pressed overflow-hidden aspect-square flex flex-col cursor-pointer transition-transform ${isSelected ? 'scale-[0.96] ring-2 ring-indigo-500' : ''}`}
              onTouchStart={() => handleTouchStart(item.id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onClick={(e) => handleClick(e, item.id, index)}
            >
              {/* Checkbox Overlay */}
              <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(item.id);
                  }}
                  className="p-1 rounded-full drop-shadow-md text-white/90 hover:scale-110 transition-transform"
                  aria-label="Select photo"
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-6 w-6 text-indigo-500 fill-white" />
                  ) : (
                    <Circle className="h-6 w-6 text-white/70" />
                  )}
                </button>
              </div>
              <GalleryThumbnail item={item} tripId={tripId} />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                {isOwner && !isSelectionMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemsToRemove([item]);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-clay-card pointer-events-auto"
                    aria-label="Remove from trip gallery"
                    title="Remove from trip gallery"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <p className="text-[10px] text-white/80 font-bold truncate">
                  {item.caption || item.filename || "Media Item"}
                </p>
                {item.takenAt && (
                  <p className="text-[9px] text-white/60">
                    {new Date(item.takenAt).toLocaleDateString()}
                  </p>
                )}
                {item.googleProductUrl && (
                  <a 
                    href={item.googleProductUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200"
                  >
                    Open Original
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Action Bar */}
      {isSelectionMode && createPortal(
        <div className="fixed bottom-0 inset-x-0 z-[1040] p-4 bg-clay-surface border-t border-border/20 shadow-clay-card flex flex-col sm:flex-row items-center justify-between sm:justify-center gap-4 animate-in slide-in-from-bottom-full pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="p-2 rounded-full bg-clay-recessed hover:bg-clay-surface shadow-clay-pressed transition-colors">
                <X className="h-5 w-5 text-clay-secondary" />
              </button>
              <span className="font-bold text-clay-primary">{selectedMediaIds.size} Selected</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto px-1 pb-1">
            {exportProgress ? (
              <div className="flex items-center px-4 py-2 bg-clay-surface rounded-full text-xs font-medium text-clay-primary shadow-clay-card">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {exportProgress.message}
              </div>
            ) : (
              <>
                <Button variant="secondary" onClick={() => handleBatchExport(false)} className="px-3 py-2 text-sm whitespace-nowrap" disabled={selectedMediaIds.size === 0}>
                  <Share2 className="h-4 w-4 mr-1.5" />
                  <span>Share</span>
                </Button>
                <Button variant="secondary" onClick={() => handleBatchExport(true)} className="px-3 py-2 text-sm whitespace-nowrap" disabled={selectedMediaIds.size === 0}>
                  <Download className="h-4 w-4 mr-1.5" />
                  <span>ZIP</span>
                </Button>
                {isOwner && (
              <Button 
                variant="primary" 
                onClick={() => setItemsToRemove(mediaItems.filter((m: any) => selectedMediaIds.has(m.id)))} 
                className="px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white border-0 whitespace-nowrap" 
                disabled={selectedMediaIds.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                <span>Remove</span>
              </Button>
            )}
            </>
            )}
          </div>
        </div>,
        document.body
      )}

      <Modal
        isOpen={itemsToRemove.length > 0}
        onClose={() => setItemsToRemove([])}
        title={`Remove ${itemsToRemove.length} photo${itemsToRemove.length !== 1 ? 's' : ''}?`}
      >
        <div className="p-6">
          <p className="text-sm font-medium text-clay-secondary mb-8">
            This will hide the selected photo(s) from the shared trip gallery. They will remain in Google Photos and can be managed manually there.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setItemsToRemove([])}
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

function GallerySettingsPanel({ connection, album, mediaItemsCount, actionLoading, handleDisconnect, albumUrl, tripId }: any) {
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    await clearGalleryThumbnailCache(tripId);
    setClearingCache(false);
    alert("Local thumbnail cache cleared. Refreshing page will load thumbnails from Google.");
    window.location.reload();
  };

  return (
    <details className="group mx-4 lg:mx-0 mt-12 bg-clay-recessed rounded-[24px] shadow-clay-pressed [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-5 w-5 text-clay-secondary/70 group-open:text-indigo-500 transition-colors" />
          <span className="font-bold text-clay-primary">Advanced Settings</span>
        </div>
        <span className="text-xl text-clay-secondary/50 group-open:rotate-45 transition-transform duration-300">+</span>
      </summary>
      <div className="px-6 pb-6 pt-2 border-t border-border/30">
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-clay-secondary">Connection</span>
            <span className="text-sm font-bold text-green-600">{connection?.connected ? "Active" : "Disconnected"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-clay-secondary">Account</span>
            <span className="text-sm font-bold text-clay-primary">{connection?.googleAccountEmail || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-clay-secondary">Album Status</span>
            <span className="text-sm font-bold text-clay-primary">{album?.status || "None"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-clay-secondary">Indexed Items</span>
            <span className="text-sm font-bold text-clay-primary">{mediaItemsCount}</span>
          </div>
        </div>

        {albumUrl && (
          <div className="mb-6 flex justify-center">
            <a 
              href={albumUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-clay-surface px-6 text-xs font-bold text-clay-primary shadow-clay-card hover:-translate-y-0.5 transition-all"
            >
              Open Google Photos Album
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="pt-4 border-t border-border/30 flex justify-center">
          <Button variant="danger" onClick={handleDisconnect} disabled={actionLoading} className="w-full sm:w-auto">
            {actionLoading ? "Disconnecting..." : "Disconnect Google Photos"}
          </Button>
        </div>
      </div>
    </details>
  );
}

export function Gallery({ data, openView }: { data: AppData; openView: (view: AppView) => void }) {
  const [album, setAlbum] = useState<TripGalleryAlbum | null>(null);
  const [mediaItems, setMediaItems] = useState<TripGalleryMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [connection, setConnection] = useState<GooglePhotosConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Role resolution
  const userRole = data.members.find(m => m.userId === data.currentUser.id)?.role;
  const isOwner = userRole === "owner";
  const isOrganizer = userRole === "organizer";
  
  // Phase 6 Prep
  const canViewGallery = true; 
  const canUploadPhotos = isOwner || isOrganizer; 
  const canManageGoogleConnection = isOwner;
  const canSeeAdvancedSettings = isOwner;

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    try {
      const [albumData, mediaData] = await Promise.all([
        getTripGalleryAlbum(data.trip.id),
        listTripGalleryMediaItems(data.trip.id)
      ]);
      
      let connData = null;
      if (canUploadPhotos || canManageGoogleConnection) {
        connData = await getGooglePhotosConnectionStatus(data.trip.id).catch(() => null);
      }
      
      let finalMediaData = mediaData;
      
      if (mediaData.length > 0) {
        const now = Date.now();
        const needsRefresh = mediaData.some(m => {
          if (!m.cachedBaseUrl) return true;
          if (!m.cachedBaseUrlExpiresAt) return true;
          const expires = new Date(m.cachedBaseUrlExpiresAt).getTime();
          return expires < now + 5 * 60 * 1000;
        });

        if (needsRefresh) {
          try {
            const refreshRes = await refreshGooglePhotosMedia(data.trip.id);
            if (refreshRes && refreshRes.refreshedCount > 0) {
              finalMediaData = await listTripGalleryMediaItems(data.trip.id);
            }
          } catch (e) {
            console.error("Failed auto refresh thumbnails", e);
          }
        }
      }

      setAlbum(albumData);
      setMediaItems(finalMediaData);
      setConnection(connData);
    } catch (e) {
      console.error("Failed to load gallery metadata", e);
    }
  }

  async function handleManualRefresh() {
    setActionLoading(true);
    try {
      const res = await refreshGooglePhotosMedia(data.trip.id);
      if (res && res.refreshedCount > 0) {
        const finalMediaData = await listTripGalleryMediaItems(data.trip.id);
        setMediaItems(finalMediaData);
        let msg = `Thumbnails updated. Successfully refreshed ${res.refreshedCount} items.`;
        if (res.processingDelayCount > 0) {
          msg += `\nNote: ${res.processingDelayCount} item(s) are still processing by Google and couldn't be loaded yet. Try again in a few minutes.`;
        }
        alert(msg);
      } else {
        if (res && res.processingDelayCount > 0) {
          alert(`No thumbnails were refreshed.\n${res.processingDelayCount} recently uploaded photo(s) are still being processed by Google. Please try again in a few minutes.`);
        } else {
          alert("No thumbnails were refreshed. " + (res?.message || "Unknown reason."));
        }
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not refresh thumbnails. Open in Google Photos still works.");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (canViewGallery) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [data.trip.id, canViewGallery]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      const authUrl = await startGooglePhotosOAuth(data.trip.id);
      window.location.href = authUrl;
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to start Google Photos connection.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Are you sure you want to disconnect Google Photos?")) return;
    setActionLoading(true);
    try {
      await disconnectGooglePhotos(data.trip.id);
      setConnection({ connected: false, hasRefreshToken: false });
      setAlbum(null);
    } catch (e) {
      console.error(e);
      alert("Failed to disconnect.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateAlbum() {
    setActionLoading(true);
    try {
      const res = await createGooglePhotosAlbum(data.trip.id);
      setAlbum(prev => prev ? { ...prev, googleAlbumId: res.googleAlbumId, albumUrl: res.albumUrl || prev.albumUrl, status: "api_ready" } : null);
      alert("App album created successfully!");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to create album.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (selectedFiles.length + files.length > 10) {
      alert("You can select a maximum of 10 files at a time.");
      return;
    }

    const validFiles = files.filter(f => {
      if (f.size > 25 * 1024 * 1024) {
        alert(`File ${f.name} is too large. Please upload images under 25 MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }
  
  function clearFiles() {
    setSelectedFiles([]);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadGooglePhotosMedia(data.trip.id, selectedFiles, caption);
      
      let msg = `Successfully uploaded ${res.successCount} photos.`;
      if (res.failedCount > 0) {
        msg = `Upload partially completed. ${res.successCount} succeeded, ${res.failedCount} failed.\nErrors: ${res.errors.join(", ")}`;
      }
      alert(msg);
      
      if (res.successCount > 0) {
        clearFiles();
        await loadData();
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!canViewGallery) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-clay-secondary font-bold">You do not have permission to view the gallery.</p>
      </div>
    );
  }

  if (loading) {
    return <GalleryPageSkeleton canManageGoogleConnection={canManageGoogleConnection} canUploadPhotos={canUploadPhotos} />;
  }

  async function handleRemoveMediaItem(mediaItemId: string) {
    await removeTripGalleryMediaItem(data.trip.id, mediaItemId);
    setMediaItems(prev => prev.filter(item => item.id !== mediaItemId));
    // The prompt says "show toast: Photo removed from trip gallery." We don't have a toast system, so we'll use alert or a custom toast. But alert is fine, or just nothing.
    // wait, we can just use alert or rely on the UI update.
    // Let's use alert to be safe:
    alert("Photo removed from trip gallery.");
  }

  const isConnected = connection?.connected;
  const hasAlbum = album?.googleAlbumId;
  const hasPhotos = mediaItems.length > 0;

  return (
    <div className="space-y-6 pb-24">
      <GalleryHeader 
        title="Trip Gallery" 
        subtitle={`Memories from ${data.trip.destination}`}
        icon={Images}
        colorClass="bg-gradient-to-br from-indigo-400 to-purple-500"
      />

      {/* UX State 1: Setup Not Complete */}
      {canManageGoogleConnection && (!isConnected || !hasAlbum) && (
        <GallerySetupPanel 
          connection={connection}
          album={album}
          actionLoading={actionLoading}
          handleConnect={handleConnect}
          handleCreateAlbum={handleCreateAlbum}
        />
      )}

      {/* UX State 2 & 3: Ready for Media */}
      {(!canUploadPhotos && !canManageGoogleConnection) ? (
        hasPhotos ? (
          <GalleryGrid 
            tripId={data.trip.id}
            tripTitle={data.trip.title}
            mediaItems={mediaItems}
            handleManualRefresh={handleManualRefresh}
            actionLoading={actionLoading}
            canUploadPhotos={canUploadPhotos}
            isOwner={isOwner}
            onRemoveMediaItem={handleRemoveMediaItem}
            onImageClick={(index: number) => setLightboxIndex(index)}
          />
        ) : (
          <GalleryEmptyState canUploadPhotos={canUploadPhotos} />
        )
      ) : (
        isConnected && hasAlbum && (
          <>
            {canUploadPhotos && (
              <div className="mb-8">
                <GalleryUploadPanel 
                  selectedFiles={selectedFiles}
                  caption={caption}
                  uploading={uploading}
                  handleFileSelect={handleFileSelect}
                  removeFile={removeFile}
                  clearFiles={clearFiles}
                  setCaption={setCaption}
                  handleUpload={handleUpload}
                  fileInputRef={fileInputRef}
                />
              </div>
            )}

            {hasPhotos ? (
              <GalleryGrid 
                tripId={data.trip.id}
                tripTitle={data.trip.title}
                mediaItems={mediaItems}
                handleManualRefresh={handleManualRefresh}
                actionLoading={actionLoading}
                canUploadPhotos={canUploadPhotos}
                isOwner={isOwner}
                onRemoveMediaItem={handleRemoveMediaItem}
                onImageClick={(index: number) => setLightboxIndex(index)}
              />
            ) : (
              <GalleryEmptyState canUploadPhotos={canUploadPhotos} />
            )}
          </>
        )
      )}

      {/* Advanced Settings */}
      {canSeeAdvancedSettings && (
        <GallerySettingsPanel 
          tripId={data.trip.id}
          connection={connection}
          album={album}
          mediaItemsCount={mediaItems.length}
          actionLoading={actionLoading}
          handleDisconnect={handleDisconnect}
          albumUrl={album?.albumUrl || data.trip.googlePhotosAlbumUrl}
        />
      )}

      {/* Lightbox */}
      <GalleryLightbox
        tripId={data.trip.id}
        isOpen={lightboxIndex !== null}
        initialIndex={lightboxIndex ?? 0}
        mediaItems={mediaItems}
        onClose={() => setLightboxIndex(null)}
        isOwner={isOwner}
        onRemoveMediaItem={handleRemoveMediaItem}
      />
    </div>
  );
}
