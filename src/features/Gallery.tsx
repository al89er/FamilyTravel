import { Images, ExternalLink, Settings as SettingsIcon, Cloud, UploadCloud, X, FileImage, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { AppData, TripGalleryAlbum, TripGalleryMediaItem, GooglePhotosConnectionStatus } from "../types";
import { AppView } from "../hooks/useAppState";
import { Card, Button, EmptyState, LoadingState } from "../components/ui";
import { 
  getTripGalleryAlbum, 
  listTripGalleryMediaItems,
  getGooglePhotosConnectionStatus,
  startGooglePhotosOAuth,
  disconnectGooglePhotos,
  createGooglePhotosAlbum,
  uploadGooglePhotosMedia,
  refreshGooglePhotosMedia
} from "../lib/supabase";

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

function GalleryGrid({ mediaItems, handleManualRefresh, actionLoading, canUploadPhotos }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 lg:px-0">
        <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary/70">
          {mediaItems.length} Photo{mediaItems.length !== 1 && "s"}
        </p>
        <Button variant="secondary" onClick={handleManualRefresh} disabled={actionLoading} className="text-[11px] py-1.5 px-3">
          <RefreshCw className={`h-3 w-3 mr-1.5 ${actionLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4 lg:px-0">
        {mediaItems.map((item: any) => {
          const now = Date.now();
          let hasValidThumbnail = false;
          if (item.cachedBaseUrl && item.cachedBaseUrlExpiresAt) {
            const expires = new Date(item.cachedBaseUrlExpiresAt).getTime();
            if (expires > now) {
              hasValidThumbnail = true;
            }
          }

          return (
            <div key={item.id} className="group relative bg-clay-recessed rounded-[20px] shadow-clay-pressed overflow-hidden aspect-square flex flex-col">
              {hasValidThumbnail ? (
                <img 
                  src={`${item.cachedBaseUrl}=w400-h400-c`} 
                  alt={item.caption || item.filename || "Trip photo"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-clay-surface/50">
                  <ImageIcon className="h-8 w-8 text-clay-secondary/40" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
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
    </div>
  );
}

function GallerySettingsPanel({ connection, album, mediaItemsCount, actionLoading, handleDisconnect, albumUrl }: any) {
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
      const [albumData, mediaData, connData] = await Promise.all([
        getTripGalleryAlbum(data.trip.id),
        listTripGalleryMediaItems(data.trip.id),
        getGooglePhotosConnectionStatus(data.trip.id).catch(() => null)
      ]);
      
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
    return <LoadingState />;
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
      {isConnected && hasAlbum && (
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
              mediaItems={mediaItems}
              handleManualRefresh={handleManualRefresh}
              actionLoading={actionLoading}
              canUploadPhotos={canUploadPhotos}
            />
          ) : (
            <GalleryEmptyState canUploadPhotos={canUploadPhotos} />
          )}
        </>
      )}

      {/* UX State 4: Advanced Settings */}
      {canSeeAdvancedSettings && isConnected && (
        <GallerySettingsPanel 
          connection={connection}
          album={album}
          mediaItemsCount={mediaItems.length}
          actionLoading={actionLoading}
          handleDisconnect={handleDisconnect}
          albumUrl={album?.albumUrl || data.trip.googlePhotosAlbumUrl}
        />
      )}
    </div>
  );
}
