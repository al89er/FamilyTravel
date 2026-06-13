import { getAdminClient } from "../shared/index.ts";

// Utility to parse JWT and extract email safely without verifying signature (Google handles it)
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = Deno.env.get("APP_PUBLIC_URL") || "http://localhost:5174";

  if (errorParam || !code || !state) {
    return Response.redirect(`${appUrl}?googlePhotos=error&msg=${errorParam || "MissingCodeOrState"}`, 302);
  }

  try {
    const adminClient = getAdminClient();

    // 1. Validate State
    const { data: stateData, error: stateError } = await adminClient
      .from("google_oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !stateData) {
      return Response.redirect(`${appUrl}?googlePhotos=error&msg=InvalidState`, 302);
    }

    if (stateData.consumed_at) {
      return Response.redirect(`${appUrl}?googlePhotos=error&msg=StateConsumed`, 302);
    }

    if (new Date(stateData.expires_at).getTime() < Date.now()) {
      return Response.redirect(`${appUrl}?googlePhotos=error&msg=StateExpired`, 302);
    }

    // Mark consumed
    await adminClient
      .from("google_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", stateData.id);

    // 2. Exchange Code
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      return Response.redirect(`${appUrl}?googlePhotos=error&msg=ConfigMissing`, 302);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({}));
      console.error("Token Exchange Error:", tokenError);
      return Response.redirect(`${appUrl}?googlePhotos=error&msg=TokenExchangeFailed`, 302);
    }

    const tokens = await tokenResponse.json();

    // Parse email from id_token
    let email = null;
    if (tokens.id_token) {
      const claims = parseJwt(tokens.id_token);
      email = claims?.email || null;
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scopesArr = tokens.scope ? tokens.scope.split(" ") : [];

    // 3. Store tokens in google_photos_connections
    await adminClient
      .from("google_photos_connections")
      .upsert({
        owner_user_id: stateData.owner_user_id,
        provider: "google_photos",
        google_account_email: email,
        scopes: scopesArr,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // might be undefined if not first time
        token_type: tokens.token_type,
        expires_at: expiresAt,
        status: "connected",
        updated_at: new Date().toISOString()
      }, { onConflict: "owner_user_id, provider" });

    // Note: if refresh_token isn't returned, we shouldn't overwrite an existing refresh_token with null.
    // The upsert above WILL overwrite it if tokens.refresh_token is undefined. We should do a safer upsert.
    // Actually, to be safe, let's fetch existing first to keep refresh_token if missing.
    if (!tokens.refresh_token) {
       const existing = await adminClient
         .from("google_photos_connections")
         .select("refresh_token")
         .eq("owner_user_id", stateData.owner_user_id)
         .eq("provider", "google_photos")
         .maybeSingle();
       
       if (existing.data?.refresh_token) {
         await adminClient
           .from("google_photos_connections")
           .update({ refresh_token: existing.data.refresh_token })
           .eq("owner_user_id", stateData.owner_user_id)
           .eq("provider", "google_photos");
       }
    }

    return Response.redirect(`${appUrl}?googlePhotos=connected`, 302);

  } catch (error) {
    console.error("Callback Error:", error);
    return Response.redirect(`${appUrl}?googlePhotos=error&msg=InternalError`, 302);
  }
});
