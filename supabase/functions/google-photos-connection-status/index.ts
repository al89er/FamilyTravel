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

    const { data: connection, error } = await adminClient
      .from("google_photos_connections")
      .select("status, google_account_email, scopes, expires_at, refresh_token")
      .eq("owner_user_id", actor.id)
      .eq("provider", "google_photos")
      .maybeSingle();

    if (error) throw error;

    if (!connection) {
      return json({ connected: false, hasRefreshToken: false });
    }

    return json({
      connected: connection.status === "connected",
      googleAccountEmail: connection.google_account_email,
      scopes: connection.scopes,
      status: connection.status,
      expiresAt: connection.expires_at,
      hasRefreshToken: !!connection.refresh_token
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 400);
  }
});
