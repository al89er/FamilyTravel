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
    if (!body.tripId) return json({ error: "tripId is required." }, 400);

    const { actor, adminClient } = await requireOwner(req, body.tripId);

    const { error } = await adminClient
      .from("google_photos_connections")
      .delete()
      .eq("owner_user_id", actor.id)
      .eq("provider", "google_photos");

    if (error) throw error;

    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 400);
  }
});
