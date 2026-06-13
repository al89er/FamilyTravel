const CACHE_NAME = 'family-travel-gallery-thumb-v1';
const CACHE_PREFIX = 'https://localcache.familytravel.app/gallery-thumb/v1';

/**
 * Generates a valid URL cache key for the Cache API
 */
function getCacheKey(tripId: string, mediaItemId: string, size: string): string {
  return `${CACHE_PREFIX}/${tripId}/${mediaItemId}/${size}`;
}

/**
 * Retrieves a cached thumbnail from the browser Cache API.
 * Returns an object URL for the blob if found, or null if not found.
 */
export async function getCachedThumbnailUrl(tripId: string, mediaItemId: string, size: string = 'w400-h400-c'): Promise<string | null> {
  if (!('caches' in window)) return null;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = getCacheKey(tripId, mediaItemId, size);
    const res = await cache.match(key);
    if (res) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.error("Cache API error (get)", e);
  }
  return null;
}

/**
 * Fetches a thumbnail from the given URL and caches it in the browser Cache API.
 * Returns an object URL for the fetched blob, or null if the fetch failed.
 */
export async function fetchAndCacheThumbnail(tripId: string, mediaItemId: string, url: string, size: string = 'w400-h400-c'): Promise<string | null> {
  if (!('caches' in window)) {
    // Fallback if no Cache API
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("Fetch fallback error", e);
    }
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const key = getCacheKey(tripId, mediaItemId, size);
    
    // Check if already cached concurrently
    let res = await cache.match(key);
    if (!res) {
      res = await fetch(url);
      if (res.ok) {
        // Clone to cache it
        await cache.put(key, res.clone());
      } else {
        return null;
      }
    }
    
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Fetch and Cache API error", e);
    return null; // Don't return raw URL to avoid leaking or re-fetching repeatedly on fail
  }
}

/**
 * Deletes a specific thumbnail from the cache.
 */
export async function deleteCachedThumbnail(tripId: string, mediaItemId: string, size: string = 'w400-h400-c'): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = getCacheKey(tripId, mediaItemId, size);
    await cache.delete(new Request(key));
  } catch (e) {
    console.error("Cache API error (delete)", e);
  }
}

/**
 * Clears all cached thumbnails for a specific trip, or the entire cache if no tripId is provided.
 */
export async function clearGalleryThumbnailCache(tripId?: string): Promise<void> {
  if (!('caches' in window)) return;
  try {
    if (!tripId) {
      await caches.delete(CACHE_NAME);
      return;
    }
    
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    for (const req of keys) {
      if (req.url.includes(`${CACHE_PREFIX}/${tripId}/`)) {
        await cache.delete(req);
      }
    }
  } catch (e) {
    console.error("Cache API error (clear)", e);
  }
}
