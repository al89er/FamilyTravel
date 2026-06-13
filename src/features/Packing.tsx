import { CheckCircle2, Circle, Luggage, Package, Pencil, Plus, Trash2, MoreVertical } from "lucide-react";
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
    <div className="space-y-6 pb-6">
      <SectionHeader
        title="Packing Lists"
        eyebrow={`${checkedCount} of ${total} checked by you`}
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add item</Button> : null}
      />

      {/* Progress bar */}
      {total > 0 ? (
        <Card className="relative overflow-hidden p-6 sm:p-7 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between text-sm mb-3 mt-1">
            <span className="font-black text-clay-primary tracking-wide text-lg">Packing progress</span>
            <span className="font-black tabular-nums text-primary text-xl">{pct}%</span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-clay-recessed shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-clay-btn ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-emerald-400" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-clay-secondary">{checkedCount} of {total} items packed</p>
        </Card>
      ) : null}

      {canEdit ? <PackingForm isOpen={showForm} data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}

      {data.packing.length === 0 ? (
        <EmptyState
          icon={<Luggage className="h-10 w-10 opacity-80" />}
          title="Empty suitcase"
          body="Create shared and personal packing lists with per-person checklist status."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add your first item</Button> : null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
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
  const [menuOpen, setMenuOpen] = useState(false);

  const ActionMenu = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-4 right-4 z-[80]">
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
              className="fixed inset-0 z-[70] bg-transparent"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            />
            
            {/* Menu overlay */}
            <div className="absolute right-0 top-11 z-[90] min-w-[120px] rounded-[20px] bg-clay-surface p-2 shadow-clay-card border border-border/40 flex flex-col gap-1">
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
      <Card className={`relative border-0 p-5 sm:p-6 flex items-start gap-4 text-left transition-all rounded-[28px] group hover:-translate-y-1 hover:shadow-clay-hover ${checked ? "bg-clay-recessed shadow-clay-pressed opacity-90" : "bg-clay-surface shadow-clay-card"} ${menuOpen ? "z-50" : "z-0"}`}>
        <ActionMenu />
        {/* Check button */}
        <button
          type="button"
          disabled={!canToggle || busy}
          onClick={() => void toggleCheck()}
          className="mt-0.5 shrink-0 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full transition-transform hover:scale-110 active:scale-95"
          aria-label={checked ? "Uncheck packing item" : "Check packing item"}
        >
          {checked ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-500 drop-shadow-sm" aria-hidden="true" />
          ) : (
            <Circle className="h-7 w-7 text-clay-secondary hover:text-primary transition-colors" aria-hidden="true" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            onClick={canToggle && !busy ? () => void toggleCheck() : undefined}
            className={canToggle && !busy ? "cursor-pointer select-none" : ""}
          >
            <h3 className={`font-black text-[1.1rem] leading-tight pr-8 ${checked ? "line-through text-clay-secondary" : "text-clay-primary"}`}>{item.name}</h3>
            
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${checked ? "bg-emerald-100 text-emerald-700 shadow-clay-pressed" : "bg-clay-recessed text-clay-secondary shadow-clay-pressed"}`}>
                {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.category}
              </span>
              <Badge tone={item.isShared ? "brand" : "zinc"} className="text-[10px] shadow-sm">{item.isShared ? "Shared" : "Personal"}</Badge>
              {assigned ? (
                <span className="inline-flex items-center gap-1 rounded-[12px] bg-clay-recessed shadow-clay-pressed px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-clay-secondary">
                  {assigned}
                </span>
              ) : null}
              {item.checkedBy.length > 0 && item.isShared ? (
                <span className="inline-flex items-center gap-1 rounded-[12px] bg-emerald-100 shadow-clay-pressed px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {item.checkedBy.length} packed
                </span>
              ) : null}
            </div>
            {item.notes ? <p className="mt-3 text-sm font-medium text-clay-secondary bg-clay-recessed shadow-clay-pressed p-3 rounded-[16px]">{item.notes}</p> : null}
          </div>
          {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
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
        <div className="flex gap-2 md:col-span-2 pt-2">
          <Button type="submit" disabled={busy}>Save item</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
