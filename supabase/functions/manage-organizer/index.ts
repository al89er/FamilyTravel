import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Action =
  | "addOrganizer"
  | "removeOrganizer"
  | "resetPassword"
  | "updateDisplayName"
  | "transferOwnership";

interface RequestBody {
  action: Action;
  tripId: string;
  username?: string;
  displayName?: string;
  temporaryPassword?: string;
  organizerUserId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const usernameDomain = Deno.env.get("AUTH_USERNAME_DOMAIN") ?? "familytravel.local";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Function environment is not configured." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userResult, error: userError } = await userClient.auth.getUser();
  const actor = userResult.user;
  if (userError || !actor) {
    return json({ error: "Authentication required." }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!body.tripId || !body.action) {
    return json({ error: "tripId and action are required." }, 400);
  }

  const ownerCheck = await adminClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", body.tripId)
    .eq("user_id", actor.id)
    .eq("role", "owner")
    .maybeSingle();

  if (ownerCheck.error) {
    return json({ error: ownerCheck.error.message }, 500);
  }

  if (!ownerCheck.data) {
    return json({ error: "Only the trip owner can manage organizers." }, 403);
  }

  try {
    if (body.action === "addOrganizer") {
      const username = normalizeUsername(body.username);
      const displayName = normalizeDisplayName(body.displayName);
      const temporaryPassword = normalizePassword(body.temporaryPassword);
      const email = usernameToEmail(username, usernameDomain);

      const created = await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName,
          must_change_password: true
        }
      });

      if (created.error) throw created.error;
      const user = created.data.user;
      if (!user) throw new Error("Organizer user was not created.");

      const profile = await adminClient.from("profiles").upsert({
        id: user.id,
        username,
        display_name: displayName,
        must_change_password: true
      });
      if (profile.error) throw profile.error;

      const membership = await adminClient.from("trip_members").insert({
        trip_id: body.tripId,
        user_id: user.id,
        profile_id: user.id,
        role: "organizer",
        can_add_expenses: true,
        invited_by: actor.id
      });
      if (membership.error) throw membership.error;

      return json({ username, temporaryPassword, userId: user.id });
    }

    const organizerUserId = requireUserId(body.organizerUserId);
    await assertOrganizer(adminClient, body.tripId, organizerUserId);

    if (body.action === "removeOrganizer") {
      const removed = await adminClient
        .from("trip_members")
        .delete()
        .eq("trip_id", body.tripId)
        .eq("user_id", organizerUserId)
        .eq("role", "organizer");
      if (removed.error) throw removed.error;
      return json({ ok: true });
    }

    if (body.action === "resetPassword") {
      const temporaryPassword = normalizePassword(body.temporaryPassword);
      const updated = await adminClient.auth.admin.updateUserById(organizerUserId, {
        password: temporaryPassword,
        user_metadata: { must_change_password: true }
      });
      if (updated.error) throw updated.error;

      const profile = await adminClient
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", organizerUserId);
      if (profile.error) throw profile.error;

      return json({ temporaryPassword });
    }

    if (body.action === "updateDisplayName") {
      const displayName = normalizeDisplayName(body.displayName);
      const profile = await adminClient
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", organizerUserId);
      if (profile.error) throw profile.error;
      return json({ ok: true });
    }

    if (body.action === "transferOwnership") {
      const transfer = await adminClient.rpc("transfer_trip_ownership_as_owner", {
        p_trip_id: body.tripId,
        p_current_owner_id: actor.id,
        p_new_owner_id: organizerUserId
      });
      if (transfer.error) throw transfer.error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Organizer action failed." }, 400);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function normalizeUsername(username?: string) {
  const value = username?.trim().toLowerCase();
  if (!value || value.length < 3 || value.length > 80) {
    throw new Error("Username must be 3 to 80 characters.");
  }
  if (!/^[a-z0-9._@-]+$/.test(value)) {
    throw new Error("Username can contain letters, numbers, dots, underscores, hyphens, or a full email address.");
  }
  return value;
}

function normalizeDisplayName(displayName?: string) {
  const value = displayName?.trim();
  if (!value || value.length < 2 || value.length > 120) {
    throw new Error("Display name must be 2 to 120 characters.");
  }
  return value;
}

function normalizePassword(password?: string) {
  if (!password || password.length < 8 || password.length > 128) {
    throw new Error("Temporary password must be 8 to 128 characters.");
  }
  return password;
}

function usernameToEmail(username: string, domain: string) {
  return username.includes("@") ? username : `${username}@${domain}`;
}

function requireUserId(userId?: string) {
  if (!userId) throw new Error("organizerUserId is required.");
  return userId;
}

async function assertOrganizer(
  adminClient: ReturnType<typeof createClient>,
  tripId: string,
  organizerUserId: string
) {
  const result = await adminClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", organizerUserId)
    .eq("role", "organizer")
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("Selected user is not an organizer on this trip.");
}
