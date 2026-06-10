import { CheckCircle2, Circle } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

export function Packing({ data }: { data: AppData }) {
  const checkedCount = data.packing.filter((item) => item.checkedBy.includes(data.currentUser.id)).length;

  return (
    <div className="space-y-5">
      <SectionHeader title="Packing Lists" eyebrow={`${checkedCount} of ${data.packing.length} checked by you`} />
      {data.packing.length === 0 ? (
        <EmptyState title="No packing items" body="Create shared and personal packing lists with per-person checklist status." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.packing.map((item) => {
            const checked = item.checkedBy.includes(data.currentUser.id);
            const assigned = data.members.find((member) => member.profileId === item.assignedTo)?.profile.displayName;
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
