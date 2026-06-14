import { useCallback, useRef, useState } from "react";
import { listTripGalleryMediaItems, refreshGooglePhotosMedia } from "../lib/supabase";
import { TripGalleryMediaItem } from "../types";

export function useGalleryMediaRefresh(
  tripId: string, 
  onItemsRefreshed?: (items: TripGalleryMediaItem[]) => void
) {
  const [refreshing, setRefreshing] = useState(false);
  
  const pendingRefreshIds = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAndRefreshStaleItems = useCallback(async (mediaItems: TripGalleryMediaItem[]) => {
    if (!mediaItems || mediaItems.length === 0) return false;
    
    const now = Date.now();
    const needsRefresh = mediaItems.some(m => {
      if (!m.cachedBaseUrl) return true;
      if (!m.cachedBaseUrlExpiresAt) return true;
      const expires = new Date(m.cachedBaseUrlExpiresAt).getTime();
      return expires < now + 5 * 60 * 1000;
    });

    if (needsRefresh) {
      triggerRefresh();
      return true;
    }
    return false;
  }, [tripId]);

  const triggerRefresh = useCallback((mediaItemIds?: string[]) => {
    if (mediaItemIds) {
      mediaItemIds.forEach(id => pendingRefreshIds.current.add(id));
    }
    
    const isFullRefresh = !mediaItemIds;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<{ success: boolean; message?: string; refreshedCount: number; processingDelayCount: number }>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        const idsToRefresh = isFullRefresh ? undefined : Array.from(pendingRefreshIds.current);
        pendingRefreshIds.current.clear();
        timeoutRef.current = null;

        setRefreshing(true);
        try {
          const res = await refreshGooglePhotosMedia(tripId, idsToRefresh);
          
          if (res && res.refreshedCount > 0) {
            const updatedItems = await listTripGalleryMediaItems(tripId);
            if (onItemsRefreshed) {
              onItemsRefreshed(updatedItems);
            }
          }
          resolve({ success: true, message: res.message, refreshedCount: res?.refreshedCount || 0, processingDelayCount: res?.processingDelayCount || 0 });
        } catch (error: any) {
          console.error("Failed to refresh media:", error);
          resolve({ success: false, message: error.message, refreshedCount: 0, processingDelayCount: 0 });
        } finally {
          setRefreshing(false);
        }
      }, 500); 
    });
  }, [tripId, onItemsRefreshed]);

  return {
    refreshing,
    triggerRefresh,
    checkAndRefreshStaleItems
  };
}
