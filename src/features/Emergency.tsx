import { AlertTriangle, HeartPulse, Pencil, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal } from "../components/ui";
import { deleteEmergencyContact, deletePlace, upsertEmergencyContact, upsertInsurance, upsertMedicalNote, upsertPlace } from "../lib/supabase";
import type { AppData, EmergencyContact, EmergencyContactInput, InsuranceInput, MedicalNoteInput, Place, PlaceInput, Profile } from "../types";

export function Emergency({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const hospitals = data.places.filter((place) => place.category === "hospital");

  return (
    <div className="space-y-5">
      <SectionHeader title="Emergency & Medical" eyebrow="Private-aware travel safety" />

      {/* Emergency summary banner */}
      {data.trip.emergencySummary ? (
        <div className="flex items-start gap-3 rounded-3xl border border-danger/25 bg-danger/10 p-5 shadow-sm">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-danger drop-shadow-sm" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-danger font-bold">{data.trip.emergencySummary}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InsuranceCard data={data} canEdit={canEdit} onRefresh={onRefresh} />

        <Card className="p-6 border-0">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
              <HeartPulse className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-primary">Medical notes</h3>
          </div>
          <div className="space-y-2">
            {data.members.map((member) => (
              <MedicalNoteCard key={member.id} tripId={data.trip.id} profile={member.profile} canEdit={canEdit} onRefresh={onRefresh} role={member.role} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
              <Phone className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-primary">Emergency contacts</h3>
          </div>
          {canEdit ? <Button onClick={() => setShowContactForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add contact</Button> : null}
        </div>
        {canEdit ? <EmergencyContactForm isOpen={showContactForm} tripId={data.trip.id} onCancel={() => setShowContactForm(false)} onSaved={async () => { setShowContactForm(false); await onRefresh?.(); }} /> : null}
        {data.emergencyContacts.length === 0 ? (
          <EmptyState
            icon={<Phone className="h-8 w-8" />}
            title="No emergency contacts"
            body="Add local contacts, family leads, or embassy details."
            action={canEdit ? <Button variant="secondary" onClick={() => setShowContactForm(true)}>Add your first contact</Button> : null}
          />
        ) : null}
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {data.emergencyContacts.map((contact) => (
            <EmergencyContactCard key={contact.id} tripId={data.trip.id} contact={contact} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      </Card>

      <Card className="p-6 border-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
              <HeartPulse className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-primary">Nearby hospitals</h3>
          </div>
          {canEdit ? <Button onClick={() => setShowHospitalForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add hospital</Button> : null}
        </div>
        {canEdit ? <HospitalForm isOpen={showHospitalForm} tripId={data.trip.id} onCancel={() => setShowHospitalForm(false)} onSaved={async () => { setShowHospitalForm(false); await onRefresh?.(); }} /> : null}
        {hospitals.length === 0 ? (
          <EmptyState
            icon={<HeartPulse className="h-8 w-8" />}
            title="No nearby hospitals"
            body="Add hospitals or clinics for quick access during travel."
            action={canEdit ? <Button variant="secondary" onClick={() => setShowHospitalForm(true)}>Add a hospital</Button> : null}
          />
        ) : null}
        <div className="mt-2 space-y-3">
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
  return (
    <>
      <Card className="p-6 border-0 relative overflow-hidden bg-clay-surface">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-primary">Travel insurance</h3>
        </div>
        {canEdit ? <Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button> : null}
      </div>
      <dl className="mt-4 divide-y divide-border text-sm">
        <div className="flex justify-between gap-4 py-2"><dt className="text-secondary">Provider</dt><dd className="font-semibold text-primary text-right">{data.insurance.provider || "—"}</dd></div>
        <div className="flex justify-between gap-4 py-2"><dt className="text-secondary">Policy</dt><dd className="font-mono font-semibold text-primary text-right">{data.insurance.policyNumber || "—"}</dd></div>
        <div className="flex justify-between gap-4 py-2"><dt className="text-secondary">Emergency phone</dt><dd className="font-semibold text-primary text-right">{data.insurance.emergencyPhone || "—"}</dd></div>
        {data.insurance.notes ? <div className="pt-2"><p className="text-xs text-muted">{data.insurance.notes}</p></div> : null}
      </dl>
    </Card>
    {canEdit && <InsuranceForm isOpen={editing} data={data} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />}
    </>
  );
}

function InsuranceForm({ isOpen, data, onSaved, onCancel }: { isOpen: boolean; data: AppData; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<InsuranceInput>({ provider: data.insurance.provider, policyNumber: data.insurance.policyNumber, emergencyPhone: data.insurance.emergencyPhone, notes: data.insurance.notes });
  return <SimpleForm isOpen={isOpen} title="Travel Insurance" onCancel={onCancel} onSave={async () => { await upsertInsurance(data.trip.id, form, data.insurance.id); await onSaved(); }}>
    <Field label="Provider"><input className={formInputClass} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></Field>
    <Field label="Policy number"><input className={formInputClass} value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} /></Field>
    <Field label="Emergency phone"><input className={formInputClass} value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} /></Field>
    <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function MedicalNoteCard({ tripId, profile, role, canEdit, onRefresh }: { tripId: string; profile: Profile; role: string; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const hasMedicalInfo = profile.allergies || profile.medications || profile.medicalNotes;
  return (
    <>
    <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-surface p-4 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-primary">{profile.displayName}</p>
          <div className="flex items-center gap-2">
            <Badge tone="zinc">{role}</Badge>
            {canEdit ? <Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit</Button> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-secondary">
          {hasMedicalInfo
            ? [profile.allergies && `Allergies: ${profile.allergies}`, profile.medications && `Medications: ${profile.medications}`, profile.medicalNotes].filter(Boolean).join(" · ")
            : "No shared medical notes."}
        </p>
      </div>
    </div>
    {canEdit && <MedicalNoteForm isOpen={editing} tripId={tripId} profile={profile} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />}
    </>
  );
}

function MedicalNoteForm({ isOpen, tripId, profile, onSaved, onCancel }: { isOpen: boolean; tripId: string; profile: Profile; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<MedicalNoteInput>({ profileId: profile.id, allergies: profile.allergies, medications: profile.medications, medicalNotes: profile.medicalNotes, visibleToOwner: true });
  return <SimpleForm isOpen={isOpen} title={`Medical Notes for ${profile.displayName}`} onCancel={onCancel} onSave={async () => { await upsertMedicalNote(tripId, form); await onSaved(); }}>
    <Field label="Allergies"><input className={formInputClass} value={form.allergies ?? ""} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></Field>
    <Field label="Medications"><input className={formInputClass} value={form.medications ?? ""} onChange={(e) => setForm({ ...form, medications: e.target.value })} /></Field>
    <Field label="Medical notes"><textarea className={formTextareaClass} value={form.medicalNotes ?? ""} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} /></Field>
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm"><input type="checkbox" checked={form.visibleToOwner} onChange={(e) => setForm({ ...form, visibleToOwner: e.target.checked })} />Visible to owner</label>
  </SimpleForm>;
}

function EmergencyContactCard({ tripId, contact, canEdit, onRefresh }: { tripId: string; contact: EmergencyContact; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
    <div className="rounded-3xl border border-border/50 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
          <Phone className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary">{contact.name}</h3>
          <p className="text-xs text-muted">{contact.relationship}</p>
          <p className="mt-2 font-mono font-bold text-primary">{contact.phone}</p>
          {contact.notes ? <p className="mt-2 text-sm text-secondary">{contact.notes}</p> : null}
          {canEdit ? <div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button><Button variant="ghost" onClick={() => void deleteEmergencyContact(tripId, contact.id).then(onRefresh).catch((err) => setError(err.message))}><Trash2 className="h-4 w-4" />Delete</Button></div> : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </div>
    {canEdit && <EmergencyContactForm isOpen={editing} tripId={tripId} contact={contact} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />}
    </>
  );
}

function EmergencyContactForm({ isOpen, tripId, contact, onSaved, onCancel }: { isOpen: boolean; tripId: string; contact?: EmergencyContact; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<EmergencyContactInput>({ name: contact?.name ?? "", relationship: contact?.relationship ?? "", phone: contact?.phone ?? "", notes: contact?.notes });
  return <SimpleForm isOpen={isOpen} title={contact ? "Edit Contact" : "Add Contact"} onCancel={onCancel} onSave={async () => { await upsertEmergencyContact(tripId, form, contact?.id); await onSaved(); }}>
    <Field label="Name"><input className={formInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Relationship"><input className={formInputClass} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></Field>
    <Field label="Phone"><input className={formInputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
    <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function HospitalCard({ hospital, canEdit, onRefresh }: { hospital: Place; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
    <Card className="relative overflow-hidden p-6 border-0 bg-clay-surface hover:shadow-lg transition-shadow">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-danger/80" />
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
          <HeartPulse className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-primary">{hospital.name}</p>
          <p className="mt-0.5 text-sm text-secondary">{hospital.address}</p>
          {hospital.notes ? <p className="mt-1 text-sm text-muted">{hospital.notes}</p> : null}
          {canEdit ? (
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
              <Button variant="ghost" onClick={() => void deletePlace(hospital.tripId, hospital.id).then(onRefresh).catch((err) => setError(err.message))}><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </Card>
    {canEdit && <HospitalForm isOpen={editing} tripId={hospital.tripId} hospital={hospital} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />}
    </>
  );
}

function HospitalForm({ isOpen, tripId, hospital, onSaved, onCancel }: { isOpen: boolean; tripId: string; hospital?: Place; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<PlaceInput>({ name: hospital?.name ?? "", category: "hospital", address: hospital?.address ?? "", latitude: hospital?.latitude, longitude: hospital?.longitude, visibility: hospital?.visibility ?? "shared", notes: hospital?.notes });
  return <SimpleForm isOpen={isOpen} title={hospital ? "Edit Hospital" : "Add Hospital"} onCancel={onCancel} onSave={async () => { await upsertPlace(tripId, form, hospital?.id); await onSaved(); }}>
    <Field label="Hospital name"><input className={formInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
    <Field label="Address"><input className={formInputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
    <Field label="Latitude"><input type="number" step="0.0000001" className={formInputClass} value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
    <Field label="Longitude"><input type="number" step="0.0000001" className={formInputClass} value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
    <Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
  </SimpleForm>;
}

function SimpleForm({ isOpen, title, children, onSave, onCancel }: { isOpen: boolean; title: string; children: ReactNode; onSave: () => Promise<void>; onCancel: () => void }) {
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
  return <Modal isOpen={isOpen} onClose={onCancel} title={title}><form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>{children}{error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}<div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={busy}>Save</Button><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div></form></Modal>;
}
