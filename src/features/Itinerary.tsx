import { Clock, MapPin, MessageSquare, Pencil, Plus, Trash2, ThumbsUp, Plane, Car, Bed, Utensils, Ticket, ShoppingBag, Coffee, AlertCircle, Star, ChevronDown, ChevronUp, CalendarClock, ArrowRight, Palmtree, Train, Bus, MoreVertical } from "lucide-react";
import { useState, useRef } from "react";
import { Badge, Button, Card, CategoryBadge, EmptyState, ErrorState, Field, SectionHeader, categoryStyles, formInputClass, formTextareaClass, formSelectClass, Modal, OptionChips, SegmentedControl, DayPickerChips } from "../components/ui";
import { addFamilyComment, castFamilyVote, deleteItineraryItem, upsertItineraryItem } from "../lib/supabase";
import { AppData, FamilySession, ItineraryCategory, ItineraryItem, Trip, Visibility, VoteValue, ItineraryInput } from "../types";
function getTripDates(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
  
  let current = new Date(start);
  let safety = 0;
  while (current <= end && safety < 100) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
    safety++;
  }
  return dates;
}

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
  const tripDates = getTripDates(data.trip.startDate, data.trip.endDate);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (tripDates.length === 0) return "";
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    if (tripDates.includes(todayStr)) {
      return todayStr;
    }
    return tripDates[0];
  });

  const itemsByDate = data.itinerary.reduce<Record<string, ItineraryItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item].sort((a, b) => {
      const aTime = a.startTime || "";
      const bTime = b.startTime || "";
      if (aTime !== bTime) {
        return aTime.localeCompare(bTime);
      }
      return a.sortOrder - b.sortOrder;
    });
    return groups;
  }, {});

  const selectedDayIndex = tripDates.indexOf(selectedDate);
  const selectedDayLabel = selectedDayIndex !== -1 ? `Day ${selectedDayIndex + 1}` : "";
  const selectedDayItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : [];

  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  const selectedDateLabel = selectedDateObj && !isNaN(selectedDateObj.getTime())
    ? selectedDateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : selectedDate;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trip Plan"
        eyebrow="Your day-by-day travel timeline"
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add plan</Button> : null}
      />
      {canEdit ? (
        <ItineraryForm
          isOpen={showForm}
          trip={data.trip}
          items={data.itinerary}
          defaultDate={selectedDate}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}

      {/* Pill navigation for the days */}
      {tripDates.length > 0 && (
        <div className="sticky top-[56px] z-30 bg-clay-canvas/90 backdrop-blur-md py-3 -mx-4 sm:mx-0 border-b border-border/20">
          <DayPickerChips
            dates={tripDates}
            dateFormat={data.trip.dateFormat}
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      )}

      {selectedDayItems.length === 0 ? (
        <EmptyState 
          icon={<Palmtree className="h-10 w-10 opacity-80" />}
          title={`No plans for ${selectedDayLabel}`} 
          body="Relax! No scheduled items for this day yet. Click 'Add plan' to add flights, hotels, meals, or activities."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add a plan</Button> : null}
        />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <div className="sticky top-[136px] z-20 -mx-4 mb-6 sm:mx-0">
              <div className="flex items-center gap-4 rounded-b-3xl sm:rounded-3xl bg-clay-surface px-4 py-4 sm:px-6 shadow-clay-card border-b sm:border border-border/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/80" />
                <div className="flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-[1.25rem] bg-primary/10 text-primary border border-primary/20 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1 opacity-80">Day</span>
                  <span className="text-xl font-black leading-none">{selectedDayIndex + 1}</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-clay-primary text-lg sm:text-xl tracking-tight">{selectedDateLabel}</h3>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                    {selectedDayItems.length} {selectedDayItems.length === 1 ? 'plan' : 'plans'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 relative">
              {selectedDayItems.map((item, idx) => (
                <ItineraryRow key={item.id} item={item} data={data} canEdit={canEdit} familySession={familySession} onRefresh={onRefresh} onRefreshFamily={onRefreshFamily} isLast={idx === selectedDayItems.length - 1} />
              ))}
            </div>
          </div>
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
    case "activity": return <Palmtree className={c} />;
    case "shopping": return <ShoppingBag className={c} />;
    case "free_time": return <Coffee className={c} />;
    case "emergency": return <AlertCircle className={c} />;
    default: return <Star className={c} />;
  }
};

export const getCategoryGradient = (cat: ItineraryCategory) => {
  switch(cat) {
    case "flight": return "bg-gradient-to-br from-sky-400 to-sky-600";
    case "transport": return "bg-gradient-to-br from-cyan-400 to-cyan-600";
    case "hotel": return "bg-gradient-to-br from-indigo-400 to-indigo-600";
    case "food": return "bg-gradient-to-br from-amber-400 to-amber-500";
    case "activity": return "bg-gradient-to-br from-emerald-400 to-emerald-600";
    case "shopping": return "bg-gradient-to-br from-rose-400 to-rose-600";
    case "free_time": return "bg-gradient-to-br from-zinc-400 to-zinc-600";
    case "emergency": return "bg-gradient-to-br from-red-400 to-red-600";
    default: return "bg-gradient-to-br from-slate-400 to-slate-600";
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

  return (
    <>
      <ItineraryCard 
        item={item} 
        data={data} 
        canEdit={canEdit} 
        familySession={familySession} 
        onRefresh={onRefresh} 
        onRefreshFamily={onRefreshFamily} 
        onEdit={() => setEditing(true)} 
      />
      {canEdit && (
        <ItineraryForm
          isOpen={editing}
          trip={data.trip}
          items={data.itinerary}
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onRefresh?.();
          }}
        />
      )}
    </>
  );
}

function ItineraryCard({
  item,
  data,
  canEdit,
  familySession,
  onRefresh,
  onRefreshFamily,
  onEdit
}: {
  item: ItineraryItem;
  data: AppData;
  canEdit: boolean;
  familySession: FamilySession | null;
  onRefresh?: () => Promise<void>;
  onRefreshFamily?: () => void;
  onEdit: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInteract, setShowInteract] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const votes = data.votes.filter((vote) => vote.itineraryItemId === item.id);
  const comments = data.comments.filter((comment) => comment.targetId === item.id);
  const mustDo = votes.filter((vote) => vote.value === "must_do").length;

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-[80]">
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
              className="fixed inset-0 z-[70] bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-[90] min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
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
                  void removeItem();
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

  const FamilyInteractions = () => (
    <div className="mt-5 pt-4 border-t border-border/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {votes.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary border border-primary/10 shadow-sm">
              👍 {mustDo} <span className="text-primary/40 px-0.5">•</span> {votes.length}
            </span>
          )}
          {comments.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-clay-recessed px-3 py-1.5 text-[11px] font-bold text-clay-secondary border-0 shadow-clay-pressed">
              <MessageSquare className="h-3 w-3" /> {comments.length}
            </span>
          )}
          {item.visibility !== "shared" && <Badge tone="zinc" className="text-[10px] shadow-sm">{item.visibility.replace("_", " ")}</Badge>}
        </div>
        <div className="flex gap-1 ml-auto">
          {familySession && (familySession.permissions.votes || familySession.permissions.comments) && (
            <Button variant="ghost" className="h-8 text-[10px] px-3 rounded-full uppercase tracking-widest font-bold text-primary hover:bg-primary/10 shadow-sm ring-1 ring-primary/20" onClick={() => setShowInteract(!showInteract)}>
               {showInteract ? "Close" : "React"}
            </Button>
          )}
        </div>
      </div>
      
      {showInteract && familySession && (
        <div className="mt-4 space-y-3 rounded-3xl bg-muted/40 p-4 border border-border/50 shadow-inner animate-in fade-in slide-in-from-top-2">
          {familySession.permissions.votes && (
            <div className="flex flex-wrap gap-2">
              {(["must_do", "interested", "neutral", "skip"] as VoteValue[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => void submitVote(value)}
                  className="h-9 rounded-[16px] border-0 bg-clay-recessed shadow-clay-pressed px-4 text-[10px] font-bold uppercase tracking-wider text-clay-secondary disabled:opacity-50 hover:bg-clay-recessed/80 hover:text-primary transition-all active:scale-95"
                >
                  {value.replace("_", " ")}
                </button>
              ))}
            </div>
          )}
          {familySession.permissions.comments && (
            <form className="flex gap-2" onSubmit={submitComment}>
              <input
                className={`${formInputClass} min-h-10 h-10 rounded-2xl text-sm shadow-sm`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a family note..."
              />
              <button
                type="submit"
                disabled={busy || !comment.trim()}
                className="h-10 rounded-2xl bg-primary px-4 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm disabled:opacity-50 transition-transform active:scale-95"
              >
                Post
              </button>
            </form>
          )}
          {error ? <p className="text-xs text-danger font-medium">{error}</p> : null}
        </div>
      )}

      {comments.length > 0 && showInteract && (
        <div className="mt-4 space-y-3 animate-in fade-in pl-2 border-l-2 border-border/50">
          {comments.map((entry) => (
            <div key={entry.id} className="rounded-[16px] bg-clay-recessed shadow-clay-pressed p-3.5 text-sm text-clay-secondary border-0 relative">
              <div className="absolute -left-[11px] top-4 h-5 w-5 rounded-full bg-clay-recessed shadow-clay-pressed border-0 flex items-center justify-center">
                <MessageSquare className="h-2.5 w-2.5 text-muted" />
              </div>
              <p className="leading-relaxed">{entry.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (item.category === "flight") {
    return (
      <Card className={`flex flex-col sm:flex-row border-0 bg-clay-surface transition-all group relative p-0 shadow-clay-card ${menuOpen ? "z-50" : "z-0"}`}>
        {/* Saturated sky accent strip — white text is safe on this background */}
        <div className="bg-sky-500 text-white p-4 sm:p-5 flex sm:flex-col justify-between items-center sm:w-[5.5rem] shrink-0 relative overflow-hidden rounded-t-[inherit] sm:rounded-tr-none sm:rounded-l-[inherit]">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4)_0%,transparent_60%)]"></div>
          <Plane className="h-6 w-6 sm:h-7 sm:w-7 rotate-45 sm:rotate-0 drop-shadow-md z-10" />
          <span className="text-[11px] uppercase tracking-[0.2em] font-black rotate-0 sm:-rotate-90 whitespace-nowrap sm:my-10 z-10 opacity-90 drop-shadow-sm">Boarding</span>
          <Ticket className="h-5 w-5 opacity-40 hidden sm:block z-10" />
        </div>

        {/* Perforation notches — match canvas so they look punched out */}
        <div className="hidden sm:flex flex-col justify-between items-center w-4 -ml-2 -mr-2 z-10">
          <div className="h-4 w-4 rounded-full bg-clay-canvas -mt-2 border-b border-border/50"></div>
          <div className="h-full w-px border-l-[3px] border-dashed border-border/60 my-2"></div>
          <div className="h-4 w-4 rounded-full bg-clay-canvas -mb-2 border-t border-border/50"></div>
        </div>

        {/* Ticket body — solid clay surface, all text must be dark */}
        <div className="p-5 sm:p-6 flex-1 min-w-0 flex flex-col justify-center sm:pl-8 relative">
          <ActionMenu />
          <div className="flex items-start justify-between gap-3 mb-3 pr-8">
            <h3 className="font-extrabold text-xl text-clay-primary tracking-tight leading-tight">{item.title}</h3>
            {item.bookingReference && <Badge tone="sky" className="font-mono uppercase shadow-sm shrink-0">Ref: {item.bookingReference}</Badge>}
          </div>
          {/* Times — sky-700 (#0369a1) on white passes WCAG AA */}
          <div className="flex items-center gap-4 mb-4 bg-sky-50 p-3 rounded-[18px] border border-sky-100">
            <div className="font-mono text-2xl font-black text-sky-700">{item.startTime}</div>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="h-px w-full bg-sky-200 absolute" />
              <Plane className="h-4 w-4 text-sky-400 absolute rotate-90" />
            </div>
            <div className="font-mono text-2xl font-black text-sky-700">{item.endTime || "—"}</div>
          </div>
          {item.locationName && (
            <p className="text-sm font-bold text-clay-secondary flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 opacity-60" />
              {item.locationName}
            </p>
          )}
          {item.notes && (
            <p className="mt-3 rounded-[18px] bg-clay-recessed shadow-clay-pressed p-4 text-sm text-clay-secondary border border-border/30 leading-relaxed whitespace-pre-line">
              {item.notes}
            </p>
          )}
          <FamilyInteractions />
        </div>
      </Card>
    );
  }

  if (item.category === "hotel") {
    const getHotelCheckOutTime = () => {
      // If there's another hotel entry for this same hotel on a later date,
      // it means checkout is on a different day, so we leave it blank here.
      const hotelItems = data.itinerary.filter((i) => i.category === "hotel" && (i.locationName === item.locationName || i.title === item.title));
      const sorted = hotelItems.sort((a, b) => a.date.localeCompare(b.date));
      const currentIndex = sorted.findIndex((i) => i.id === item.id);
      
      if (currentIndex > -1 && currentIndex < sorted.length - 1) {
        const nextItem = sorted[currentIndex + 1];
        if (nextItem.date !== item.date) {
          return "—";
        }
      }

      if (item.endTime) return item.endTime;
      if (item.notes) {
        const lines = item.notes.split('\n');
        const ciLine = lines.find(l => l.startsWith('Check-in: '));
        const coLine = lines.find(l => l.startsWith('Check-out: '));

        if (coLine) {
          const coVal = coLine.replace('Check-out: ', '').trim();
          const coLastSpace = coVal.lastIndexOf(' ');
          
          if (ciLine && coLastSpace > -1) {
            const ciVal = ciLine.replace('Check-in: ', '').trim();
            const ciLastSpace = ciVal.lastIndexOf(' ');
            if (ciLastSpace > -1) {
              const ciPrefix = ciVal.substring(0, ciLastSpace).trim();
              const coPrefix = coVal.substring(0, coLastSpace).trim();
              // If the dates before the time string differ, it's a multi-day stay
              if (ciPrefix && coPrefix && ciPrefix !== coPrefix) {
                return "—";
              }
            }
          }

          if (coLastSpace > -1) {
            return coVal.substring(coLastSpace + 1).trim();
          }
        }
      }
      return "—";
    };

    return (
      <Card className={`flex flex-col border-0 bg-clay-surface transition-all relative shadow-clay-card p-0 ${menuOpen ? "z-50" : "z-0"}`}>
        <ActionMenu />
        <div className="relative flex flex-col w-full overflow-hidden rounded-[inherit]">
          <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="p-5 sm:p-6 flex-1 min-w-0 pt-7 relative">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pr-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-[1.25rem] bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-clay-btn flex items-center justify-center text-white">
                <Bed className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-clay-primary tracking-tight">{item.title}</h3>
                {item.locationName && <p className="text-sm font-bold text-secondary flex items-center gap-1.5 mt-1"><MapPin className="h-3.5 w-3.5 text-muted" /> {item.locationName}</p>}
              </div>
            </div>
            {item.bookingReference && <Badge tone="indigo" className="font-mono uppercase shadow-sm">Ref: {item.bookingReference}</Badge>}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex flex-1 items-center justify-between gap-4 rounded-2xl bg-muted/40 px-4 py-3 border border-border/50 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">Check-in</span>
                <span className="font-bold text-primary text-base">{item.startTime}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted/50" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">Check-out</span>
                <span className="font-bold text-primary text-base">{getHotelCheckOutTime()}</span>
              </div>
            </div>
          </div>
          
          {item.notes && <p className="mt-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed p-4 text-sm font-medium text-clay-secondary leading-relaxed whitespace-pre-line">{item.notes}</p>}
          <FamilyInteractions />
        </div>
        </div>
      </Card>
    );
  }

  // Default / Food / Activity / Transport
  const isFood = item.category === "food";
  const isActivity = item.category === "activity";
  const isTransport = item.category === "transport";
  
  let ringClass = "ring-border/50";
  let bgClass = "bg-clay-surface";
  let accentClass = "text-clay-primary";
  let badgeTone = "slate";
  let stripClass = "bg-border/50";

  if (isFood) { ringClass = "ring-amber-200"; bgClass = "bg-gradient-to-br from-clay-surface to-amber-50/50"; accentClass = "text-amber-700"; badgeTone = "amber"; stripClass = "bg-amber-400"; }
  else if (isActivity) { ringClass = "ring-emerald-200"; bgClass = "bg-gradient-to-br from-clay-surface to-emerald-50/50"; accentClass = "text-emerald-700"; badgeTone = "emerald"; stripClass = "bg-emerald-400"; }
  else if (isTransport) { ringClass = "ring-cyan-200"; bgClass = "bg-gradient-to-br from-clay-surface to-cyan-50/50"; accentClass = "text-cyan-700"; badgeTone = "sky"; stripClass = "bg-cyan-400"; }

  return (
    <Card className={`relative flex flex-col sm:flex-row border-0 shadow-clay-card p-0 transition-all ${bgClass} ${menuOpen ? "z-50" : "z-0"}`}>
      <div className={`absolute left-0 top-5 bottom-5 w-1.5 rounded-full ${stripClass}`} aria-hidden="true" />
      <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col sm:flex-row gap-4 sm:gap-6 pl-6 sm:pl-7 relative">
        <ActionMenu />
        <div className="shrink-0 sm:w-[4.5rem] mt-1 flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0">
          <span className="inline-flex items-center justify-center rounded-[16px] bg-clay-recessed shadow-clay-pressed px-3 py-2 text-sm font-black text-clay-primary tabular-nums border-0 min-w-[4.5rem]">
            {item.startTime}
          </span>
          {item.endTime && <p className="sm:mt-2 sm:pl-1 text-[10px] font-bold text-muted uppercase tracking-wider">→ {item.endTime}</p>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pr-8">
            <h3 className={`font-extrabold text-lg sm:text-xl tracking-tight ${accentClass}`}>{item.title}</h3>
            <Badge tone={badgeTone as any} className="capitalize shadow-sm">{item.category.replace("_", " ")}</Badge>
          </div>
          {item.locationName && <p className="text-sm font-bold text-secondary flex items-center gap-1.5 mb-3"><MapPin className="h-4 w-4 text-muted" /> {item.locationName}</p>}
          {item.notes && <p className="mt-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed p-4 text-sm font-medium text-clay-secondary leading-relaxed whitespace-pre-line">{item.notes}</p>}
          <FamilyInteractions />
        </div>
      </div>
    </Card>
  );
}

const itineraryCategories: ItineraryCategory[] = ["flight", "transport", "hotel", "food", "activity", "shopping", "free_time", "emergency", "other"];
const visibilityOptions: Visibility[] = ["shared", "planner_only", "private"];

function ItineraryForm({
  isOpen,
  trip,
  items,
  item,
  defaultDate,
  onSaved,
  onCancel
}: {
  isOpen: boolean;
  trip: Trip;
  items: ItineraryItem[];
  item?: ItineraryItem;
  defaultDate?: string;
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
  const defaultDateValue = item?.date ?? defaultDate ?? (items.length > 0 ? items[items.length - 1].date : trip.startDate);

  const [form, setForm] = useState<ItineraryInput>({
    date: defaultDateValue,
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

  function handleCategoryChange(cat: ItineraryCategory) {
    update("category", cat);
  }

  const saveRef = useRef<() => void>(() => {});

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    
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
      case "activity": return <Palmtree className="h-6 w-6" />;
      case "shopping": return <ShoppingBag className="h-6 w-6" />;
      case "free_time": return <Coffee className="h-6 w-6" />;
      case "emergency": return <AlertCircle className="h-6 w-6" />;
      default: return <Star className="h-6 w-6" />;
    }
  };

  saveRef.current = () => void save();

  const footerButtons = (
    <div className="flex items-center justify-between gap-2">
      <div>
        {step === 1 && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        {step === 2 && (
          <Button type="button" variant="ghost" onClick={() => setStep(1)}>← Back</Button>
        )}
        {step === 3 && (
          <Button type="button" variant="ghost" onClick={() => setStep(2)}>← Back</Button>
        )}
      </div>
      <div className="flex gap-2">
        {step === 1 && (
          <Button type="button" onClick={() => setStep(2)} disabled={!form.date}>Next →</Button>
        )}
        {step === 2 && (
          <Button type="button" onClick={() => setStep(3)} disabled={!form.category}>Next →</Button>
        )}
        {step === 3 && (
          <>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={() => saveRef.current()} disabled={busy}>Save plan</Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={item ? "Editing trip plan item" : "Add to trip plan"}
      footer={footerButtons}
    >
      <div className="mb-5">
        <div className="flex gap-2 text-sm text-muted font-medium">
          <span className={step >= 1 ? "font-bold text-primary" : ""}>1. Day</span>
          <span>→</span>
          <span className={step >= 2 ? "font-bold text-primary" : ""}>2. Type</span>
          <span>→</span>
          <span className={step >= 3 ? "font-bold text-primary" : ""}>3. Details</span>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}

      <form id="itinerary-form" onSubmit={save} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <h4 className="font-semibold text-primary">Choose a day</h4>
            {days.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map(d => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => { update("date", d.date); setStep(2); }}
                    className={`rounded-[20px] p-3 text-left transition-all ${
                      form.date === d.date
                        ? "bg-gradient-to-br from-violet-200 to-violet-300 shadow-clay-pressed border-2 border-violet-400 scale-95"
                        : "bg-clay-surface shadow-clay-card border-2 border-transparent hover:-translate-y-1 hover:shadow-clay-hover"
                    }`}
                  >
                    <div className={`text-sm font-bold ${form.date === d.date ? "text-violet-900" : "text-primary"}`}>{d.label.split(" - ")[0]}</div>
                    <div className={`text-xs mt-0.5 ${form.date === d.date ? "text-violet-800" : "text-secondary"}`}>{d.label.split(" - ")[1]}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="pt-2">
              <label className="mb-1 block text-sm font-semibold text-secondary">Or pick a specific date</label>
              <div className="flex items-center gap-2">
                <input type="date" className={`${formInputClass} flex-1 max-w-xs`} value={form.date} onChange={(e) => update("date", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-primary">What kind of plan?</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {itineraryCategories.map((cat) => {
                const cs = categoryStyles(cat);
                const isActive = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { handleCategoryChange(cat); setStep(3); }}
                    className={`flex flex-col items-center justify-center rounded-[20px] p-3 transition-all ${
                      isActive
                        ? `bg-clay-recessed shadow-clay-pressed border-0 scale-95`
                        : `bg-clay-surface shadow-clay-card border-0 hover:-translate-y-1 hover:shadow-clay-hover`
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] transition-all ${
                      isActive ? `${getCategoryGradient(cat)} shadow-clay-btn text-white` : `bg-clay-recessed shadow-clay-pressed ${cs.iconText}`
                    }`}>
                      {CategoryIcon(cat)}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider mt-2 ${isActive ? 'text-primary' : 'text-clay-secondary'}`}>
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
              <h4 className="font-semibold text-primary">The details</h4>
            </div>
            
            {form.category === "flight" ? (
              <div className="space-y-4">
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Hotel name *"><input autoFocus className={formInputClass} value={catData.hotelName} onChange={(e) => updateCatData("hotelName", e.target.value)} placeholder="e.g. Grand Hyatt" required /></Field></div>
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
                        <option value="Train">Train</option>
                        <option value="Bus">Bus</option>
                        <option value="Car Rental">Car Rental</option>
                        <option value="Ferry">Ferry</option>
                        <option value="Private Transfer">Private Transfer</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="From *"><input className={formInputClass} value={catData.transportFrom} onChange={(e) => updateCatData("transportFrom", e.target.value)} placeholder="e.g. Airport" required /></Field>
                  <Field label="To *"><input className={formInputClass} value={catData.transportTo} onChange={(e) => updateCatData("transportTo", e.target.value)} placeholder="e.g. Hotel" required /></Field>
                  <Field label="Departure time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="Arrival time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Driver/Contact (optional)"><input className={formInputClass} value={catData.driverContact} onChange={(e) => updateCatData("driverContact", e.target.value)} placeholder="e.g. John +123456789" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Meeting point..." /></Field></div>
                </div>
              </div>
            ) : form.category === "food" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Meal *">
                    <select className={formSelectClass} value={catData.mealType} onChange={(e) => updateCatData("mealType", e.target.value)}>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Brunch">Brunch</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                      <option value="Drinks">Drinks</option>
                    </select>
                  </Field>
                  <Field label="Restaurant / Place *"><input className={formInputClass} value={catData.restaurantName} onChange={(e) => updateCatData("restaurantName", e.target.value)} placeholder="e.g. Nasi Lemak Antarabangsa" required /></Field>
                  <Field label="Time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="Reservation details, must try dishes..." /></Field></div>
                </div>
              </div>
            ) : form.category === "activity" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Activity name *"><input autoFocus className={formInputClass} value={catData.activityName} onChange={(e) => updateCatData("activityName", e.target.value)} placeholder="e.g. Snorkeling trip" required /></Field></div>
                  <div className="sm:col-span-2"><Field label="Location / Venue (optional)"><input className={formInputClass} value={catData.activityLocation} onChange={(e) => updateCatData("activityLocation", e.target.value)} placeholder="e.g. Blue Lagoon" /></Field></div>
                  <Field label="Start time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Booking reference (optional)"><input className={formInputClass} value={form.bookingReference ?? ""} onChange={(e) => update("bookingReference", e.target.value || undefined)} placeholder="e.g. TIX123" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} placeholder="What to bring, meeting spot..." /></Field></div>
                </div>
              </div>
            ) : form.category === "shopping" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Place / Market *"><input autoFocus className={formInputClass} value={catData.shoppingPlace} onChange={(e) => updateCatData("shoppingPlace", e.target.value)} placeholder="e.g. Chatuchak Market" required /></Field></div>
                  <Field label="Start time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <Field label="Purpose (optional)"><input className={formInputClass} value={catData.shoppingPurpose} onChange={(e) => updateCatData("shoppingPurpose", e.target.value)} placeholder="e.g. Souvenirs" /></Field>
                  <Field label="Estimated budget (optional)"><input type="number" className={formInputClass} value={catData.shoppingBudget} onChange={(e) => updateCatData("shoppingBudget", e.target.value)} placeholder="e.g. 500" /></Field>
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
                        <option value="Custom">Custom...</option>
                      </select>
                    </Field>
                  </div>
                  {catData.freeTimeLabel === "Custom" && (
                    <div className="sm:col-span-2"><Field label="Custom label *"><input autoFocus className={formInputClass} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Pool time" required /></Field></div>
                  )}
                  <Field label="Start time (optional)"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={catData.userNotes} onChange={(e) => updateCatData("userNotes", e.target.value)} /></Field></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Title *"><input autoFocus className={formInputClass} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Unexpected event" required /></Field></div>
                  <Field label="Time *"><input type="time" className={formInputClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required /></Field>
                  <Field label="End time (optional)"><input type="time" className={formInputClass} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value || undefined)} /></Field>
                  <div className="sm:col-span-2"><Field label="Location (optional)"><input className={formInputClass} value={form.locationName ?? ""} onChange={(e) => update("locationName", e.target.value || undefined)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value || undefined)} /></Field></div>
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-4 pb-2">
              <button type="button" onClick={() => setShowOptional(!showOptional)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">
                {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Advanced options
              </button>
            </div>
            
            {showOptional && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-muted/50 p-4 animate-in fade-in">
                <Field label="Visibility">
                  <SegmentedControl
                    options={visibilityOptions.map(v => ({ value: v, label: v.replace("_", " ") }))}
                    value={form.visibility}
                    onChange={(v) => update("visibility", v as Visibility)}
                  />
                </Field>
                <Field label="Sort order">
                  <input type="number" className={formInputClass} value={form.sortOrder} onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)} />
                </Field>
              </div>
            )}


          </div>
        )}
      </form>
    </Modal>
  );
}
