import { CalendarCheck, CalendarDays, FileText, Luggage, Map, Plane, ReceiptText, TrendingUp } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

function daysUntil(date: string) {
  const today = new Date();
  const start = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.ceil((start.getTime() - today.getTime()) / 86_400_000));
}

/** Format "2026-08-14" → "14 Aug 2026" */
function fmtDate(d: string): string {
  if (!d) return d;
  const [y, m, day] = d.split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Format "2026-08-14" → "14 Aug" (short) */
function fmtShort(d: string): string {
  if (!d) return d;
  const [y, m, day] = d.split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function tripDuration(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

export function Dashboard({
  data,
  openView,
  canEdit
}: {
  data: AppData;
  openView: (view: string) => void;
  canEdit: boolean;
}) {
  const countdown = daysUntil(data.trip.startDate);
  const totalSpend = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPct =
    data.trip.estimatedBudget > 0
      ? Math.min(100, Math.round((totalSpend / data.trip.estimatedBudget) * 100))
      : 0;
  const remaining = data.trip.estimatedBudget > 0 ? data.trip.estimatedBudget - totalSpend : null;
  const nights = tripDuration(data.trip.startDate, data.trip.endDate);

  const quickButtons = [
    { id: "itinerary", label: "Itinerary", icon: CalendarCheck, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950" },
    { id: "map", label: "Map", icon: Map, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
    { id: "documents", label: "Documents", icon: FileText, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-950" },
    { id: "expenses", label: "Expenses", icon: ReceiptText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
    { id: "packing", label: "Packing", icon: Luggage, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950" }
  ];

  return (
    <div className="space-y-5">
      {/* ── Hero Card ── */}
      <Card className="overflow-hidden">
        {/* Gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 dark:from-teal-900 dark:via-teal-800 dark:to-slate-800 p-5 sm:p-8">
          {/* Decorative radial blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: trip info */}
            <div className="min-w-0">
              <Badge tone="overlay" className="mb-3">
                ✈️ {data.trip.destination}
              </Badge>
              <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                {data.trip.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/75">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {fmtShort(data.trip.startDate)} – {fmtShort(data.trip.endDate)}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {nights} {nights === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            {/* Right: countdown */}
            <div className="flex-shrink-0 rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm ring-1 ring-white/20 min-w-[100px]">
              {countdown > 0 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Countdown</p>
                  <p className="mt-1 text-4xl font-black tabular-nums text-white">{countdown}</p>
                  <p className="text-xs text-white/70">days to go</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Status</p>
                  <p className="mt-1 text-lg font-black text-white">🌴</p>
                  <p className="text-xs text-white/70">Trip is on!</p>
                </>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative mt-5 grid grid-cols-3 gap-3 rounded-xl bg-black/15 p-3 ring-1 ring-white/10">
            <StatPill label="Itinerary" value={`${data.itinerary.length} items`} />
            <StatPill label="Expenses" value={`${data.trip.currency} ${totalSpend.toLocaleString()}`} />
            <StatPill label="Members" value={`${data.members.length} people`} />
          </div>
        </div>
      </Card>

      {/* ── Info row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionHeader title="Next up" eyebrow="Upcoming plan" />
          {data.itinerary[0] ? (
            <div className="mt-4 flex gap-3 rounded-xl bg-muted/60 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Plane className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-primary">{data.itinerary[0].title}</p>
                <p className="mt-0.5 text-sm text-secondary">
                  {fmtDate(data.itinerary[0].date)} at {data.itinerary[0].startTime}
                  {data.itinerary[0].locationName ? ` · ${data.itinerary[0].locationName}` : ""}
                </p>
                {data.itinerary[0].notes ? (
                  <p className="mt-2 text-sm text-secondary line-clamp-2">{data.itinerary[0].notes}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No itinerary yet"
                body="Open Itinerary to start adding flights, hotels, meals, and activities."
              />
            </div>
          )}
        </Card>

        {/* Budget card */}
        <Card className="p-5">
          <SectionHeader title="Budget" eyebrow={data.trip.currency} />
          <p className="mt-4 text-3xl font-black text-primary tabular-nums">
            {data.trip.currency} {totalSpend.toLocaleString()}
          </p>
          {data.trip.estimatedBudget > 0 ? (
            <>
              <p className="mt-1 text-sm text-secondary">{budgetPct}% of budget used</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetPct >= 90 ? "bg-danger" : budgetPct >= 70 ? "bg-warning" : "bg-primary"
                  }`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              {remaining !== null ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {data.trip.currency} {remaining.toLocaleString()} remaining
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">No budget set</p>
          )}
        </Card>
      </div>

      {/* ── Hotel / Emergency ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Accommodation" />
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            {data.trip.hotelInfo || "—"}
          </p>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Emergency" />
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            {data.trip.emergencySummary || "—"}
          </p>
        </Card>
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Quick access
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {quickButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => openView(btn.id)}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft active:scale-95"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${btn.bg} transition-transform group-hover:scale-110`}>
                <btn.icon className={`h-5 w-5 ${btn.color}`} aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-secondary group-hover:text-primary">
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white truncate">{value}</p>
    </div>
  );
}
