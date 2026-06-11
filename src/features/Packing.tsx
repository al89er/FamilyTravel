import { CheckCircle2, Circle, Luggage, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, MouseEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass } from "../components/ui";
import { deletePackingItem, setFamilyPackingCheck, togglePackingItemCheck, upsertPackingItem } from "../lib/supabase";
import type { AppData, FamilySession, PackingInput, PackingItem } from "../types";

export function Packing({
  data,
  canEdit = false,
  onRefresh,
  familySession,
  onRefreshFamily
}: {
  data: AppData;
  canEdit?: boolean;
  onRefresh?: () => Promise<void>;
  familySession: FamilySession | null;
  onRefreshFamily?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const checkedCount = data.packing.filter((item) => item.checkedBy.includes(data.currentUser.id)).length;
  const total = data.packing.length;
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Packing Lists"
        eyebrow={`${checkedCount} of ${total} checked by you`}
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add item</Button> : null}
      />

      {/* Progress bar */}
      {total > 0 ? (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-primary">Your packing progress</span>
            <span className="font-bold tabular-nums text-primary">{pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${pct >= 100 ? "bg-success" : pct >= 60 ? "bg-primary" : "bg-warning"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">{checkedCount} of {total} items checked</p>
        </Card>
      ) : null}

      {canEdit && showForm ? <PackingForm data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {data.packing.length === 0 ? (
        <EmptyState
          icon={<Luggage className="h-8 w-8" />}
          title="No packing items"
          body="Create shared and personal packing lists with per-person checklist status."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add your first item</Button> : null}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.packing.map((item) => {
            const checked = item.checkedBy.includes(data.currentUser.id);
            const assigned = data.members.find((member) => member.profileId === item.assignedTo)?.profile.displayName;
            return (
              <PackingCard
                key={item.id}
                data={data}
                item={item}
                checked={checked}
                assigned={assigned}
                canEdit={canEdit}
                familySession={familySession}
                onRefresh={onRefresh}
                onRefreshFamily={onRefreshFamily}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PackingCard({
  item,
  data,
  checked,
  assigned,
  canEdit,
  familySession,
  onRefresh,
  onRefreshFamily
}: {
  item: PackingItem;
  data: AppData;
  checked: boolean;
  assigned?: string;
  canEdit: boolean;
  familySession: FamilySession | null;
  onRefresh?: () => Promise<void>;
  onRefreshFamily?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleCheck() {
    setBusy(true);
    setError(null);
    try {
      if (familySession) {
        if (!familySession.permissions.packingChecks) return;
        const { error: checkError } = await setFamilyPackingCheck(familySession, item.id, !checked);
        if (checkError) throw checkError;
        onRefreshFamily?.();
      } else {
        await togglePackingItemCheck(item.tripId, item.id, !checked);
        await onRefresh?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update packing item.");
    } finally {
      setBusy(false);
    }
  }

  const canToggle = !familySession || familySession.permissions.packingChecks;

  async function remove() {
    if (!window.confirm("Delete this packing item?")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePackingItem(item.tripId, item.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete packing item.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <PackingForm data={data} item={item} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }

  return (
    <Card className={`p-4 flex items-start gap-3 text-left transition-all ${checked ? "opacity-70" : ""}`}>
      <button
        type="button"
        disabled={!canToggle || busy}
        onClick={() => void toggleCheck()}
        className="mt-0.5 shrink-0 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
        aria-label={checked ? "Uncheck packing item" : "Check packing item"}
      >
        {checked ? (
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5 text-muted" aria-hidden="true" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          onClick={canToggle && !busy ? () => void toggleCheck() : undefined}
          className={canToggle && !busy ? "cursor-pointer select-none" : ""}
        >
          <h3 className={`font-semibold ${checked ? "line-through text-muted" : "text-primary"}`}>{item.name}</h3>
          <p className="text-sm text-secondary mt-0.5">
            {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.category}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={item.isShared ? "brand" : "zinc"}>{item.isShared ? "Shared" : "Personal"}</Badge>
            {assigned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-border/60">
                {assigned}
              </span>
            ) : null}
            {item.checkedBy.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success ring-1 ring-success/20">
                {item.checkedBy.length} checked
              </span>
            ) : null}
          </div>
          {item.notes ? <p className="mt-2 text-sm text-secondary">{item.notes}</p> : null}
        </div>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" disabled={busy} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setEditing(true); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
            <Button variant="ghost" disabled={busy} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); void remove(); }}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
    </Card>
  );
}

function PackingForm({ data, item, onSaved, onCancel }: { data: AppData; item?: PackingItem; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<PackingInput>({
    name: item?.name ?? "",
    category: item?.category ?? "General",
    quantity: item?.quantity ?? 1,
    assignedTo: item?.assignedTo,
    isShared: item?.isShared ?? true,
    notes: item?.notes
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PackingInput>(key: K, value: PackingInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || form.quantity < 1) {
      setError("Name and quantity are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertPackingItem(item?.tripId ?? data.trip.id, { ...form, name: form.name.trim(), category: form.category.trim() || "General" }, item?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save packing item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Package className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-primary">{item ? "Edit item" : "Add packing item"}</h3>
      </div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Name"><input className={formInputClass} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Sunscreen" /></Field>
        <Field label="Category"><input className={formInputClass} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="e.g. Toiletries" /></Field>
        <Field label="Quantity"><input type="number" min="1" className={formInputClass} value={form.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></Field>
        <Field label="Assigned to"><select className={formSelectClass} value={form.assignedTo ?? ""} onChange={(event) => update("assignedTo", event.target.value || undefined)}><option value="">Nobody</option>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-primary hover:bg-muted transition-colors">
          <input type="checkbox" checked={form.isShared} onChange={(event) => update("isShared", event.target.checked)} />
          Shared with family
        </label>
        <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save item</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
