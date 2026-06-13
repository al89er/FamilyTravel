import { createClient } from "@supabase/supabase-js";
import { demoData } from "../data/demoData";
import type {
  AppData,
  CommentTarget,
  DocumentInput,
  EmergencyContactInput,
  ExpenseInput,
  FamilyPermissions,
  FamilySession,
  FlightSeatAssignmentInput,
  InsuranceInput,
  ItineraryInput,
  MedicalNoteInput,
  NewTripInput,
  PackingInput,
  PlaceInput,
  Role,
  RoomAssignmentInput,
  ShareLink,
  TripInput,
  TripSummary,
  VoteValue,
  Vote,
  TripGalleryAlbum,
  TripGalleryAlbumInput,
  TripGalleryMediaItem,
  TripGalleryMediaItemInput,
  TripGalleryAlbumStatus,
  TripGalleryVisibility,
  TripGalleryMediaType,
  GooglePhotosConnectionStatus
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

export async function loadAuthenticatedTrips(): Promise<TripSummary[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");

  const { data, error } = await supabase
    .from("trip_members")
    .select(`
      trip_id,
      role,
      trip:trips (
        id,
        title,
        destination,
        start_date,
        end_date
      )
    `)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = asRecord(row);
    const trip = asRecord(record.trip);
    return {
      id: asString(trip.id || record.trip_id),
      title: asString(trip.title || "Untitled trip"),
      destination: asString(trip.destination),
      startDate: asString(trip.start_date),
      endDate: asString(trip.end_date),
      role: asRole(record.role)
    };
  });
}

export async function loadAuthenticatedTrip(tripId: string): Promise<AppData> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");

  const [
    profileResult,
    tripResult,
    membersResult,
    itineraryResult,
    placesResult,
    documentsResult,
    expensesResult,
    packingResult,
    votesResult,
    commentsResult,
    emergencyResult,
    insuranceResult,
    medicalNotesResult,
    roomAssignmentsResult,
    flightSeatsResult
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("trip_members")
      .select(`
        id,
        trip_id,
        user_id,
        profile_id,
        role,
        can_add_expenses,
        invited_by,
        created_at,
        profile:profiles!trip_members_profile_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          medical_notes,
          allergies,
          medications,
          must_change_password
        )
      `)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("date", { ascending: true }).order("sort_order", { ascending: true }),
    supabase.from("places").select("*").eq("trip_id", tripId).order("name", { ascending: true }),
    supabase.from("documents").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").eq("trip_id", tripId).order("date", { ascending: false }),
    supabase.from("packing_items").select("*").eq("trip_id", tripId).order("category", { ascending: true }).order("name", { ascending: true }),
    supabase.from("votes").select("*").eq("trip_id", tripId),
    supabase.from("comments").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    supabase.from("emergency_contacts").select("*").eq("trip_id", tripId).order("name", { ascending: true }),
    supabase.from("travel_insurance").select("*").eq("trip_id", tripId).limit(1).maybeSingle(),
    supabase.from("family_medical_notes").select("*").eq("trip_id", tripId),
    supabase.from("family_room_assignments").select("*").eq("trip_id", tripId).order("hotel_name", { ascending: true }),
    supabase.from("family_flight_seat_assignments").select("*").eq("trip_id", tripId).order("flight_label", { ascending: true })
  ]);

  throwIfError(profileResult.error);
  throwIfError(tripResult.error);
  throwIfError(membersResult.error);
  throwIfError(itineraryResult.error);
  throwIfError(placesResult.error);
  throwIfError(documentsResult.error);
  throwIfError(expensesResult.error);
  throwIfError(packingResult.error);
  throwIfError(votesResult.error);
  throwIfError(commentsResult.error);
  throwIfError(emergencyResult.error);
  throwIfError(insuranceResult.error);
  throwIfError(medicalNotesResult.error);
  throwIfError(roomAssignmentsResult.error);
  throwIfError(flightSeatsResult.error);

  if (!tripResult.data) throw new Error("Trip not found for this account.");
  if (!profileResult.data) throw new Error("Profile not found for this account.");

  const expenses = asArray(expensesResult.data);
  const packing = asArray(packingResult.data);

  const [splitsResult, packingChecksResult] = await Promise.all([
    expenses.length
      ? supabase.from("expense_splits").select("*").in("expense_id", expenses.map((expense) => asString(asRecord(expense).id)))
      : Promise.resolve({ data: [], error: null }),
    packing.length
      ? supabase.from("packing_item_checks").select("*").in("packing_item_id", packing.map((item) => asString(asRecord(item).id)))
      : Promise.resolve({ data: [], error: null })
  ]);

  throwIfError(splitsResult.error);
  throwIfError(packingChecksResult.error);

  const splitsByExpense = new Map<string, string[]>();
  asArray(splitsResult.data).forEach((split) => {
    const record = asRecord(split);
    const expenseId = asString(record.expense_id);
    const profileId = asString(record.profile_id);
    splitsByExpense.set(expenseId, [...(splitsByExpense.get(expenseId) ?? []), profileId]);
  });

  const checksByItem = new Map<string, string[]>();
  asArray(packingChecksResult.data).forEach((check) => {
    const record = asRecord(check);
    const packingItemId = asString(record.packing_item_id);
    const profileId = asString(record.profile_id);
    checksByItem.set(packingItemId, [...(checksByItem.get(packingItemId) ?? []), profileId]);
  });

  const members = asArray(membersResult.data).map(memberToTripMember);
  const medicalNotesByProfile = new Map(asArray(medicalNotesResult.data).map((note) => [asString(note.profile_id), note]));
  members.forEach((member) => {
    const note = medicalNotesByProfile.get(member.profileId);
    if (!note) return;
    member.profile.allergies = optionalString(note.allergies);
    member.profile.medications = optionalString(note.medications);
    member.profile.medicalNotes = optionalString(note.notes);
  });

  return {
    currentUser: profileToProfile(asRecord(profileResult.data)),
    trip: tripToTrip(asRecord(tripResult.data)),
    members,
    itinerary: asArray(itineraryResult.data).map(itineraryToItineraryItem),
    places: asArray(placesResult.data).map(placeToPlace),
    documents: asArray(documentsResult.data).map(documentToTravelDocument),
    expenses: expenses.map((expense) => expenseToExpense(asRecord(expense), splitsByExpense)),
    packing: packing.map((item) => packingToPackingItem(asRecord(item), checksByItem)),
    votes: asArray(votesResult.data).map(voteToVote),
    comments: asArray(commentsResult.data).map(commentToComment),
    emergencyContacts: asArray(emergencyResult.data).map(emergencyToEmergencyContact),
    insurance: insuranceResult.data
      ? insuranceToTravelInsurance(asRecord(insuranceResult.data))
      : {
          id: "",
          tripId,
          provider: "",
          policyNumber: "",
          emergencyPhone: "",
          notes: ""
        },
    roomAssignments: asArray(roomAssignmentsResult.data).map(roomAssignmentToRoomAssignment),
    flightSeatAssignments: asArray(flightSeatsResult.data).map(flightSeatToFlightSeatAssignment)
  };
}

export async function createAuthenticatedTrip(input: NewTripInput): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("create_trip_as_owner", {
    p_title: input.title,
    p_destination: input.destination,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_timezone: input.timezone,
    p_currency: input.currency,
    p_date_format: input.dateFormat
  });

  if (error) throw error;
  return asString(data);
}

export async function updateTrip(tripId: string, input: TripInput) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("trips")
    .update({
      title: input.title,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      timezone: input.timezone,
      currency: input.currency,
      date_format: input.dateFormat,
      default_visibility: input.defaultVisibility,
      hotel_info: input.hotelInfo,
      emergency_summary: input.emergencySummary,
      estimated_budget: input.estimatedBudget,
      google_photos_album_url: input.googlePhotosAlbumUrl
    })
    .eq("id", tripId);
  if (error) throw error;
}

export async function upsertItineraryItem(tripId: string, input: ItineraryInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime || null,
    title: input.title,
    category: input.category,
    location_name: input.locationName || null,
    address: input.address || null,
    notes: input.notes || null,
    estimated_cost: input.estimatedCost ?? null,
    booking_reference: input.bookingReference || null,
    attachment_url: input.attachmentUrl || null,
    visibility: input.visibility,
    sort_order: input.sortOrder,
    created_by: userData.user.id
  };
  const query = id ? supabase.from("itinerary_items").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("itinerary_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteItineraryItem(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("itinerary_items").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function upsertPlace(tripId: string, input: PlaceInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    itinerary_item_id: input.itineraryItemId || null,
    name: input.name,
    category: input.category,
    address: input.address,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    visibility: input.visibility,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id ? supabase.from("places").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("places").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deletePlace(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("places").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function upsertExpense(tripId: string, input: ExpenseInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    paid_by: input.paidBy,
    date: input.date,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const result = id
    ? await supabase.from("expenses").update(payload).eq("id", id).eq("trip_id", tripId).select("id").single()
    : await supabase.from("expenses").insert(payload).select("id").single();
  if (result.error) throw result.error;
  const expenseId = asString(result.data.id);
  const { error: deleteSplitsError } = await supabase.from("expense_splits").delete().eq("expense_id", expenseId);
  if (deleteSplitsError) throw deleteSplitsError;
  if (input.splitBetween.length) {
    const shareAmount = input.amount / input.splitBetween.length;
    const { error: splitError } = await supabase.from("expense_splits").insert(
      input.splitBetween.map((profileId) => ({
        expense_id: expenseId,
        profile_id: profileId,
        share_amount: shareAmount
      }))
    );
    if (splitError) throw splitError;
  }
}

export async function deleteExpense(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function upsertPackingItem(tripId: string, input: PackingInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    assigned_to: input.assignedTo || null,
    is_shared: input.isShared,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id ? supabase.from("packing_items").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("packing_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deletePackingItem(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("packing_items").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function upsertDocument(tripId: string, input: DocumentInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  let storagePath: string | undefined;
  if (input.file) {
    storagePath = `${tripId}/${crypto.randomUUID()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("trip-documents").upload(storagePath, input.file, { upsert: false });
    if (uploadError) throw uploadError;
  }
  const payload = {
    trip_id: tripId,
    itinerary_item_id: input.itineraryItemId || null,
    file_name: input.fileName,
    file_type: input.fileType,
    category: input.category,
    uploaded_by: userData.user.id,
    is_private: input.isPrivate,
    ...(storagePath ? { storage_path: storagePath } : {})
  };
  const query = id ? supabase.from("documents").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("documents").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteDocument(tripId: string, id: string, storagePath?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
  if (storagePath) {
    await supabase.storage.from("trip-documents").remove([storagePath]);
  }
}

export function getDocumentUrl(storagePath: string): string {
  if (!supabase) return "";
  const { data } = supabase.storage.from("trip-documents").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function upsertEmergencyContact(tripId: string, input: EmergencyContactInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    name: input.name,
    relationship: input.relationship,
    phone: input.phone,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id ? supabase.from("emergency_contacts").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("emergency_contacts").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteEmergencyContact(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("emergency_contacts").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function upsertInsurance(tripId: string, input: InsuranceInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    provider: input.provider,
    policy_number: input.policyNumber,
    emergency_phone: input.emergencyPhone,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id ? supabase.from("travel_insurance").update(payload).eq("id", id).eq("trip_id", tripId) : supabase.from("travel_insurance").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertMedicalNote(tripId: string, input: MedicalNoteInput) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("family_medical_notes").upsert({
    trip_id: tripId,
    profile_id: input.profileId,
    allergies: input.allergies || null,
    medications: input.medications || null,
    notes: input.medicalNotes || null,
    visible_to_owner: input.visibleToOwner
  });
  if (error) throw error;
}

export async function listShareLinks(tripId: string): Promise<ShareLink[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("trip_share_links")
    .select("id, trip_id, label, is_enabled, allow_comments, allow_votes, allow_packing_checks, expires_at, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return asArray(data).map(shareLinkToShareLink);
}

export async function createShareLink({
  tripId,
  token,
  label,
  allowComments,
  allowVotes,
  allowPackingChecks
}: {
  tripId: string;
  token: string;
  label: string;
  allowComments: boolean;
  allowVotes: boolean;
  allowPackingChecks: boolean;
}): Promise<ShareLink> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");

  const { data, error } = await supabase
    .from("trip_share_links")
    .insert({
      trip_id: tripId,
      token,
      label,
      is_enabled: true,
      allow_comments: allowComments,
      allow_votes: allowVotes,
      allow_packing_checks: allowPackingChecks,
      created_by: userData.user.id
    })
    .select("id, trip_id, label, is_enabled, allow_comments, allow_votes, allow_packing_checks, expires_at, created_at")
    .single();

  if (error) throw error;
  return { ...shareLinkToShareLink(asRecord(data)), token };
}

export async function setShareLinkEnabled(tripId: string, shareLinkId: string, isEnabled: boolean): Promise<ShareLink> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("trip_share_links")
    .update({ is_enabled: isEnabled })
    .eq("trip_id", tripId)
    .eq("id", shareLinkId)
    .select("id, trip_id, label, is_enabled, allow_comments, allow_votes, allow_packing_checks, expires_at, created_at")
    .single();

  if (error) throw error;
  return shareLinkToShareLink(asRecord(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Trip Gallery Metadata (Owner-Only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getTripGalleryAlbum(tripId: string): Promise<TripGalleryAlbum | null> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("trip_gallery_albums")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load trip gallery album:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: asString(data.id),
    tripId: asString(data.trip_id),
    provider: asString(data.provider),
    googleAlbumId: optionalString(data.google_album_id),
    albumUrl: optionalString(data.album_url),
    title: optionalString(data.title),
    status: data.status as TripGalleryAlbumStatus,
    visibility: data.visibility as TripGalleryVisibility,
    createdByProfileId: optionalString(data.created_by_profile_id),
    createdAt: asString(data.created_at),
    updatedAt: asString(data.updated_at)
  };
}

export async function upsertTripGalleryAlbum(tripId: string, input: TripGalleryAlbumInput): Promise<TripGalleryAlbum> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("trip_gallery_albums")
    .upsert({
      trip_id: tripId,
      provider: input.provider,
      google_album_id: input.googleAlbumId,
      album_url: input.albumUrl,
      title: input.title,
      status: input.status,
      visibility: input.visibility,
      created_by_profile_id: input.createdByProfileId
    }, { onConflict: "trip_id, provider" })
    .select()
    .single();

  if (error) throw error;
  return {
    id: asString(data.id),
    tripId: asString(data.trip_id),
    provider: asString(data.provider),
    googleAlbumId: optionalString(data.google_album_id),
    albumUrl: optionalString(data.album_url),
    title: optionalString(data.title),
    status: data.status as TripGalleryAlbumStatus,
    visibility: data.visibility as TripGalleryVisibility,
    createdByProfileId: optionalString(data.created_by_profile_id),
    createdAt: asString(data.created_at),
    updatedAt: asString(data.updated_at)
  };
}

export async function listTripGalleryMediaItems(tripId: string): Promise<TripGalleryMediaItem[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("trip_gallery_media_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("taken_at", { ascending: false });

  if (error) throw error;
  
  return data.map(item => ({
    id: asString(item.id),
    tripId: asString(item.trip_id),
    albumId: optionalString(item.album_id),
    provider: asString(item.provider),
    googleMediaItemId: optionalString(item.google_media_item_id),
    filename: optionalString(item.filename),
    mimeType: optionalString(item.mime_type),
    mediaType: item.media_type as TripGalleryMediaType,
    caption: optionalString(item.caption),
    description: optionalString(item.description),
    googleProductUrl: optionalString(item.google_product_url),
    cachedBaseUrl: optionalString(item.cached_base_url),
    cachedBaseUrlExpiresAt: optionalString(item.cached_base_url_expires_at),
    uploadedByProfileId: optionalString(item.uploaded_by_profile_id),
    uploadedByName: optionalString(item.uploaded_by_name),
    takenAt: optionalString(item.taken_at),
    createdAt: asString(item.created_at),
    updatedAt: asString(item.updated_at)
  }));
}

export async function upsertTripGalleryMediaItem(tripId: string, input: TripGalleryMediaItemInput): Promise<TripGalleryMediaItem> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("trip_gallery_media_items")
    .upsert({
      trip_id: tripId,
      album_id: input.albumId,
      provider: input.provider,
      google_media_item_id: input.googleMediaItemId,
      filename: input.filename,
      mime_type: input.mimeType,
      media_type: input.mediaType,
      caption: input.caption,
      description: input.description,
      google_product_url: input.googleProductUrl,
      cached_base_url: input.cachedBaseUrl,
      cached_base_url_expires_at: input.cachedBaseUrlExpiresAt,
      uploaded_by_profile_id: input.uploadedByProfileId,
      uploaded_by_name: input.uploadedByName,
      taken_at: input.takenAt
    }, { onConflict: "provider, google_media_item_id" })
    .select()
    .single();

  if (error) throw error;
  return {
    id: asString(data.id),
    tripId: asString(data.trip_id),
    albumId: optionalString(data.album_id),
    provider: asString(data.provider),
    googleMediaItemId: optionalString(data.google_media_item_id),
    filename: optionalString(data.filename),
    mimeType: optionalString(data.mime_type),
    mediaType: data.media_type as TripGalleryMediaType,
    caption: optionalString(data.caption),
    description: optionalString(data.description),
    googleProductUrl: optionalString(data.google_product_url),
    cachedBaseUrl: optionalString(data.cached_base_url),
    cachedBaseUrlExpiresAt: optionalString(data.cached_base_url_expires_at),
    uploadedByProfileId: optionalString(data.uploaded_by_profile_id),
    uploadedByName: optionalString(data.uploaded_by_name),
    takenAt: optionalString(data.taken_at),
    createdAt: asString(data.created_at),
    updatedAt: asString(data.updated_at)
  };
}

export async function deleteTripGalleryMediaItem(tripId: string, mediaItemId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("trip_gallery_media_items")
    .delete()
    .eq("id", mediaItemId)
    .eq("trip_id", tripId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Photos Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function startGooglePhotosOAuth(tripId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("google-photos-oauth-start", {
    body: { tripId }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.authUrl;
}

export async function getGooglePhotosConnectionStatus(tripId: string): Promise<GooglePhotosConnectionStatus> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("google-photos-connection-status", {
    body: { tripId }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as GooglePhotosConnectionStatus;
}

export async function disconnectGooglePhotos(tripId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("google-photos-disconnect", {
    body: { tripId }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function createGooglePhotosAlbum(tripId: string, title?: string): Promise<{ googleAlbumId: string, albumUrl: string }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("google-photos-create-album", {
    body: { tripId, title }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadGooglePhotosMedia(tripId: string, files: File[], caption?: string): Promise<{ successCount: number, failedCount: number, uploadedItems: any[], errors: string[] }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required.");

  const formData = new FormData();
  formData.append("tripId", tripId);
  if (caption) formData.append("caption", caption);
  files.forEach(file => formData.append("files[]", file));

  const response = await fetch(`${supabaseUrl}/functions/v1/google-photos-upload-media`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Upload failed with status ${response.status}`);
  }

  return data;
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

export async function togglePackingItemCheck(tripId: string, itemId: string, checked: boolean) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");

  if (checked) {
    const { error } = await supabase.from("packing_item_checks").insert({
      packing_item_id: itemId,
      profile_id: userData.user.id
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("packing_item_checks")
      .delete()
      .eq("packing_item_id", itemId)
      .eq("profile_id", userData.user.id);
    if (error) throw error;
  }
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
  if (error) throw await functionErrorToError(error);
  if (data?.error) throw new Error(data.error);
  return data as { username?: string; temporaryPassword?: string; userId?: string; ok?: boolean };
}

export async function listRoomAssignments(tripId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("family_room_assignments")
    .select("*")
    .eq("trip_id", tripId)
    .order("hotel_name", { ascending: true });
  if (error) throw error;
  return asArray(data).map(roomAssignmentToRoomAssignment);
}

export async function upsertRoomAssignment(tripId: string, input: RoomAssignmentInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    itinerary_item_id: input.itineraryItemId || null,
    hotel_name: input.hotelName,
    check_in_date: input.checkInDate || null,
    check_out_date: input.checkOutDate || null,
    room_number: input.roomNumber,
    guest_ids: input.guestIds,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id
    ? supabase.from("family_room_assignments").update(payload).eq("id", id).eq("trip_id", tripId)
    : supabase.from("family_room_assignments").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteRoomAssignment(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("family_room_assignments").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

export async function listFlightSeatAssignments(tripId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("family_flight_seat_assignments")
    .select("*")
    .eq("trip_id", tripId)
    .order("flight_label", { ascending: true });
  if (error) throw error;
  return asArray(data).map(flightSeatToFlightSeatAssignment);
}

export async function upsertFlightSeatAssignment(tripId: string, input: FlightSeatAssignmentInput, id?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required.");
  const payload = {
    trip_id: tripId,
    itinerary_item_id: input.itineraryItemId || null,
    flight_label: input.flightLabel,
    guest_id: input.guestId,
    guest_name: input.guestName,
    seat_number: input.seatNumber,
    notes: input.notes || null,
    created_by: userData.user.id
  };
  const query = id
    ? supabase.from("family_flight_seat_assignments").update(payload).eq("id", id).eq("trip_id", tripId)
    : supabase.from("family_flight_seat_assignments").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteFlightSeatAssignment(tripId: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("family_flight_seat_assignments").delete().eq("id", id).eq("trip_id", tripId);
  if (error) throw error;
}

async function functionErrorToError(error: unknown) {
  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const payload = (await context.clone().json()) as { error?: string };
      if (payload.error) return new Error(payload.error);
    } catch {
      // Fall through to the SDK error message.
    }
  }

  return error instanceof Error ? error : new Error("Edge Function returned an error.");
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
      visibility: asVisibility(place.visibility),
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
    },
    roomAssignments: [],
    flightSeatAssignments: []
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

function throwIfError(error: { message: string } | null | undefined) {
  if (error) throw new Error(error.message);
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRole(value: unknown): Role {
  return value === "owner" ? "owner" : "organizer";
}

function profileToProfile(profile: Record<string, unknown>) {
  return {
    id: asString(profile.id),
    username: optionalString(profile.username),
    displayName: asString(profile.display_name),
    avatarUrl: optionalString(profile.avatar_url),
    medicalNotes: optionalString(profile.medical_notes),
    allergies: optionalString(profile.allergies),
    medications: optionalString(profile.medications),
    mustChangePassword: Boolean(profile.must_change_password)
  };
}

function tripToTrip(trip: Record<string, unknown>) {
  return {
    id: asString(trip.id),
    title: asString(trip.title),
    destination: asString(trip.destination),
    startDate: asString(trip.start_date),
    endDate: asString(trip.end_date),
    timezone: asString(trip.timezone),
    currency: asString(trip.currency),
    dateFormat: asString(trip.date_format),
    defaultVisibility: asVisibility(trip.default_visibility),
    hotelInfo: asString(trip.hotel_info),
    emergencySummary: asString(trip.emergency_summary),
    estimatedBudget: asNumber(trip.estimated_budget),
    googlePhotosAlbumUrl: optionalString(trip.google_photos_album_url)
  };
}

function memberToTripMember(member: Record<string, unknown>) {
  const profile = profileToProfile(asRecord(member.profile));
  return {
    id: asString(member.id),
    tripId: asString(member.trip_id),
    userId: asString(member.user_id || member.profile_id),
    profileId: asString(member.profile_id || member.user_id),
    role: asRole(member.role),
    canAddExpenses: Boolean(member.can_add_expenses),
    invitedBy: optionalString(member.invited_by),
    createdAt: optionalString(member.created_at),
    profile
  };
}

function itineraryToItineraryItem(item: Record<string, unknown>) {
  return {
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
  };
}

function placeToPlace(place: Record<string, unknown>) {
  return {
    id: asString(place.id),
    tripId: asString(place.trip_id),
    itineraryItemId: optionalString(place.itinerary_item_id),
    name: asString(place.name),
    category: asString(place.category) as AppData["places"][number]["category"],
    address: asString(place.address),
    latitude: optionalNumber(place.latitude),
    longitude: optionalNumber(place.longitude),
    visibility: asVisibility(place.visibility),
    notes: optionalString(place.notes)
  };
}

function documentToTravelDocument(document: Record<string, unknown>) {
  return {
    id: asString(document.id),
    tripId: asString(document.trip_id),
    itineraryItemId: optionalString(document.itinerary_item_id),
    fileName: asString(document.file_name),
    fileType: asString(document.file_type),
    category: asString(document.category) as AppData["documents"][number]["category"],
    uploadedBy: asString(document.uploaded_by),
    storagePath: optionalString(document.storage_path),
    isPrivate: Boolean(document.is_private),
    createdAt: asString(document.created_at)
  };
}

function expenseToExpense(expense: Record<string, unknown>, splitsByExpense: Map<string, string[]>) {
  const id = asString(expense.id);
  return {
    id,
    tripId: asString(expense.trip_id),
    amount: asNumber(expense.amount),
    currency: asString(expense.currency),
    category: asString(expense.category),
    paidBy: asString(expense.paid_by),
    splitBetween: splitsByExpense.get(id) ?? [],
    date: asString(expense.date),
    notes: optionalString(expense.notes),
    receiptPath: optionalString(expense.receipt_path)
  };
}

function packingToPackingItem(item: Record<string, unknown>, checksByItem: Map<string, string[]>) {
  const id = asString(item.id);
  return {
    id,
    tripId: asString(item.trip_id),
    name: asString(item.name),
    category: asString(item.category),
    quantity: asNumber(item.quantity),
    assignedTo: optionalString(item.assigned_to),
    isShared: Boolean(item.is_shared),
    checkedBy: checksByItem.get(id) ?? [],
    notes: optionalString(item.notes)
  };
}

function voteToVote(vote: Record<string, unknown>) {
  return {
    id: asString(vote.id),
    tripId: asString(vote.trip_id),
    itineraryItemId: asString(vote.itinerary_item_id),
    profileId: asString(vote.profile_id),
    value: asString(vote.value) as VoteValue
  };
}

function commentToComment(comment: Record<string, unknown>) {
  return {
    id: asString(comment.id),
    tripId: asString(comment.trip_id),
    targetType: asString(comment.target_type) as CommentTarget,
    targetId: asString(comment.target_id),
    profileId: asString(comment.profile_id),
    body: asString(comment.body),
    createdAt: asString(comment.created_at)
  };
}

function emergencyToEmergencyContact(contact: Record<string, unknown>) {
  return {
    id: asString(contact.id),
    tripId: asString(contact.trip_id),
    name: asString(contact.name),
    relationship: asString(contact.relationship),
    phone: asString(contact.phone),
    notes: optionalString(contact.notes)
  };
}

function insuranceToTravelInsurance(insurance: Record<string, unknown>) {
  return {
    id: asString(insurance.id),
    tripId: asString(insurance.trip_id),
    provider: asString(insurance.provider),
    policyNumber: asString(insurance.policy_number),
    emergencyPhone: asString(insurance.emergency_phone),
    notes: optionalString(insurance.notes)
  };
}

function roomAssignmentToRoomAssignment(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    tripId: asString(row.trip_id),
    itineraryItemId: optionalString(row.itinerary_item_id),
    hotelName: asString(row.hotel_name),
    checkInDate: optionalString(row.check_in_date),
    checkOutDate: optionalString(row.check_out_date),
    roomNumber: asString(row.room_number),
    guestIds: Array.isArray(row.guest_ids) ? row.guest_ids.map(String) : [],
    notes: optionalString(row.notes),
    createdAt: optionalString(row.created_at)
  };
}

function flightSeatToFlightSeatAssignment(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    tripId: asString(row.trip_id),
    itineraryItemId: optionalString(row.itinerary_item_id),
    flightLabel: asString(row.flight_label),
    guestId: asString(row.guest_id),
    guestName: asString(row.guest_name),
    seatNumber: asString(row.seat_number),
    notes: optionalString(row.notes),
    createdAt: optionalString(row.created_at)
  };
}

function shareLinkToShareLink(link: Record<string, unknown>): ShareLink {
  return {
    id: asString(link.id),
    tripId: asString(link.trip_id),
    label: asString(link.label),
    isEnabled: Boolean(link.is_enabled),
    allowComments: Boolean(link.allow_comments),
    allowVotes: Boolean(link.allow_votes),
    allowPackingChecks: Boolean(link.allow_packing_checks),
    expiresAt: optionalString(link.expires_at),
    createdAt: asString(link.created_at)
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
