import {
  BedDouble,
  CalendarCheck,
  CalendarDays,
  FileText,
  Luggage,
  Map,
  MapPin,
  Plane,
  ReceiptText,
  ShieldAlert,
  Ticket,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
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
  canEdit,
}: {
  data: AppData;
  openView: (view: string) => void;
  canEdit: boolean;
}) {
  const countdown   = daysUntil(data.trip.startDate);
  const totalSpend  = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPct   = data.trip.estimatedBudget > 0
    ? Math.min(100, Math.round((totalSpend / data.trip.estimatedBudget) * 100))
    : 0;
  const remaining   = data.trip.estimatedBudget > 0 ? data.trip.estimatedBudget - totalSpend : null;
  const nights      = tripDuration(data.trip.startDate, data.trip.endDate);

  // Quick-action grid — light-mode colours only
  const quickButtons = [
    { id: "itinerary",   label: "Plan",          icon: CalendarCheck, gradient: "from-violet-400 to-violet-600" },
    { id: "map",         label: "Explore",       icon: Map,           gradient: "from-sky-400 to-sky-600" },
    { id: "assignments", label: "Rooms & Seats", icon: BedDouble,     gradient: "from-emerald-400 to-emerald-600" },
    { id: "documents",   label: "Docs",          icon: FileText,      gradient: "from-indigo-400 to-indigo-600" },
    { id: "emergency",   label: "Safety",        icon: ShieldAlert,   gradient: "from-rose-400 to-rose-600" },
  ];

  const nextPlan = data.itinerary[0];

  return (
    <div className="space-y-6">

      {/* ── Hero Card ── */}
      <Card className="overflow-hidden border-0 shadow-clay-card rounded-[48px] p-0 relative bg-clay-surface">
        <div className="relative overflow-hidden p-6 sm:p-8">
          {/* Faded background image */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url('${import.meta.env.BASE_URL}hero-bg.jpg')` }}
          />

          {/* Decorative colour blobs — behind text, low opacity */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/8 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-pink-400/8 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between z-10">
            {/* Left: trip info */}
            <div className="min-w-0 flex-1">
              {/* Destination pill */}
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary ring-1 ring-primary/20 shadow-clay-surface">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {data.trip.destination}
              </div>

              {/* Trip title */}
              <h1 className="text-4xl font-black leading-tight text-clay-primary sm:text-5xl">
                {data.trip.title}
              </h1>

              {/* Dates */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold">
                <span className="flex items-center gap-1.5 bg-clay-recessed rounded-full px-3 py-1.5 text-clay-primary shadow-clay-pressed">
                  <CalendarDays className="h-4 w-4 text-clay-secondary" aria-hidden="true" />
                  {fmtShort(data.trip.startDate)} – {fmtShort(data.trip.endDate)}
                </span>
                <span className="rounded-full bg-clay-recessed px-3 py-1.5 text-xs font-bold text-clay-secondary shadow-clay-pressed">
                  {nights} {nights === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            {/* Right: countdown orb — saturated violet so white text is safe */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center h-28 w-28 rounded-[32px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-[0_12px_28px_rgba(124,58,237,0.35),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-3px_6px_rgba(0,0,0,0.15)] text-white">
              {countdown > 0 ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Starts in</p>
                  <p className="mt-0.5 text-4xl font-black tabular-nums drop-shadow-sm">{countdown}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Days</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Status</p>
                  <p className="mt-0.5 text-3xl font-black drop-shadow-sm">✈️</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5 opacity-90">Trip is on</p>
                </>
              )}
            </div>
          </div>

          {/* Stats strip — recessed well */}
          <div className="relative mt-8 grid grid-cols-3 gap-3 rounded-[24px] bg-clay-recessed shadow-clay-pressed p-3">
            <StatPill label="Plan"   value={`${data.itinerary.length} items`} inverse={true} />
            <StatPill label="Budget" value={`${data.trip.currency} ${totalSpend.toLocaleString()}`} inverse={true} />
            <StatPill label="Crew"   value={`${data.members.length} people`} inverse={true} />
          </div>
        </div>
      </Card>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {quickButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => openView(btn.id)}
            className="group flex flex-col items-center gap-2 rounded-[24px] bg-clay-surface p-2.5 sm:p-3 text-center shadow-clay-card transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-[0.93] active:shadow-clay-pressed"
          >
            <div
              className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-[16px] bg-gradient-to-br ${btn.gradient} shadow-clay-btn transition-transform duration-300 group-hover:scale-110`}
            >
              <btn.icon className="h-6 w-6 text-white drop-shadow-sm" aria-hidden="true" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-clay-secondary group-hover:text-clay-primary tracking-wide">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Next Plan Card ── */}
        <Card className="p-6 lg:col-span-2 overflow-hidden relative border-0">
          <SectionHeader title="Next up" eyebrow="Your upcoming plan" />

          {nextPlan ? (
            nextPlan.category === "flight" ? (
              // Boarding pass style — solid clay body, sky accent strip on left
              <div className="mt-4 flex flex-col sm:flex-row overflow-hidden rounded-[24px] bg-clay-surface shadow-clay-card">
                {/* Saturated sky strip — white text is safe here */}
                <div className="bg-sky-500 text-white p-4 sm:p-5 flex sm:flex-col justify-between items-center sm:w-16 shrink-0">
                  <Plane className="h-5 w-5 rotate-45 sm:rotate-0 drop-shadow-sm" aria-hidden="true" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black rotate-0 sm:-rotate-90 whitespace-nowrap sm:my-8 opacity-90">
                    Boarding
                  </span>
                  <Ticket className="h-4 w-4 opacity-50 hidden sm:block" aria-hidden="true" />
                </div>
                {/* Perforation separator */}
                <div className="hidden sm:flex flex-col justify-between items-center w-4 -ml-2 -mr-2 z-10">
                  <div className="h-4 w-4 rounded-full bg-clay-canvas -mt-2 border-b border-border/50" />
                  <div className="h-full w-px border-l-[3px] border-dashed border-border/60 my-2" />
                  <div className="h-4 w-4 rounded-full bg-clay-canvas -mb-2 border-t border-border/50" />
                </div>
                {/* Ticket body — solid clay surface, dark text */}
                <div className="p-4 sm:p-5 flex-1 min-w-0 sm:pl-7">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-lg text-clay-primary leading-tight">{nextPlan.title}</p>
                    <Badge tone="sky">Flight</Badge>
                  </div>
                  {/* Times — sky-700 is dark enough on white */}
                  <div className="flex items-center gap-4 bg-sky-50 rounded-[16px] p-3 mb-3">
                    <div className="font-mono text-xl font-black text-sky-700">{nextPlan.startTime}</div>
                    <ArrowRight className="h-4 w-4 text-clay-secondary" aria-hidden="true" />
                    <div className="font-mono text-xl font-black text-sky-700">{nextPlan.endTime || "—"}</div>
                  </div>
                  <p className="text-sm font-medium text-clay-secondary flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 opacity-60" aria-hidden="true" />
                    {fmtDate(nextPlan.date)}
                  </p>
                  {nextPlan.notes && (
                    <p className="mt-3 text-sm text-clay-secondary bg-clay-recessed shadow-clay-pressed p-2.5 rounded-[16px] line-clamp-2">
                      {nextPlan.notes}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // Standard card — dark text on muted clay recessed background
              <div className="mt-4 flex gap-4 rounded-[24px] bg-clay-recessed shadow-clay-pressed border border-border/40 p-4 sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                  {nextPlan.category === "hotel"    ? <BedDouble className="h-6 w-6" />      :
                   nextPlan.category === "activity" ? <MapPin className="h-6 w-6" />         :
                                                      <CalendarCheck className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-lg text-clay-primary leading-tight">{nextPlan.title}</p>
                    <Badge tone="brand" className="hidden sm:inline-flex capitalize">
                      {nextPlan.category}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-clay-secondary flex items-center gap-2 flex-wrap">
                    <span className="text-clay-primary font-bold">{nextPlan.startTime}</span>
                    <span className="text-border">•</span>
                    <span>{fmtDate(nextPlan.date)}</span>
                    {nextPlan.locationName && (
                      <>
                        <span className="text-border">•</span>
                        <span className="truncate">{nextPlan.locationName}</span>
                      </>
                    )}
                  </p>
                  {nextPlan.notes && (
                    <p className="mt-2.5 text-sm text-clay-secondary bg-clay-surface shadow-clay-surface p-2.5 rounded-[16px] line-clamp-2">
                      {nextPlan.notes}
                    </p>
                  )}
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

        {/* ── Budget Card ── */}
        <Card className="p-6 relative overflow-hidden border-0">
          <div aria-hidden="true" className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-amber-400/10 blur-2xl" />
          <SectionHeader title="Budget" eyebrow={data.trip.currency} />
          <div className="relative mt-4">
            <p className="text-4xl font-black text-clay-primary tabular-nums tracking-tight">
              <span className="text-xl font-bold text-clay-secondary mr-1">{data.trip.currency}</span>
              {totalSpend.toLocaleString()}
            </p>
            {data.trip.estimatedBudget > 0 ? (
              <>
                <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-clay-secondary">
                  <span>{budgetPct}% Used</span>
                  <span>Total {data.trip.estimatedBudget.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-clay-recessed shadow-clay-pressed">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPct >= 90 ? "bg-danger" : budgetPct >= 75 ? "bg-warning" : "bg-emerald-500"
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                {remaining !== null && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-[16px] w-fit">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    {data.trip.currency} {remaining.toLocaleString()} left to spend
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm font-medium text-clay-secondary bg-clay-recessed shadow-clay-pressed px-3 py-2 rounded-[16px] inline-block">
                No budget limit set
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Accommodation & Safety ── */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6 flex flex-col border-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-indigo-100 text-indigo-600">
              <BedDouble className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-clay-primary">Accommodation</h3>
          </div>
          <p className="text-sm leading-relaxed text-clay-secondary flex-1">
            {data.trip.hotelInfo || "No accommodation details added yet."}
          </p>
        </Card>

        <Card className="p-6 flex flex-col border-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-red-100 text-red-600">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-clay-primary">Safety Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-clay-secondary flex-1">
            {data.trip.emergencySummary || "No safety information added yet."}
          </p>
        </Card>
      </div>
    </div>
  );
}
