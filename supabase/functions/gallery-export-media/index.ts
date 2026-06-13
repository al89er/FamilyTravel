import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing server configuration");
    }

    const { trip_id, media_item_row_id, export_size = "download" } = await req.json();
    
    if (!media_item_row_id || !trip_id) {
      console.error(`Export failed: Missing required parameters. trip_id: ${trip_id}, media_item_row_id: ${media_item_row_id}`);
      return new Response(JSON.stringify({ error: "media_item_row_id and trip_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify trip membership
    const { data: memberData, error: memberError } = await adminClient
      .from("trip_members")
      .select("id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "Forbidden: Not a trip member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the media item
    const { data: mediaItem, error: mediaError } = await adminClient
      .from("trip_gallery_media_items")
      .select("id, google_media_item_id, cached_base_url, cached_base_url_expires_at, is_removed, filename")
      .eq("id", media_item_row_id)
      .eq("trip_id", trip_id)
      .single();

    console.log(`Export prep for ${media_item_row_id}: found=${!!mediaItem}, is_removed=${mediaItem?.is_removed}`);

    if (mediaError || !mediaItem) {
      return new Response(JSON.stringify({ error: "Media item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mediaItem.is_removed) {
      return new Response(JSON.stringify({ error: "Media item is no longer available" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if URL is expired
    let baseUrl = mediaItem.cached_base_url;
    const now = Date.now();
    const expiresAt = new Date(mediaItem.cached_base_url_expires_at).getTime();
    const isExpired = !baseUrl || expiresAt < now;

    console.log(`Export prep for ${media_item_row_id}: baseUrl_exists=${!!baseUrl}, is_expired=${isExpired}`);

    if (isExpired) {
      console.log(`Export prep for ${media_item_row_id}: Attempting Google URL refresh`);
      // Need to refresh URL. Find the Owner's connection.
      const { data: members, error: roleError } = await adminClient
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", trip_id)
        .eq("role", "Owner");

      if (roleError || !members || members.length === 0) {
        return new Response(JSON.stringify({ error: "Owner not found for trip" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ownerId = members[0].user_id;

      // Get owner's token
      const { data: connData, error: connError } = await adminClient
        .from("google_photos_connections")
        .select("access_token")
        .eq("user_id", ownerId)
        .single();

      if (connError || !connData || !connData.access_token) {
        return new Response(JSON.stringify({ error: "Owner Google Photos connection not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch new media item from Google API
      const googleApiRes = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItem.google_media_item_id}`, {
        headers: {
          "Authorization": `Bearer ${connData.access_token}`
        }
      });

      if (!googleApiRes.ok) {
        console.error("Failed to fetch fresh media item from Google API:", await googleApiRes.text());
        return new Response(JSON.stringify({ error: "Failed to refresh media item from Google API" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const freshGoogleItem = await googleApiRes.json();
      baseUrl = freshGoogleItem.baseUrl;
      const newExpiresAt = new Date(now + 50 * 60 * 1000).toISOString();

      // Update DB with new URL
      await adminClient
        .from("trip_gallery_media_items")
        .update({
          cached_base_url: baseUrl,
          cached_base_url_expires_at: newExpiresAt
        })
        .eq("id", media_item_row_id);
      
      console.log(`Export prep for ${media_item_row_id}: Refresh successful`);
    }

    // Determine download parameter
    const sizeParam = export_size === "large" ? "=w2048-h2048" : "=d";
    const downloadUrl = `${baseUrl}${sizeParam}`;
    
    console.log(`Fetching image bytes from Google for ${media_item_row_id} with param ${sizeParam}`);
    
    const imageRes = await fetch(downloadUrl);
    
    if (!imageRes.ok) {
        console.error("Failed to fetch image bytes from Google:", imageRes.status, await imageRes.text());
        return new Response(JSON.stringify({ error: "Failed to download image from Google" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Extract content length and type safely
    const contentLength = imageRes.headers.get("Content-Length");
    let contentType = imageRes.headers.get("Content-Type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      contentType = "image/jpeg";
    }

    console.log(`Google fetch successful for ${media_item_row_id}: status=${imageRes.status}, type=${contentType}, length=${contentLength}`);

    // Use a friendly filename
    const filename = mediaItem.filename || "family-travel-photo.jpg";

    // Create safe proxy response
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "private, max-age=60"); // Short private cache
    
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    // Stream the body directly back to the client natively
    return new Response(imageRes.body, {
        status: 200,
        headers: headers
    });

  } catch (err: any) {
    console.error("Unexpected error in gallery-export-media:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
