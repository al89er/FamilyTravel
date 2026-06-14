import { useState, useRef, useEffect, useMemo } from "react";
import {
  BedDouble,
  CalendarRange,
  Luggage,
  PlaneTakeoff,
  Plus,
  Trash2,
  Users,
  Pencil,
  MoreVertical,
  Hotel,
  MapPin,
  Clock
} from "lucide-react";
import type { AppData, FlightSeatAssignment, RoomAssignment, ItineraryItem } from "../types";
import type { FlightSeatAssignmentInput, RoomAssignmentInput } from "../types";
import {
  deleteFlightSeatAssignment,
  deleteRoomAssignment,
  upsertFlightSeatAssignment,
  upsertRoomAssignment,
  deleteHotelFromAssignments,
  deleteFlightFromAssignments
} from "../lib/supabase";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  SectionHeader,
  formInputClass,
  formSelectClass,
  formTextareaClass,
  Modal
} from "../components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function memberDisplayName(profileId: string, data: AppData): string {
  const member = data.members.find((m) => m.profileId === profileId || m.id === profileId);
  return member?.profile.displayName ?? profileId;
}

function fmtDate(d: string | undefined): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShortDate(d: string | undefined): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function noteValue(notes: string | undefined, label: string): string {
  if (!notes) return "";
  const prefix = `${label}:`;
  const line = notes.split("\n").find((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : "";
}

function cleanHotelTitle(item: ItineraryItem): string {
  return (item.locationName || item.title.replace(/^Hotel:\s*/i, "")).trim();
}

function flightDetails(item: ItineraryItem) {
  const titleRoute = item.title.replace(/^Flight:\s*/i, "").trim();
  const airline = noteValue(item.notes, "Airline");
  const flightNumber = noteValue(item.notes, "Flight number");
  const from = noteValue(item.notes, "From");
  const to = noteValue(item.notes, "To");
  return {
    route: titleRoute || item.title,
    airline,
    flightNumber,
    from,
    to,
    label: [airline, flightNumber].filter(Boolean).join(" ")
  };
}

function friendlyAssignmentError(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (message.includes("permission") || message.includes("policy") || message.includes("rls")) {
    return "You don't have permission to edit this trip.";
  }
  if (message.includes("duplicate") || message.includes("unique") || message.includes("already")) {
    return "This item is already added.";
  }
  return "Couldn't save this yet. Please try again.";
}

function getHotelCheckOutDate(item: ItineraryItem, data: AppData): string | null {
  const hotelItems = data.itinerary.filter(i => i.category === "hotel").sort((a, b) => a.date.localeCompare(b.date));
  const tripStart = new Date(data.trip.startDate);
  const tripEnd = new Date(data.trip.endDate);
  const days: { date: string; label: string }[] = [];
  if (!isNaN(tripStart.getTime()) && !isNaN(tripEnd.getTime())) {
    let current = new Date(tripStart);
    let dayNum = 1;
    while (current <= tripEnd && dayNum < 100) {
      const dStr = current.toISOString().split('T')[0];
      const weekday = current.toLocaleDateString('en-GB', { weekday: 'short' });
      const month = current.toLocaleDateString('en-GB', { month: 'short' });
      const day = current.getDate();
      days.push({ date: dStr, label: `Day ${dayNum} – ${weekday}, ${month} ${day}` });
      current.setDate(current.getDate() + 1);
      dayNum++;
    }
  }

  let parsedCheckoutDate: string | null = null;
  if (item?.notes) {
    const coLine = item.notes.split('\n').find(l => /^Check-?out:/i.test(l));
    if (coLine) {
      const coVal = coLine.replace(/^Check-?out:/i, '').trim();
      const isoMatch = coVal.match(/(\d{4}-\d{2}-\d{2})/);
      const dayMatch = coVal.match(/Day\s+(\d+)/i);
      
      if (isoMatch) {
        parsedCheckoutDate = isoMatch[1];
      } else if (dayMatch) {
        const dayIndex = parseInt(dayMatch[1], 10) - 1;
        if (dayIndex >= 0 && dayIndex < days.length) {
          parsedCheckoutDate = days[dayIndex].date;
        }
      } else {
        const lastSpace = coVal.lastIndexOf(' ');
        if (lastSpace > -1) {
          const labelStr = coVal.substring(0, lastSpace).trim();
          const matchingDay = days.find(d => d.label === labelStr || d.date === labelStr);
          if (matchingDay) {
            parsedCheckoutDate = matchingDay.date;
          }
        }
      }
    }
  }

  let checkoutDate: string | null = parsedCheckoutDate;
  if (!checkoutDate) {
    const matchingItems = hotelItems.filter(h => h.id === item.id || (h.locationName || h.title) === (item.locationName || item.title));
    if (matchingItems.length > 1 && matchingItems[matchingItems.length - 1].date !== item.date) {
      checkoutDate = matchingItems[matchingItems.length - 1].date;
    } else {
      const itemIndex = hotelItems.findIndex(h => h.id === item.id);
      if (itemIndex !== -1 && itemIndex < hotelItems.length - 1) {
        checkoutDate = hotelItems[itemIndex + 1].date;
      }
    }
  }

  if (!checkoutDate) {
    const checkIn = new Date(item.date);
    checkIn.setDate(checkIn.getDate() + 1);
    checkoutDate = checkIn.toISOString().split('T')[0];
  }

  return checkoutDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1: Room Assignments Section
// ─────────────────────────────────────────────────────────────────────────────

function RoomForm({
  data,
  initial,
  onSave,
  onCancel,
  saving,
  onValidityChange,
  onRegisterSave
}: {
  data: AppData;
  initial: RoomAssignmentInput;
  onSave: (input: RoomAssignmentInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  onValidityChange?: (isValid: boolean) => void;
  onRegisterSave?: (saveFn: () => void) => void;
}) {
  const [form, setForm] = useState<RoomAssignmentInput>(initial);

  function toggleGuest(profileId: string) {
    setForm((prev) => ({
      ...prev,
      guestIds: prev.guestIds.includes(profileId)
        ? prev.guestIds.filter((g) => g !== profileId)
        : [...prev.guestIds, profileId]
    }));
  }

  const isValid = form.roomNumber.trim() !== "";

  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(() => {
    onRegisterSave?.(() => {
      void onSave(formRef.current);
    });
  }, [onRegisterSave, onSave]);

  return (
    <div className="space-y-4">
      <Field label="Room number / name">
        <input
          className={formInputClass}
          value={form.roomNumber}
          onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))}
          placeholder="e.g. 101 or Master Bedroom"
          autoFocus
        />
      </Field>

      <Field label="Guests in this room">
        <div className="mt-2 flex flex-wrap gap-2">
          {data.members.map((member) => {
            const selected = form.guestIds.includes(member.profileId);
            return (
              <button
                key={member.profileId}
                type="button"
                onClick={() => toggleGuest(member.profileId)}
                className={`inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-bold transition-all ${
                  selected
                    ? "bg-primary shadow-clay-button text-white"
                    : "bg-clay-recessed shadow-clay-pressed text-clay-secondary hover:bg-clay-surface hover:shadow-clay-surface"
                }`}
              >
                <Users className="h-4 w-4" />
                {member.profile.displayName}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Notes (optional)">
        <textarea
          className={formTextareaClass}
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Connecting rooms, baby cot requested"
        />
      </Field>
    </div>
  );
}

function RoomRow({
  ra,
  data,
  canEdit,
  onEdit,
  onDelete
}: {
  ra: RoomAssignment;
  data: AppData;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`relative rounded-[24px] border border-border/40 bg-clay-surface px-4 py-4 sm:px-5 shadow-sm transition-all hover:shadow-md ${menuOpen ? "z-50" : "z-0"}`}>
      {canEdit && (
        <div className="absolute top-3 right-3 z-[80]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary hover:text-clay-primary transition-all"
            aria-label="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-9 z-[90] min-w-[120px] rounded-[16px] bg-clay-surface p-1.5 shadow-clay-card border border-border/40 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[10px] text-left"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10 rounded-[10px] text-left"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-50 border border-indigo-100/50">
          <BedDouble className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <p className="font-bold text-clay-primary truncate">{ra.roomNumber}</p>
          {ra.guestIds.length > 0 ? (
            <p className="text-xs font-medium text-clay-secondary truncate">
              {ra.guestIds.map(gid => memberDisplayName(gid, data)).join(", ")}
            </p>
          ) : (
            <p className="text-xs font-medium text-amber-600">Unassigned</p>
          )}
        </div>
      </div>

      {ra.notes && (
        <div className="mt-3 text-xs text-clay-secondary bg-clay-recessed rounded-[12px] p-3 border border-border/30 whitespace-pre-line">
          {ra.notes}
        </div>
      )}
    </div>
  );
}

function RoomAssignmentsSection({
  data,
  canEdit,
  onRefresh
}: {
  data: AppData;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [addingHotel, setAddingHotel] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripHotels = useMemo(() => data.itinerary.filter(i => i.category === "hotel"), [data.itinerary]);
  
  // Find which hotels are opted-in to Rooms & Seats
  const optedInHotels = useMemo(() => {
    const assignedIds = new Set<string>();
    data.roomAssignments.forEach(ra => {
      if (ra.itineraryItemId) assignedIds.add(ra.itineraryItemId);
    });
    return tripHotels.filter(h => assignedIds.has(h.id));
  }, [data.roomAssignments, tripHotels]);

  const availableHotels = useMemo(() => {
    const optedInIds = new Set(optedInHotels.map(h => h.id));
    return tripHotels.filter(h => !optedInIds.has(h.id));
  }, [tripHotels, optedInHotels]);

  async function handleAddHotel(hotelId: string) {
    const hotel = tripHotels.find(h => h.id === hotelId);
    if (!hotel) return;
    if (optedInHotels.some((item) => item.id === hotelId)) {
      setError("This item is already added.");
      setAddingHotel(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const coDate = getHotelCheckOutDate(hotel, data);
      await upsertRoomAssignment(data.trip.id, {
        itineraryItemId: hotel.id,
        hotelName: cleanHotelTitle(hotel),
        checkInDate: hotel.date,
        checkOutDate: coDate || hotel.date,
        roomNumber: "__CONTAINER__",
        guestIds: [],
        notes: ""
      });
      setAddingHotel(false);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveHotel(hotelId: string) {
    if (!confirm("Remove this hotel and all its room assignments?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteHotelFromAssignments(data.trip.id, hotelId);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRoom(input: RoomAssignmentInput, id?: string) {
    setSaving(true);
    setError(null);
    try {
      await upsertRoomAssignment(data.trip.id, input, id);
      setEditingHotelId(null);
      setEditingRoomId(null);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm("Delete this room assignment?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRoomAssignment(data.trip.id, id);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  const showRoomModal = !!editingHotelId || !!editingRoomId;
  const editingRoom = editingRoomId ? data.roomAssignments.find(r => r.id === editingRoomId) : null;
  const targetHotelId = editingHotelId || (editingRoom ? editingRoom.itineraryItemId : null);
  const targetHotel = tripHotels.find(h => h.id === targetHotelId);

  const [roomValid, setRoomValid] = useState(false);
  const roomSaveRef = useRef<(() => void) | null>(null);

  return (
    <div className="space-y-6">
      {/* Hotel Picker Modal */}
      <Modal isOpen={addingHotel} onClose={() => setAddingHotel(false)} title="Add hotel">
        <div className="space-y-3 pb-6">
          {tripHotels.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-clay-primary">No hotels in your trip plan yet</p>
              <p className="text-xs text-clay-secondary mt-1">Add your hotel stays in Trip Plan first, then come back here to assign rooms.</p>
            </div>
          ) : availableHotels.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-clay-primary">All planned hotels have already been added.</p>
            </div>
          ) : (
            availableHotels.map(hotel => (
              <button
                key={hotel.id}
                onClick={() => handleAddHotel(hotel.id)}
                disabled={saving}
                className="w-full flex items-center gap-4 text-left p-4 rounded-[20px] bg-clay-surface shadow-sm border border-border/40 hover:bg-clay-recessed hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-50 border border-indigo-100/50">
                  <Hotel className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-clay-primary truncate">{cleanHotelTitle(hotel)}</p>
                  <p className="text-xs font-medium text-clay-secondary flex items-center gap-1.5 mt-0.5">
                    <CalendarRange className="h-3.5 w-3.5 opacity-60" />
                    {fmtShortDate(hotel.date)} – {fmtShortDate(getHotelCheckOutDate(hotel, data) || hotel.date)}
                  </p>
                  {(hotel.address || hotel.locationName) && (
                    <p className="text-xs font-medium text-clay-secondary/80 flex items-center gap-1.5 mt-1 truncate">
                      <MapPin className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span className="truncate">{hotel.address || hotel.locationName}</span>
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Room Modal */}
      {targetHotel && (
        <Modal
          isOpen={showRoomModal}
          onClose={() => { setEditingHotelId(null); setEditingRoomId(null); }}
          title={editingRoom ? "Edit room" : "Add room"}
          footer={
            <div className="flex gap-2">
              <Button type="button" onClick={() => roomSaveRef.current?.()} disabled={saving || !roomValid}>
                {saving ? "Saving…" : "Save room"}
              </Button>
              <Button variant="ghost" onClick={() => { setEditingHotelId(null); setEditingRoomId(null); }} disabled={saving}>
                Cancel
              </Button>
            </div>
          }
        >
          <div className="mb-4 bg-indigo-50/50 p-3 rounded-[16px] border border-indigo-100/50 flex items-center gap-3">
            <Hotel className="h-5 w-5 text-indigo-500 opacity-60" />
            <div>
              <p className="text-xs font-bold text-indigo-900/80 uppercase tracking-widest">Assigning room for</p>
              <p className="text-sm font-bold text-indigo-900">{cleanHotelTitle(targetHotel)}</p>
            </div>
          </div>
          <RoomForm
            key={editingRoomId ?? "new"}
            data={data}
            initial={editingRoom ? {
              hotelName: editingRoom.hotelName,
              checkInDate: editingRoom.checkInDate ?? "",
              checkOutDate: editingRoom.checkOutDate ?? "",
              roomNumber: editingRoom.roomNumber,
              guestIds: editingRoom.guestIds,
              notes: editingRoom.notes ?? "",
              itineraryItemId: editingRoom.itineraryItemId
            } : {
              hotelName: cleanHotelTitle(targetHotel),
              checkInDate: targetHotel.date,
              checkOutDate: getHotelCheckOutDate(targetHotel, data) || targetHotel.date,
              roomNumber: "",
              guestIds: [],
              notes: "",
              itineraryItemId: targetHotel.id
            }}
            onSave={handleSaveRoom}
            onCancel={() => { setEditingHotelId(null); setEditingRoomId(null); }}
            saving={saving}
            onValidityChange={setRoomValid}
            onRegisterSave={(fn) => { roomSaveRef.current = fn; }}
          />
        </Modal>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-clay-primary">Room keys</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mt-1">Who sleeps where</p>
        </div>
        {canEdit ? (
          <Button onClick={() => setAddingHotel(true)}>
            <Plus className="h-4 w-4" /> Add hotel
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {optedInHotels.length === 0 && !addingHotel ? (
        <EmptyState
          title={tripHotels.length === 0 ? "No hotels in your trip plan yet" : "No hotels added yet"}
          body={tripHotels.length === 0 ? "Add your hotel stays in Trip Plan first, then come back here to assign rooms." : "Tap Add hotel to start assigning rooms for this trip."}
          icon={<BedDouble className="h-10 w-10 opacity-80" />}
          action={
            canEdit && tripHotels.length > 0 ? (
              <Button onClick={() => setAddingHotel(true)}>
                <Plus className="h-4 w-4" /> Add hotel
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <div className="space-y-5">
        {optedInHotels.map(hotel => {
          const hotelRooms = data.roomAssignments.filter(ra => ra.itineraryItemId === hotel.id && ra.roomNumber !== "__CONTAINER__");
          const assignedMembers = new Set(hotelRooms.flatMap(r => r.guestIds));
          const hotelName = cleanHotelTitle(hotel);
          
          return (
            <div key={hotel.id} className="relative overflow-hidden rounded-[32px] bg-clay-surface p-5 pt-7 sm:p-6 sm:pt-8 shadow-clay-card border-0">
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-indigo-300 via-violet-400 to-purple-500" />
              {/* Hotel actions menu */}
              {canEdit && (
                <div className="absolute top-5 right-5 z-[40]">
                  <ActionMenu 
                    onRemove={() => handleRemoveHotel(hotel.id)} 
                    removeLabel="Remove hotel from Rooms & Seats" 
                  />
                </div>
              )}

              {/* Hotel Header */}
              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-indigo-100 shadow-clay-pressed">
                  <Hotel className="h-6 w-6 text-indigo-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xl font-black text-clay-primary leading-tight break-words">{hotelName}</h4>
                  <p className="text-sm font-medium text-clay-secondary flex items-center gap-1.5 mt-1 flex-wrap">
                    <CalendarRange className="h-4 w-4 opacity-60" />
                    {fmtDate(hotel.date)} – {fmtDate(getHotelCheckOutDate(hotel, data) || hotel.date)}
                  </p>
                  {hotel.address && (
                    <p className="text-xs font-medium text-clay-secondary/80 flex items-center gap-1.5 mt-1 truncate max-w-full">
                      <MapPin className="h-3 w-3 opacity-60 shrink-0" />
                      <span className="truncate">{hotel.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Summary Chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center rounded-full bg-clay-recessed px-3 py-1 text-xs font-bold text-clay-primary shadow-sm">
                  {hotelRooms.length} room{hotelRooms.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center rounded-full bg-clay-recessed px-3 py-1 text-xs font-bold text-clay-primary shadow-sm">
                  {assignedMembers.size} member{assignedMembers.size !== 1 ? 's' : ''} assigned
                </span>
              </div>

              {/* Rooms List */}
              <div className="mt-5 space-y-3">
                {hotelRooms.length > 0 ? (
                  hotelRooms.map(ra => (
                    <RoomRow
                      key={ra.id}
                      ra={ra}
                      data={data}
                      canEdit={canEdit}
                      onEdit={() => setEditingRoomId(ra.id)}
                      onDelete={() => void handleDeleteRoom(ra.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] bg-clay-recessed px-4 py-5 text-sm font-medium text-clay-secondary shadow-clay-pressed">
                    No rooms assigned yet.
                  </div>
                )}
              </div>

              {/* Add Room Button */}
              {canEdit && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onClick={() => setEditingHotelId(hotel.id)} className="text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50">
                    <Plus className="h-4 w-4 mr-1.5" /> Add room
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Action Menu (used by Hotel and Flight cards)
// ─────────────────────────────────────────────────────────────────────────────
function ActionMenu({ onRemove, removeLabel }: { onRemove: () => void, removeLabel: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary hover:text-clay-primary shadow-clay-pressed transition-all"
        aria-label="Actions"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="absolute right-0 top-11 z-[90] min-w-[200px] rounded-[16px] bg-clay-surface p-1.5 shadow-clay-card border border-border/40 flex flex-col gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRemove(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-[10px] text-left"
            >
              <Trash2 className="h-4 w-4" /> {removeLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 2: Flight Seat Assignments Section
// ─────────────────────────────────────────────────────────────────────────────

function SeatForm({
  data,
  initial,
  onSave,
  onCancel,
  saving,
  onValidityChange,
  onRegisterSave
}: {
  data: AppData;
  initial: FlightSeatAssignmentInput;
  onSave: (input: FlightSeatAssignmentInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  onValidityChange?: (isValid: boolean) => void;
  onRegisterSave?: (saveFn: () => void) => void;
}) {
  const [form, setForm] = useState<FlightSeatAssignmentInput>(initial);
  const isValid = !!form.guestId.trim() && !!form.seatNumber.trim();

  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(() => {
    onRegisterSave?.(() => {
      void onSave(formRef.current);
    });
  }, [onRegisterSave, onSave]);

  function selectMember(profileId: string) {
    const member = data.members.find((m) => m.profileId === profileId);
    setForm((prev) => ({
      ...prev,
      guestId: profileId,
      guestName: member?.profile.displayName ?? profileId
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Passenger">
          <select
            className={formSelectClass}
            value={form.guestId}
            onChange={(e) => selectMember(e.target.value)}
          >
            <option value="">Select passenger…</option>
            {data.members.map((m) => (
              <option key={m.profileId} value={m.profileId}>
                {m.profile.displayName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seat number">
          <input
            className={formInputClass}
            value={form.seatNumber}
            onChange={(e) => setForm((p) => ({ ...p, seatNumber: e.target.value }))}
            placeholder="e.g. 14A"
            autoFocus
          />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea
          className={formTextareaClass}
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Window seat, near emergency exit"
        />
      </Field>
    </div>
  );
}

function SeatCard({
  seat,
  canEdit,
  onEdit,
  onDelete
}: {
  seat: FlightSeatAssignment;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`relative flex items-center justify-between rounded-[24px] border border-border/40 bg-clay-surface p-4 sm:p-5 shadow-sm transition-all hover:shadow-md group ${menuOpen ? "z-50" : "z-0"}`}>
      <div className="absolute top-0 left-0 bottom-0 w-2 rounded-l-[24px] bg-gradient-to-b from-sky-400 to-blue-500" />
      
      <div className="flex items-center gap-4 pl-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Passenger</p>
          <p className="font-black text-lg text-clay-primary leading-none pr-2">{seat.guestName}</p>
          {seat.notes && (
            <p className="text-xs text-clay-secondary mt-1 max-w-[150px] sm:max-w-[200px] truncate">{seat.notes}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pr-1">
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Seat</p>
          <span className="inline-flex items-center justify-center rounded-[12px] bg-sky-50 border border-sky-100/50 px-3 py-1 font-mono text-base font-black text-sky-700">
            {seat.seatNumber}
          </span>
        </div>

        {canEdit && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary hover:text-clay-primary transition-all"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute right-0 top-9 z-[90] min-w-[120px] rounded-[16px] bg-clay-surface p-1.5 shadow-clay-card border border-border/40 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[10px] text-left"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10 rounded-[10px] text-left"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FlightSeatsSection({
  data,
  canEdit,
  onRefresh
}: {
  data: AppData;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [addingFlight, setAddingFlight] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripFlights = useMemo(() => data.itinerary.filter(i => i.category === "flight"), [data.itinerary]);

  const optedInFlights = useMemo(() => {
    const assignedIds = new Set<string>();
    data.flightSeatAssignments.forEach(sa => {
      if (sa.itineraryItemId) assignedIds.add(sa.itineraryItemId);
    });
    return tripFlights.filter(f => assignedIds.has(f.id));
  }, [data.flightSeatAssignments, tripFlights]);

  const availableFlights = useMemo(() => {
    const optedInIds = new Set(optedInFlights.map(f => f.id));
    return tripFlights.filter(f => !optedInIds.has(f.id));
  }, [tripFlights, optedInFlights]);

  async function handleAddFlight(flightId: string) {
    const flight = tripFlights.find(f => f.id === flightId);
    if (!flight) return;
    if (optedInFlights.some((item) => item.id === flightId)) {
      setError("This item is already added.");
      setAddingFlight(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertFlightSeatAssignment(data.trip.id, {
        itineraryItemId: flight.id,
        flightLabel: flight.title,
        guestId: "none",
        guestName: "none",
        seatNumber: "__CONTAINER__",
        notes: ""
      });
      setAddingFlight(false);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFlight(flightId: string) {
    if (!confirm("Remove this flight and all its seat assignments?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFlightFromAssignments(data.trip.id, flightId);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSeat(input: FlightSeatAssignmentInput, id?: string) {
    setSaving(true);
    setError(null);
    try {
      await upsertFlightSeatAssignment(data.trip.id, input, id);
      setEditingFlightId(null);
      setEditingSeatId(null);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeat(id: string) {
    if (!confirm("Delete this seat assignment?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFlightSeatAssignment(data.trip.id, id);
      await onRefresh();
    } catch (err) {
      setError(friendlyAssignmentError(err));
    } finally {
      setSaving(false);
    }
  }

  const showSeatModal = !!editingFlightId || !!editingSeatId;
  const editingSeat = editingSeatId ? data.flightSeatAssignments.find(s => s.id === editingSeatId) : null;
  const targetFlightId = editingFlightId || (editingSeat ? editingSeat.itineraryItemId : null);
  const targetFlight = tripFlights.find(f => f.id === targetFlightId);

  const [seatValid, setSeatValid] = useState(false);
  const seatSaveRef = useRef<(() => void) | null>(null);

  return (
    <div className="space-y-6">
      {/* Flight Picker Modal */}
      <Modal isOpen={addingFlight} onClose={() => setAddingFlight(false)} title="Add flight">
        <div className="space-y-3 pb-6">
          {tripFlights.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-clay-primary">No flights in your trip plan yet</p>
              <p className="text-xs text-clay-secondary mt-1">Add your flights in Trip Plan first, then come back here to assign seats.</p>
            </div>
          ) : availableFlights.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-clay-primary">All planned flights have already been added.</p>
            </div>
          ) : (
            availableFlights.map(flight => {
              const details = flightDetails(flight);
              return (
                <button
                  key={flight.id}
                  onClick={() => handleAddFlight(flight.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-4 text-left p-4 rounded-[20px] bg-clay-surface shadow-sm border border-border/40 hover:bg-clay-recessed hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sky-50 border border-sky-100/50">
                    <PlaneTakeoff className="h-5 w-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-clay-primary truncate">{details.route}</p>
                    {details.label && (
                      <p className="text-xs font-bold text-sky-700 truncate">{details.label}</p>
                    )}
                    <p className="text-xs font-medium text-clay-secondary flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      {fmtShortDate(flight.date)} {flight.startTime ? `at ${flight.startTime}` : ""}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Modal>

      {/* Seat Modal */}
      {targetFlight && (
        <Modal
          isOpen={showSeatModal}
          onClose={() => { setEditingFlightId(null); setEditingSeatId(null); }}
          title={editingSeat ? "Edit seat" : "Add seats"}
          footer={
            <div className="flex gap-2">
              <Button type="button" onClick={() => seatSaveRef.current?.()} disabled={saving || !seatValid}>
                {saving ? "Saving…" : "Save seat"}
              </Button>
              <Button variant="ghost" onClick={() => { setEditingFlightId(null); setEditingSeatId(null); }} disabled={saving}>
                Cancel
              </Button>
            </div>
          }
        >
          <div className="mb-4 bg-sky-50/50 p-3 rounded-[16px] border border-sky-100/50 flex items-center gap-3">
            <PlaneTakeoff className="h-5 w-5 text-sky-500 opacity-60" />
            <div>
              <p className="text-xs font-bold text-sky-900/80 uppercase tracking-widest">Assigning seat for</p>
              <p className="text-sm font-bold text-sky-900">{flightDetails(targetFlight).route}</p>
            </div>
          </div>
          <SeatForm
            key={editingSeatId ?? "new"}
            data={data}
            initial={editingSeat ? {
              flightLabel: editingSeat.flightLabel,
              guestId: editingSeat.guestId,
              guestName: editingSeat.guestName,
              seatNumber: editingSeat.seatNumber,
              notes: editingSeat.notes ?? "",
              itineraryItemId: editingSeat.itineraryItemId
            } : {
              flightLabel: targetFlight.title,
              guestId: "",
              guestName: "",
              seatNumber: "",
              notes: "",
              itineraryItemId: targetFlight.id
            }}
            onSave={handleSaveSeat}
            onCancel={() => { setEditingFlightId(null); setEditingSeatId(null); }}
            saving={saving}
            onValidityChange={setSeatValid}
            onRegisterSave={(fn) => { seatSaveRef.current = fn; }}
          />
        </Modal>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-clay-primary">Flight seats</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mt-1">Seat numbers for everyone</p>
        </div>
        {canEdit ? (
          <Button onClick={() => setAddingFlight(true)}>
            <Plus className="h-4 w-4" /> Add flight
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {optedInFlights.length === 0 && !addingFlight ? (
        <EmptyState
          title={tripFlights.length === 0 ? "No flights in your trip plan yet" : "No flights added yet"}
          body={tripFlights.length === 0 ? "Add your flights in Trip Plan first, then come back here to assign seats." : "Tap Add flight to start assigning seats for this trip."}
          icon={<PlaneTakeoff className="h-10 w-10 opacity-80" />}
          action={
            canEdit && tripFlights.length > 0 ? (
              <Button onClick={() => setAddingFlight(true)}>
                <Plus className="h-4 w-4" /> Add flight
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <div className="space-y-5">
        {optedInFlights.map(flight => {
          const seats = data.flightSeatAssignments.filter(sa => sa.itineraryItemId === flight.id && sa.seatNumber !== "__CONTAINER__");
          const assignedMembers = new Set(seats.map(s => s.guestId));
          const details = flightDetails(flight);

          return (
            <div key={flight.id} className="relative overflow-hidden rounded-[32px] bg-clay-surface shadow-clay-card border-0">
              <div className="bg-sky-500 px-5 py-4 text-white sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/20 shadow-sm">
                      <PlaneTakeoff className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black uppercase tracking-widest opacity-85">
                        {details.label || "Flight"}
                      </p>
                      <h4 className="truncate text-2xl font-black leading-tight">{details.route}</h4>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-[11px] font-black uppercase tracking-[0.2em] opacity-90 sm:inline">BOARDING</span>
                    {canEdit && (
                      <ActionMenu
                        onRemove={() => handleRemoveFlight(flight.id)}
                        removeLabel="Remove flight from Rooms & Seats"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-clay-secondary flex items-center gap-1.5 flex-wrap">
                    <Clock className="h-4 w-4 opacity-60" />
                    {fmtDate(flight.date)} {flight.startTime ? `at ${flight.startTime}` : ""}
                  </p>
                  {(details.from || details.to || flight.locationName) && (
                    <p className="text-xs font-medium text-clay-secondary/80 flex items-center gap-1.5 truncate max-w-full">
                      <MapPin className="h-3 w-3 opacity-60 shrink-0" />
                      <span className="truncate">{details.from && details.to ? `${details.from} to ${details.to}` : flight.locationName}</span>
                    </p>
                  )}
                </div>

              {/* Summary Chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center rounded-full bg-clay-recessed px-3 py-1 text-xs font-bold text-clay-primary shadow-sm">
                  {seats.length} seat{seats.length !== 1 ? 's' : ''} assigned
                </span>
                <span className="inline-flex items-center rounded-full bg-clay-recessed px-3 py-1 text-xs font-bold text-clay-primary shadow-sm">
                  {assignedMembers.size} member{assignedMembers.size !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Seats List */}
              <div className="mt-5 space-y-3">
                {seats.length > 0 ? (
                  seats.map(seat => (
                    <SeatCard
                      key={seat.id}
                      seat={seat}
                      canEdit={canEdit}
                      onEdit={() => setEditingSeatId(seat.id)}
                      onDelete={() => void handleDeleteSeat(seat.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] bg-clay-recessed px-4 py-5 text-sm font-medium text-clay-secondary shadow-clay-pressed">
                    No seats assigned yet.
                  </div>
                )}
              </div>

              {/* Add Seats Button */}
              {canEdit && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onClick={() => setEditingFlightId(flight.id)} className="text-sky-600 bg-sky-50/50 hover:bg-sky-100/50">
                    <Plus className="h-4 w-4 mr-1.5" /> Add seats
                  </Button>
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export function Assignments({
  data,
  canEdit = false,
  onRefresh
}: {
  data: AppData;
  canEdit?: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const roomCount = data.roomAssignments.filter(ra => ra.roomNumber !== "__CONTAINER__").length;
  const seatCount = data.flightSeatAssignments.filter(sa => sa.seatNumber !== "__CONTAINER__").length;
  const noData = roomCount === 0 && seatCount === 0 && data.itinerary.filter(i => i.category === "hotel" || i.category === "flight").length === 0;

  return (
    <div className="space-y-10 pb-10">
      <SectionHeader
        title="Assignments"
        eyebrow="Rooms & Seats"
        action={null}
      />

      {noData && !canEdit ? (
        <EmptyState
          title="No assignments yet"
          body="Room and seat assignments will appear here."
          icon={<Luggage className="h-10 w-10 opacity-80" />}
        />
      ) : (
        <div className="space-y-10">
          <RoomAssignmentsSection data={data} canEdit={canEdit} onRefresh={onRefresh!} />
          <div className="h-px w-full bg-border/40" />
          <FlightSeatsSection data={data} canEdit={canEdit} onRefresh={onRefresh!} />
        </div>
      )}
    </div>
  );
}
