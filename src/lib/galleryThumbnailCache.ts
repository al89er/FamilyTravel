import { supabase } from './supabase';

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
    return url; // fallback to raw url
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const key = getCacheKey(tripId, mediaItemId, size);
    
    // Check if already cached concurrently
    let res = await cache.match(key);
    if (!res) {
      if (!supabase) return url;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-cors-proxy`;
      
      res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (res.ok) {
        // Clone to cache it
        await cache.put(key, res.clone());
      } else {
        return url;
      }
    }
    
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Fetch and Cache API error", e);
    return url; // fallback to raw URL so image still displays even if cache fails
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
