import { Hospital, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deletePlace, upsertPlace } from "../lib/supabase";
import type { AppData, Place, PlaceCategory, PlaceInput } from "../types";

const placeCategories: PlaceCategory[] = ["hotel", "restaurant", "attraction", "airport", "meeting_point", "pharmacy", "hospital", "custom"];

export function MapPlaces({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Map Places"
        eyebrow="Provider-ready abstraction"
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add place</Button> : null}
      />
      {canEdit && showForm ? (
        <PlaceForm
          data={data}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}
      <Card className="overflow-hidden">
        <div className="flex min-h-[260px] items-center justify-center bg-[linear-gradient(135deg,#dbeafe_0%,#ecfdf5_55%,#fff7ed_100%)] p-5 text-center">
          <div>
            <MapPinned className="mx-auto h-10 w-10 text-brand-700" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-900">Map provider placeholder</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-700">
              Places are stored with optional coordinates. The MapProvider component can be replaced with Google Maps or Mapbox without changing trip data.
            </p>
          </div>
        </div>
      </Card>

      {data.places.length === 0 ? (
        <EmptyState title="No places saved" body="Add hotels, restaurants, attractions, pharmacies, hospitals, and meeting points." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.places.map((place) => (
            <PlaceCard key={place.id} data={data} place={place} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceCard({ data, place, canEdit, onRefresh }: { data: AppData; place: Place; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this place?")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlace(data.trip.id, place.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete place.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <PlaceForm data={data} place={place} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-800">
          {place.category === "hospital" ? <Hospital className="h-5 w-5" /> : <MapPinned className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{place.name}</h3>
            <Badge>{place.category.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{place.address}</p>
          {place.latitude != null && place.longitude != null ? <p className="mt-1 text-xs text-slate-500">{place.latitude}, {place.longitude}</p> : null}
          {place.notes ? <p className="mt-2 text-sm text-slate-700">{place.notes}</p> : null}
          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function PlaceForm({ data, place, onSaved, onCancel }: { data: AppData; place?: Place; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<PlaceInput>({
    name: place?.name ?? "",
    category: place?.category ?? "custom",
    address: place?.address ?? "",
    latitude: place?.latitude,
    longitude: place?.longitude,
    notes: place?.notes,
    itineraryItemId: place?.itineraryItemId
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Place name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertPlace(data.trip.id, { ...form, name: form.name.trim(), address: form.address.trim() }, place?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save place.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
        <Field label="Category"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value as PlaceCategory)}>{placeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
        <Field label="Address"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
        <Field label="Linked itinerary item"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}><option value="">None</option>{data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
        <Field label="Latitude"><input type="number" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.latitude ?? ""} onChange={(event) => update("latitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
        <Field label="Longitude"><input type="number" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.longitude ?? ""} onChange={(event) => update("longitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
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
