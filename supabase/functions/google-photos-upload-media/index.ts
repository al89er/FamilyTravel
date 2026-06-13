import { corsHeaders, json, requireOwner, refreshGoogleTokenIfNeeded } from "../shared/index.ts";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return json({ error: "Invalid form data." }, 400);
    }

    const tripId = formData.get("tripId")?.toString();
    if (!tripId) {
      return json({ error: "tripId is required." }, 400);
    }

    const caption = formData.get("caption")?.toString() || "";

    const { actor, adminClient } = await requireOwner(req, tripId);

    // 1. Verify Google Connection
    const { data: connection, error: connError } = await adminClient
      .from("google_photos_connections")
      .select("*")
      .eq("owner_user_id", actor.id)
      .eq("provider", "google_photos")
      .maybeSingle();

    if (connError) throw connError;
    if (!connection || connection.status !== "connected") {
      return json({ error: "Google Photos upload permission is missing. Please reconnect Google Photos." }, 400);
    }
    
    // Check scopes
    if (!connection.scopes.includes("https://www.googleapis.com/auth/photoslibrary.appendonly")) {
      return json({ error: "Google Photos upload permission is missing. Please reconnect Google Photos." }, 400);
    }

    const accessToken = await refreshGoogleTokenIfNeeded(adminClient, connection);

    // 2. Fetch app-created album ID
    const { data: album, error: albumError } = await adminClient
      .from("trip_gallery_albums")
      .select("*")
      .eq("trip_id", tripId)
      .eq("provider", "google_photos")
      .maybeSingle();
      
    if (albumError) throw albumError;
    if (!album || !album.google_album_id || !["api_ready", "active"].includes(album.status)) {
      return json({ error: "Create an app album first." }, 400);
    }

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files[]" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return json({ error: "No files uploaded." }, 400);
    }
    if (files.length > 10) {
      return json({ error: "You can upload a maximum of 10 files at a time." }, 400);
    }

    const uploadTokens: { token: string; file: File }[] = [];
    const errors: any[] = [];
    const uploadTokenMap = new Map<string, File>();

    // 3. Upload raw bytes to get upload tokens
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`File ${file.name} has unsupported type ${file.type}.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.name} is too large. Please upload images under 25 MB.`);
        continue;
      }

      try {
        const uploadResponse = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "X-Goog-Upload-Content-Type": file.type,
            "X-Goog-Upload-Protocol": "raw"
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error(`Google upload failed: ${uploadResponse.statusText}`);
        }

        const token = await uploadResponse.text();
        uploadTokens.push({ token, file });
        uploadTokenMap.set(token, file);
      } catch (e) {
        console.error("File upload error:", e);
        errors.push({
          fileName: file.name,
          message: `Failed to upload ${file.name}.`
        });
      }
    }

    if (uploadTokens.length === 0) {
      return json({ 
        uploadTokenCount: 0,
        batchCreateResultCount: 0,
        successCount: 0, 
        failedCount: errors.length, 
        savedMetadataCount: 0,
        uploadedItems: [], 
        errors 
      }, 400);
    }

    // 4. Batch create media items
    const newMediaItems = uploadTokens.map(({ token, file }) => ({
      description: caption.slice(0, 1000), // Max 1000 chars
      simpleMediaItem: {
        fileName: file.name,
        uploadToken: token
      }
    }));

    const batchCreateResponse = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        albumId: album.google_album_id,
        newMediaItems
      })
    });

    if (!batchCreateResponse.ok) {
      const err = await batchCreateResponse.json().catch(() => ({}));
      console.error("Batch create failed:", err);
      return json({ error: "Failed to save photos to Google album." }, 500);
    }

    const batchData = await batchCreateResponse.json();
    
    // 5. Store metadata for successful items
    const results = batchData.newMediaItemResults || [];
    const uploadedMediaRows = [];
    const diagnosticInsertedItems: any[] = [];
    
    // Fetch user profile to log uploader name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", actor.id)
      .maybeSingle();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const originalFile = result.uploadToken ? uploadTokenMap.get(result.uploadToken) : null;
      const originalFileName = originalFile ? originalFile.name : "Unknown File";
      const originalMimeType = originalFile ? originalFile.type : "application/octet-stream";

      if (result.status && result.status.code !== 0 && result.status.message !== "Success") {
        errors.push({
          index: i,
          fileName: originalFileName,
          statusCode: result.status.code,
          statusMessage: result.status.message
        });
        continue;
      }
      
      const mediaItem = result.mediaItem;
      if (!mediaItem || !mediaItem.id) {
        errors.push({
          index: i,
          fileName: originalFileName,
          statusCode: result.status?.code,
          statusMessage: "Google returned success but missing mediaItem.id"
        });
        continue;
      }

      const mediaRow = {
        trip_id: tripId,
        album_id: album.id,
        provider: "google_photos",
        google_media_item_id: mediaItem.id,
        filename: mediaItem.filename || originalFileName,
        mime_type: mediaItem.mimeType || originalMimeType,
        media_type: "photo",
        caption: caption || null,
        description: caption || null,
        google_product_url: mediaItem.productUrl || null,
        cached_base_url: mediaItem.baseUrl || null,
        cached_base_url_expires_at: mediaItem.baseUrl ? new Date(Date.now() + 55 * 60 * 1000).toISOString() : null,
        uploaded_by_profile_id: actor.id,
        uploaded_by_name: profile?.display_name || actor.email || "Owner",
        taken_at: mediaItem.mediaMetadata?.creationTime || new Date().toISOString()
      };
      
      uploadedMediaRows.push(mediaRow);
      diagnosticInsertedItems.push({
        fileName: originalFileName,
        hasMediaItemId: !!mediaItem.id,
        googleMediaItemIdPrefix: mediaItem.id ? String(mediaItem.id).substring(0, 12) : null,
        hasBaseUrl: !!mediaItem.baseUrl,
        hasProductUrl: !!mediaItem.productUrl
      });
    }

    let savedItems = [];
    if (uploadedMediaRows.length > 0) {
      const { data: inserted, error: insertError } = await adminClient
        .from("trip_gallery_media_items")
        .insert(uploadedMediaRows)
        .select();
        
      if (insertError) {
        console.error("Failed to insert media metadata:", insertError);
        errors.push({ message: "Photos uploaded to Google, but failed to save metadata to app." });
      } else {
        savedItems = inserted;
      }
    }

    return json({
      uploadTokenCount: uploadTokens.length,
      batchCreateResultCount: results.length,
      successCount: uploadedMediaRows.length,
      failedCount: errors.length + (files.length - uploadTokens.length),
      savedMetadataCount: savedItems.length,
      insertedItems: diagnosticInsertedItems,
      uploadedItems: savedItems,
      errors
    });

  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
