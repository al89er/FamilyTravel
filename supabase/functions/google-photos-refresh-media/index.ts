import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders, json, requireOwner, refreshGoogleTokenIfNeeded } from "../shared/index.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tripId, mediaItemIds } = await req.json();

    if (!tripId) {
      return json({ error: "tripId is required" }, 400);
    }

    const { actor, adminClient } = await requireOwner(req, tripId);

    // Get the Google Photos connection for the owner
    const { data: connection, error: connError } = await adminClient
      .from("google_photos_connections")
      .select("*")
      .eq("owner_user_id", actor.id)
      .eq("status", "connected")
      .maybeSingle();

    if (connError || !connection) {
      return json({ error: "No connected Google Photos account found" }, 400);
    }

    const accessToken = await refreshGoogleTokenIfNeeded(adminClient, connection);

    // Fetch the media items that need refreshing
    let query = adminClient
      .from("trip_gallery_media_items")
      .select("*")
      .eq("trip_id", tripId)
      .eq("provider", "google_photos")
      .not("google_media_item_id", "is", null);

    if (mediaItemIds && Array.isArray(mediaItemIds) && mediaItemIds.length > 0) {
      query = query.in("id", mediaItemIds);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return json({ message: "No media items to refresh", successCount: 0, failedCount: 0 });
    }

    // Chunk into 50s
    const chunkSize = 50;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      const params = new URLSearchParams();
      chunk.forEach(item => {
        params.append('mediaItemIds', item.google_media_item_id);
      });

      const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems:batchGet?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        errors.push(`Failed batchGet: ${response.status}`);
        continue;
      }

      const resData = await response.json();
      // resData.mediaItemResults[] contains { mediaItem: { id, baseUrl, ... }, status: { code, message } }
      
      const updates = [];

      for (const result of (resData.mediaItemResults || [])) {
        if (!result.mediaItem) continue;

        const gItem = result.mediaItem;
        const dbItem = chunk.find(ci => ci.google_media_item_id === gItem.id);
        if (!dbItem) continue;

        const updateData: any = {
          cached_base_url: gItem.baseUrl,
          cached_base_url_expires_at: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
        };

        if (gItem.productUrl) updateData.google_product_url = gItem.productUrl;
        if (gItem.filename) updateData.filename = gItem.filename;
        if (gItem.mimeType) updateData.mime_type = gItem.mimeType;
        if (gItem.mediaMetadata?.creationTime && !dbItem.taken_at) {
          updateData.taken_at = gItem.mediaMetadata.creationTime;
        }

        updates.push(adminClient
          .from("trip_gallery_media_items")
          .update(updateData)
          .eq("id", dbItem.id)
        );
      }

      await Promise.all(updates);
      successCount += updates.length;
    }

    return json({ 
      message: "Refresh complete",
      successCount,
      failedCount: items.length - successCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 400);
  }
});
