import { BedDouble, CalendarCheck, CalendarDays, FileText, Luggage, Map, MapPin, Plane, ReceiptText, ShieldAlert, Ticket, TrendingUp, ArrowRight } from "lucide-react";
import { Badge, Card, EmptyState, GlassPanel, SectionHeader, StatPill } from "../components/ui";
import type { AppData } from "../types";

function daysUntil(date: string) {
  const today = new Date();
  const start = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.ceil((start.getTime() - today.getTime()) / 86_400_000));
}

function fmtDate(d: string): string {
  if (!d) return d;
  const [y, m, day] = d.split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

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
    { id: "itinerary", label: "Plan", icon: CalendarCheck, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-100 dark:bg-brand-900" },
    { id: "map", label: "Explore", icon: Map, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950" },
    { id: "expenses", label: "Money", icon: ReceiptText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
    { id: "documents", label: "Docs", icon: FileText, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-950" },
    { id: "packing", label: "Packing", icon: Luggage, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950" }
  ];

  const nextPlan = data.itinerary[0];

  return (
    <div className="space-y-6">
      {/* ── Hero Card ── */}
      <Card className="overflow-hidden border-none shadow-xl">
        {/* Gradient header (Ocean/Sunset/Sand palette) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-600 to-coral p-5 sm:p-8">
          {/* Decorative motifs */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          
          {/* Plane route curve motif */}
          <svg className="absolute top-0 right-0 h-full w-full opacity-20 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0,100 Q 50,20 100,10" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2 2" />
            <circle cx="100" cy="10" r="1.5" fill="white" />
          </svg>

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between z-10">
            {/* Left: trip info */}
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                <MapPin className="h-3.5 w-3.5" />
                {data.trip.destination}
              </div>
              <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl drop-shadow-md">
                {data.trip.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/90 font-medium">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {fmtShort(data.trip.startDate)} – {fmtShort(data.trip.endDate)}
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                  {nights} {nights === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            {/* Right: countdown */}
            <GlassPanel className="flex-shrink-0 p-4 text-center min-w-[110px] shadow-lg">
              {countdown > 0 ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Countdown</p>
                  <p className="mt-1 text-4xl font-black tabular-nums text-white drop-shadow-sm">{countdown}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mt-1">Days to go</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Status</p>
                  <p className="mt-1 text-4xl font-black text-white drop-shadow-sm">✈️</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mt-1">Trip is on</p>
                </>
              )}
            </GlassPanel>
          </div>

          {/* Stats strip */}
          <GlassPanel className="relative mt-6 grid grid-cols-3 gap-3 p-3">
            <StatPill label="Plan" value={`${data.itinerary.length} items`} inverse />
            <StatPill label="Budget" value={`${data.trip.currency} ${totalSpend.toLocaleString()}`} inverse />
            <StatPill label="Crew" value={`${data.members.length} people`} inverse />
          </GlassPanel>
        </div>
      </Card>

      {/* ── Quick actions ── */}
      <div>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {quickButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => openView(btn.id)}
              className="group flex flex-col items-center gap-2 rounded-2xl p-2 sm:p-3 text-center transition-all hover:-translate-y-1 active:scale-95"
            >
              <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-[1.25rem] ${btn.bg} transition-all group-hover:scale-110 group-hover:shadow-md`}>
                <btn.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${btn.color}`} aria-hidden="true" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-secondary group-hover:text-primary tracking-wide">
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Next Plan Card */}
        <Card className="p-5 lg:col-span-2 overflow-hidden relative">
          <SectionHeader title="Next up" eyebrow="Your upcoming plan" />
          
          {nextPlan ? (
            nextPlan.category === "flight" ? (
              // Boarding pass style for flights
              <div className="mt-4 relative rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 p-0 overflow-hidden flex flex-col sm:flex-row shadow-sm">
                {/* Decorative boarding pass side */}
                <div className="bg-sky-600 text-white p-4 flex sm:flex-col justify-between items-center sm:w-16 shrink-0">
                  <Plane className="h-6 w-6 rotate-45 sm:rotate-0" />
                  <span className="text-[10px] uppercase tracking-widest font-bold rotate-0 sm:-rotate-90 whitespace-nowrap sm:my-8">Boarding</span>
                  <Ticket className="h-5 w-5 opacity-60 hidden sm:block" />
                </div>
                {/* Perforation line */}
                <div className="hidden sm:block w-px border-l-2 border-dashed border-sky-200 dark:border-sky-800 my-4"></div>
                <div className="p-4 sm:p-5 flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-lg text-primary">{nextPlan.title}</p>
                    <Badge tone="sky">Flight</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-secondary mb-3">
                    <div className="font-mono text-xl font-bold text-sky-700 dark:text-sky-400">{nextPlan.startTime}</div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                    <div className="font-mono text-xl font-bold text-sky-700 dark:text-sky-400">{nextPlan.endTime || "—"}</div>
                  </div>
                  <p className="text-sm font-medium text-secondary flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 opacity-70" />
                    {fmtDate(nextPlan.date)}
                  </p>
                  {nextPlan.notes && <p className="mt-3 text-sm text-secondary bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-sky-100/50 dark:border-sky-800/50 line-clamp-2">{nextPlan.notes}</p>}
                </div>
              </div>
            ) : (
              // Standard itinerary style for other categories
              <div className="mt-4 flex gap-4 rounded-2xl bg-muted/40 border border-border/50 p-4 sm:p-5 transition-colors hover:bg-muted/60">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                  {nextPlan.category === "hotel" ? <BedDouble className="h-6 w-6" /> : 
                   nextPlan.category === "activity" ? <MapPin className="h-6 w-6" /> : 
                   <CalendarCheck className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-lg text-primary">{nextPlan.title}</p>
                    <Badge tone="brand" className="hidden sm:inline-flex capitalize">{nextPlan.category}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-secondary flex items-center gap-2 flex-wrap">
                    <span className="text-primary font-bold">{nextPlan.startTime}</span>
                    <span className="text-muted">•</span>
                    <span>{fmtDate(nextPlan.date)}</span>
                    {nextPlan.locationName && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="truncate">{nextPlan.locationName}</span>
                      </>
                    )}
                  </p>
                  {nextPlan.notes && <p className="mt-2.5 text-sm text-secondary bg-surface border border-border/50 p-2.5 rounded-xl line-clamp-2">{nextPlan.notes}</p>}
                </div>
              </div>
            )
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<MapPin className="h-8 w-8" />}
                title="Your journey awaits"
                body="Head over to the Plan tab to start adding flights, hotels, and activities."
              />
            </div>
          )}
        </Card>

        {/* Budget card */}
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-amber-500/10 blur-2xl" />
          <SectionHeader title="Budget" eyebrow={data.trip.currency} />
          <div className="relative mt-4">
            <p className="text-4xl font-black text-primary tabular-nums tracking-tight">
              <span className="text-xl font-bold text-muted mr-1">{data.trip.currency}</span>
              {totalSpend.toLocaleString()}
            </p>
            {data.trip.estimatedBudget > 0 ? (
              <>
                <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary">
                  <span>{budgetPct}% Used</span>
                  <span>Total {data.trip.estimatedBudget.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPct >= 90 ? "bg-danger" : budgetPct >= 75 ? "bg-warning" : "bg-emerald-500"
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                {remaining !== null && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl w-fit">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    {data.trip.currency} {remaining.toLocaleString()} left to spend
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm font-medium text-muted bg-muted/50 px-3 py-2 rounded-xl inline-block">No budget limit set</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Accommodations & Safety ── */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <BedDouble className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-primary">Accommodation</h3>
          </div>
          <p className="text-sm leading-relaxed text-secondary flex-1">
            {data.trip.hotelInfo || "No accommodation details added yet."}
          </p>
        </Card>
        
        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-primary">Safety Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-secondary flex-1">
            {data.trip.emergencySummary || "No safety information added yet."}
          </p>
        </Card>
      </div>
    </div>
  );
}
