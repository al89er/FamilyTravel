import { AlertTriangle, HeartPulse, Pencil, Phone, Plus, ShieldCheck, Trash2, MoreVertical } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal } from "../components/ui";
import { deleteEmergencyContact, deletePlace, upsertEmergencyContact, upsertInsurance, upsertMedicalNote, upsertPlace } from "../lib/supabase";
import type { AppData, EmergencyContact, EmergencyContactInput, InsuranceInput, MedicalNoteInput, Place, PlaceInput, Profile } from "../types";

export function Emergency({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const hospitals = data.places.filter((place) => place.category === "hospital");

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader title="Emergency & Medical" eyebrow="Private-aware travel safety" />

      {/* Emergency summary banner */}
      {data.trip.emergencySummary ? (
        <div className="flex items-start gap-3 rounded-[24px] bg-clay-recessed shadow-clay-pressed p-5">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm font-bold leading-relaxed text-amber-700">{data.trip.emergencySummary}</p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <InsuranceCard data={data} canEdit={canEdit} onRefresh={onRefresh} />

        <Card className="p-6 sm:p-7 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-rose-100 shadow-clay-pressed">
              <HeartPulse className="h-5 w-5 text-rose-600" aria-hidden="true" />
            </div>
            <h3 className="font-black text-xl text-clay-primary">Medical notes</h3>
          </div>
          <div className="space-y-3">
            {data.members.map((member) => (
              <MedicalNoteCard key={member.id} tripId={data.trip.id} profile={member.profile} canEdit={canEdit} onRefresh={onRefresh} role={member.role} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 sm:p-7 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-red-100 shadow-clay-pressed">
              <Phone className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="font-black text-xl text-clay-primary">Emergency contacts</h3>
          </div>
          {canEdit ? <Button onClick={() => setShowContactForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add contact</Button> : null}
        </div>
        {canEdit ? <EmergencyContactForm isOpen={showContactForm} tripId={data.trip.id} onCancel={() => setShowContactForm(false)} onSaved={async () => { setShowContactForm(false); await onRefresh?.(); }} /> : null}
        {data.emergencyContacts.length === 0 ? (
          <EmptyState
            icon={<Phone className="h-10 w-10 opacity-80" />}
            title="No emergency contacts"
            body="Add local contacts, family leads, or embassy details."
            action={canEdit ? <Button variant="secondary" onClick={() => setShowContactForm(true)}>Add your first contact</Button> : null}
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {data.emergencyContacts.map((contact) => (
            <EmergencyContactCard key={contact.id} tripId={data.trip.id} contact={contact} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      </Card>

      <Card className="p-6 sm:p-7 border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-red-100 shadow-clay-pressed">
              <HeartPulse className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="font-black text-xl text-clay-primary">Nearby hospitals</h3>
          </div>
          {canEdit ? <Button onClick={() => setShowHospitalForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add hospital</Button> : null}
        </div>
        {canEdit ? <HospitalForm isOpen={showHospitalForm} tripId={data.trip.id} onCancel={() => setShowHospitalForm(false)} onSaved={async () => { setShowHospitalForm(false); await onRefresh?.(); }} /> : null}
        {hospitals.length === 0 ? (
          <EmptyState
            icon={<HeartPulse className="h-10 w-10 opacity-80" />}
            title="No nearby hospitals"
            body="Add hospitals or clinics for quick access during travel."
            action={canEdit ? <Button variant="secondary" onClick={() => setShowHospitalForm(true)}>Add a hospital</Button> : null}
          />
        ) : null}
        <div className="space-y-4">
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
      <Card className="p-6 sm:p-7 border-0 border-t-[6px] border-t-emerald-400 relative bg-clay-surface shadow-clay-card rounded-[32px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-emerald-100 shadow-clay-pressed">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <h3 className="font-black text-xl text-clay-primary">Travel insurance</h3>
        </div>
        {canEdit ? <Button variant="ghost" className="bg-clay-recessed shadow-clay-pressed hover:bg-clay-recessed/80" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" aria-hidden="true" />Edit</Button> : null}
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between items-center gap-4 bg-clay-recessed p-3.5 rounded-[16px] shadow-clay-pressed">
          <dt className="text-clay-secondary font-bold uppercase tracking-wider text-[10px]">Provider</dt>
          <dd className="font-bold text-clay-primary text-right">{data.insurance.provider || "—"}</dd>
        </div>
        <div className="flex justify-between items-center gap-4 bg-clay-recessed p-3.5 rounded-[16px] shadow-clay-pressed">
          <dt className="text-clay-secondary font-bold uppercase tracking-wider text-[10px]">Policy</dt>
          <dd className="font-mono font-bold text-clay-primary text-right">{data.insurance.policyNumber || "—"}</dd>
        </div>
        <div className="flex justify-between items-center gap-4 bg-clay-recessed p-3.5 rounded-[16px] shadow-clay-pressed">
          <dt className="text-clay-secondary font-bold uppercase tracking-wider text-[10px]">Emergency phone</dt>
          <dd className="font-bold text-clay-primary text-right">{data.insurance.emergencyPhone || "—"}</dd>
        </div>
        {data.insurance.notes ? <div className="mt-3 pt-1"><p className="text-xs font-medium text-clay-secondary leading-relaxed bg-clay-recessed p-3.5 rounded-[16px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">{data.insurance.notes}</p></div> : null}
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
    <div className="flex items-start gap-4 rounded-[28px] border-0 bg-clay-surface p-5 shadow-clay-card hover:-translate-y-1 hover:shadow-clay-hover transition-all">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-clay-recessed shadow-clay-pressed text-[11px] font-black tracking-widest text-clay-primary">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-lg text-clay-primary">{profile.displayName}</p>
          <div className="flex items-center gap-2">
            <Badge tone="zinc" className="shadow-sm">{role}</Badge>
            {canEdit ? <Button variant="ghost" className="h-8 text-[11px] font-bold uppercase tracking-wider text-clay-secondary bg-clay-recessed shadow-clay-pressed hover:bg-clay-recessed/80" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Edit</Button> : null}
          </div>
        </div>
        {hasMedicalInfo ? (
          <div className="mt-3 space-y-2">
            {profile.allergies && <p className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-[14px] shadow-sm"><span className="font-bold uppercase tracking-wider text-[10px] mr-2">Allergies</span>{profile.allergies}</p>}
            {profile.medications && <p className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-[14px] shadow-sm"><span className="font-bold uppercase tracking-wider text-[10px] mr-2">Meds</span>{profile.medications}</p>}
            {profile.medicalNotes && <p className="text-sm font-medium text-clay-secondary bg-clay-recessed shadow-clay-pressed px-3 py-2 rounded-[14px]">{profile.medicalNotes}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-clay-secondary uppercase tracking-wider">No shared medical notes.</p>
        )}
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
    <label className="flex min-h-12 items-center gap-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 text-sm font-bold text-clay-primary hover:bg-primary/5 transition-colors mt-2"><input type="checkbox" className="h-4 w-4 accent-primary rounded" checked={form.visibleToOwner} onChange={(e) => setForm({ ...form, visibleToOwner: e.target.checked })} />Visible to owner</label>
  </SimpleForm>;
}

function EmergencyContactCard({ tripId, contact, canEdit, onRefresh }: { tripId: string; contact: EmergencyContact; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
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
              className="fixed inset-0 z-40 bg-transparent"
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
                  void deleteEmergencyContact(tripId, contact.id).then(onRefresh).catch((err) => setError(err.message));
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

  return (
    <>
    <div className={`rounded-[28px] border-0 bg-clay-surface p-5 sm:p-6 shadow-clay-card transition-all hover:shadow-clay-hover hover:-translate-y-1 relative ${menuOpen ? "z-50" : "z-0"}`}>
      <ActionMenu />
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-100 shadow-clay-pressed">
          <Phone className="h-5 w-5 text-red-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-lg text-clay-primary pr-8">{contact.name}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary pr-8">{contact.relationship}</p>
          <p className="mt-2 font-mono font-black text-lg text-clay-primary">{contact.phone}</p>
          {contact.notes ? <p className="mt-3 text-sm font-medium text-clay-secondary bg-clay-recessed shadow-clay-pressed p-3.5 rounded-[16px]">{contact.notes}</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
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
  const [menuOpen, setMenuOpen] = useState(false);

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
                  void deletePlace(hospital.tripId, hospital.id).then(onRefresh).catch((err) => setError(err.message));
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

  return (
    <>
    <Card className={`relative p-5 sm:p-6 border-0 border-l-[10px] border-l-red-500 bg-clay-surface shadow-clay-card rounded-[28px] hover:shadow-clay-hover hover:-translate-y-1 transition-all ${menuOpen ? "z-50" : "z-0"}`}>
      <ActionMenu />
      <div className="flex items-start gap-4 pl-3 relative z-20">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-100 shadow-clay-pressed">
          <HeartPulse className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-lg text-clay-primary leading-tight pr-8">{hospital.name}</p>
          <p className="mt-1 text-sm font-medium text-clay-secondary pr-8">{hospital.address}</p>
          {hospital.notes ? <p className="mt-3 text-sm font-medium text-clay-secondary bg-clay-recessed shadow-clay-pressed p-3.5 rounded-[16px]">{hospital.notes}</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
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
  return <Modal isOpen={isOpen} onClose={onCancel} title={title}><form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>{children}{error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}<div className="flex gap-2 md:col-span-2 pt-4"><Button type="submit" disabled={busy}>Save</Button><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div></form></Modal>;
}
