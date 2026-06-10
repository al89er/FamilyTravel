import { Clock, MapPin, MessageSquare, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import { addFamilyComment, castFamilyVote } from "../lib/supabase";
import type { AppData, FamilySession, ItineraryItem, VoteValue } from "../types";

export function Itinerary({
  data,
  familySession,
  onRefreshFamily
}: {
  data: AppData;
  familySession: FamilySession | null;
  onRefreshFamily?: () => void;
}) {
  const itemsByDate = data.itinerary.reduce<Record<string, ItineraryItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item].sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      <SectionHeader title="Shared Itinerary" eyebrow="Timeline, day, and family view" />
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
                <ItineraryRow key={item.id} item={item} data={data} familySession={familySession} onRefreshFamily={onRefreshFamily} />
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
  familySession,
  onRefreshFamily
}: {
  item: ItineraryItem;
  data: AppData;
  familySession: FamilySession | null;
  onRefreshFamily?: () => void;
}) {
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
