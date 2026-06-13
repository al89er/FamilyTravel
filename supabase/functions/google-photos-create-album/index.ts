import { corsHeaders, json, requireOwner, refreshGoogleTokenIfNeeded } from "../shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    if (!body.tripId) return json({ error: "tripId is required." }, 400);

    const { actor, adminClient } = await requireOwner(req, body.tripId);

    // Get connection
    const { data: connection, error: connError } = await adminClient
      .from("google_photos_connections")
      .select("*")
      .eq("owner_user_id", actor.id)
      .eq("provider", "google_photos")
      .maybeSingle();

    if (connError) throw connError;
    if (!connection || connection.status !== "connected") {
      return json({ error: "Google Photos is not connected." }, 400);
    }

    // Refresh token if needed
    const accessToken = await refreshGoogleTokenIfNeeded(adminClient, connection);

    // Get trip details for album title
    const { data: trip, error: tripError } = await adminClient
      .from("trips")
      .select("title")
      .eq("id", body.tripId)
      .single();

    if (tripError) throw tripError;

    const albumTitle = body.title || `FamilyTravel - ${trip.title}`;

    // Create album via Google API
    const response = await fetch("https://photoslibrary.googleapis.com/v1/albums", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        album: { title: albumTitle }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Failed to create Google Photos album", errData);
      throw new Error("Failed to create Google Photos album.");
    }

    const albumData = await response.json();
    const googleAlbumId = albumData.id;
    const albumUrl = albumData.productUrl;

    // Save metadata
    const { data: savedAlbum, error: saveError } = await adminClient
      .from("trip_gallery_albums")
      .upsert({
        trip_id: body.tripId,
        provider: "google_photos",
        google_album_id: googleAlbumId,
        // Optional: keep manual album_url if it already exists by not overwriting unless it's new
        title: albumTitle,
        status: "api_ready",
        visibility: "owner_only",
        created_by_profile_id: actor.id
      }, { onConflict: "trip_id, provider" })
      .select()
      .single();

    if (saveError) throw saveError;

    // Also try to update the album_url if one wasn't manually set
    if (!savedAlbum.album_url) {
      await adminClient
        .from("trip_gallery_albums")
        .update({ album_url: albumUrl })
        .eq("id", savedAlbum.id);
    }

    return json({ success: true, googleAlbumId, albumUrl });
  } catch (error) {
    console.error("Create album error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 400);
  }
});
