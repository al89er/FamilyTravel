import { Ban, Copy, KeyRound, Link2, Shield, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { createShareLink, listShareLinks, manageOrganizer, setShareLinkEnabled } from "../lib/supabase";
import type { AccessMode, AppData, Role, ShareLink, TripMember } from "../types";

const FAMILY_TRAVEL_PUBLIC_URL = "https://al89er.github.io/FamilyTravel/";

export function Settings({ data, role, accessMode }: { data: AppData; role: Role; accessMode: AccessMode }) {
  if (accessMode === "family" || accessMode === "demo") {
    return (
      <div className="space-y-5">
        <SectionHeader title="Trip Settings" eyebrow={`${accessMode} mode`} />
        <EmptyState title="Settings unavailable" body="Settings are only available to signed-in owners and organizers." />
      </div>
    );
  }

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
      <ShareLinkManagement data={data} role={role} />
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

function ShareLinkManagement({ data, role }: { data: AppData; role: Role }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [label, setLabel] = useState("Family share link");
  const [allowComments, setAllowComments] = useState(true);
  const [allowVotes, setAllowVotes] = useState(true);
  const [allowPackingChecks, setAllowPackingChecks] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role !== "owner") return;
    void refreshLinks();
  }, [data.trip.id, role]);

  async function refreshLinks() {
    setBusy(true);
    setError(null);
    try {
      setLinks(await listShareLinks(data.trip.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load share links.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    const token = generateShareToken();

    try {
      const link = await createShareLink({
        tripId: data.trip.id,
        token,
        label: label.trim() || "Family share link",
        allowComments,
        allowVotes,
        allowPackingChecks
      });
      setLinks((current) => [link, ...current]);
      setStatus(`Share link created: ${familyUrl(token)}`);
      setLabel("Family share link");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLink(link: ShareLink, enabled: boolean) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const updated = await setShareLinkEnabled(data.trip.id, link.id, enabled);
      setLinks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatus(enabled ? "Share link reactivated." : "Share link revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update share link.");
    } finally {
      setBusy(false);
    }
  }

  if (role !== "owner") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h3 className="font-semibold text-slate-950">Family share links</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">Only the trip owner can create or revoke family share links.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h3 className="font-semibold text-slate-950">Family share links</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Share links let family members open a shared view without Supabase Auth. Tokens are generated once and stored hashed.
      </p>

      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {status ? (
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
          <p className="break-all">{status}</p>
          {status.includes("https://") ? (
            <button type="button" className="mt-2 inline-flex items-center gap-2 font-semibold" onClick={() => void navigator.clipboard.writeText(status.replace("Share link created: ", ""))}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy URL
            </button>
          ) : null}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={onCreate}>
        <Field label="Label">
          <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
            <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} />
            Comments
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
            <input type="checkbox" checked={allowVotes} onChange={(event) => setAllowVotes(event.target.checked)} />
            Votes
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
            <input type="checkbox" checked={allowPackingChecks} onChange={(event) => setAllowPackingChecks(event.target.checked)} />
            Packing checks
          </label>
        </div>
        <Button type="submit" disabled={busy}>Create share link</Button>
      </form>

      <div className="mt-5 space-y-3">
        {links.length === 0 ? <EmptyState title="No share links" body="Create a family share link when you are ready to invite relatives." /> : null}
        {links.map((link) => (
          <div key={link.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-950">{link.label}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {link.allowComments ? "Comments" : "No comments"} | {link.allowVotes ? "Votes" : "No votes"} |{" "}
                  {link.allowPackingChecks ? "Packing checks" : "No packing checks"}
                </p>
                {link.token ? (
                  <p className="mt-2 break-all rounded-md bg-white p-2 text-sm text-slate-700">{familyUrl(link.token)}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Full token is hidden after creation. Revoke this link and create a new one if you need a new URL.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={link.isEnabled ? "brand" : "red"}>{link.isEnabled ? "Active" : "Revoked"}</Badge>
                <Button variant="ghost" disabled={busy} onClick={() => void toggleLink(link, !link.isEnabled)}>
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  {link.isEnabled ? "Revoke" : "Reactivate"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function generateShareToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `ft_${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function familyUrl(token: string) {
  return `${FAMILY_TRAVEL_PUBLIC_URL}?share=${encodeURIComponent(token)}`;
}
