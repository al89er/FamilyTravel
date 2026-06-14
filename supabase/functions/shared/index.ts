import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
};

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Function environment is not configured (missing keys).");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function requireOwner(req: Request, tripId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !anonKey) {
    throw new Error("Function environment is not configured (missing anon key).");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser();
  const actor = userResult.user;
  if (userError || !actor) {
    throw new Error("Authentication required.");
  }

  const adminClient = getAdminClient();

  const ownerCheck = await adminClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", actor.id)
    .eq("role", "owner")
    .maybeSingle();

  if (ownerCheck.error) {
    throw new Error(ownerCheck.error.message);
  }

  if (!ownerCheck.data) {
    throw new Error("Only the trip owner can perform this action.");
  }

  return { actor, adminClient, userClient };
}

export async function requireOrganizerOrOwner(req: Request, tripId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !anonKey) {
    throw new Error("Function environment is not configured (missing anon key).");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser();
  const actor = userResult.user;
  if (userError || !actor) {
    throw new Error("Authentication required.");
  }

  const adminClient = getAdminClient();

  const roleCheck = await adminClient
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", actor.id)
    .in("role", ["owner", "organizer"])
    .maybeSingle();

  if (roleCheck.error) {
    throw new Error(roleCheck.error.message);
  }

  if (!roleCheck.data) {
    throw new Error("Only the trip owner or organizer can perform this action.");
  }

  return { actor, adminClient, userClient, role: roleCheck.data.role };
}

export async function requireTripMember(req: Request, tripId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !anonKey) {
    throw new Error("Function environment is not configured (missing anon key).");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser();
  const actor = userResult.user;
  if (userError || !actor) {
    throw new Error("Authentication required.");
  }

  const adminClient = getAdminClient();

  const roleCheck = await adminClient
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", actor.id)
    .maybeSingle();

  if (roleCheck.error) {
    throw new Error(roleCheck.error.message);
  }

  if (!roleCheck.data) {
    throw new Error("Only trip members can perform this action.");
  }

  return { actor, adminClient, userClient, role: roleCheck.data.role };
}

export async function getTripOwnerId(adminClient: any, tripId: string) {
  const { data, error } = await adminClient
    .from("trip_members")
    .select("user_id")
    .eq("trip_id", tripId)
    .eq("role", "owner")
    .maybeSingle();
    
  if (error || !data) {
    throw new Error("Trip owner not found.");
  }
  return data.user_id;
}


export async function refreshGoogleTokenIfNeeded(adminClient: any, connection: any) {
  if (!connection.expires_at) return connection.access_token;

  const expiresAt = new Date(connection.expires_at).getTime();
  const now = Date.now();
  
  // If token is valid for more than 5 minutes, return it
  if (expiresAt > now + 5 * 60 * 1000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Google connection expired and no refresh token is available.");
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth secrets not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    await adminClient
      .from("google_photos_connections")
      .update({ status: "error" })
      .eq("id", connection.id);
    throw new Error(`Failed to refresh Google token: ${data.error_description || "Unknown error"}`);
  }

  const data = await response.json();
  
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  
  await adminClient
    .from("google_photos_connections")
    .update({
      access_token: data.access_token,
      expires_at: newExpiresAt,
      status: "connected"
    })
    .eq("id", connection.id);
    
  return data.access_token;
}
