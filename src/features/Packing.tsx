import { CheckCircle2, Circle, Luggage, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, MouseEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal, SegmentedControl } from "../components/ui";
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
        <Card className="relative overflow-hidden p-6 border-0">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between text-sm mb-3 mt-1">
            <span className="font-bold text-primary tracking-wide">Packing progress</span>
            <span className="font-bold tabular-nums text-primary">{pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden ring-1 ring-inset ring-border/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${pct >= 100 ? "bg-success" : pct >= 60 ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted">{checkedCount} of {total} items packed</p>
        </Card>
      ) : null}

      {canEdit ? <PackingForm isOpen={showForm} data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {data.packing.length === 0 ? (
        <EmptyState
          icon={<Luggage className="h-10 w-10 opacity-80 text-muted" />}
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

  return (
    <>
      <Card className={`relative overflow-hidden border-0 p-4 sm:p-5 flex items-start gap-4 text-left transition-all group hover:shadow-lg ${checked ? "opacity-80 bg-success/10 shadow-clay-pressed" : "bg-clay-surface"}`}>
      {/* Check button */}
      <button
        type="button"
        disabled={!canToggle || busy}
        onClick={() => void toggleCheck()}
        className="mt-0.5 shrink-0 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
        aria-label={checked ? "Uncheck packing item" : "Check packing item"}
      >
        {checked ? (
          <CheckCircle2 className="h-6 w-6 text-success drop-shadow-sm" aria-hidden="true" />
        ) : (
          <Circle className="h-6 w-6 text-muted hover:text-primary transition-colors" aria-hidden="true" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          onClick={canToggle && !busy ? () => void toggleCheck() : undefined}
          className={canToggle && !busy ? "cursor-pointer select-none" : ""}
        >
          <h3 className={`font-bold text-lg leading-tight ${checked ? "line-through text-success/80" : "text-primary"}`}>{item.name}</h3>
          
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${checked ? "bg-success/10 text-success ring-success/20" : "bg-muted text-secondary ring-border/60"}`}>
              {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.category}
            </span>
            <Badge tone={item.isShared ? "brand" : "zinc"} className="text-[10px] shadow-sm">{item.isShared ? "Shared" : "Personal"}</Badge>
            {assigned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200/60 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-800">
                {assigned}
              </span>
            ) : null}
            {item.checkedBy.length > 0 && item.isShared ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success ring-1 ring-success/20">
                {item.checkedBy.length} packed
              </span>
            ) : null}
          </div>
          {item.notes ? <p className="mt-2 text-sm text-secondary">{item.notes}</p> : null}
        </div>
        {canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
            <Button variant="ghost" disabled={busy} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setEditing(true); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
            <Button variant="ghost" disabled={busy} onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); void remove(); }}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
      </Card>
      {canEdit && (
        <PackingForm isOpen={editing} data={data} item={item} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />
      )}
    </>
  );
}

function PackingForm({ isOpen, data, item, onSaved, onCancel }: { isOpen: boolean; data: AppData; item?: PackingItem; onSaved: () => Promise<void>; onCancel: () => void }) {
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
    <Modal isOpen={isOpen} onClose={onCancel} title={item ? "Edit item" : "Add packing item"}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Name"><input className={formInputClass} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Sunscreen" /></Field>
        <Field label="Category"><input className={formInputClass} value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="e.g. Toiletries" /></Field>
        <Field label="Quantity"><input type="number" min="1" className={formInputClass} value={form.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></Field>
        <Field label="Assigned to"><select className={formSelectClass} value={form.assignedTo ?? ""} onChange={(event) => update("assignedTo", event.target.value || undefined)}><option value="">Nobody</option>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <div className="md:col-span-2">
          <Field label="Item type">
            <SegmentedControl
              options={[{ value: "true", label: "Shared item" }, { value: "false", label: "Personal item" }]}
              value={form.isShared ? "true" : "false"}
              onChange={(v) => update("isShared", v === "true")}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        </div>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save item</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
