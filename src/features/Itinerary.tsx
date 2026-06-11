import { Clock, MapPin, MessageSquare, Pencil, Plus, Trash2, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { addFamilyComment, castFamilyVote, deleteItineraryItem, upsertItineraryItem } from "../lib/supabase";
import type { AppData, FamilySession, ItineraryCategory, ItineraryInput, ItineraryItem, Visibility, VoteValue } from "../types";

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
          tripId={data.trip.id}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}
      {Object.keys(itemsByDate).length === 0 ? (
        <EmptyState title="No itinerary yet" body="Add flights, hotels, meals, activities, and free time to build the shared plan." />
      ) : (
        Object.entries(itemsByDate).map(([date, items]) => (
          <Card key={date} className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{date}</h3>
              <Badge>{items.length} items</Badge>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <ItineraryRow key={item.id} item={item} data={data} canEdit={canEdit} familySession={familySession} onRefresh={onRefresh} onRefreshFamily={onRefreshFamily} />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ItineraryRow({
  item,
  data,
  canEdit,
  familySession,
  onRefresh,
  onRefreshFamily
}: {
  item: ItineraryItem;
  data: AppData;
  canEdit: boolean;
  familySession: FamilySession | null;
  onRefresh?: () => Promise<void>;
  onRefreshFamily?: () => void;
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
        tripId={data.trip.id}
        item={item}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await onRefresh?.();
        }}
      />
    );
  }

  return (
    <article className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[7rem_1fr]">
      <div className="text-sm font-semibold text-brand-900">
        <Clock className="mb-1 h-4 w-4" aria-hidden="true" />
        {item.startTime}
        {item.endTime ? <span className="block text-xs text-slate-500">to {item.endTime}</span> : null}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
          <Badge tone="coral">{item.category.replace("_", " ")}</Badge>
          <Badge>{item.visibility}</Badge>
        </div>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
            <Button variant="ghost" disabled={busy} onClick={() => void removeItem()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
          </div>
        ) : null}
        {item.locationName ? (
          <p className="mt-2 flex gap-1 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.locationName}</span>
          </p>
        ) : null}
        {item.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.notes}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            {mustDo} must-do, {votes.length} votes
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {comments.length} comments
          </span>
          {item.bookingReference ? <span>Ref {item.bookingReference}</span> : null}
        </div>
        {familySession ? (
          <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
            {familySession.permissions.votes ? (
              <div className="flex flex-wrap gap-2">
                {(["must_do", "interested", "neutral", "skip"] as VoteValue[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitVote(value)}
                    className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {value.replace("_", " ")}
                  </button>
                ))}
              </div>
            ) : null}
            {familySession.permissions.comments ? (
              <form className="flex gap-2" onSubmit={submitComment}>
                <input
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a family note"
                />
                <button
                  type="submit"
                  disabled={busy || !comment.trim()}
                  className="min-h-10 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            ) : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        ) : null}
        {comments.length ? (
          <div className="mt-3 space-y-2">
            {comments.slice(0, 3).map((entry) => (
              <p key={entry.id} className="rounded-lg bg-white text-sm text-slate-700">
                {entry.body}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

const itineraryCategories: ItineraryCategory[] = ["flight", "transport", "hotel", "food", "activity", "shopping", "free_time", "emergency", "other"];
const visibilityOptions: Visibility[] = ["shared", "planner_only", "private"];

function ItineraryForm({
  tripId,
  item,
  onSaved,
  onCancel
}: {
  tripId: string;
  item?: ItineraryItem;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ItineraryInput>({
    date: item?.date ?? new Date().toISOString().slice(0, 10),
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

  function update<K extends keyof ItineraryInput>(key: K, value: ItineraryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertItineraryItem(tripId, { ...form, title: form.title.trim(), sortOrder: Number(form.sortOrder || 0) }, item?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save itinerary item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Date"><input type="date" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
        <Field label="Title"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
        <Field label="Start time"><input type="time" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field>
        <Field label="End time"><input type="time" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.endTime ?? ""} onChange={(event) => update("endTime", event.target.value || undefined)} /></Field>
        <Field label="Category"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value as ItineraryCategory)}>{itineraryCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
        <Field label="Visibility"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.visibility} onChange={(event) => update("visibility", event.target.value as Visibility)}>{visibilityOptions.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}</select></Field>
        <Field label="Location name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.locationName ?? ""} onChange={(event) => update("locationName", event.target.value || undefined)} /></Field>
        <Field label="Address"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.address ?? ""} onChange={(event) => update("address", event.target.value || undefined)} /></Field>
        <Field label="Estimated cost"><input type="number" step="0.01" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.estimatedCost ?? ""} onChange={(event) => update("estimatedCost", event.target.value ? Number(event.target.value) : undefined)} /></Field>
        <Field label="Sort order"><input type="number" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></Field>
        <Field label="Booking reference"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.bookingReference ?? ""} onChange={(event) => update("bookingReference", event.target.value || undefined)} /></Field>
        <Field label="Attachment URL"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.attachmentUrl ?? ""} onChange={(event) => update("attachmentUrl", event.target.value || undefined)} /></Field>
        <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
