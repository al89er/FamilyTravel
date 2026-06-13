import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Wallet,
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
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Currency Helper State
  const [cachedRateInfo, setCachedRateInfo] = useState<{rate: number, date: string} | null>(() => {
    try {
      const cacheStr = localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:rate-cache`);
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        if (cache && typeof cache.rate === "number") {
          return { rate: cache.rate, date: cache.date };
        }
      }
    } catch(e) {}
    return null;
  });

  const [rateMode, setRateMode] = useState<"auto" | "manual">(() => {
    return (localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:mode`) as any) || "auto";
  });

  const [currencyDirection, setCurrencyDirection] = useState<"IDR_TO_MYR" | "MYR_TO_IDR">(() => {
    return (localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:direction`) as any) || "IDR_TO_MYR";
  });

  const [currencyRateStr, setCurrencyRateStr] = useState(() => {
    const savedMode = localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:mode`) || "auto";
    if (savedMode === "auto") {
      try {
        const cacheStr = localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:rate-cache`);
        if (cacheStr) {
          const cache = JSON.parse(cacheStr);
          if (cache && typeof cache.rate === "number") {
            return cache.rate.toString();
          }
        }
      } catch(e) {}
    }
    return localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:rate`) || "0.00027";
  });

  const [currencyAmountStr, setCurrencyAmountStr] = useState(() => {
    return localStorage.getItem(`familytravel:currency-helper:${data.trip.id}:amount`) || "";
  });

  useEffect(() => {
    localStorage.setItem(`familytravel:currency-helper:${data.trip.id}:mode`, rateMode);
  }, [rateMode, data.trip.id]);

  useEffect(() => {
    localStorage.setItem(`familytravel:currency-helper:${data.trip.id}:direction`, currencyDirection);
  }, [currencyDirection, data.trip.id]);

  useEffect(() => {
    localStorage.setItem(`familytravel:currency-helper:${data.trip.id}:rate`, currencyRateStr);
  }, [currencyRateStr, data.trip.id]);

  useEffect(() => {
    localStorage.setItem(`familytravel:currency-helper:${data.trip.id}:amount`, currencyAmountStr);
  }, [currencyAmountStr, data.trip.id]);

  useEffect(() => {
    const cacheKey = `familytravel:currency-helper:${data.trip.id}:rate-cache`;
    let needsUpdate = true;
    
    try {
      const cacheStr = localStorage.getItem(cacheKey);
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        const todayStr = new Date().toISOString().split("T")[0];
        const ageHours = (Date.now() - new Date(cache.fetchedAt).getTime()) / (1000 * 60 * 60);
        if (cache.date === todayStr && ageHours < 24 && cache.rate > 0) {
          needsUpdate = false;
        }
      }
    } catch(e) {}

    if (!needsUpdate) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch("https://api.frankfurter.dev/v2/rate/IDR/MYR", { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error("API not ok");
        return res.json();
      })
      .then(json => {
        if (json && json.rate && typeof json.rate === "number" && json.rate > 0) {
          const dateStr = new Date().toISOString().split("T")[0];
          const newCache = {
            rate: json.rate,
            base: "IDR",
            quote: "MYR",
            date: dateStr,
            fetchedAt: new Date().toISOString(),
            source: "frankfurter"
          };
          localStorage.setItem(cacheKey, JSON.stringify(newCache));
          setCachedRateInfo({ rate: json.rate, date: dateStr });
          
          setRateMode(currentMode => {
            if (currentMode === "auto") {
              setCurrencyRateStr(json.rate.toString());
            }
            return currentMode;
          });
        }
      })
      .catch(() => { /* silent failure */ })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [data.trip.id]);

  const numRate = parseFloat(currencyRateStr);
  const effectiveRate = isNaN(numRate) ? 0.00027 : numRate;
  const numAmount = parseFloat(currencyAmountStr) || 0;
  
  let convertedResult = 0;
  if (currencyDirection === "IDR_TO_MYR") {
    convertedResult = numAmount * effectiveRate;
  } else {
    convertedResult = effectiveRate > 0 ? numAmount / effectiveRate : 0;
  }

  function handleCurrencySwap() {
    setCurrencyDirection(prev => prev === "IDR_TO_MYR" ? "MYR_TO_IDR" : "IDR_TO_MYR");
  }

  const isIdrToMyr = currencyDirection === "IDR_TO_MYR";
  const sourceLabel = isIdrToMyr ? "IDR" : "MYR";
  const targetLabel = isIdrToMyr ? "MYR" : "IDR";
  const quickChips = isIdrToMyr 
    ? [10000, 50000, 100000, 500000, 1000000]
    : [10, 50, 100, 500, 1000];
  
  const formatResult = (amount: number, currency: string) => {
    if (currency === "IDR") {
      return "IDR " + Math.round(amount).toLocaleString("en-US");
    } else {
      return "MYR " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  function handleRateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRateMode("manual");
    setCurrencyRateStr(e.target.value);
  }

  function handleUseDailyRate() {
    setRateMode("auto");
    if (cachedRateInfo) {
      setCurrencyRateStr(cachedRateInfo.rate.toString());
    } else {
      setCurrencyRateStr("0.00027");
    }
  }

  let rateSourceText = "Rate is manual for offline use.";
  if (rateMode === "auto") {
    if (cachedRateInfo) {
       rateSourceText = `Daily rate cached for offline use (Updated: ${cachedRateInfo.date})`;
    } else {
       rateSourceText = "Using default rate (Offline)";
    }
  } else {
    rateSourceText = "Manual rate for offline use";
  }

  const countdown   = daysUntil(data.trip.startDate);
  const totalSpend  = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPct   = data.trip.estimatedBudget > 0
    ? Math.min(100, Math.round((totalSpend / data.trip.estimatedBudget) * 100))
    : 0;
  const remaining   = data.trip.estimatedBudget > 0 ? data.trip.estimatedBudget - totalSpend : null;
  const nights      = tripDuration(data.trip.startDate, data.trip.endDate);

  const hotelItemsCount = data.itinerary.filter(i => i.category === "hotel").length;
  const roomAssignmentsCount = data.roomAssignments.length;
  
  const totalPacking = data.packing.length;
  const packedCount = data.packing.filter(i => i.checkedBy && i.checkedBy.length > 0).length;
  
  const documentCount = data.documents.length;
  const emergencyContactsCount = data.emergencyContacts.length;
  const hasSafetySummary = !!data.trip.emergencySummary;
  const hasInsurance = !!(data.insurance && data.insurance.provider);

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



      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Next Plan Card ── */}
        <Card className="p-6 lg:col-span-2 overflow-hidden relative border-0">
          <SectionHeader title="Next up" eyebrow="Your upcoming plan" />

          {nextPlan ? (
            nextPlan.category === "flight" ? (
              // Boarding pass style — solid clay body, sky accent strip on left
              <div className="mt-4 flex flex-col sm:flex-row overflow-hidden rounded-[24px] bg-clay-surface shadow-clay-card">
                {/* Saturated sky strip — white text is safe here */}
                <div className="bg-sky-500 text-white p-4 sm:p-5 flex sm:flex-col justify-between items-center sm:w-[5.5rem] shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4)_0%,transparent_60%)]"></div>
                  <Plane className="h-6 w-6 sm:h-7 sm:w-7 rotate-45 sm:rotate-0 drop-shadow-md z-10" aria-hidden="true" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-black rotate-0 sm:-rotate-90 whitespace-nowrap sm:my-10 z-10 opacity-90 drop-shadow-sm">
                    Boarding
                  </span>
                  <Ticket className="h-5 w-5 opacity-40 hidden sm:block z-10" aria-hidden="true" />
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
                  <div className="flex items-center gap-4 mb-4 bg-sky-50 p-3 rounded-[18px] border border-sky-100">
                    <div className="font-mono text-2xl font-black text-sky-700">{nextPlan.startTime}</div>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="h-px w-full bg-sky-200 absolute" />
                      <Plane className="h-4 w-4 text-sky-400 absolute rotate-90" aria-hidden="true" />
                    </div>
                    <div className="font-mono text-2xl font-black text-sky-700">{nextPlan.endTime || "—"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-clay-secondary flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 opacity-60" aria-hidden="true" />
                      {fmtDate(nextPlan.date)}
                    </p>
                    {nextPlan.notes && (
                      <button
                        type="button"
                        onClick={() => setNotesExpanded(!notesExpanded)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-secondary hover:text-clay-primary transition-all focus:outline-none bg-clay-recessed shadow-clay-pressed py-1.5 px-3 rounded-[12px]"
                      >
                        <span>{notesExpanded ? "Hide notes" : "Show notes"}</span>
                        {notesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  {nextPlan.notes && notesExpanded && (
                    <p className="mt-3 rounded-[18px] bg-clay-recessed shadow-clay-pressed p-4 text-sm text-clay-secondary border border-border/30 leading-relaxed whitespace-pre-line">
                      {nextPlan.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openView("itinerary")} className="inline-flex items-center justify-center rounded-[14px] bg-clay-recessed shadow-clay-pressed px-4 py-2 text-xs font-bold text-clay-primary hover:text-primary transition-all active:scale-95">
                      View plan
                    </button>
                    {nextPlan.locationName && (
                      <button type="button" onClick={() => openView("map")} className="inline-flex items-center justify-center rounded-[14px] bg-clay-recessed shadow-clay-pressed px-4 py-2 text-xs font-bold text-clay-primary hover:text-primary transition-all active:scale-95">
                        Open map
                      </button>
                    )}
                  </div>
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
                  <div className="mt-0.5 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-clay-secondary flex items-center gap-2 flex-wrap">
                      <span className="text-clay-primary font-bold">{nextPlan.startTime}</span>
                      <span className="text-border">•</span>
                      <span>{fmtDate(nextPlan.date)}</span>
                      {nextPlan.locationName && (
                        <>
                          <span className="text-border">•</span>
                          <span className="truncate max-w-[120px] sm:max-w-none">{nextPlan.locationName}</span>
                        </>
                      )}
                    </p>
                    {nextPlan.notes && (
                      <button
                        type="button"
                        onClick={() => setNotesExpanded(!notesExpanded)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-secondary hover:text-clay-primary transition-all focus:outline-none bg-clay-surface shadow-clay-surface py-1.5 px-3 rounded-[12px] border border-border/30"
                      >
                        <span>{notesExpanded ? "Hide notes" : "Show notes"}</span>
                        {notesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  {nextPlan.notes && notesExpanded && (
                    <p className="mt-2.5 text-sm text-clay-secondary bg-clay-surface shadow-clay-surface p-2.5 rounded-[16px] whitespace-pre-line">
                      {nextPlan.notes}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openView("itinerary")} className="inline-flex items-center justify-center rounded-[14px] bg-clay-surface shadow-clay-surface border border-border/30 px-4 py-2 text-xs font-bold text-clay-primary hover:text-primary transition-all active:scale-95">
                      View plan
                    </button>
                    {nextPlan.locationName && (
                      <button type="button" onClick={() => openView("map")} className="inline-flex items-center justify-center rounded-[14px] bg-clay-surface shadow-clay-surface border border-border/30 px-4 py-2 text-xs font-bold text-clay-primary hover:text-primary transition-all active:scale-95">
                        Open map
                      </button>
                    )}
                  </div>
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

        {/* ── Currency Helper Card ── */}
        <Card className="p-6 relative overflow-hidden border-0 bg-clay-surface shadow-clay-card flex flex-col">
          <div aria-hidden="true" className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-400/10 blur-2xl" />
          <SectionHeader title="Currency Helper" eyebrow="Quick travel conversion" />
          
          <div className="relative mt-4 flex-1 flex flex-col gap-4">
            {/* Swap & Inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-1.5 ml-2">{sourceLabel}</label>
                <input
                  type="number"
                  value={currencyAmountStr}
                  onChange={(e) => setCurrencyAmountStr(e.target.value)}
                  className="w-full bg-clay-recessed shadow-clay-pressed rounded-[20px] px-4 py-3 text-lg font-black text-clay-primary placeholder:text-clay-secondary/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all border-0"
                  placeholder="0"
                />
              </div>

              <button
                type="button"
                onClick={handleCurrencySwap}
                className="mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-clay-surface shadow-clay-card hover:shadow-clay-hover hover:-translate-y-0.5 active:scale-95 transition-all text-emerald-600"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCurrencyAmountStr(chip.toString())}
                  className="rounded-[12px] bg-clay-surface shadow-clay-card px-3 py-1.5 text-xs font-bold text-clay-secondary hover:text-clay-primary hover:shadow-clay-hover active:scale-95 transition-all border border-border/20"
                >
                  {chip >= 1000 ? (chip >= 1000000 ? (chip / 1000000) + 'M' : (chip / 1000) + 'k') : chip}
                </button>
              ))}
            </div>

            {/* Result Panel */}
            <div className="mt-2 bg-clay-recessed shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] rounded-[24px] p-5 border border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-1">{targetLabel} Result</p>
              <p className="text-3xl font-black text-clay-primary tracking-tight">
                {formatResult(convertedResult, targetLabel)}
              </p>
            </div>

            {/* Manual Rate & CTA */}
            <div className="mt-auto pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 bg-clay-surface shadow-clay-surface rounded-[16px] p-2 pr-4 border border-border/30">
                <div className="flex items-center gap-2 flex-1">
                  <div className="bg-clay-recessed shadow-clay-pressed px-3 py-1.5 rounded-[12px]">
                    <span className="text-[10px] font-bold text-clay-secondary">1 IDR =</span>
                  </div>
                  <input
                    type="number"
                    value={currencyRateStr}
                    onChange={handleRateChange}
                    className="w-24 bg-transparent text-sm font-bold text-clay-primary focus:outline-none placeholder:text-clay-secondary"
                    step="0.00001"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary">MYR</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-clay-secondary/80">{rateSourceText}</p>
                  {rateMode === "manual" && cachedRateInfo && (
                    <button
                      type="button"
                      onClick={handleUseDailyRate}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 text-left w-fit"
                    >
                      Reset to daily rate
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openView("expenses")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-[12px] transition-colors"
                >
                  <Wallet className="h-3.5 w-3.5" /> Open Money
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Actionable Status Cards ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Stay & Rooms */}
        <button
          type="button"
          onClick={() => openView("assignments")}
          className="group flex flex-col text-left rounded-[32px] bg-clay-surface shadow-clay-card p-6 transition-all hover:-translate-y-1 hover:shadow-clay-hover active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-clay-btn text-white transition-transform group-hover:scale-110">
              <BedDouble className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary group-hover:text-primary transition-colors">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-clay-primary tracking-tight">Stay & Rooms</h3>
          <div className="mt-2 text-sm text-clay-secondary leading-relaxed font-medium">
            {hotelItemsCount > 0 || roomAssignmentsCount > 0 ? (
              <p>
                {hotelItemsCount} {hotelItemsCount === 1 ? 'stay' : 'stays'} planned
                <span className="mx-2 text-border">•</span>
                {roomAssignmentsCount} {roomAssignmentsCount === 1 ? 'room' : 'rooms'} assigned
              </p>
            ) : data.trip.hotelInfo ? (
              <p className="line-clamp-2">{data.trip.hotelInfo}</p>
            ) : (
              <p className="text-amber-600">Rooms not assigned yet</p>
            )}
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-[12px] w-fit">
            View rooms
          </div>
        </button>

        {/* Travel Safety */}
        <button
          type="button"
          onClick={() => openView("emergency")}
          className="group flex flex-col text-left rounded-[32px] bg-clay-surface shadow-clay-card p-6 transition-all hover:-translate-y-1 hover:shadow-clay-hover active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-rose-400 to-rose-600 shadow-clay-btn text-white transition-transform group-hover:scale-110">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary group-hover:text-primary transition-colors">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-clay-primary tracking-tight">Travel Safety</h3>
          <div className="mt-2 text-sm text-clay-secondary leading-relaxed font-medium">
            {emergencyContactsCount > 0 || hasSafetySummary || hasInsurance ? (
              <div className="flex flex-col gap-1">
                {emergencyContactsCount > 0 && <p>{emergencyContactsCount} emergency {emergencyContactsCount === 1 ? 'contact' : 'contacts'}</p>}
                {hasSafetySummary && <p>Safety notes ready</p>}
                {hasInsurance && <p>Insurance info ready</p>}
              </div>
            ) : (
              <p className="text-amber-600">Safety info not ready</p>
            )}
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1.5 rounded-[12px] w-fit mt-auto">
            Open safety
          </div>
        </button>
      </div>

      {/* ── Trip Readiness ── */}
      <div className="space-y-4">
        <SectionHeader title="Trip readiness" eyebrow="Status check" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button type="button" onClick={() => openView("packing")} className="flex flex-col gap-2 rounded-[24px] bg-clay-surface shadow-clay-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95 text-left group">
            <div className="flex items-center justify-between">
              <Luggage className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Packing</p>
              <p className="font-bold text-clay-primary">
                {totalPacking > 0 ? `${packedCount} / ${totalPacking} packed` : "Not started"}
              </p>
            </div>
          </button>
          
          <button type="button" onClick={() => openView("documents")} className="flex flex-col gap-2 rounded-[24px] bg-clay-surface shadow-clay-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95 text-left group">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Docs</p>
              <p className="font-bold text-clay-primary">
                {documentCount > 0 ? `${documentCount} saved` : "No docs yet"}
              </p>
            </div>
          </button>

          <button type="button" onClick={() => openView("expenses")} className="flex flex-col gap-2 rounded-[24px] bg-clay-surface shadow-clay-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95 text-left group">
            <div className="flex items-center justify-between">
              <ReceiptText className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Money</p>
              <p className="font-bold text-clay-primary">
                {totalSpend > 0 ? `${data.trip.currency} ${totalSpend.toLocaleString()}` : "No spending"}
              </p>
            </div>
          </button>

          <button type="button" onClick={() => openView("emergency")} className="flex flex-col gap-2 rounded-[24px] bg-clay-surface shadow-clay-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95 text-left group">
            <div className="flex items-center justify-between">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Safety</p>
              <p className="font-bold text-clay-primary">
                {emergencyContactsCount > 0 ? `${emergencyContactsCount} contacts` : "Action needed"}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
