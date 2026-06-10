import { Shield } from "lucide-react";
import { Badge, Card, Field, SectionHeader } from "../components/ui";
import type { AppData, Role } from "../types";

export function Settings({ data, role }: { data: AppData; role: Role }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Trip Settings" eyebrow={`Current role: ${role}`} />
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Currency">
            <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" readOnly value={data.trip.currency} />
          </Field>
          <Field label="Timezone">
            <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" readOnly value={data.trip.timezone} />
          </Field>
          <Field label="Date format">
            <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" readOnly value={data.trip.dateFormat} />
          </Field>
          <Field label="Default visibility">
            <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" readOnly value={data.trip.defaultVisibility} />
          </Field>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-700" aria-hidden="true" />
          <h3 className="font-semibold text-slate-950">Member permissions</h3>
        </div>
        <div className="mt-4 space-y-3">
          {data.members.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <p className="font-medium text-slate-900">{member.profile.displayName}</p>
                <p className="text-sm text-slate-600">{member.canAddExpenses ? "Can add expenses" : "Cannot add expenses"}</p>
              </div>
              <Badge tone={member.role === "owner" ? "brand" : "slate"}>{member.role}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
