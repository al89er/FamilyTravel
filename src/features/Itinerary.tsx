import { Clock, MapPin, MessageSquare, ThumbsUp } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData, ItineraryItem } from "../types";

export function Itinerary({ data }: { data: AppData }) {
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
                <ItineraryRow key={item.id} item={item} data={data} />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ItineraryRow({ item, data }: { item: ItineraryItem; data: AppData }) {
  const votes = data.votes.filter((vote) => vote.itineraryItemId === item.id);
  const comments = data.comments.filter((comment) => comment.targetId === item.id);
  const mustDo = votes.filter((vote) => vote.value === "must_do").length;

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
      </div>
    </article>
  );
}
