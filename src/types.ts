export type Role = "owner" | "organizer";
export type Visibility = "shared" | "private" | "planner_only";
export type ItineraryCategory =
  | "flight"
  | "transport"
  | "hotel"
  | "food"
  | "activity"
  | "shopping"
  | "free_time"
  | "emergency"
  | "other";
export type PlaceCategory =
  | "hotel"
  | "restaurant"
  | "attraction"
  | "airport"
  | "meeting_point"
  | "pharmacy"
  | "hospital"
  | "custom";
export type DocumentCategory =
  | "flight_ticket"
  | "hotel_booking"
  | "passport"
  | "insurance"
  | "attraction_ticket"
  | "other";
export type VoteValue = "interested" | "must_do" | "skip" | "neutral";
export type CommentTarget = "trip" | "itinerary_item" | "expense" | "document" | "place";

export interface Profile {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  medicalNotes?: string;
  allergies?: string;
  medications?: string;
  mustChangePassword?: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  defaultVisibility: Visibility;
  hotelInfo: string;
  emergencySummary: string;
  estimatedBudget: number;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  profileId: string;
  role: Role;
  canAddExpenses: boolean;
  invitedBy?: string;
  createdAt?: string;
  profile: Profile;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  startTime: string;
  endTime?: string;
  title: string;
  category: ItineraryCategory;
  locationName?: string;
  address?: string;
  notes?: string;
  estimatedCost?: number;
  bookingReference?: string;
  attachmentUrl?: string;
  visibility: Visibility;
  sortOrder: number;
}

export interface Place {
  id: string;
  tripId: string;
  itineraryItemId?: string;
  name: string;
  category: PlaceCategory;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface TravelDocument {
  id: string;
  tripId: string;
  itineraryItemId?: string;
  fileName: string;
  fileType: string;
  category: DocumentCategory;
  uploadedBy: string;
  storagePath?: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  splitBetween: string[];
  date: string;
  notes?: string;
  receiptPath?: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  quantity: number;
  assignedTo?: string;
  isShared: boolean;
  checkedBy: string[];
  notes?: string;
}

export interface Vote {
  id: string;
  tripId: string;
  itineraryItemId: string;
  profileId: string;
  value: VoteValue;
}

export interface Comment {
  id: string;
  tripId: string;
  targetType: CommentTarget;
  targetId: string;
  profileId: string;
  body: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  tripId: string;
  name: string;
  relationship: string;
  phone: string;
  notes?: string;
}

export interface TravelInsurance {
  id: string;
  tripId: string;
  provider: string;
  policyNumber: string;
  emergencyPhone: string;
  notes?: string;
}

export interface AppData {
  currentUser: Profile;
  trip: Trip;
  members: TripMember[];
  itinerary: ItineraryItem[];
  places: Place[];
  documents: TravelDocument[];
  expenses: Expense[];
  packing: PackingItem[];
  votes: Vote[];
  comments: Comment[];
  emergencyContacts: EmergencyContact[];
  insurance: TravelInsurance;
}

export interface FamilyPermissions {
  comments: boolean;
  votes: boolean;
  packingChecks: boolean;
}

export interface FamilySession {
  displayName: string;
  shareToken: string;
  guestId?: string;
  permissions: FamilyPermissions;
}

export type AccessMode = "locked" | "owner" | "organizer" | "family" | "demo";

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  role: Role;
}

export interface NewTripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  timezone: string;
  currency: string;
  dateFormat: string;
}

export interface ShareLink {
  id: string;
  tripId: string;
  label: string;
  isEnabled: boolean;
  allowComments: boolean;
  allowVotes: boolean;
  allowPackingChecks: boolean;
  expiresAt?: string;
  createdAt: string;
  token?: string;
}
