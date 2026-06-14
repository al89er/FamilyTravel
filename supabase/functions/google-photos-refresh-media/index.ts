import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders, json, requireTripMember, refreshGoogleTokenIfNeeded, getTripOwnerId } from "../shared/index.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tripId, mediaItemIds } = await req.json();

    if (!tripId) {
      return json({ error: "tripId is required" }, 400);
    }

    const { actor, adminClient } = await requireTripMember(req, tripId);
    
    const ownerUserId = await getTripOwnerId(adminClient, tripId);

    const { data: connection, error: connError } = await adminClient
      .from("google_photos_connections")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("status", "connected")
      .maybeSingle();

    if (connError || !connection) {
      return json({ error: "No connected Google Photos account found" }, 400);
    }

    const requiredScope = "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata";
    if (!connection.scopes || !connection.scopes.includes(requiredScope)) {
      return json({ error: "Google Photos read permission is missing. Please reconnect Google Photos." }, 403);
    }

    const accessToken = await refreshGoogleTokenIfNeeded(adminClient, connection);

    // Fetch the media items that need refreshing
    let query = adminClient
      .from("trip_gallery_media_items")
      .select("*")
      .eq("trip_id", tripId)
      .eq("provider", "google_photos")
      .eq("is_removed", false)
      .not("google_media_item_id", "is", null);

    if (mediaItemIds && Array.isArray(mediaItemIds) && mediaItemIds.length > 0) {
      query = query.in("id", mediaItemIds);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return json({ 
        message: "No Google media item IDs found to refresh.",
        requestedCount: 0,
        googleResultCount: 0,
        refreshedCount: 0,
        failedCount: 0,
        missingBaseUrlCount: 0,
        missingGoogleMediaIdCount: mediaItemIds ? mediaItemIds.length : 0,
        errors: []
      });
    }

    const chunkSize = 50;
    let requestedCount = items.length;
    let googleResultCount = 0;
    let refreshedCount = 0;
    let missingBaseUrlCount = 0;
    let failedCount = 0;
    let processingDelayCount = 0;
    let missingGoogleMediaIdCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      const params = new URLSearchParams();
      chunk.forEach(item => {
        params.append('mediaItemIds', item.google_media_item_id);
      });

      const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems:batchGet?${params.toString()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        errors.push({
          index: -1,
          code: response.status,
          message: `Failed batchGet HTTP ${response.status}`,
          hasMediaItem: false,
          hasBaseUrl: false
        });
        continue;
      }

      const resData = await response.json();
      const results = resData.mediaItemResults || [];
      googleResultCount += results.length;
      
      const updates = [];

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        
        console.log(`Item ${i + j}: hasMediaItem=${!!result.mediaItem}, hasBaseUrl=${!!result.mediaItem?.baseUrl}, statusCode=${result.status?.code}, statusMessage=${result.status?.message}`);

        if (result.status?.code) {
          if (result.status.code === 3) {
            processingDelayCount++;
          } else {
            failedCount++;
          }
          errors.push({
            index: i + j,
            code: result.status.code,
            message: result.status.message || "Unknown error",
            hasMediaItem: !!result.mediaItem,
            hasBaseUrl: !!result.mediaItem?.baseUrl
          });
        }

        if (!result.mediaItem) {
          if (!result.status?.code) {
             failedCount++;
          }
          continue;
        }

        const gItem = result.mediaItem;
        const dbItem = chunk.find(ci => ci.google_media_item_id === gItem.id);
        if (!dbItem) continue;

        const updateData: any = {};

        if (gItem.baseUrl) {
          updateData.cached_base_url = gItem.baseUrl;
          updateData.cached_base_url_expires_at = new Date(Date.now() + 55 * 60 * 1000).toISOString();
        } else {
          missingBaseUrlCount++;
        }

        if (gItem.productUrl) updateData.google_product_url = gItem.productUrl;
        if (gItem.filename) updateData.filename = gItem.filename;
        if (gItem.mimeType) updateData.mime_type = gItem.mimeType;
        if (gItem.mediaMetadata?.creationTime && !dbItem.taken_at) {
          updateData.taken_at = gItem.mediaMetadata.creationTime;
        }

        if (Object.keys(updateData).length > 0) {
          updates.push(adminClient
            .from("trip_gallery_media_items")
            .update(updateData)
            .eq("id", dbItem.id)
          );
          if (gItem.baseUrl) {
            refreshedCount++;
          }
        }
      }

      await Promise.all(updates);
    }

    return json({ 
      message: processingDelayCount > 0 
        ? `Refresh complete. ${processingDelayCount} item(s) are still processing by Google.`
        : "Refresh complete",
      requestedCount,
      googleResultCount,
      refreshedCount,
      failedCount,
      processingDelayCount,
      missingBaseUrlCount,
      missingGoogleMediaIdCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 400);
  }
});
