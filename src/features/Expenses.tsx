import { Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deleteExpense, upsertExpense } from "../lib/supabase";
import type { AppData, Expense, ExpenseInput } from "../types";

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
                  <div className="h-2 rounded-full bg-brand-700" style={{ width: `${total > 0 ? Math.max(8, (amount / total) * 100) : 0}%` }} />
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
        <div className="flex gap-3">
          <ReceiptText className="mt-1 h-5 w-5 text-brand-700" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-slate-950">{expense.category}</h3>
            <p className="text-sm text-slate-600">{expense.date}{paidBy ? ` | paid by ${paidBy}` : ""}</p>
            {expense.notes ? <p className="mt-1 text-sm text-slate-700">{expense.notes}</p> : null}
            {canEdit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
              </div>
            ) : null}
            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          </div>
        </div>
        <Badge tone="coral">{expense.currency} {expense.amount.toLocaleString()}</Badge>
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
        <Field label="Category"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value)} /></Field>
        <Field label="Amount"><input type="number" min="0" step="0.01" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.amount} onChange={(event) => update("amount", Number(event.target.value))} /></Field>
        <Field label="Currency"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.currency} onChange={(event) => update("currency", event.target.value)} maxLength={3} /></Field>
        <Field label="Date"><input type="date" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
        <Field label="Paid by"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.paidBy} onChange={(event) => update("paidBy", event.target.value)}>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-slate-800">Split between</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.members.map((member) => (
              <label key={member.profileId} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
                <input type="checkbox" checked={form.splitBetween.includes(member.profileId)} onChange={() => toggleSplit(member.profileId)} />
                {member.profile.displayName}
              </label>
            ))}
          </div>
        </div>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save</Button>
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
