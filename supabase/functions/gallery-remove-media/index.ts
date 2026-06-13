import { corsHeaders, json, requireOwner } from "../shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { tripId, mediaItemId } = body;

    if (!tripId || !mediaItemId) {
      return json({ error: "tripId and mediaItemId are required." }, 400);
    }

    // Only Trip Owners can remove media
    const { actor, adminClient } = await requireOwner(req, tripId);

    // Verify media item belongs to the trip
    const { data: item, error: itemError } = await adminClient
      .from("trip_gallery_media_items")
      .select("id")
      .eq("id", mediaItemId)
      .eq("trip_id", tripId)
      .single();

    if (itemError || !item) {
      return json({ error: "Media item not found in this trip." }, 404);
    }

    const { error: updateError } = await adminClient
      .from("trip_gallery_media_items")
      .update({
        is_removed: true,
        removed_at: new Date().toISOString(),
        removed_by: actor.id,
      })
      .eq("id", mediaItemId);

    if (updateError) throw updateError;

    return json({ success: true, message: "Media item removed from trip gallery." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 400);
  }
});
