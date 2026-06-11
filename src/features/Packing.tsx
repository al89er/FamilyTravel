import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deletePackingItem, setFamilyPackingCheck, upsertPackingItem } from "../lib/supabase";
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

  return (
    <div className="space-y-5">
      <SectionHeader title="Packing Lists" eyebrow={`${checkedCount} of ${data.packing.length} checked by you`} action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add item</Button> : null} />
      {canEdit && showForm ? <PackingForm data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}
      {data.packing.length === 0 ? (
        <EmptyState title="No packing items" body="Create shared and personal packing lists with per-person checklist status." />
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
    if (!familySession || !familySession.permissions.packingChecks) return;
    setBusy(true);
    setError(null);
    try {
      const { error: checkError } = await setFamilyPackingCheck(familySession, item.id, !checked);
      if (checkError) throw checkError;
      onRefreshFamily?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update packing item.");
    } finally {
      setBusy(false);
    }
  }

  const Wrapper = familySession?.permissions.packingChecks ? "button" : "div";

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
    <Card className="p-4">
      <Wrapper
        type={Wrapper === "button" ? "button" : undefined}
        disabled={Wrapper === "button" ? busy : undefined}
        onClick={Wrapper === "button" ? () => void toggleCheck() : undefined}
        className="flex w-full items-start gap-3 text-left disabled:opacity-50"
      >
        {checked ? (
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        ) : (
          <Circle className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        )}
        <div>
          <h3 className="font-semibold text-slate-950">{item.name}</h3>
          <p className="text-sm text-slate-600">
            {item.quantity} x {item.category}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={item.isShared ? "brand" : "slate"}>{item.isShared ? "Shared" : "Personal"}</Badge>
            {assigned ? <Badge>{assigned}</Badge> : null}
          </div>
          {item.notes ? <p className="mt-2 text-sm text-slate-700">{item.notes}</p> : null}
          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </Wrapper>
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
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
        <Field label="Category"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value)} /></Field>
        <Field label="Quantity"><input type="number" min="1" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></Field>
        <Field label="Assigned to"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.assignedTo ?? ""} onChange={(event) => update("assignedTo", event.target.value || undefined)}><option value="">Nobody</option>{data.members.map((member) => <option key={member.profileId} value={member.profileId}>{member.profile.displayName}</option>)}</select></Field>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
          <input type="checkbox" checked={form.isShared} onChange={(event) => update("isShared", event.target.checked)} />
          Shared with family
        </label>
        <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
