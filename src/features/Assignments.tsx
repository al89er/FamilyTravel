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
  Users
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
  formTextareaClass
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
                  setForm((p) => ({ ...p, hotelName: e.target.value }));
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
              className={`${formInputClass} mt-2`}
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
      <div className="grid grid-cols-2 gap-3">
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
        <div className="mt-1 flex flex-wrap gap-2">
          {data.members.map((member) => {
            const selected = form.guestIds.includes(member.profileId);
            return (
              <button
                key={member.profileId}
                type="button"
                onClick={() => toggleGuest(member.profileId)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                  selected
                    ? "bg-primary/10 text-primary ring-primary/40"
                    : "bg-muted text-secondary ring-border hover:bg-muted/80"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
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

      <div className="flex gap-3">
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
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950">
            <BedDouble className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-mono text-base font-bold text-primary">#{ra.roomNumber}</span>
        </div>
        {canEdit ? (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-secondary hover:bg-muted hover:text-primary transition-colors"
              aria-label="Edit room assignment"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
              aria-label="Delete room assignment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Guest chips */}
      {ra.guestIds.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
          {ra.guestIds.map((gid) => (
            <span
              key={gid}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800"
            >
              {memberDisplayName(gid, data)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 pl-10 text-xs text-muted italic">No guests assigned</p>
      )}

      {ra.notes ? (
        <p className="mt-1.5 pl-10 text-xs text-muted">{ra.notes}</p>
      ) : null}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-primary">Room Assignments</h3>
          <p className="text-xs text-muted mt-0.5">Who is staying in which room</p>
        </div>
        {canEdit ? (
          <Button onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> Add room
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {adding ? (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
          <p className="text-sm font-semibold text-primary">New room assignment</p>
          <RoomForm
            data={data}
            initial={emptyRoom()}
            onSave={(input) => handleSave(input)}
            onCancel={() => setAdding(false)}
            saving={saving}
          />
        </div>
      ) : null}

      {grouped.length === 0 && !adding ? (
        <EmptyState
          title="No room assignments yet"
          body="Add room assignments to let everyone know where they're sleeping."
          icon={<BedDouble className="h-10 w-10" />}
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
      {grouped.map((hotel) => (
        <div key={hotel.hotelName} className="space-y-3">
          {/* Level 1: Hotel name */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
              <BedDouble className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="font-bold text-primary">{hotel.hotelName}</p>
          </div>

          {hotel.dateRanges.map((dr) => (
            <div key={dr.key} className="ml-2 space-y-2 border-l-2 border-border pl-4">
              {/* Level 2: Date range */}
              {dr.label ? (
                <div className="flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-secondary ring-1 ring-border/60">
                    {dr.label}
                  </span>
                </div>
              ) : null}

              {/* Level 3: Rooms */}
              {dr.rooms.map((room) => (
                <div key={room.roomNumber} className="space-y-2">
                  {room.assignments.map((ra) =>
                    editingId === ra.id ? (
                      <div key={ra.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                        <RoomForm
                          data={data}
                          initial={{
                            hotelName: ra.hotelName,
                            checkInDate: ra.checkInDate ?? "",
                            checkOutDate: ra.checkOutDate ?? "",
                            roomNumber: ra.roomNumber,
                            guestIds: ra.guestIds,
                            notes: ra.notes ?? ""
                          }}
                          onSave={(input) => handleSave(input, ra.id)}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                        />
                      </div>
                    ) : (
                      <RoomRow
                        key={ra.id}
                        ra={ra}
                        data={data}
                        canEdit={canEdit}
                        onEdit={() => { setEditingId(ra.id); setAdding(false); }}
                        onDelete={() => void handleDelete(ra.id)}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
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
          <p className="mt-1 text-xs text-muted">No flight items in itinerary — type the label below.</p>
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

      <Field label="Passenger">
        <select
          className={formSelectClass}
          value={form.guestId}
          onChange={(e) => selectMember(e.target.value)}
        >
          <option value="">Select a passenger…</option>
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

      <Field label="Notes (optional)">
        <textarea
          className={formTextareaClass}
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Window seat, near emergency exit"
        />
      </Field>

      <div className="flex gap-3">
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
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950">
        <PlaneTakeoff className="h-5 w-5 text-sky-600 dark:text-sky-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-primary">{seat.guestName}</p>
            <p className="text-sm text-secondary">
              Seat <span className="font-mono font-bold text-primary">{seat.seatNumber}</span>
            </p>
          </div>
          {canEdit ? (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-secondary hover:bg-muted hover:text-primary transition-colors"
                aria-label="Edit seat assignment"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-2 text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
                aria-label="Delete seat assignment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        {seat.notes ? (
          <p className="mt-1.5 text-xs text-muted">{seat.notes}</p>
        ) : null}
      </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-primary">Seat Assignments</h3>
          <p className="text-xs text-muted mt-0.5">Who sits where on each flight</p>
        </div>
        {canEdit ? (
          <Button onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> Add seat
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {adding ? (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
          <p className="text-sm font-semibold text-primary">New seat assignment</p>
          <SeatForm
            data={data}
            initial={emptySeat()}
            onSave={(input) => handleSave(input)}
            onCancel={() => setAdding(false)}
            saving={saving}
          />
        </div>
      ) : null}

      {Object.keys(byFlight).length === 0 && !adding ? (
        <EmptyState
          title="No seat assignments yet"
          body="Add seat numbers to help everyone find their seats at the airport."
          icon={<PlaneTakeoff className="h-10 w-10" />}
          action={
            canEdit ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add first seat
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {Object.entries(byFlight).map(([flight, seats]) => {
        const flightItem = data.itinerary.find(
          (item) => item.title === flight && item.category === "flight"
        );
        return (
          <div key={flight} className="space-y-3">
            <div className="flex items-center gap-2">
              <PlaneTakeoff className="h-4 w-4 text-muted" />
              <div>
                <p className="text-sm font-semibold text-secondary">{flight}</p>
                {flightItem ? (
                  <p className="text-xs text-muted">
                    {flightItem.date} · {flightItem.startTime}
                    {flightItem.endTime ? ` – ${flightItem.endTime}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
            {seats.map((seat) =>
              editingId === seat.id ? (
                <div key={seat.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <SeatForm
                    data={data}
                    initial={{
                      flightLabel: seat.flightLabel,
                      guestId: seat.guestId,
                      guestName: seat.guestName,
                      seatNumber: seat.seatNumber,
                      notes: seat.notes ?? ""
                    }}
                    onSave={(input) => handleSave(input, seat.id)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  canEdit={canEdit}
                  onEdit={() => { setEditingId(seat.id); setAdding(false); }}
                  onDelete={() => void handleDelete(seat.id)}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible tab card
// ─────────────────────────────────────────────────────────────────────────────

function TabCard({
  id,
  label,
  icon: Icon,
  badgeCount,
  children,
  defaultOpen = true
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  badgeCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        id={`assignments-tab-${id}`}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-primary">{label}</p>
            <p className="text-xs text-muted">
              {badgeCount} {badgeCount === 1 ? "assignment" : "assignments"}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted" />
        )}
      </button>
      {open ? <div className="border-t border-border p-5">{children}</div> : null}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Assignments Page
// ─────────────────────────────────────────────────────────────────────────────

export function Assignments({
  data,
  canEdit,
  onRefresh
}: {
  data: AppData;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Assignments"
        title="Family Assignments"
        action={
          <Badge tone="slate">
            <Luggage className="mr-1 h-3 w-3" />
            {data.members.length} travellers
          </Badge>
        }
      />
      <p className="text-sm text-secondary">
        Track room numbers and flight seat assignments so everyone knows where they're going.
        {!canEdit ? " Only planners can add or edit assignments." : ""}
      </p>

      <TabCard
        id="rooms"
        label="Room Assignments"
        icon={BedDouble}
        badgeCount={data.roomAssignments.length}
        defaultOpen
      >
        <RoomAssignmentsSection data={data} canEdit={canEdit} onRefresh={onRefresh} />
      </TabCard>

      <TabCard
        id="seats"
        label="Flight Seats"
        icon={PlaneTakeoff}
        badgeCount={data.flightSeatAssignments.length}
        defaultOpen={data.flightSeatAssignments.length > 0}
      >
        <FlightSeatsSection data={data} canEdit={canEdit} onRefresh={onRefresh} />
      </TabCard>
    </div>
  );
}
