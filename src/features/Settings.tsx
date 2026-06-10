import { KeyRound, Shield, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, ErrorState, Field, SectionHeader } from "../components/ui";
import { manageOrganizer } from "../lib/supabase";
import type { AppData, Role, TripMember } from "../types";

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

      <OrganizerManagement data={data} role={role} />
    </div>
  );
}

function OrganizerManagement({ data, role }: { data: AppData; role: Role }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const owner = data.members.find((member) => member.role === "owner");
  const organizers = useMemo(() => data.members.filter((member) => member.role === "organizer"), [data.members]);
  const selectedOrganizer = organizers.find((member) => member.userId === selectedUserId);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await action();
      setStatus(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Organizer action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addOrganizer(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await manageOrganizer({
        action: "addOrganizer",
        tripId: data.trip.id,
        displayName,
        username,
        temporaryPassword
      });
      setDisplayName("");
      setUsername("");
      setTemporaryPassword("");
      return result;
    }, `Organizer created. Share username "${username}" and the temporary password securely.`);
  }

  if (role !== "owner") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h3 className="font-semibold text-slate-950">Organizers</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">Only the trip owner can manage organizer access.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h3 className="font-semibold text-slate-950">Organizers</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Owner: {owner?.profile.displayName ?? "Not set"}. Organizers can manage planning data for this trip, but cannot delete or transfer trips.
      </p>

      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {status ? <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{status}</p> : null}

      <form className="mt-5 grid gap-3 md:grid-cols-3" onSubmit={addOrganizer}>
        <Field label="Display name">
          <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="Username">
          <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={username} onChange={(event) => setUsername(event.target.value)} />
        </Field>
        <Field label="Temporary password">
          <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
        </Field>
        <div className="md:col-span-3">
          <Button type="submit" disabled={busy}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add organizer
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {organizers.map((member) => (
          <OrganizerRow
            key={member.id}
            member={member}
            owner={owner}
            selected={selectedUserId === member.userId}
            onSelect={() => {
              setSelectedUserId(member.userId);
              setNewDisplayName(member.profile.displayName);
            }}
          />
        ))}
      </div>

      {selectedOrganizer ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-950">Manage {selectedOrganizer.profile.displayName}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="New display name">
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} />
            </Field>
            <Field label="Temporary password">
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run(
                  () => manageOrganizer({ action: "updateDisplayName", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId, displayName: newDisplayName }),
                  "Organizer display name updated."
                )
              }
            >
              Update name
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run(
                  () => manageOrganizer({ action: "resetPassword", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId, temporaryPassword }),
                  "Temporary password set. Organizer must change password on next login."
                )
              }
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Reset password
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Transfer ownership to this organizer? You will become an organizer.")) {
                  void run(
                    () => manageOrganizer({ action: "transferOwnership", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId }),
                    "Ownership transferred."
                  );
                }
              }}
            >
              Transfer ownership
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Remove this organizer from the trip?")) {
                  void run(
                    () => manageOrganizer({ action: "removeOrganizer", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId }),
                    "Organizer removed."
                  );
                }
              }}
            >
              Remove organizer
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function OrganizerRow({
  member,
  owner,
  selected,
  onSelect
}: {
  member: TripMember;
  owner?: TripMember;
  selected: boolean;
  onSelect: () => void;
}) {
  const invitedBy = owner && owner.userId === member.invitedBy ? owner.profile.displayName : "Owner";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-left ${
        selected ? "border-brand-700 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <div>
        <p className="font-medium text-slate-900">{member.profile.displayName}</p>
        <p className="text-sm text-slate-600">{member.profile.username ?? "No username"} | Added by {invitedBy}</p>
        {member.createdAt ? <p className="text-xs text-slate-500">{new Date(member.createdAt).toLocaleDateString()}</p> : null}
      </div>
      <Badge>{member.role}</Badge>
    </button>
  );
}
