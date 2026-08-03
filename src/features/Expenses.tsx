import { DollarSign, Pencil, Plus, ReceiptText, Trash2, TrendingDown, TrendingUp, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal } from "../components/ui";
import { deleteExpense, upsertExpense } from "../lib/supabase";
import type { AppData, Expense, ExpenseInput } from "../types";

// Map common expense category names to a saturated text and muted bg colour
const EXPENSE_CATEGORY_COLOURS: Record<string, string> = {
  food: "bg-amber-100 text-amber-700",
  dining: "bg-amber-100 text-amber-700",
  restaurant: "bg-amber-100 text-amber-700",
  transport: "bg-cyan-100 text-cyan-700",
  taxi: "bg-cyan-100 text-cyan-700",
  flight: "bg-sky-100 text-sky-700",
  hotel: "bg-indigo-100 text-indigo-700",
  accommodation: "bg-indigo-100 text-indigo-700",
  shopping: "bg-rose-100 text-rose-700",
  activity: "bg-emerald-100 text-emerald-700",
  entertainment: "bg-emerald-100 text-emerald-700",
};

function expenseCategoryClass(category: string) {
  const key = category.trim().toLowerCase();
  for (const [k, v] of Object.entries(EXPENSE_CATEGORY_COLOURS)) {
    if (key.includes(k)) return v;
  }
  return "bg-clay-recessed text-clay-secondary";
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
    <div className="space-y-6 pb-6">
      <SectionHeader title="Expense Tracker" eyebrow="Actual vs estimated" action={canEdit ? <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" aria-hidden="true" />Add expense</Button> : null} />
      {canEdit ? <ExpenseForm isOpen={showForm} data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative p-6 border-0 border-t-[6px] border-t-emerald-400 bg-clay-surface shadow-clay-card rounded-[32px]">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5" />
          <div className="flex h-12 w-12 mt-1 items-center justify-center rounded-[18px] bg-primary/10 shadow-clay-pressed">
            <DollarSign className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-clay-secondary">Total spent</p>
          <p className="mt-1 text-2xl font-black text-clay-primary tabular-nums">{data.trip.currency} {total.toLocaleString()}</p>
        </Card>

        <Card className="p-6 sm:col-span-2 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-clay-secondary">By category</p>
          <div className="mt-4 space-y-3">
            {Object.entries(byCategory).map(([category, amount]) => (
              <div key={category}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${expenseCategoryClass(category)}`}>
                    {category}
                  </span>
                  <span className="font-bold tabular-nums text-clay-primary">{data.trip.currency} {amount.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-clay-recessed shadow-clay-pressed overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all shadow-clay-btn"
                    style={{ width: `${total > 0 ? Math.max(6, (amount / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && <p className="text-sm font-medium text-clay-secondary mt-2">No spending yet.</p>}
          </div>
        </Card>
      </div>

      {/* Who owes whom */}
      {balance.length > 0 ? (
        <Card className="p-6 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 shadow-clay-pressed">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-clay-primary">Settlement</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {balance.map((line) => {
              const owes = line.includes("owes");
              return (
                <div
                  key={line}
                  className={`flex items-center gap-2.5 rounded-[20px] px-5 py-4 text-sm font-bold shadow-clay-pressed ${
                    owes ? "bg-danger/10 text-danger" : "bg-emerald-100 text-emerald-700"
                  }`}
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
          icon={<ReceiptText className="h-10 w-10 opacity-80" />}
          title="No expenses yet"
          body="Add receipts, notes, split members, and categories as spending happens."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add your first expense</Button> : null}
        />
      ) : (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-clay-secondary flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" /> 
              Recent Expenses
            </h3>
            <div className="h-px flex-1 bg-border/40 ml-2" />
          </div>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const paidBy = data.members.find((member) => member.profileId === expense.paidBy)?.profile.displayName;

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-surface text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary active:scale-90 transition-all shadow-clay-card"
          aria-label="Actions"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-50 min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary rounded-[12px] transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  void remove();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-[12px] transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

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

  return (
    <>
      <Card className="p-5 border-0 hover:-translate-y-1 hover:shadow-clay-hover transition-all bg-clay-surface shadow-clay-card rounded-[28px] relative">
        <ActionMenu />
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-clay-recessed shadow-clay-pressed">
              <ReceiptText className="h-5 w-5 text-clay-secondary" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1 pr-8">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${expenseCategoryClass(expense.category)}`}>
                  {expense.category}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-clay-secondary pr-8">
                <span className="font-bold text-clay-primary">{expense.date}</span>
                {paidBy ? ` · paid by ${paidBy}` : ""}
              </p>
              {expense.notes ? <p className="mt-2 text-sm text-clay-secondary bg-clay-recessed shadow-clay-pressed p-3 rounded-[16px] pr-8">{expense.notes}</p> : null}
              {error ? <p className="mt-2 text-sm font-bold text-danger">{error}</p> : null}
            </div>
          </div>
          
          {/* Right side amounts */}
          <div className="shrink-0 sm:text-right w-full sm:w-auto pt-3 border-t sm:border-t-0 border-border/40 sm:pt-0 sm:pr-8">
            <p className="text-xl font-black tabular-nums text-clay-primary">{expense.currency} {expense.amount.toLocaleString()}</p>
            {expense.splitBetween.length > 0 && (
              <p className="mt-1 text-xs font-bold text-clay-secondary uppercase tracking-wider">÷ {expense.splitBetween.length} people</p>
            )}
          </div>
        </div>
      </Card>
      {canEdit && (
        <ExpenseForm isOpen={editing} data={data} expense={expense} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />
      )}
    </>
  );
}

function ExpenseForm({ isOpen, data, expense, onSaved, onCancel }: { isOpen: boolean; data: AppData; expense?: Expense; onSaved: () => Promise<void>; onCancel: () => void }) {
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

  async function save(event?: React.FormEvent) {
    if (event) event.preventDefault();
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
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title={expense ? "Edit Expense" : "Add Expense"}
      footer={
        <div className="flex gap-2">
          <Button type="button" disabled={busy} onClick={() => save()}>Save expense</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      }
    >
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Category"><input className={formInputClass} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="e.g. Food, Transport, Hotel" /></Field>
        <Field label="Amount"><input type="number" min="0" step="0.01" className={formInputClass} value={form.amount} onChange={(event) => update("amount", Number(event.target.value))} /></Field>
        <Field label="Currency"><input className={formInputClass} value={form.currency} onChange={(event) => update("currency", event.target.value)} maxLength={3} /></Field>
        <Field label="Date"><input type="date" className={formInputClass} value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
        <Field label="Paid by"><select className={formSelectClass} value={form.paidBy} onChange={(event) => update("paidBy", event.target.value)}>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        <div className="md:col-span-2">
          <p className="text-sm font-bold text-clay-primary">Split between</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.members.map((member) => (
              <label key={member.profileId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 text-sm font-bold text-clay-primary transition-all hover:bg-primary/5">
                <input type="checkbox" className="h-4 w-4 accent-primary rounded" checked={form.splitBetween.includes(member.profileId)} onChange={() => toggleSplit(member.profileId)} />
                {member.profile.displayName}
              </label>
            ))}
          </div>
        </div>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
      </form>
    </Modal>
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
  }).filter((line) => !line.includes(" 0.00"));
}
