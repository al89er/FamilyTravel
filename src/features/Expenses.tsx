import { ReceiptText } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

export function Expenses({ data }: { data: AppData }) {
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = data.expenses.reduce<Record<string, number>>((groups, expense) => {
    groups[expense.category] = (groups[expense.category] ?? 0) + expense.amount;
    return groups;
  }, {});
  const balance = calculateBalances(data);

  return (
    <div className="space-y-5">
      <SectionHeader title="Expense Tracker" eyebrow="Actual vs estimated" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-600">Total spending</p>
          <p className="mt-2 text-3xl font-bold text-ink tabular-nums">
            {data.trip.currency} {total.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-900">Spending by category</p>
          <div className="mt-3 space-y-2">
            {Object.entries(byCategory).map(([category, amount]) => (
              <div key={category}>
                <div className="flex justify-between text-sm">
                  <span>{category}</span>
                  <span className="tabular-nums">{amount.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-700" style={{ width: `${Math.max(8, (amount / total) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionHeader title="Who Owes Whom" />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {balance.map((line) => (
            <div key={line} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {line}
            </div>
          ))}
        </div>
      </Card>

      {data.expenses.length === 0 ? (
        <EmptyState title="No expenses yet" body="Add receipts, notes, split members, and categories as spending happens." />
      ) : (
        <div className="space-y-3">
          {data.expenses.map((expense) => (
            <Card key={expense.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <ReceiptText className="mt-1 h-5 w-5 text-brand-700" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-slate-950">{expense.category}</h3>
                    <p className="text-sm text-slate-600">{expense.date}</p>
                    {expense.notes ? <p className="mt-1 text-sm text-slate-700">{expense.notes}</p> : null}
                  </div>
                </div>
                <Badge tone="coral">
                  {expense.currency} {expense.amount.toLocaleString()}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function calculateBalances(data: AppData) {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  data.expenses.forEach((expense) => {
    paid[expense.paidBy] = (paid[expense.paidBy] ?? 0) + expense.amount;
    const share = expense.amount / expense.splitBetween.length;
    expense.splitBetween.forEach((profileId) => {
      owed[profileId] = (owed[profileId] ?? 0) + share;
    });
  });

  return data.members.map((member) => {
    const diff = (paid[member.profileId] ?? 0) - (owed[member.profileId] ?? 0);
    const name = member.profile.displayName;
    if (diff >= 0) return `${name} should receive ${data.trip.currency} ${diff.toFixed(2)}`;
    return `${name} owes ${data.trip.currency} ${Math.abs(diff).toFixed(2)}`;
  });
}
