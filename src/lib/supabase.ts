import { createClient } from "@supabase/supabase-js";
import { demoData } from "../data/demoData";
import type {
  AppData,
  CommentTarget,
  FamilyPermissions,
  FamilySession,
  VoteValue
} from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const usernameDomain = (import.meta.env.VITE_AUTH_USERNAME_DOMAIN as string | undefined) ?? "familytravel.local";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes("your_"));

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

function usernameToEmail(username: string) {
  const cleanUsername = username.trim().toLowerCase();
  return cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@${usernameDomain}`;
}

export async function signInWithPassword(username: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password
  });
}

export async function getPasswordChangeRequired(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.must_change_password);
}

export async function completeRequiredPasswordChange(newPassword: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");

  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
  if (passwordError) throw passwordError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userData.user.id);
  if (profileError) throw profileError;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function loadFamilyTrip(displayName: string, shareToken: string): Promise<{ data: AppData; session: FamilySession }> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.rpc("get_family_trip", {
    p_display_name: displayName,
    p_share_token: shareToken
  });

  if (error) throw error;

  return familyPayloadToAppData(data as FamilyTripPayload, displayName, shareToken);
}

export async function addFamilyComment(
  session: FamilySession,
  targetType: CommentTarget,
  targetId: string,
  body: string
) {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase.rpc("add_family_comment", {
    p_share_token: session.shareToken,
    p_display_name: session.displayName,
    p_target_type: targetType,
    p_target_id: targetId,
    p_body: body
  });
}

export async function castFamilyVote(session: FamilySession, itineraryItemId: string, value: VoteValue) {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase.rpc("cast_family_vote", {
    p_share_token: session.shareToken,
    p_display_name: session.displayName,
    p_itinerary_item_id: itineraryItemId,
    p_value: value
  });
}

export async function setFamilyPackingCheck(session: FamilySession, packingItemId: string, checked: boolean) {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase.rpc("set_family_packing_check", {
    p_share_token: session.shareToken,
    p_display_name: session.displayName,
    p_packing_item_id: packingItemId,
    p_checked: checked
  });
}

export type OrganizerAction =
  | {
      action: "addOrganizer";
      tripId: string;
      username: string;
      displayName: string;
      temporaryPassword: string;
    }
  | {
      action: "removeOrganizer" | "resetPassword" | "transferOwnership";
      tripId: string;
      organizerUserId: string;
      temporaryPassword?: string;
    }
  | {
      action: "updateDisplayName";
      tripId: string;
      organizerUserId: string;
      displayName: string;
    };

export async function manageOrganizer(payload: OrganizerAction) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("manage-organizer", {
    body: payload
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { username?: string; temporaryPassword?: string; userId?: string; ok?: boolean };
}

interface FamilyTripPayload {
  guestId: string;
  permissions: FamilyPermissions;
  trip: Record<string, unknown>;
  itinerary: Array<Record<string, unknown>>;
  places: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  packing: Array<Record<string, unknown>>;
  votes: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  emergencyContacts: Array<Record<string, unknown>>;
}

function familyPayloadToAppData(payload: FamilyTripPayload, displayName: string, shareToken: string) {
  const guestId = payload.guestId;
  const data: AppData = {
    ...demoData,
    currentUser: {
      id: guestId,
      displayName
    },
    trip: {
      ...demoData.trip,
      id: asString(payload.trip.id),
      title: asString(payload.trip.title),
      destination: asString(payload.trip.destination),
      startDate: asString(payload.trip.start_date),
      endDate: asString(payload.trip.end_date),
      timezone: asString(payload.trip.timezone),
      currency: asString(payload.trip.currency),
      dateFormat: asString(payload.trip.date_format),
      defaultVisibility: asVisibility(payload.trip.default_visibility),
      hotelInfo: asString(payload.trip.hotel_info),
      emergencySummary: asString(payload.trip.emergency_summary),
      estimatedBudget: asNumber(payload.trip.estimated_budget)
    },
    members: [
      {
        id: guestId,
        tripId: asString(payload.trip.id),
        userId: guestId,
        profileId: guestId,
        role: "organizer",
        canAddExpenses: false,
        profile: { id: guestId, displayName }
      }
    ],
    itinerary: payload.itinerary.map((item) => ({
      id: asString(item.id),
      tripId: asString(item.trip_id),
      date: asString(item.date),
      startTime: asString(item.start_time).slice(0, 5),
      endTime: optionalString(item.end_time)?.slice(0, 5),
      title: asString(item.title),
      category: asString(item.category) as AppData["itinerary"][number]["category"],
      locationName: optionalString(item.location_name),
      address: optionalString(item.address),
      notes: optionalString(item.notes),
      estimatedCost: optionalNumber(item.estimated_cost),
      bookingReference: optionalString(item.booking_reference),
      attachmentUrl: optionalString(item.attachment_url),
      visibility: asVisibility(item.visibility),
      sortOrder: asNumber(item.sort_order)
    })),
    places: payload.places.map((place) => ({
      id: asString(place.id),
      tripId: asString(place.trip_id),
      itineraryItemId: optionalString(place.itinerary_item_id),
      name: asString(place.name),
      category: asString(place.category) as AppData["places"][number]["category"],
      address: asString(place.address),
      latitude: optionalNumber(place.latitude),
      longitude: optionalNumber(place.longitude),
      notes: optionalString(place.notes)
    })),
    documents: payload.documents.map((document) => ({
      id: asString(document.id),
      tripId: asString(document.trip_id),
      itineraryItemId: optionalString(document.itinerary_item_id),
      fileName: asString(document.file_name),
      fileType: asString(document.file_type),
      category: asString(document.category) as AppData["documents"][number]["category"],
      uploadedBy: asString(document.uploaded_by),
      isPrivate: false,
      createdAt: asString(document.created_at)
    })),
    expenses: payload.expenses.map((expense) => ({
      id: asString(expense.id),
      tripId: asString(expense.trip_id),
      amount: asNumber(expense.amount),
      currency: asString(expense.currency),
      category: asString(expense.category),
      paidBy: asString(expense.paid_by),
      splitBetween: [],
      date: asString(expense.date),
      notes: optionalString(expense.notes)
    })),
    packing: payload.packing.map((item) => {
      const checkedNames = Array.isArray(item.familyCheckedBy) ? item.familyCheckedBy.map(String) : [];
      return {
        id: asString(item.id),
        tripId: asString(item.trip_id),
        name: asString(item.name),
        category: asString(item.category),
        quantity: asNumber(item.quantity),
        assignedTo: optionalString(item.assigned_to),
        isShared: Boolean(item.is_shared),
        checkedBy: checkedNames.includes(displayName) ? [guestId] : [],
        notes: optionalString(item.notes)
      };
    }),
    votes: payload.votes.map((vote) => ({
      id: asString(vote.id),
      tripId: asString(vote.trip_id),
      itineraryItemId: asString(vote.itinerary_item_id),
      profileId: asString(vote.guest_id),
      value: asString(vote.value) as VoteValue
    })),
    comments: payload.comments.map((comment) => ({
      id: asString(comment.id),
      tripId: asString(comment.trip_id),
      targetType: asString(comment.target_type) as CommentTarget,
      targetId: asString(comment.target_id),
      profileId: asString(comment.guest_id),
      body: `${asString(comment.displayName)}: ${asString(comment.body)}`,
      createdAt: asString(comment.created_at)
    })),
    emergencyContacts: payload.emergencyContacts.map((contact) => ({
      id: asString(contact.id),
      tripId: asString(contact.trip_id),
      name: asString(contact.name),
      relationship: asString(contact.relationship),
      phone: asString(contact.phone),
      notes: optionalString(contact.notes)
    })),
    insurance: {
      ...demoData.insurance,
      provider: "Admin only",
      policyNumber: "Hidden from family share",
      emergencyPhone: demoData.insurance.emergencyPhone
    }
  };

  return {
    data,
    session: {
      displayName,
      shareToken,
      guestId,
      permissions: payload.permissions
    }
  };
}

function asString(value: unknown) {
  return value == null ? "" : String(value);
}

function optionalString(value: unknown) {
  return value == null ? undefined : String(value);
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function optionalNumber(value: unknown) {
  return value == null ? undefined : Number(value);
}

function asVisibility(value: unknown) {
  return (value === "private" || value === "planner_only" ? value : "shared") as AppData["trip"]["defaultVisibility"];
}
