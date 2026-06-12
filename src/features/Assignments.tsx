import { useState } from "react";
import {
  BedDouble,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Edit2,
  Luggage,
  PlaneTakeoff,
  Plus,
  Trash2,
  Users,
  Pencil,
  MoreVertical
} from "lucide-react";
import type { AppData, FlightSeatAssignment, RoomAssignment } from "../types";
import type { FlightSeatAssignmentInput, RoomAssignmentInput } from "../types";
import {
  deleteFlightSeatAssignment,
  deleteRoomAssignment,
  upsertFlightSeatAssignment,
  upsertRoomAssignment
} from "../lib/supabase";
import {
  Badge,
  Button,
  Card,
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

function getFlightItems(data: AppData) {
  return data.itinerary.filter((item) => item.category === "flight");
}

/** Format a YYYY-MM-DD date string as "27 Aug 2026" */
function fmtDate(d: string | undefined): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Build a human-readable date range like "27–28 Aug 2026" or "27 Aug 2026" */
function fmtDateRange(checkIn?: string, checkOut?: string): string {
  if (!checkIn) return "";
  const inFmt = fmtDate(checkIn);
  if (!checkOut || checkOut === checkIn) return inFmt;

  // Share month/year if same month
  const [inY, inM] = checkIn.split("-");
  const [outY, outM] = checkOut.split("-");
  const outDay = checkOut.split("-")[2].replace(/^0/, "");
  if (inY === outY && inM === outM) {
    const inDay = checkIn.split("-")[2].replace(/^0/, "");
    const monthYear = fmtDate(checkOut).slice(outDay.length + 1); // "Aug 2026"
    return `${inDay}–${outDay} ${monthYear}`;
  }
  return `${inFmt} – ${fmtDate(checkOut)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-level grouping: hotel → dateRange → roomNumber
// ─────────────────────────────────────────────────────────────────────────────

interface GroupedRooms {
  hotelName: string;
  dateRanges: {
    key: string;        // sort key (checkInDate or "")
    label: string;      // human-readable date range
    rooms: {
      roomNumber: string;
      assignments: RoomAssignment[];
    }[];
  }[];
}

function groupRoomAssignments(assignments: RoomAssignment[]): GroupedRooms[] {
  // hotel → dateRangeKey → roomNumber → assignments[]
  const map = new Map<string, Map<string, Map<string, RoomAssignment[]>>>();

  for (const ra of assignments) {
    const hotel = ra.hotelName;
    const drKey = `${ra.checkInDate ?? ""}__${ra.checkOutDate ?? ""}`;
    const room = ra.roomNumber;

    if (!map.has(hotel)) map.set(hotel, new Map());
    const drMap = map.get(hotel)!;
    if (!drMap.has(drKey)) drMap.set(drKey, new Map());
    const roomMap = drMap.get(drKey)!;
    if (!roomMap.has(room)) roomMap.set(room, []);
    roomMap.get(room)!.push(ra);
  }

  return Array.from(map.entries()).map(([hotelName, drMap]) => ({
    hotelName,
    dateRanges: Array.from(drMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([drKey, roomMap]) => {
        const [checkIn, checkOut] = drKey.split("__");
        return {
          key: drKey,
          label: fmtDateRange(checkIn || undefined, checkOut || undefined),
          rooms: Array.from(roomMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([roomNumber, assignments]) => ({ roomNumber, assignments }))
        };
      })
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Assignment Form
// ─────────────────────────────────────────────────────────────────────────────

const emptyRoom = (): RoomAssignmentInput => ({
  hotelName: "",
  checkInDate: "",
  checkOutDate: "",
  roomNumber: "",
  guestIds: [],
  notes: ""
});

function RoomForm({
  data,
  initial,
  onSave,
  onCancel,
  saving
}: {
  data: AppData;
  initial: RoomAssignmentInput;
  onSave: (input: RoomAssignmentInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<RoomAssignmentInput>(initial);

  // Auto-suggest hotel names from itinerary hotel items
  const hotelItems = data.itinerary.filter((i) => i.category === "hotel");

  function toggleGuest(profileId: string) {
    setForm((prev) => ({
      ...prev,
      guestIds: prev.guestIds.includes(profileId)
        ? prev.guestIds.filter((g) => g !== profileId)
        : [...prev.guestIds, profileId]
    }));
  }

  const isValid = form.hotelName.trim() !== "" && form.roomNumber.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Hotel name */}
      <Field label="Hotel / accommodation name">
        {hotelItems.length > 0 ? (
          <>
            <select
              className={formSelectClass}
              value={hotelItems.some((h) => h.locationName === form.hotelName || h.title === form.hotelName) ? form.hotelName : "__custom__"}
              onChange={(e) => {
                if (e.target.value !== "__custom__") {
                  const selectedName = e.target.value;
                  const sortedHotels = [...hotelItems].sort((a, b) => a.date.localeCompare(b.date));
                  const matchingItems = sortedHotels.filter(h => (h.locationName || h.title) === selectedName);
                  const item = matchingItems[0];

                  // Reconstruct trip days to match label from notes
                  const tripStart = new Date(data.trip.startDate);
                  const tripEnd = new Date(data.trip.endDate);
                  const days: { date: string; label: string }[] = [];
                  if (!isNaN(tripStart.getTime()) && !isNaN(tripEnd.getTime())) {
                    let current = new Date(tripStart);
                    let dayNum = 1;
                    let safety = 0;
                    while (current <= tripEnd && safety < 100) {
                      const dStr = current.toISOString().split('T')[0];
                      const weekday = current.toLocaleDateString('en-GB', { weekday: 'short' });
                      const month = current.toLocaleDateString('en-GB', { month: 'short' });
                      const day = current.getDate();
                      days.push({ date: dStr, label: `Day ${dayNum} – ${weekday}, ${month} ${day}` });
                      current.setDate(current.getDate() + 1);
                      dayNum++;
                      safety++;
                    }
                  }

                  // Find checkout date from trip plan:
                  // 0. Parse from notes (generated by ItineraryForm Check-out inputs)
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

                  // 1. If there's another item for the same hotel (e.g. explicitly added checkout item)
                  // 2. Otherwise, use the date of the NEXT hotel in the itinerary
                  let checkoutDate: string | null = parsedCheckoutDate;
                  if (!checkoutDate) {
                    if (matchingItems.length > 1 && matchingItems[matchingItems.length - 1].date !== item.date) {
                      checkoutDate = matchingItems[matchingItems.length - 1].date;
                    } else if (item) {
                      const itemIndex = sortedHotels.findIndex(h => h.id === item.id);
                      if (itemIndex !== -1 && itemIndex < sortedHotels.length - 1) {
                        checkoutDate = sortedHotels[itemIndex + 1].date;
                      }
                    }
                  }

                  setForm((p) => {
                    const nextState = { ...p, hotelName: selectedName };
                    if (item?.date) {
                      if (!p.checkInDate) nextState.checkInDate = item.date;
                      if (!p.checkOutDate) {
                        if (checkoutDate) {
                          nextState.checkOutDate = checkoutDate;
                        } else {
                          const checkIn = new Date(item.date);
                          checkIn.setDate(checkIn.getDate() + 1);
                          nextState.checkOutDate = checkIn.toISOString().split('T')[0];
                        }
                      }
                    }
                    return nextState;
                  });
                }
              }}
            >
              <option value="__custom__">— Type a name below —</option>
              {hotelItems.map((h) => {
                const name = h.locationName || h.title;
                return <option key={h.id} value={name}>{name}</option>;
              })}
            </select>
            <input
              className={`${formInputClass} mt-3`}
              value={form.hotelName}
              onChange={(e) => setForm((p) => ({ ...p, hotelName: e.target.value }))}
              placeholder="e.g. Amnaya Resort Kuta"
            />
          </>
        ) : (
          <input
            className={formInputClass}
            value={form.hotelName}
            onChange={(e) => setForm((p) => ({ ...p, hotelName: e.target.value }))}
            placeholder="e.g. Amnaya Resort Kuta"
          />
        )}
      </Field>

      {/* Check-in / Check-out dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Check-in date">
          <input
            type="date"
            className={formInputClass}
            value={form.checkInDate ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, checkInDate: e.target.value }))}
          />
        </Field>
        <Field label="Check-out date">
          <input
            type="date"
            className={formInputClass}
            value={form.checkOutDate ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, checkOutDate: e.target.value }))}
          />
        </Field>
      </div>

      {/* Room number */}
      <Field label="Room number">
        <input
          className={formInputClass}
          value={form.roomNumber}
          onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))}
          placeholder="e.g. 101"
        />
      </Field>

      {/* Guest chip picker */}
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

      {/* Notes */}
      <Field label="Notes (optional)">
        <textarea
          className={formTextareaClass}
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Connecting rooms, baby cot requested"
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          onClick={() => void onSave(form)}
          disabled={saving || !isValid}
        >
          {saving ? "Saving…" : "Save room"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual room row (under hotel → date range → room number)
// ─────────────────────────────────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(false);

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-surface text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary active:scale-90 transition-all shadow-clay-card"
          aria-label="Actions"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-50 min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[12px] transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-[12px] transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border-0 bg-clay-surface px-5 py-5 sm:px-6 shadow-clay-card transition-all hover:shadow-clay-hover hover:-translate-y-1 group">
      <ActionMenu />
      {/* Key card accent strip */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-400 to-purple-500" />
      
      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-clay-btn">
            <BedDouble className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary block mb-1">Room</span>
            <span className="font-mono text-2xl font-black text-clay-primary leading-none pr-8">{ra.roomNumber}</span>
          </div>
        </div>

        {/* Guest name pills on the right side, stacked */}
        <div className="flex flex-col gap-1 items-end ml-auto pr-8">
          {ra.guestIds.length > 0 ? (
            ra.guestIds.map((gid) => (
              <span
                key={gid}
                className="inline-flex items-center gap-1.5 rounded-[12px] bg-clay-recessed px-3 py-1 text-xs font-bold text-clay-secondary shadow-clay-pressed whitespace-nowrap"
              >
                {memberDisplayName(gid, data)}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center rounded-[12px] bg-amber-50 text-amber-700 px-3 py-1 text-xs font-bold shadow-sm whitespace-nowrap">
              Unassigned
            </span>
          )}
        </div>
      </div>

      {ra.notes ? (
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-secondary hover:text-clay-primary transition-all focus:outline-none bg-clay-recessed shadow-clay-pressed py-1.5 px-3 rounded-[12px]"
          >
            <span>{expanded ? "Hide Details" : "Show Details"}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      ) : null}
      {expanded && ra.notes && (
        <div className="mt-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed p-3.5">
          <p className="text-xs font-medium text-clay-secondary leading-relaxed">{ra.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1: Room Assignments Section
// ─────────────────────────────────────────────────────────────────────────────

function RoomAssignmentsSection({
  data,
  canEdit,
  onRefresh
}: {
  data: AppData;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHotels, setExpandedHotels] = useState<Record<string, boolean>>({});

  async function handleSave(input: RoomAssignmentInput, id?: string) {
    setSaving(true);
    setError(null);
    try {
      await upsertRoomAssignment(data.trip.id, input, id);
      setAdding(false);
      setEditingId(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save room assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this room assignment?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRoomAssignment(data.trip.id, id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete room assignment.");
    } finally {
      setSaving(false);
    }
  }

  const grouped = groupRoomAssignments(data.roomAssignments);

  const editingRoom = editingId ? data.roomAssignments.find(r => r.id === editingId) : null;
  const showModal = adding || !!editingRoom;

  return (
    <div className="space-y-6">
      <Modal isOpen={showModal} onClose={() => { setAdding(false); setEditingId(null); }} title={editingRoom ? "Edit room" : "Add room"}>
        <RoomForm
          key={editingId ?? "new"}
          data={data}
          initial={editingRoom ? {
            hotelName: editingRoom.hotelName,
            checkInDate: editingRoom.checkInDate ?? "",
            checkOutDate: editingRoom.checkOutDate ?? "",
            roomNumber: editingRoom.roomNumber,
            guestIds: editingRoom.guestIds,
            notes: editingRoom.notes ?? ""
          } : emptyRoom()}
          onSave={(input) => handleSave(input, editingId ?? undefined)}
          onCancel={() => { setAdding(false); setEditingId(null); }}
          saving={saving}
        />
      </Modal>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-clay-primary">Room keys</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mt-1">Who sleeps where</p>
        </div>
        {canEdit ? (
          <Button onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> Add room
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {grouped.length === 0 && !adding ? (
        <EmptyState
          title="No room assignments yet"
          body="Add room assignments once rooms are confirmed."
          icon={<BedDouble className="h-10 w-10 opacity-80" />}
          action={
            canEdit ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add first room
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {/* ── 3-level hierarchy ── */}
      {grouped.map((hotel) => {
        const isExpanded = expandedHotels[hotel.hotelName] !== false;
        return (
          <div key={hotel.hotelName} className="space-y-4 bg-clay-surface p-5 sm:p-6 rounded-[32px] shadow-clay-card">
            {/* Level 1: Hotel name (Clickable to collapse/expand) */}
            <div
              onClick={() => setExpandedHotels((prev) => ({ ...prev, [hotel.hotelName]: !isExpanded }))}
              className="flex items-center justify-between gap-3 cursor-pointer select-none group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-indigo-100 shadow-clay-pressed group-hover:scale-105 transition-transform">
                  <BedDouble className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <p className="font-black text-xl text-clay-primary">{hotel.hotelName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mt-0.5">
                    {hotel.dateRanges.length} date range{hotel.dateRanges.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary shadow-clay-pressed group-hover:text-clay-primary transition-all">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>

            {isExpanded && hotel.dateRanges.map((dr) => (
              <div key={dr.key} className="space-y-3 mt-4 pt-4 border-t border-border/40">
                {/* Level 2: Date range */}
                {dr.label ? (
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      {dr.label}
                    </span>
                  </div>
                ) : null}

                {/* Level 3: Rooms */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {dr.rooms.map((room) => (
                    <div key={room.roomNumber} className="space-y-3">
                      {room.assignments.map((ra) => (
                        <RoomRow
                          key={ra.id}
                          ra={ra}
                          data={data}
                          canEdit={canEdit}
                          onEdit={() => { setEditingId(ra.id); setAdding(false); }}
                          onDelete={() => void handleDelete(ra.id)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flight Seat Form
// ─────────────────────────────────────────────────────────────────────────────

const emptySeat = (): FlightSeatAssignmentInput => ({
  flightLabel: "",
  guestId: "",
  guestName: "",
  seatNumber: "",
  notes: ""
});

function SeatForm({
  data,
  initial,
  onSave,
  onCancel,
  saving
}: {
  data: AppData;
  initial: FlightSeatAssignmentInput;
  onSave: (input: FlightSeatAssignmentInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FlightSeatAssignmentInput>(initial);
  const flightItems = getFlightItems(data);

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
      <Field label="Flight">
        <select
          className={formSelectClass}
          value={form.flightLabel}
          onChange={(e) => setForm((p) => ({ ...p, flightLabel: e.target.value }))}
        >
          <option value="">Select a flight…</option>
          {flightItems.map((f) => (
            <option key={f.id} value={f.title}>
              {f.title} – {f.date}
            </option>
          ))}
          {form.flightLabel && !flightItems.find((f) => f.title === form.flightLabel) ? (
            <option value={form.flightLabel}>{form.flightLabel}</option>
          ) : null}
        </select>
        {flightItems.length === 0 ? (
          <p className="mt-1 ml-1 text-[11px] font-bold uppercase tracking-wider text-clay-secondary">No flight items in itinerary — type the label below.</p>
        ) : null}
      </Field>

      {flightItems.length === 0 ? (
        <Field label="Flight label (manual)">
          <input
            className={formInputClass}
            value={form.flightLabel}
            onChange={(e) => setForm((p) => ({ ...p, flightLabel: e.target.value }))}
            placeholder="e.g. Flight: KUL → DPS"
          />
        </Field>
      ) : null}

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

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          onClick={() => void onSave(form)}
          disabled={saving || !form.flightLabel.trim() || !form.guestId.trim() || !form.seatNumber.trim()}
        >
          {saving ? "Saving…" : "Save seat"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flight Seat Card
// ─────────────────────────────────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(false);

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-surface text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary active:scale-90 transition-all shadow-clay-card"
          aria-label="Actions"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-50 min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[12px] transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-[12px] transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[28px] border-0 bg-clay-surface shadow-clay-card transition-all hover:shadow-clay-hover hover:-translate-y-1 group">
      <ActionMenu />
      {/* Boarding pass accent strip */}
      <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-to-b from-sky-400 to-blue-500" />
      
      <div className="flex items-center justify-between p-5 pl-8 sm:p-6 pr-14 relative mt-1.5">
        {/* Left side: Icon & Passenger */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-400 to-sky-600 shadow-clay-btn">
            <PlaneTakeoff className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-1">Passenger</p>
            <p className="font-black text-lg sm:text-xl text-clay-primary leading-none pr-2">{seat.guestName}</p>
          </div>
        </div>

        {/* Right side: Seat number */}
        <div className="flex flex-col items-end ml-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-1">Seat</p>
          <span className="inline-flex items-center justify-center rounded-[14px] bg-clay-recessed shadow-clay-pressed px-3.5 py-1.5 font-mono text-lg font-black text-clay-primary">
            {seat.seatNumber}
          </span>
        </div>
      </div>
      
      {seat.notes ? (
        <div className="px-6 pb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-secondary hover:text-clay-primary transition-all focus:outline-none bg-clay-recessed shadow-clay-pressed py-1.5 px-3 rounded-[12px]"
          >
            <span>{expanded ? "Hide Details" : "Show Details"}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      ) : null}
      {expanded && seat.notes && (
        <div className="w-full bg-clay-recessed shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border-t border-dashed border-border/50 px-6 py-4">
          <p className="text-xs font-bold text-clay-secondary">{seat.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 2: Flight Seat Assignments Section
// ─────────────────────────────────────────────────────────────────────────────

function FlightSeatsSection({
  data,
  canEdit,
  onRefresh
}: {
  data: AppData;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFlights, setExpandedFlights] = useState<Record<string, boolean>>({});

  async function handleSave(input: FlightSeatAssignmentInput, id?: string) {
    setSaving(true);
    setError(null);
    try {
      await upsertFlightSeatAssignment(data.trip.id, input, id);
      setAdding(false);
      setEditingId(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save seat assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this seat assignment?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFlightSeatAssignment(data.trip.id, id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete seat assignment.");
    } finally {
      setSaving(false);
    }
  }

  // Group seats by flight label
  const byFlight = data.flightSeatAssignments.reduce<Record<string, FlightSeatAssignment[]>>((acc, s) => {
    const key = s.flightLabel;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const editingSeat = editingId ? data.flightSeatAssignments.find(s => s.id === editingId) : null;
  const showModal = adding || !!editingSeat;

  return (
    <div className="space-y-6">
      <Modal isOpen={showModal} onClose={() => { setAdding(false); setEditingId(null); }} title={editingSeat ? "Edit seat" : "Add seat"}>
        <SeatForm
          key={editingId ?? "new"}
          data={data}
          initial={editingSeat ? {
            flightLabel: editingSeat.flightLabel,
            guestId: editingSeat.guestId,
            guestName: editingSeat.guestName,
            seatNumber: editingSeat.seatNumber,
            notes: editingSeat.notes ?? ""
          } : emptySeat()}
          onSave={(input) => handleSave(input, editingId ?? undefined)}
          onCancel={() => { setAdding(false); setEditingId(null); }}
          saving={saving}
        />
      </Modal>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-clay-primary">Flight seats</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mt-1">Seat numbers for everyone</p>
        </div>
        {canEdit ? (
          <Button onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> Add seat
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {Object.keys(byFlight).length === 0 && !adding ? (
        <EmptyState
          title="No seat assignments yet"
          body="Add flight seats after check-in opens."
          icon={<PlaneTakeoff className="h-10 w-10 opacity-80" />}
          action={
            canEdit ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add first seat
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {/* ── 2-level hierarchy ── */}
      {Object.entries(byFlight).map(([flightLabel, seats]) => {
        const isExpanded = expandedFlights[flightLabel] !== false;
        return (
          <div key={flightLabel} className="space-y-4 bg-clay-surface p-5 sm:p-6 rounded-[32px] shadow-clay-card">
            {/* Level 1: Flight label (Clickable to collapse/expand) */}
            <div
              onClick={() => setExpandedFlights((prev) => ({ ...prev, [flightLabel]: !isExpanded }))}
              className="flex items-center justify-between gap-3 cursor-pointer select-none group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-sky-100 shadow-clay-pressed group-hover:scale-105 transition-transform">
                  <PlaneTakeoff className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <p className="font-black text-xl text-clay-primary">{flightLabel}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mt-0.5">
                    {seats.length} seat assignment{seats.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary shadow-clay-pressed group-hover:text-clay-primary transition-all">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>

            {isExpanded && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
                {seats.map((seat) => (
                  <SeatCard
                    key={seat.id}
                    seat={seat}
                    canEdit={canEdit}
                    onEdit={() => { setEditingId(seat.id); setAdding(false); }}
                    onDelete={() => void handleDelete(seat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
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
  const noData = data.roomAssignments.length === 0 && data.flightSeatAssignments.length === 0;

  return (
    <div className="space-y-10 pb-10">
      <SectionHeader
        title="Assignments"
        eyebrow="Rooms & Seats"
        action={null} // Actions are inside the individual sections
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
