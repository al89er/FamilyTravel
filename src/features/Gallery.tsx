import { Images, ExternalLink, Settings as SettingsIcon, Server, Database, Cloud, UploadCloud, X, FileImage } from "lucide-react";
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
  uploadGooglePhotosMedia
} from "../lib/supabase";

export function Gallery({ data, openView }: { data: AppData; openView: (view: AppView) => void }) {
  const url = data.trip.googlePhotosAlbumUrl;
  const [album, setAlbum] = useState<TripGalleryAlbum | null>(null);
  const [mediaItems, setMediaItems] = useState<TripGalleryMediaItem[]>([]);
  const [connection, setConnection] = useState<GooglePhotosConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = data.members.find(m => m.userId === data.currentUser.id)?.role === "owner";

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
      setAlbum(albumData);
      setMediaItems(mediaData);
      setConnection(connData);
    } catch (e) {
      console.error("Failed to load gallery metadata", e);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [data.trip.id]);

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
    
    // Validate count
    if (selectedFiles.length + files.length > 10) {
      alert("You can select a maximum of 10 files at a time.");
      return;
    }

    // Validate size
    const validFiles = files.filter(f => {
      if (f.size > 25 * 1024 * 1024) {
        alert(`File ${f.name} is too large. Please upload images under 25 MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        setSelectedFiles([]);
        setCaption("");
        await loadData();
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-indigo-400 to-purple-500 shadow-clay-card text-white shrink-0">
          <Images className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-clay-primary">Trip Gallery</h2>
          <p className="text-sm font-bold text-clay-secondary">Family photos for this getaway</p>
        </div>
      </div>

      {!url ? (
        <Card className="p-6 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
          <EmptyState 
            title="No trip album linked yet" 
            body="Add your Google Photos shared album link in Settings." 
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={() => openView("settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Settings
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-clay-recessed shadow-clay-pressed rounded-[24px] flex items-center justify-center mb-6">
            <Images className="h-10 w-10 text-indigo-500" />
          </div>
          
          <h3 className="text-xl font-black text-clay-primary mb-2">Trip Gallery</h3>
          <p className="text-sm font-bold text-clay-secondary mb-1">
            Family photos for {data.trip.destination}
          </p>
          <p className="text-xs font-medium text-clay-secondary/80 mb-8 max-w-xs mx-auto">
            Photos are stored in Google Photos, not Supabase.
          </p>
          
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-indigo-400 to-purple-500 px-8 text-sm font-black text-white shadow-clay-btn transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95"
          >
            Open Google Photos album
            <ExternalLink className="h-4 w-4" />
          </a>

          <div className="mt-8 pt-6 border-t border-border/50 w-full max-w-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-clay-secondary/70">
              Owner-only preview. Family access will open after upload/security phases are complete.
            </p>
          </div>
        </Card>
      )}

      {/* Google Photos Connection Section */}
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0 mt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-400 to-blue-500 shadow-clay-card text-white shrink-0">
          <Cloud className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-clay-primary">Google Photos Connection</h2>
          <p className="text-sm font-bold text-clay-secondary">App integration</p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
          {!connection?.connected ? (
            <div className="text-center">
              <p className="text-base font-bold text-clay-primary mb-2">Google Photos not connected</p>
              <p className="text-sm text-clay-secondary mb-6">Connect your account to allow the app to manage photos for this trip.</p>
              <Button onClick={handleConnect} disabled={actionLoading}>
                {actionLoading ? "Connecting..." : "Connect Google Photos"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <span className="text-sm text-clay-secondary">Status</span>
                <span className="text-sm font-bold text-green-600">Connected</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <span className="text-sm text-clay-secondary">Account</span>
                <span className="text-sm font-semibold text-clay-primary">{connection.googleAccountEmail || "Unknown"}</span>
              </div>

              {!album?.googleAlbumId ? (
                <div className="pt-4 flex flex-col items-center">
                  <p className="text-sm font-bold text-clay-secondary mb-4 text-center">Connection ready. Create an app album to start syncing photos.</p>
                  <Button onClick={handleCreateAlbum} disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create app album"}
                  </Button>
                </div>
              ) : (
                <div className="pt-4 flex flex-col items-center">
                  <p className="text-base font-bold text-clay-primary mb-1">App album ready</p>
                  <p className="text-sm text-clay-secondary mb-4">{album.title}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary/70">Ready for future in-app uploads</p>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-border/40 flex justify-center">
                <Button variant="danger" onClick={handleDisconnect} disabled={actionLoading}>
                  {actionLoading ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Upload Section */}
      {isOwner && (
        <>
          <div className="flex items-center gap-3 mb-6 px-4 lg:px-0 mt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-green-400 to-emerald-500 shadow-clay-card text-white shrink-0">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-clay-primary">Upload to Google Photos</h2>
              <p className="text-sm font-bold text-clay-secondary">Upload selected images into your app-created trip album.</p>
            </div>
          </div>

          <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
            {!connection?.connected ? (
              <div className="text-center py-4 text-clay-secondary font-bold">
                Connect Google Photos first.
              </div>
            ) : !album || !album.googleAlbumId ? (
              <div className="text-center py-4 text-clay-secondary font-bold">
                Create an app album before uploading.
              </div>
            ) : !["api_ready", "active"].includes(album.status) ? (
              <div className="text-center py-4 text-clay-secondary font-bold">
                Album is not ready yet.
              </div>
            ) : (
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
                      <button onClick={() => setSelectedFiles([])} className="text-xs text-clay-secondary hover:text-red-500 font-bold uppercase tracking-wider" disabled={uploading}>Clear All</button>
                    </div>
                    <ul className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {selectedFiles.map((f, i) => (
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
                        {uploading ? "Uploading to Google Photos..." : "Upload Photos"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Gallery Metadata Section */}
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0 mt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-gray-400 to-gray-500 shadow-clay-card text-white shrink-0">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-clay-primary">Gallery Metadata</h2>
          <p className="text-sm font-bold text-clay-secondary">Items synced to the app</p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <span className="text-sm text-clay-secondary">Album metadata status</span>
              <span className="text-sm font-semibold text-clay-primary">
                {album?.status === "external_link" ? "External link only" : album?.status || "Not configured"}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <span className="text-sm text-clay-secondary">Stored media items</span>
              <span className="text-sm font-bold text-clay-primary">
                {mediaItems.length}
              </span>
            </div>
          </div>
          
          {mediaItems.length === 0 ? (
            <div className="bg-clay-recessed rounded-[24px] p-6 text-center shadow-clay-pressed mt-4">
              <div className="flex justify-center mb-3">
                <Server className="h-8 w-8 text-clay-secondary opacity-50" />
              </div>
              <p className="text-base font-bold text-clay-primary mb-1">No app-synced photos yet</p>
              <p className="text-sm text-clay-secondary font-medium">Future uploads will appear here after Google Photos connection is added.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {mediaItems.map(item => (
                <div key={item.id} className="aspect-square bg-clay-recessed rounded-[16px] shadow-clay-pressed flex flex-col items-center justify-center p-4 relative group overflow-hidden">
                  <FileImage className="h-8 w-8 text-clay-secondary/50 mb-2" />
                  <span className="text-xs text-clay-secondary break-all text-center px-2 w-full truncate">
                    {item.filename || "Media Item"}
                  </span>
                  {item.googleProductUrl && (
                    <div className="absolute inset-0 bg-clay-surface/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={item.googleProductUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-500 rounded-full text-white shadow-clay-btn hover:scale-110 transition-transform">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <div className="mt-8 pt-6 border-t border-border/50 text-[10px] text-clay-secondary/50 font-mono flex gap-3 flex-wrap">
              <span>connected: {connection?.connected ? "yes" : "no"}</span>
              <span>appAlbum: {album ? "yes" : "no"}</span>
              <span>status: {album?.status || "none"}</span>
              <span>googleAlbumId: {album?.googleAlbumId ? "yes" : "no"}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
