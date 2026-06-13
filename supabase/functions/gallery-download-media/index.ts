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

    const { mediaItemId, tripId } = await req.json();
    if (!mediaItemId || !tripId) {
      return new Response(JSON.stringify({ error: "mediaItemId and tripId are required" }), {
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
    const { data: isMember, error: memberError } = await adminClient.rpc("is_trip_member", {
      t_id: tripId,
      u_id: user.id
    });

    if (memberError || !isMember) {
      return new Response(JSON.stringify({ error: "Forbidden: Not a trip member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the media item
    const { data: mediaItem, error: mediaError } = await adminClient
      .from("trip_gallery_media_items")
      .select("id, google_media_item_id, cached_base_url, cached_base_url_expires_at, is_removed, filename")
      .eq("id", mediaItemId)
      .eq("trip_id", tripId)
      .single();

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

    if (!baseUrl || expiresAt < now) {
      // Need to refresh URL. Find the Owner's connection.
      const { data: members, error: roleError } = await adminClient
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", tripId)
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
        console.error("Failed to fetch fresh media item from Google:", await googleApiRes.text());
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
        .eq("id", mediaItemId);
    }

    // Proxy the image stream
    // Append '=d' to force original quality and direct download mode from Google API
    const downloadUrl = `${baseUrl}=d`;
    
    console.log(`Proxying download stream for item ${mediaItemId}`);
    
    const imageRes = await fetch(downloadUrl);
    
    if (!imageRes.ok) {
        console.error("Failed to proxy image:", await imageRes.text());
        return new Response(JSON.stringify({ error: "Failed to download image" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Use a friendly filename
    const filename = mediaItem.filename || "family-travel-photo.jpg";

    // Create safe proxy response
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", imageRes.headers.get("Content-Type") || "application/octet-stream");
    // Ensure the browser prompts a download rather than showing the raw image
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream the body directly back to the client
    return new Response(imageRes.body, {
        status: 200,
        headers: headers
    });

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
