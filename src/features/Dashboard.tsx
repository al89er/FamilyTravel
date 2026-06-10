import { CalendarCheck, FileText, Luggage, Map, Plane, ReceiptText } from "lucide-react";
import { Badge, Card, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

function daysUntil(date: string) {
  const today = new Date();
  const start = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.ceil((start.getTime() - today.getTime()) / 86_400_000));
}

export function Dashboard({ data, openView }: { data: AppData; openView: (view: string) => void }) {
  const currentPlan = data.itinerary[0];
  const totalSpend = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetPct = Math.round((totalSpend / data.trip.estimatedBudget) * 100);
  const quickButtons = [
    { id: "itinerary", label: "Itinerary", icon: CalendarCheck },
    { id: "map", label: "Map", icon: Map },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "expenses", label: "Expenses", icon: ReceiptText },
    { id: "packing", label: "Packing", icon: Luggage }
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-700 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="brand">{data.trip.destination}</Badge>
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{data.trip.title}</h1>
              <p className="mt-2 text-sm text-teal-50">
                {data.trip.startDate} to {data.trip.endDate}
              </p>
            </div>
            <div className="rounded-lg bg-white/15 p-4 text-left backdrop-blur">
              <p className="text-sm text-teal-50">Countdown</p>
              <p className="text-3xl font-bold tabular-nums">{daysUntil(data.trip.startDate)}</p>
              <p className="text-sm text-teal-50">days to go</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionHeader title="Current Day Plan" eyebrow="Today focus" />
          <div className="mt-4 flex gap-3 rounded-lg bg-slate-50 p-4">
            <Plane className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">{currentPlan.title}</p>
              <p className="text-sm text-slate-600">
                {currentPlan.date} at {currentPlan.startTime} - {currentPlan.locationName}
              </p>
              <p className="mt-2 text-sm text-slate-700">{currentPlan.notes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title="Budget" eyebrow={data.trip.currency} />
          <p className="mt-4 text-3xl font-bold text-ink tabular-nums">
            {data.trip.currency} {totalSpend.toLocaleString()}
          </p>
          <p className="text-sm text-slate-600">{budgetPct}% of estimated budget used</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-coral" style={{ width: `${Math.min(100, budgetPct)}%` }} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionHeader title="Hotel" />
          <p className="mt-3 text-sm leading-6 text-slate-700">{data.trip.hotelInfo}</p>
        </Card>
        <Card className="p-4">
          <SectionHeader title="Emergency" />
          <p className="mt-3 text-sm leading-6 text-slate-700">{data.trip.emergencySummary}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {quickButtons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={() => openView(button.id)}
            className="min-h-24 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-100"
          >
            <button.icon className="h-6 w-6 text-brand-700" aria-hidden="true" />
            <span className="mt-3 block text-sm font-semibold text-slate-900">{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
