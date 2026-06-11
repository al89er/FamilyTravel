import { Clock, MapPin, MessageSquare, Pencil, Plus, Trash2, ThumbsUp, Plane, Car, Bed, Utensils, Ticket, ShoppingBag, Coffee, AlertCircle, Star, ChevronDown, ChevronUp, CalendarClock } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CategoryBadge, EmptyState, ErrorState, Field, SectionHeader, categoryStyles, formInputClass, formTextareaClass, formSelectClass } from "../components/ui";
import { addFamilyComment, castFamilyVote, deleteItineraryItem, upsertItineraryItem } from "../lib/supabase";
import type { AppData, FamilySession, ItineraryCategory, ItineraryInput, ItineraryItem, Trip, Visibility, VoteValue } from "../types";

export function Itinerary({
  data,
  familySession,
  canEdit = false,
  onRefresh,
  onRefreshFamily
}: {
  data: AppData;
  familySession: FamilySession | null;
  canEdit?: boolean;
  onRefresh?: () => Promise<void>;
  onRefreshFamily?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const itemsByDate = data.itinerary.reduce<Record<string, ItineraryItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item].sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Shared Itinerary"
        eyebrow="Timeline, day, and family view"
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add item</Button> : null}
      />
      {canEdit && showForm ? (
        <ItineraryForm
          trip={data.trip}
          items={data.itinerary}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}
      {Object.keys(itemsByDate).length === 0 ? (
        <EmptyState 
          icon={<CalendarClock className="h-8 w-8" />}
          title="No itinerary yet" 
          body="Add flights, hotels, meals, activities, and free time to build the shared plan." 
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(itemsByDate).map(([date, items]) => {
            // Format date as "Thu, 14 Aug 2026"
            const dateObj = new Date(`${date}T00:00:00`);
            const dayLabel = isNaN(dateObj.getTime())
              ? date
              : dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
            return (
            <div key={date} className="relative">
              <div className="sticky top-14 z-10 -mx-4 mb-5 flex items-center gap-3 bg-app/95 px-4 py-2.5 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:border-border/60 sm:bg-surface/95 sm:px-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {items.length}
                </span>
                <h3 className="font-bold text-primary">{dayLabel}</h3>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-secondary">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="space-y-0 relative">
                {items.map((item, idx) => (
                  <ItineraryRow key={item.id} item={item} data={data} canEdit={canEdit} familySession={familySession} onRefresh={onRefresh} onRefreshFamily={onRefreshFamily} isLast={idx === items.length - 1} />
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const getCategoryIcon = (cat: ItineraryCategory, className?: string) => {
  const c = className || "h-5 w-5";
  switch(cat) {
    case "flight": return <Plane className={c} />;
    case "transport": return <Car className={c} />;
    case "hotel": return <Bed className={c} />;
    case "food": return <Utensils className={c} />;
    case "activity": return <Ticket className={c} />;
    case "shopping": return <ShoppingBag className={c} />;
    case "free_time": return <Coffee className={c} />;
    case "emergency": return <AlertCircle className={c} />;
    default: return <Star className={c} />;
  }
};

function ItineraryRow({
  item,
  data,
  canEdit,
  familySession,
  onRefresh,
  onRefreshFamily,
  isLast
}: {
  item: ItineraryItem;
  data: AppData;
  canEdit: boolean;
  familySession: FamilySession | null;
  onRefresh?: () => Promise<void>;
  onRefreshFamily?: () => void;
  isLast?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const votes = data.votes.filter((vote) => vote.itineraryItemId === item.id);
  const comments = data.comments.filter((comment) => comment.targetId === item.id);
  const mustDo = votes.filter((vote) => vote.value === "must_do").length;

  async function submitVote(value: VoteValue) {
    if (!familySession) return;
    setBusy(true);
    setError(null);
    try {
      const { error: voteError } = await castFamilyVote(familySession, item.id, value);
      if (voteError) throw voteError;
      onRefreshFamily?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!familySession || !comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { error: commentError } = await addFamilyComment(familySession, "itinerary_item", item.id, comment.trim());
      if (commentError) throw commentError;
      setComment("");
      onRefreshFamily?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    if (!window.confirm("Delete this itinerary item?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteItineraryItem(data.trip.id, item.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <ItineraryForm
        trip={data.trip}
        items={data.itinerary}
        item={item}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await onRefresh?.();
        }}
      />
    );
  }

  const cs = categoryStyles(item.category);
  return (
    <article className="relative pl-12 sm:pl-16 py-2.5 group">
      {!isLast && <div className="absolute left-[23px] sm:left-[31px] top-12 bottom-[-10px] w-0.5 rounded-full bg-border/60" aria-hidden="true" />}

      {/* Category-coloured timeline node */}
      <div className={`absolute left-0.5 sm:left-2.5 top-3.5 h-10 w-10 rounded-xl border-2 border-surface shadow-sm flex items-center justify-center z-10 ${cs.iconBg} ${cs.iconText}`}>
        {getCategoryIcon(item.category)}
      </div>

      <Card className="p-4 sm:p-5 w-full transition-all hover:ring-primary/20">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Time column */}
          <div className="shrink-0 sm:w-20 sm:mt-0.5">
            <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-sm font-bold text-primary tabular-nums">
              {item.startTime}
            </span>
            {item.endTime ? (
              <p className="mt-1 pl-0.5 text-[11px] font-medium text-muted">→ {item.endTime}</p>
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-primary">{item.title}</h3>
              <CategoryBadge category={item.category} />
              {item.visibility !== "shared" ? <Badge tone="zinc">{item.visibility}</Badge> : null}
            </div>
            
            {canEdit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                <Button variant="ghost" disabled={busy} onClick={() => void removeItem()}><Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />Delete</Button>
              </div>
            ) : null}
            
            {item.locationName ? (
              <p className="mt-3 flex gap-1.5 text-sm text-secondary font-medium">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span>{item.locationName}</span>
              </p>
            ) : null}
            
            {item.notes ? (
              <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm leading-relaxed text-secondary border-l-2 border-border">
                {item.notes}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3 text-xs text-secondary">
              {(votes.length > 0) ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-medium">
                  <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                  {mustDo} must-do · {votes.length} votes
                </span>
              ) : null}
              {(comments.length > 0) ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-medium">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </span>
              ) : null}
              {item.bookingReference ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/8 px-2.5 py-1 font-mono font-semibold text-primary">
                  Ref {item.bookingReference}
                </span>
              ) : null}
            </div>
        {familySession && (familySession.permissions.votes || familySession.permissions.comments || error) ? (
          <div className="mt-4 space-y-3 rounded-lg bg-muted p-3">
            {familySession.permissions.votes ? (
              <div className="flex flex-wrap gap-2">
                {(["must_do", "interested", "neutral", "skip"] as VoteValue[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitVote(value)}
                    className="min-h-10 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-secondary disabled:opacity-50"
                  >
                    {value.replace("_", " ")}
                  </button>
                ))}
              </div>
            ) : null}
            {familySession.permissions.comments ? (
              <form className="flex gap-2" onSubmit={submitComment}>
                <input
                  className={`${formInputClass} min-h-10 text-sm`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a family note"
                />
                <button
                  type="submit"
                  disabled={busy || !comment.trim()}
                  className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        ) : null}
        {comments.length ? (
          <div className="mt-3 space-y-2">
            {comments.slice(0, 3).map((entry) => (
              <p key={entry.id} className="rounded-lg bg-surface text-sm text-secondary">
                {entry.body}
              </p>
            ))}
          </div>
        ) : null}
      </div>
        </div>
      </Card>
    </article>
  );
}

const itineraryCategories: ItineraryCategory[] = ["flight", "transport", "hotel", "food", "activity", "shopping", "free_time", "emergency", "other"];
const visibilityOptions: Visibility[] = ["shared", "planner_only", "private"];

function ItineraryForm({
  trip,
  items,
  item,
  onSaved,
  onCancel
}: {
  trip: Trip;
  items: ItineraryItem[];
  item?: ItineraryItem;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showOptional, setShowOptional] = useState(false);
  
  // Date calculations
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  const days: { date: string; label: string }[] = [];
  if (!isNaN(tripStart.getTime()) && !isNaN(tripEnd.getTime())) {
    let current = new Date(tripStart);
    let dayNum = 1;
    // ensure we don't infinite loop if dates are weird
    let safety = 0;
    while (current <= tripEnd && safety < 100) {
      days.push({
        date: current.toISOString().slice(0, 10),
        label: `Day ${dayNum} - ${current.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`
      });
      current.setDate(current.getDate() + 1);
      dayNum++;
      safety++;
    }
  }

  // Calculate default date for new items: latest date among existing items, or trip start
  const defaultDate = item?.date ?? (items.length > 0 ? items[items.length - 1].date : trip.startDate);

  const [form, setForm] = useState<ItineraryInput>({
    date: defaultDate,
    startTime: item?.startTime ?? "09:00",
    endTime: item?.endTime,
    title: item?.title ?? "",
    category: item?.category ?? "activity",
    locationName: item?.locationName,
    address: item?.address,
    notes: item?.notes,
    estimatedCost: item?.estimatedCost,
    bookingReference: item?.bookingReference,
    attachmentUrl: item?.attachmentUrl,
    visibility: item?.visibility ?? "shared",
    sortOrder: item?.sortOrder ?? 0
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catData, setCatData] = useState(() => {
    const init = {
      fromAirport: "", fromCode: "", toAirport: "", toCode: "", airline: "", flightNumber: "",
      hotelName: "", hotelCheckOutDate: "", hotelCheckOutTime: "12:00",
      transportType: "Grab", transportFrom: "", transportTo: "", driverContact: "",
      mealType: "Dinner", restaurantName: "",
      activityName: "", activityLocation: "",
      shoppingPlace: "", shoppingPurpose: "", shoppingBudget: "",
      freeTimeLabel: "Free time",
      userNotes: ""
    };
    if (!item) return init;

    if (item.category === "flight") {
      init.fromAirport = item.locationName || "";
      if (item.title.startsWith("Flight: ") && item.title.includes(" → ")) {
        const parts = item.title.replace("Flight: ", "").split(" → ");
        init.fromCode = parts[0].trim();
        init.toCode = parts[1].trim();
      }
      if (item.notes) {
        const lines = item.notes.split('\n');
        let inNotes = false, userNotesLines = [];
        for (const line of lines) {
          if (inNotes) { userNotesLines.push(line); continue; }
          if (line.startsWith('Airline: ')) init.airline = line.slice(9).trim();
          else if (line.startsWith('Flight number: ')) init.flightNumber = line.slice(15).trim();
          else if (line.startsWith('From: ')) {
            const fromStr = line.slice(6).trim();
            if (!init.fromAirport) init.fromAirport = fromStr;
          }
          else if (line.startsWith('To: ')) init.toAirport = line.slice(4).trim();
          else if (line.startsWith('Notes:')) inNotes = true;
        }
        init.userNotes = userNotesLines.join('\n').trim();
      }
      if (init.fromCode === init.fromAirport) init.fromCode = "";
      if (init.toCode === init.toAirport) init.toCode = "";
    }
    else if (item.category === "hotel") {
      init.hotelName = item.locationName || "";
      if (item.title.startsWith("Hotel: ")) init.hotelName = item.title.replace("Hotel: ", "").trim();
      init.hotelCheckOutTime = "12:00";
      if (item.notes) {
        const lines = item.notes.split('\n');
        let inNotes = false, userNotesLines = [];
        for (const line of lines) {
          if (inNotes) { userNotesLines.push(line); continue; }
          if (line.startsWith('Check-out: ')) {
            const co = line.slice(11).trim();
            const lastSpaceIndex = co.lastIndexOf(' ');
            if (lastSpaceIndex > -1) {
              const labelStr = co.slice(0, lastSpaceIndex).trim();
              const timeStr = co.slice(lastSpaceIndex + 1).trim();
              init.hotelCheckOutTime = timeStr;
              const matchingDay = days.find(d => d.label === labelStr || d.date === labelStr);
              if (matchingDay) init.hotelCheckOutDate = matchingDay.date;
              else init.hotelCheckOutDate = labelStr;
            } else {
              init.hotelCheckOutDate = co;
            }
          }
          else if (line.startsWith('Check-in: ')) {
             // ignore, handled by form.startTime / form.date
          }
          else if (line.startsWith('Notes:')) inNotes = true;
        }
        init.userNotes = userNotesLines.join('\n').trim();
      }
    }
    else if (item.category === "transport") {
      init.transportFrom = item.locationName || "";
      if (item.title.startsWith("Transport: ") && item.title.includes(" → ")) {
        const parts = item.title.replace("Transport: ", "").split(" → ");
        init.transportFrom = parts[0].trim();
        init.transportTo = parts[1].trim();
      }
      if (item.notes) {
        const lines = item.notes.split('\n');
        let inNotes = false, userNotesLines = [];
        for (const line of lines) {
          if (inNotes) { userNotesLines.push(line); continue; }
          if (line.startsWith('Type: ')) init.transportType = line.slice(6).trim();
          else if (line.startsWith('Destination: ')) init.transportTo = line.slice(13).trim();
          else if (line.startsWith('Driver/Contact: ')) init.driverContact = line.slice(16).trim();
          else if (line.startsWith('Notes:')) inNotes = true;
        }
        init.userNotes = userNotesLines.join('\n').trim();
      }
    }
    else if (item.category === "food") {
      init.restaurantName = item.locationName || "";
      if (item.title.includes(": ")) {
        const parts = item.title.split(": ");
        init.mealType = parts[0].trim();
        init.restaurantName = parts[1].trim();
      }
      init.userNotes = item.notes || "";
    }
    else if (item.category === "activity") {
      init.activityName = item.title;
      init.activityLocation = item.locationName || "";
      init.userNotes = item.notes || "";
    }
    else if (item.category === "shopping") {
      init.shoppingPlace = item.locationName || "";
      if (item.title.startsWith("Shopping: ")) init.shoppingPlace = item.title.replace("Shopping: ", "").trim();
      if (item.notes) {
        const lines = item.notes.split('\n');
        let inNotes = false, userNotesLines = [];
        for (const line of lines) {
          if (inNotes) { userNotesLines.push(line); continue; }
          if (line.startsWith('Purpose: ')) init.shoppingPurpose = line.slice(9).trim();
          else if (line.startsWith('Notes:')) inNotes = true;
          else userNotesLines.push(line);
        }
        init.userNotes = userNotesLines.join('\n').trim();
        if (!inNotes && item.notes && !item.notes.includes('Purpose: ')) init.userNotes = item.notes;
      }
      if (item.estimatedCost) init.shoppingBudget = item.estimatedCost.toString();
    }
    else if (item.category === "free_time") {
      const standardLabels = ["Free time", "Rest", "Explore nearby"];
      if (standardLabels.includes(item.title)) init.freeTimeLabel = item.title;
      else init.freeTimeLabel = "Custom";
      init.userNotes = item.notes || "";
    }

    return init;
  });

  function updateCatData(key: keyof typeof catData, value: string) {
    setCatData(cur => ({ ...cur, [key]: value }));
  }

  function update<K extends keyof ItineraryInput>(key: K, value: ItineraryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Smart suggestions on category change
  function handleCategoryChange(cat: ItineraryCategory) {
    update("category", cat);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    
    let finalPayload = { ...form, sortOrder: Number(form.sortOrder || 0) };
    
    if (form.category === "flight") {
      if (!catData.fromAirport.trim() || !catData.toAirport.trim() || !form.date || !form.startTime) {
        setError("Please fill in required flight fields.");
        return;
      }
      const fromDisp = catData.fromCode.trim() || catData.fromAirport.trim();
      const toDisp = catData.toCode.trim() || catData.toAirport.trim();
      finalPayload.title = `Flight: ${fromDisp} → ${toDisp}`;
      finalPayload.locationName = catData.fromAirport.trim();
      
      const notesParts = [];
      if (catData.airline.trim()) notesParts.push(`Airline: ${catData.airline.trim()}`);
      if (catData.flightNumber.trim()) notesParts.push(`Flight number: ${catData.flightNumber.trim()}`);
      notesParts.push(`From: ${catData.fromAirport.trim()}`);
      notesParts.push(`To: ${catData.toAirport.trim()}`);
      if (form.endTime) notesParts.push(`Arrival: ${form.endTime}`);
      if (catData.userNotes.trim()) {
        notesParts.push(`Notes:`);
        notesParts.push(catData.userNotes.trim());
      }
      finalPayload.notes = notesParts.join('\n');
    } else if (form.category === "hotel") {
      const checkInIndex = days.findIndex(d => d.date === form.date);
      const nextDayObj = checkInIndex > -1 && checkInIndex < days.length - 1 ? days[checkInIndex + 1] : days.find(d => d.date === form.date);
      const checkOutDateStr = catData.hotelCheckOutDate || (nextDayObj?.date ?? form.date);

      if (!catData.hotelName.trim() || !form.date || !form.startTime) { setError("Please fill in required hotel fields."); return; }
      
      if (checkOutDateStr < form.date || (checkOutDateStr === form.date && catData.hotelCheckOutTime < form.startTime)) {
        setError("Check-out cannot be before check-in."); return;
      }

      finalPayload.title = `Hotel: ${catData.hotelName.trim()}`;
      finalPayload.locationName = catData.hotelName.trim();
      
      if (checkOutDateStr === form.date) finalPayload.endTime = catData.hotelCheckOutTime;
      else finalPayload.endTime = undefined;

      const notesParts = [];
      const checkInDayObj = days.find(d => d.date === form.date);
      const inDayStr = checkInDayObj ? checkInDayObj.label : form.date;
      const outDayObj = days.find(d => d.date === checkOutDateStr);
      const outDayStr = outDayObj ? outDayObj.label : checkOutDateStr;

      notesParts.push(`Check-in: ${inDayStr} ${form.startTime}`);
      notesParts.push(`Check-out: ${outDayStr} ${catData.hotelCheckOutTime}`);
      if (catData.userNotes.trim()) { notesParts.push(`Notes:`); notesParts.push(catData.userNotes.trim()); }
      finalPayload.notes = notesParts.join('\n');
    } else if (form.category === "transport") {
      if (!catData.transportFrom.trim() || !catData.transportTo.trim() || !form.date || !form.startTime) { setError("Please fill in required transport fields."); return; }
      finalPayload.title = `Transport: ${catData.transportFrom.trim()} → ${catData.transportTo.trim()}`;
      finalPayload.locationName = catData.transportFrom.trim();
      const notesParts = [];
      notesParts.push(`Type: ${catData.transportType}`);
      notesParts.push(`Destination: ${catData.transportTo.trim()}`);
      if (catData.driverContact.trim()) notesParts.push(`Driver/Contact: ${catData.driverContact.trim()}`);
      if (catData.userNotes.trim()) { notesParts.push(`Notes:`); notesParts.push(catData.userNotes.trim()); }
      finalPayload.notes = notesParts.join('\n');
    } else if (form.category === "food") {
      if (!catData.restaurantName.trim() || !form.date || !form.startTime) { setError("Please fill in required food fields."); return; }
      finalPayload.title = `${catData.mealType}: ${catData.restaurantName.trim()}`;
      finalPayload.locationName = catData.restaurantName.trim();
      finalPayload.notes = catData.userNotes.trim();
    } else if (form.category === "activity") {
      if (!catData.activityName.trim() || !form.date || !form.startTime) { setError("Please fill in required activity fields."); return; }
      finalPayload.title = catData.activityName.trim();
      finalPayload.locationName = catData.activityLocation.trim();
      finalPayload.notes = catData.userNotes.trim();
    } else if (form.category === "shopping") {
      if (!catData.shoppingPlace.trim() || !form.date || !form.startTime) { setError("Please fill in required shopping fields."); return; }
      finalPayload.title = `Shopping: ${catData.shoppingPlace.trim()}`;
      finalPayload.locationName = catData.shoppingPlace.trim();
      if (catData.shoppingBudget) finalPayload.estimatedCost = Number(catData.shoppingBudget);
      const notesParts = [];
      if (catData.shoppingPurpose.trim()) notesParts.push(`Purpose: ${catData.shoppingPurpose.trim()}`);
      if (catData.userNotes.trim()) { notesParts.push(`Notes:`); notesParts.push(catData.userNotes.trim()); }
      finalPayload.notes = notesParts.join('\n');
    } else if (form.category === "free_time") {
      const finalLabel = catData.freeTimeLabel === "Custom" ? form.title.trim() : catData.freeTimeLabel.trim();
      if (!finalLabel || !form.date) { setError("Please fill in required free time fields."); return; }
      finalPayload.title = finalLabel;
      if (!form.startTime) finalPayload.startTime = "09:00";
      finalPayload.notes = catData.userNotes.trim();
    } else {
      if (!form.title.trim() || !form.date || !form.startTime) {
        setError("Please fill in all required fields.");
        return;
      }
      finalPayload.title = form.title.trim();
    }

    setBusy(true);
    setError(null);
    try {
      let finalSortOrder = finalPayload.sortOrder;
      if (!item && finalSortOrder === 0) {
        const dateItems = items.filter(i => i.date === form.date);
        finalSortOrder = dateItems.length > 0 ? Math.max(...dateItems.map(i => i.sortOrder)) + 1 : 1;
      }
      await upsertItineraryItem(trip.id, { ...finalPayload, sortOrder: Number(finalSortOrder) }, item?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save itinerary item.");
    } finally {
      setBusy(false);
    }
  }

  const CategoryIcon = (cat: ItineraryCategory) => {
    switch(cat) {
      case "flight": return <Plane className="h-6 w-6" />;
      case "transport": return <Car className="h-6 w-6" />;
      case "hotel": return <Bed className="h-6 w-6" />;
      case "food": return <Utensils className="h-6 w-6" />;
      case "activity": return <Ticket className="h-6 w-6" />;
      case "shopping": return <ShoppingBag className="h-6 w-6" />;
      case "free_time": return <Coffee className="h-6 w-6" />;
      case "emergency": return <AlertCircle className="h-6 w-6" />;
      default: return <Star className="h-6 w-6" />;
    }
  };

  return (
    <Card className="p-4 sm:p-6 shadow-sm border-primary/20">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">{item ? "Editing itinerary item" : "Add to itinerary"}</h3>
        <div className="mt-2 flex gap-2 text-sm text-muted">
          <span className={step >= 1 ? "font-semibold text-primary" : ""}>1. Day</span>
          <span>→</span>
          <span className={step >= 2 ? "font-semibold text-primary" : ""}>2. Type</span>
          <span>→</span>
          <span className={step >= 3 ? "font-semibold text-primary" : ""}>3. Details</span>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}

      <form onSubmit={save} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Choose a day</h4>
            {days.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map(d => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => { update("date", d.date); setStep(2); }}
                    className={`rounded-xl border p-3 text-left transition-colors ${form.date === d.date ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"}`}
                  >
                    <div className="text-sm font-semibold text-primary">{d.label.split(" - ")[0]}</div>
                    <div className="text-xs text-muted">{d.label.split(" - ")[1]}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="pt-2">
              <label className="mb-1 block text-sm font-medium text-secondary">Or pick a specific date</label>
              <div className="flex items-center gap-2">
                <input type="date" className={`${formInputClass} flex-1 max-w-xs`} value={form.date} onChange={(e) => update("date", e.target.value)} />
                <Button type="button" onClick={() => setStep(2)}>Next</Button>
              </div>
            </div>
            <div className="flex justify-end border-t pt-4 border-border">
              <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary">What kind of plan?</h4>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-primary hover:underline">← Back to Day</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itineraryCategories.map((cat) => {
                const cs = categoryStyles(cat);
                const isActive = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { handleCategoryChange(cat); setStep(3); }}
                    className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all ${
                      isActive
                        ? `border-primary bg-primary/10`
                        : `border-border bg-surface hover:border-primary/30 hover:bg-muted`
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isActive ? `bg-primary/15 ${cs.iconText}` : `${cs.iconBg} ${cs.iconText}`
                    }`}>
                      {CategoryIcon(cat)}
                    </div>
                    <span className={`text-sm font-semibold capitalize ${isActive ? 'text-primary' : 'text-secondary'}`}>
                      {cat.replace("_", " ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary">The details</h4>
              <button type="button" onClick={() => setStep(2)} className="text-sm text-primary hover:underline">← Back to Type</button>
            </div>
            
            {form.category === "flight" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4 text-secondary">
                  <Plane className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm">Add departure and arrival airport so family members can easily follow the travel plan.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="From airport *"><input autoFocus className={formInputClass} value={catData.fromAirport} onChange={(e) => updateCatData("fromAirport", e.target.value)} placeholder="e.g. Kuala Lumpur" required /></Field>
                  <Field label="From airport code (optional)"><input className={formInputClass} value={catData.fromCode} onChange={(e) => updateCatData("fromCode", e.target.value)} placeholder="e.g. KUL" maxLength={3} /></Field>
                  <Field label="To airport *"><input className={formInputClass} value={catData.toAirport} onChange={(e) => updateCatData("toAirport", e.target.value)} placeholder="e.g. Bali" required /></Field>
                  <Field label="To airport code (optional)"><input className={formInputClass} value={catData.toCode} onChange={(e) => updateCatData("toCode", e.target.value)} placeholder="e.g. DPS" maxLength={3} /></Field>
                  <Field label="Airline (optional)"><input className={formInputClass} value={catData.airline} onChange={(e) => updateCatData("airline", e.target.value)} placeholder="e.g. AirAsia" /></Field>
                  <Field label="Flight number (optional)"><input className={formInputClass} value={catData.flightNumber} onChange={(e) => updateCatData("flightNumber", e.target.value)} placeholder="e.g. AK 123" /></Field>
                  <Field label="Departure time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="Arrival time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2">
                    <Field label="Booking reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} placeholder="e.g. PNR123" /></Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Notes (optional)">
                      <textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Terminal info, check-in instructions..." />
                    </Field>
                  </div>
                </div>
              </div>
            ) : form.category === "hotel" ? (() => {
              const checkInDayObj = days.find(d => d.date === form.date);
              const checkInDayLabel = checkInDayObj ? checkInDayObj.label : form.date;
              const checkInIndex = days.findIndex(d => d.date === form.date);
              const nextDayObj = checkInIndex > -1 && checkInIndex < days.length - 1 ? days[checkInIndex + 1] : checkInDayObj;
              const currentCheckoutDate = catData.hotelCheckOutDate || (nextDayObj?.date ?? form.date);

              return (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4 text-secondary">
                    <Bed className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm">Add hotel details so family members know where to stay and when to check in.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Hotel name *"><input autoFocus className={formInputClass} value={catData.hotelName} onChange={(e) => updateCatData("hotelName", e.target.value)} placeholder="e.g. Grand Hyatt" required /></Field></div>
                    
                    <div className="sm:col-span-2 rounded-lg bg-muted p-3 border border-border">
                      <p className="text-sm font-medium text-secondary">Check-in day: <span className="font-semibold text-primary">{checkInDayLabel}</span></p>
                      <p className="text-xs text-muted mt-0.5">Selected in Step 1</p>
                    </div>

                    <Field label="Check-in time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                    <div className="hidden sm:block"></div>

                    <Field label="Check-out day *">
                      <select className={formSelectClass} value={currentCheckoutDate} onChange={(e) => updateCatData("hotelCheckOutDate", e.target.value)} required>
                        {days.map(d => (
                          <option key={d.date} value={d.date}>{d.label} {d.date === form.date ? "(Same day)" : d.date === nextDayObj?.date ? "(Next day)" : ""}</option>
                        ))}
                        {!days.find(d => d.date === currentCheckoutDate) && (
                          <option value={currentCheckoutDate}>{currentCheckoutDate}</option>
                        )}
                      </select>
                    </Field>

                    <Field label="Check-out time *"><input type="time" className={formInputClass} value={catData.hotelCheckOutTime} onChange={(e) => updateCatData("hotelCheckOutTime", e.target.value)} required /></Field>
                    
                    <div className="sm:col-span-2"><Field label="Booking reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} placeholder="e.g. CONF123" /></Field></div>
                    <div className="sm:col-span-2"><Field label="Address (optional)"><input className={formInputClass} value={form.address ?? ""} onChange={(e) => update("address", e.target.value || undefined)} /></Field></div>
                    <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Room preferences, breakfast included..." /></Field></div>
                  </div>
                </div>
              );
            })() : form.category === "transport" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Transport type *">
                      <select className={formSelectClass} value={catData.transportType} onChange={(e) => updateCatData("transportType", e.target.value)}>
                        <option value="Grab">Grab</option>
                        <option value="Taxi">Taxi</option>
                        <option value="Bus">Bus</option>
                        <option value="Train">Train</option>
                        <option value="Ferry">Ferry</option>
                        <option value="Private van">Private van</option>
                        <option value="Car rental">Car rental</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="From location *"><input className={formInputClass} value={catData.transportFrom} onChange={(e) => updateCatData("transportFrom", e.target.value)} required /></Field>
                  <Field label="To location *"><input className={formInputClass} value={catData.transportTo} onChange={(e) => updateCatData("transportTo", e.target.value)} required /></Field>
                  <Field label="Pickup/departure time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="Arrival time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <Field label="Driver/contact (optional)"><input className={formInputClass} value={catData.driverContact} onChange={(e) => updateCatData("driverContact", e.target.value)} placeholder="Name / Phone / Plate No" /></Field>
                  <Field label="Booking/reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Meeting point details..." /></Field></div>
                </div>
              </div>
            ) : form.category === "food" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Meal type *">
                      <select className={formSelectClass} value={catData.mealType} onChange={(e) => updateCatData("mealType", e.target.value)}>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2"><Field label="Restaurant/place name *"><input autoFocus className={formInputClass} value={catData.restaurantName} onChange={(e) => updateCatData("restaurantName", e.target.value)} required /></Field></div>
                  <Field label="Time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="Reservation/reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Address (optional)"><input className={formInputClass} value={form.address ?? ""} onChange={(e) => update("address", e.target.value || undefined)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Must try dishes..." /></Field></div>
                </div>
              </div>
            ) : form.category === "activity" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Activity name *"><input autoFocus className={formInputClass} value={catData.activityName} onChange={(e) => updateCatData("activityName", e.target.value)} required /></Field></div>
                  <div className="sm:col-span-2"><Field label="Place/location *"><input className={formInputClass} value={catData.activityLocation} onChange={(e) => updateCatData("activityLocation", e.target.value)} required /></Field></div>
                  <Field label="Start time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <Field label="Ticket/booking reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Address (optional)"><input className={formInputClass} value={form.address ?? ""} onChange={(e) => update("address", e.target.value || undefined)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} /></Field></div>
                </div>
              </div>
            ) : form.category === "shopping" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Shopping place/mall/market *"><input autoFocus className={formInputClass} value={catData.shoppingPlace} onChange={(e) => updateCatData("shoppingPlace", e.target.value)} required /></Field></div>
                  <Field label="Time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="Budget (optional)"><input type="number" step="0.01" className={formInputClass} value={catData.shoppingBudget} onChange={(e) => updateCatData("shoppingBudget", e.target.value)} /></Field>
                  <div className="sm:col-span-2"><Field label="Shopping purpose (optional)"><input className={formInputClass} value={catData.shoppingPurpose} onChange={(e) => updateCatData("shoppingPurpose", e.target.value)} placeholder="e.g. Souvenirs, clothes" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Address (optional)"><input className={formInputClass} value={form.address ?? ""} onChange={(e) => update("address", e.target.value || undefined)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} /></Field></div>
                </div>
              </div>
            ) : form.category === "free_time" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Label *">
                      <select className={formSelectClass} value={catData.freeTimeLabel} onChange={(e) => updateCatData("freeTimeLabel", e.target.value)}>
                        <option value="Free time">Free time</option>
                        <option value="Rest">Rest</option>
                        <option value="Explore nearby">Explore nearby</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </Field>
                  </div>
                  {catData.freeTimeLabel === "Custom" && (
                    <div className="sm:col-span-2"><Field label="Custom label *"><input autoFocus className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-lg text-primary placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value={form.title} onChange={(e) => update("title", e.target.value)} required /></Field></div>
                  )}
                  <Field label="Start time (optional)"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} /></Field></div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Title *">
                    <input autoFocus className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-lg text-primary placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value={form.title} onChange={(e) => update("title", e.target.value)} required />
                  </Field>
                </div>
                <Field label="Start time *">
                  <input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required />
                </Field>
                <Field label="End time (optional)">
                  <input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Location name (optional)">
                    <input className={formInputClass} value={form.locationName ?? ""} onChange={(e) => update("locationName", e.target.value || undefined)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Notes (optional)">
                    <textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value || undefined)} placeholder="Any special instructions or thoughts?" />
                  </Field>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted overflow-hidden">
              <button type="button" onClick={() => setShowOptional(!showOptional)} className="flex w-full items-center justify-between p-4 text-sm font-semibold text-secondary hover:bg-muted">
                Advanced / Optional fields
                {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showOptional && (
                <div className="grid gap-4 p-4 border-t border-border sm:grid-cols-2">
                  {!["hotel", "food", "activity", "shopping"].includes(form.category) && <Field label="Address"><input className={formInputClass} value={form.address ?? ""} onChange={(event) => update("address", event.target.value || undefined)} /></Field>}
                  {form.category !== "shopping" && <Field label="Estimated cost"><input type="number" step="0.01" className={formInputClass} value={form.estimatedCost ?? ""} onChange={(event) => update("estimatedCost", event.target.value ? Number(event.target.value) : undefined)} /></Field>}
                  {!["flight", "hotel", "transport", "food", "activity"].includes(form.category) && <Field label="Booking reference"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(event) => update("bookingReference", event.target.value || undefined)} /></Field>}
                  <Field label="Attachment URL"><input className={formInputClass} value={form.attachmentUrl ?? ""} onChange={(event) => update("attachmentUrl", event.target.value || undefined)} /></Field>
                  <Field label="Visibility"><select className={formSelectClass} value={form.visibility} onChange={(event) => update("visibility", event.target.value as Visibility)}>{visibilityOptions.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}</select></Field>
                  <Field label="Sort order"><input type="number" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value={form.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></Field>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="submit" disabled={busy}>Save to itinerary</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
