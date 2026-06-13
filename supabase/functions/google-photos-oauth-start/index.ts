import { corsHeaders, json, requireOwner } from "../shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    let body: { tripId?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    if (!body.tripId) {
      return json({ error: "tripId is required." }, 400);
    }

    const { actor, adminClient } = await requireOwner(req, body.tripId);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");

    if (!clientId || !redirectUri) {
      return json({ error: "Google OAuth secrets not configured." }, 500);
    }

    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertState = await adminClient.from("google_oauth_states").insert({
      state,
      owner_user_id: actor.id,
      trip_id: body.tripId,
      expires_at: expiresAt
    });

    if (insertState.error) {
      throw insertState.error;
    }

    const scopes = [
      "https://www.googleapis.com/auth/photoslibrary.appendonly",
      "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
      "openid",
      "email",
      "profile"
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent"); // Force refresh token
    authUrl.searchParams.set("state", state);

    return json({ authUrl: authUrl.toString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 400);
  }
});
