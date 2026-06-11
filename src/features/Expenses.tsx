import { DollarSign, Pencil, Plus, ReceiptText, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass } from "../components/ui";
import { deleteExpense, upsertExpense } from "../lib/supabase";
import type { AppData, Expense, ExpenseInput } from "../types";

// Map common expense category names to a colour
const EXPENSE_CATEGORY_COLOURS: Record<string, string> = {
  food: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  dining: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  restaurant: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  transport: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  taxi: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  flight: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  hotel: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  accommodation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  shopping: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  activity: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  entertainment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

function expenseCategoryClass(category: string) {
  const key = category.trim().toLowerCase();
  for (const [k, v] of Object.entries(EXPENSE_CATEGORY_COLOURS)) {
    if (key.includes(k)) return v;
  }
  return "bg-muted text-secondary";
}

export function Expenses({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = data.expenses.reduce<Record<string, number>>((groups, expense) => {
    groups[expense.category] = (groups[expense.category] ?? 0) + expense.amount;
    return groups;
  }, {});
  const balance = calculateBalances(data);

  return (
    <div className="space-y-5">
      <SectionHeader title="Expense Tracker" eyebrow="Actual vs estimated" action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add expense</Button> : null} />
      {canEdit && showForm ? <ExpenseForm data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10" />
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Total spent</p>
          <p className="mt-1 text-2xl font-bold text-primary tabular-nums">{data.trip.currency} {total.toLocaleString()}</p>
        </Card>

        <Card className="p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">By category</p>
          <div className="mt-3 space-y-2.5">
            {Object.entries(byCategory).map(([category, amount]) => (
              <div key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${expenseCategoryClass(category)}`}>{category}</span>
                  <span className="font-semibold tabular-nums text-primary">{data.trip.currency} {amount.toLocaleString()}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${total > 0 ? Math.max(6, (amount / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && <p className="text-sm text-muted">No spending yet.</p>}
          </div>
        </Card>
      </div>

      {/* Who owes whom */}
      {balance.length > 0 ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-primary">Settlement</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {balance.map((line) => {
              const owes = line.includes("owes");
              return (
                <div
                  key={line}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium ${owes ? "bg-danger/8 text-danger ring-1 ring-danger/20" : "bg-success/8 text-success ring-1 ring-success/20"}`}
                >
                  {owes
                    ? <TrendingDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    : <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                  }
                  {line}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {data.expenses.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-8 w-8" />}
          title="No expenses yet"
          body="Add receipts, notes, split members, and categories as spending happens."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add your first expense</Button> : null}
        />
      ) : (
        <div className="space-y-3">
          {data.expenses.map((expense) => (
            <ExpenseCard key={expense.id} data={data} expense={expense} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseCard({ data, expense, canEdit, onRefresh }: { data: AppData; expense: Expense; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paidBy = data.members.find((member) => member.profileId === expense.paidBy)?.profile.displayName;

  async function remove() {
    if (!window.confirm("Delete this expense?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteExpense(data.trip.id, expense.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete expense.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <ExpenseForm data={data} expense={expense} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <ReceiptText className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${expenseCategoryClass(expense.category)}`}>
                {expense.category}
              </span>
            </div>
            <p className="mt-1 text-sm text-secondary">
              {expense.date}{paidBy ? ` · paid by ${paidBy}` : ""}
            </p>
            {expense.notes ? <p className="mt-1 text-sm text-secondary">{expense.notes}</p> : null}
            {canEdit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
              </div>
            ) : null}
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-primary">{expense.currency} {expense.amount.toLocaleString()}</p>
          {expense.splitBetween.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">÷ {expense.splitBetween.length} people</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ExpenseForm({ data, expense, onSaved, onCancel }: { data: AppData; expense?: Expense; onSaved: () => Promise<void>; onCancel: () => void }) {
  const defaultMember = data.members[0]?.profileId ?? data.currentUser.id;
  const [form, setForm] = useState<ExpenseInput>({
    amount: expense?.amount ?? 0,
    currency: expense?.currency ?? data.trip.currency,
    category: expense?.category ?? "",
    paidBy: expense?.paidBy ?? defaultMember,
    splitBetween: expense?.splitBetween.length ? expense.splitBetween : data.members.map((member) => member.profileId),
    date: expense?.date ?? new Date().toISOString().slice(0, 10),
    notes: expense?.notes
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSplit(profileId: string) {
    setForm((current) => ({
      ...current,
      splitBetween: current.splitBetween.includes(profileId)
        ? current.splitBetween.filter((id) => id !== profileId)
        : [...current.splitBetween, profileId]
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.category.trim() || form.amount < 0 || !form.paidBy || form.splitBetween.length === 0) {
      setError("Category, amount, paid by, and at least one split member are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertExpense(data.trip.id, { ...form, category: form.category.trim(), currency: form.currency.trim().toUpperCase() }, expense?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Category"><input className={formInputClass} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="e.g. Food, Transport, Hotel" /></Field>
        <Field label="Amount"><input type="number" min="0" step="0.01" className={formInputClass} value={form.amount} onChange={(event) => update("amount", Number(event.target.value))} /></Field>
        <Field label="Currency"><input className={formInputClass} value={form.currency} onChange={(event) => update("currency", event.target.value)} maxLength={3} /></Field>
        <Field label="Date"><input type="date" className={formInputClass} value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
        <Field label="Paid by"><select className={formSelectClass} value={form.paidBy} onChange={(event) => update("paidBy", event.target.value)}>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-primary">Split between</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.members.map((member) => (
              <label key={member.profileId} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-muted">
                <input type="checkbox" checked={form.splitBetween.includes(member.profileId)} onChange={() => toggleSplit(member.profileId)} />
                {member.profile.displayName}
              </label>
            ))}
          </div>
        </div>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save expense</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function calculateBalances(data: AppData) {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  data.expenses.forEach((expense) => {
    paid[expense.paidBy] = (paid[expense.paidBy] ?? 0) + expense.amount;
    if (!expense.splitBetween.length) return;
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
