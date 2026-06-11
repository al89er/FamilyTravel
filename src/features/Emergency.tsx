import { HeartPulse, Pencil, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deleteEmergencyContact, deletePlace, upsertEmergencyContact, upsertInsurance, upsertMedicalNote, upsertPlace } from "../lib/supabase";
import type { AppData, EmergencyContact, EmergencyContactInput, InsuranceInput, MedicalNoteInput, Place, PlaceInput, Profile } from "../types";

export function Emergency({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const hospitals = data.places.filter((place) => place.category === "hospital");

  return (
    <div className="space-y-5">
      <SectionHeader title="Emergency & Medical" eyebrow="Private-aware travel safety" />
      <div className="grid gap-4 lg:grid-cols-2">
        <InsuranceCard data={data} canEdit={canEdit} onRefresh={onRefresh} />

        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-coral" aria-hidden="true" />
              <h3 className="font-semibold text-slate-950">Medical notes</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.members.map((member) => (
              <MedicalNoteCard key={member.id} tripId={data.trip.id} profile={member.profile} canEdit={canEdit} onRefresh={onRefresh} role={member.role} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionHeader title="Emergency contacts" action={canEdit ? <Button onClick={() => setShowContactForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add contact</Button> : null} />
        {canEdit && showContactForm ? <EmergencyContactForm tripId={data.trip.id} onCancel={() => setShowContactForm(false)} onSaved={async () => { setShowContactForm(false); await onRefresh?.(); }} /> : null}
        {data.emergencyContacts.length === 0 ? <div className="mt-4"><EmptyState title="No emergency contacts" body="Add local contacts, family leads, or embassy details." /></div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.emergencyContacts.map((contact) => (
            <EmergencyContactCard key={contact.id} tripId={data.trip.id} contact={contact} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Nearby hospitals" action={canEdit ? <Button onClick={() => setShowHospitalForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add hospital</Button> : null} />
        {canEdit && showHospitalForm ? <HospitalForm tripId={data.trip.id} onCancel={() => setShowHospitalForm(false)} onSaved={async () => { setShowHospitalForm(false); await onRefresh?.(); }} /> : null}
        {hospitals.length === 0 ? <div className="mt-4"><EmptyState title="No nearby hospitals" body="Add hospitals or clinics for quick access during travel." /></div> : null}
        <div className="mt-3 space-y-3">
          {hospitals.map((hospital) => (
            <HospitalCard key={hospital.id} hospital={hospital} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function InsuranceCard({ data, canEdit, onRefresh }: { data: AppData; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <InsuranceForm data={data} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <h3 className="font-semibold text-slate-950">Travel insurance</h3>
          </div>
        </div>
        {canEdit ? <Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button> : null}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-slate-600">Provider</dt><dd className="font-medium text-slate-900">{data.insurance.provider}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-600">Policy</dt><dd className="font-medium text-slate-900">{data.insurance.policyNumber}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-600">Emergency phone</dt><dd className="font-medium text-slate-900">{data.insurance.emergencyPhone}</dd></div>
      </dl>
    </Card>
  );
}

function InsuranceForm({ data, onSaved, onCancel }: { data: AppData; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<InsuranceInput>({ provider: data.insurance.provider, policyNumber: data.insurance.policyNumber, emergencyPhone: data.insurance.emergencyPhone, notes: data.insurance.notes });
  return <SimpleForm onCancel={onCancel} onSave={async () => { await upsertInsurance(data.trip.id, form, data.insurance.id); await onSaved(); }}>
    <Field label="Provider"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></Field>
    <Field label="Policy number"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} /></Field>
    <Field label="Emergency phone"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} /></Field>
    <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function MedicalNoteCard({ tripId, profile, role, canEdit, onRefresh }: { tripId: string; profile: Profile; role: string; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <MedicalNoteForm tripId={tripId} profile={profile} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-slate-900">{profile.displayName}</p>
        <div className="flex items-center gap-2">
          <Badge>{role}</Badge>
          {canEdit ? <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button> : null}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {profile.allergies || profile.medications || profile.medicalNotes ? [profile.allergies, profile.medications, profile.medicalNotes].filter(Boolean).join(" | ") : "No shared medical notes."}
      </p>
    </div>
  );
}

function MedicalNoteForm({ tripId, profile, onSaved, onCancel }: { tripId: string; profile: Profile; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<MedicalNoteInput>({ profileId: profile.id, allergies: profile.allergies, medications: profile.medications, medicalNotes: profile.medicalNotes, visibleToOwner: true });
  return <SimpleForm onCancel={onCancel} onSave={async () => { await upsertMedicalNote(tripId, form); await onSaved(); }}>
    <Field label="Allergies"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.allergies ?? ""} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></Field>
    <Field label="Medications"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.medications ?? ""} onChange={(e) => setForm({ ...form, medications: e.target.value })} /></Field>
    <Field label="Medical notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.medicalNotes ?? ""} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} /></Field>
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm"><input type="checkbox" checked={form.visibleToOwner} onChange={(e) => setForm({ ...form, visibleToOwner: e.target.checked })} />Visible to owner</label>
  </SimpleForm>;
}

function EmergencyContactCard({ tripId, contact, canEdit, onRefresh }: { tripId: string; contact: EmergencyContact; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (editing) return <EmergencyContactForm tripId={tripId} contact={contact} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <Phone className="mt-1 h-5 w-5 text-brand-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-950">{contact.name}</h3>
          <p className="text-sm text-slate-600">{contact.relationship}</p>
          <p className="mt-2 font-medium text-slate-900">{contact.phone}</p>
          {contact.notes ? <p className="mt-2 text-sm text-slate-700">{contact.notes}</p> : null}
          {canEdit ? <div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button><Button variant="ghost" onClick={() => void deleteEmergencyContact(tripId, contact.id).then(onRefresh).catch((err) => setError(err.message))}><Trash2 className="h-4 w-4" />Delete</Button></div> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmergencyContactForm({ tripId, contact, onSaved, onCancel }: { tripId: string; contact?: EmergencyContact; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<EmergencyContactInput>({ name: contact?.name ?? "", relationship: contact?.relationship ?? "", phone: contact?.phone ?? "", notes: contact?.notes });
  return <SimpleForm onCancel={onCancel} onSave={async () => { await upsertEmergencyContact(tripId, form, contact?.id); await onSaved(); }}>
    <Field label="Name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Relationship"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></Field>
    <Field label="Phone"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
    <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function HospitalCard({ hospital, canEdit, onRefresh }: { hospital: Place; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (editing) return <HospitalForm tripId={hospital.tripId} hospital={hospital} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  return (
    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
      <p className="font-semibold">{hospital.name}</p>
      <p>{hospital.address}</p>
      {hospital.notes ? <p className="mt-1">{hospital.notes}</p> : null}
      {canEdit ? <div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button><Button variant="ghost" onClick={() => void deletePlace(hospital.tripId, hospital.id).then(onRefresh).catch((err) => setError(err.message))}>Delete</Button></div> : null}
      {error ? <p className="mt-2 text-red-700">{error}</p> : null}
    </div>
  );
}

function HospitalForm({ tripId, hospital, onSaved, onCancel }: { tripId: string; hospital?: Place; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<PlaceInput>({ name: hospital?.name ?? "", category: "hospital", address: hospital?.address ?? "", latitude: hospital?.latitude, longitude: hospital?.longitude, notes: hospital?.notes });
  return <SimpleForm onCancel={onCancel} onSave={async () => { await upsertPlace(tripId, form, hospital?.id); await onSaved(); }}>
    <Field label="Hospital name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Address"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
    <Field label="Latitude"><input type="number" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
    <Field label="Longitude"><input type="number" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
    <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function SimpleForm({ children, onSave, onCancel }: { children: ReactNode; onSave: () => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return <Card className="p-4"><form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>{children}{error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}<div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={busy}>Save</Button><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div></form></Card>;
}
