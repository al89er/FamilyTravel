import { HeartPulse, Phone, ShieldCheck } from "lucide-react";
import { Badge, Card, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

export function Emergency({ data }: { data: AppData }) {
  const hospitals = data.places.filter((place) => place.category === "hospital");

  return (
    <div className="space-y-5">
      <SectionHeader title="Emergency & Medical" eyebrow="Private-aware travel safety" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <h3 className="font-semibold text-slate-950">Travel insurance</h3>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Provider</dt>
              <dd className="font-medium text-slate-900">{data.insurance.provider}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Policy</dt>
              <dd className="font-medium text-slate-900">{data.insurance.policyNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Emergency phone</dt>
              <dd className="font-medium text-slate-900">{data.insurance.emergencyPhone}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-coral" aria-hidden="true" />
            <h3 className="font-semibold text-slate-950">Medical notes</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.members.map((member) => (
              <div key={member.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{member.profile.displayName}</p>
                  <Badge>{member.role}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {member.profile.allergies || member.profile.medications || member.profile.medicalNotes
                    ? [member.profile.allergies, member.profile.medications, member.profile.medicalNotes].filter(Boolean).join(" | ")
                    : "No shared medical notes."}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionHeader title="Emergency contacts" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.emergencyContacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 text-brand-700" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-slate-950">{contact.name}</h3>
                  <p className="text-sm text-slate-600">{contact.relationship}</p>
                  <p className="mt-2 font-medium text-slate-900">{contact.phone}</p>
                  {contact.notes ? <p className="mt-2 text-sm text-slate-700">{contact.notes}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Nearby hospitals" />
        <div className="mt-3 space-y-3">
          {hospitals.map((hospital) => (
            <div key={hospital.id} className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">{hospital.name}</p>
              <p>{hospital.address}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
