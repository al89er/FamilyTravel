import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import { setFamilyPackingCheck } from "../lib/supabase";
import type { AppData, FamilySession, PackingItem } from "../types";

export function Packing({
  data,
  familySession,
  onRefreshFamily
}: {
  data: AppData;
  familySession: FamilySession | null;
  onRefreshFamily?: () => void;
}) {
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
              <PackingCard
                key={item.id}
                item={item}
                checked={checked}
                assigned={assigned}
                familySession={familySession}
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
  checked,
  assigned,
  familySession,
  onRefreshFamily
}: {
  item: PackingItem;
  checked: boolean;
  assigned?: string;
  familySession: FamilySession | null;
  onRefreshFamily?: () => void;
}) {
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
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </Wrapper>
    </Card>
  );
}
