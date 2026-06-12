import { Ban, Copy, KeyRound, Link2, LogOut, Shield, UserPlus, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal, OptionChips } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { createShareLink, listShareLinks, manageOrganizer, setShareLinkEnabled, updateTrip } from "../lib/supabase";
import type { AccessMode, AppData, Role, ShareLink, TripInput, TripMember, FamilySession } from "../types";

const FAMILY_TRAVEL_PUBLIC_URL = "https://al89er.github.io/FamilyTravel/";

export function Settings({
  data,
  role,
  accessMode,
  familySession,
  onRefresh,
  onLeave
}: {
  data: AppData;
  role: Role;
  accessMode: AccessMode;
  familySession: FamilySession | null;
  onRefresh?: () => Promise<void>;
  onLeave?: () => Promise<void>;
}) {
  if (accessMode === "family") {
    return (
      <div className="space-y-5">
        <SectionHeader title="Trip Control Centre" eyebrow="Family mode" />
        
    <Card className="p-6 border-0">
          <h2 className="text-lg font-semibold text-primary">Your Family Session</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-secondary">Guest name</span>
              <span className="text-sm font-semibold text-primary">{familySession?.displayName || "Guest"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-secondary">Share token used</span>
              <span className="text-sm font-mono text-primary truncate max-w-[200px]">{familySession?.shareToken || "None"}</span>
            </div>
          </div>
        </Card>

    <Card className="p-6 border-0">
          <h2 className="text-lg font-semibold text-primary">Permissions Granted</h2>
          <p className="mt-1 text-sm text-secondary">Your access level is controlled by the trip organizer via the share link configuration.</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm font-medium text-primary">Submit votes on itinerary items</span>
              <Badge tone={familySession?.permissions.votes ? "brand" : "red"}>
                {familySession?.permissions.votes ? "Allowed" : "Restricted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm font-medium text-primary">Add comments / notes</span>
              <Badge tone={familySession?.permissions.comments ? "brand" : "red"}>
                {familySession?.permissions.comments ? "Allowed" : "Restricted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm font-medium text-primary">Check off packing list items</span>
              <Badge tone={familySession?.permissions.packingChecks ? "brand" : "red"}>
                {familySession?.permissions.packingChecks ? "Allowed" : "Restricted"}
              </Badge>
            </div>
          </div>
        </Card>

        {onLeave ? (
          <div className="mt-8 flex justify-center">
            <Button variant="secondary" onClick={() => void onLeave()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out of Family Mode
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Trip Control Centre" eyebrow={`Current role: ${role}`} />
      
      {onLeave ? (
        <Card className="mb-5 overflow-hidden border-0 bg-surface-solid">
          <div className="flex items-center gap-3 bg-primary/8 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {data.currentUser.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary truncate">{data.currentUser.displayName}</p>
              <p className="text-xs text-secondary capitalize">{accessMode} mode</p>
            </div>
            <Button variant="ghost" onClick={() => void onLeave()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </Card>
      ) : null}

      <ThemeSettings />

      <TripOverviewEditor data={data} onRefresh={onRefresh} />

      <OrganizerManagement data={data} role={role} />
      <ShareLinkManagement data={data} role={role} />
    </div>
  );
}

function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  const options = [
    { key: "light" as const, label: "Light", icon: Sun, color: "text-amber-500" },
    { key: "dark" as const, label: "Dark", icon: Moon, color: "text-indigo-500" },
    { key: "system" as const, label: "System", icon: Monitor, color: "text-primary" },
  ];

  return (
      <Card className="p-6 border-0 bg-clay-surface shadow-clay-card">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-clay-secondary">Appearance</p>
        <p className="mt-1 text-sm text-clay-secondary">Dark mode will be re-enabled after the light theme is finalized.</p>
      </div>
      <div className="grid grid-cols-3 gap-3 opacity-50 pointer-events-none">
        {options.map(({ key, label, icon: Icon, color }) => {
          const active = theme === key;
          return (
            <button
              key={key}
              type="button"
              disabled
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 p-4 transition-all shadow-sm ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-clay-surface"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-primary/15" : "bg-clay-recessed"}`}>
                <Icon className={`h-5 w-5 ${active ? "text-primary" : color}`} />
              </div>
              <span className={`text-sm font-semibold ${active ? "text-primary" : "text-clay-secondary"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TripOverviewEditor({ data, onRefresh }: { data: AppData; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TripInput>({
    title: data.trip.title,
    destination: data.trip.destination,
    startDate: data.trip.startDate,
    endDate: data.trip.endDate,
    timezone: data.trip.timezone,
    currency: data.trip.currency,
    dateFormat: data.trip.dateFormat,
    defaultVisibility: data.trip.defaultVisibility,
    hotelInfo: data.trip.hotelInfo,
    emergencySummary: data.trip.emergencySummary,
    estimatedBudget: data.trip.estimatedBudget
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function update<K extends keyof TripInput>(key: K, value: TripInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await updateTrip(data.trip.id, {
        ...form,
        title: form.title.trim(),
        destination: form.destination.trim(),
        currency: form.currency.trim().toUpperCase() || data.trip.currency,
        timezone: form.timezone.trim() || data.trip.timezone,
        dateFormat: form.dateFormat.trim() || data.trip.dateFormat,
        estimatedBudget: Number(form.estimatedBudget || 0)
      });
      await onRefresh?.();
      setEditing(false);
      setStatus("Trip overview saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save trip overview.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <Card className="p-6 border-0 bg-clay-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-primary">Trip overview</h3>
        <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      </div>
      {status ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">{status}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Currency"><input className={formInputClass} readOnly value={data.trip.currency} /></Field>
        <Field label="Timezone"><input className={formInputClass} readOnly value={data.trip.timezone} /></Field>
        <Field label="Date format"><input className={formInputClass} readOnly value={data.trip.dateFormat} /></Field>
        <Field label="Default visibility"><input className={formInputClass} readOnly value={data.trip.defaultVisibility} /></Field>
      </div>
    </Card>

    <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Trip Overview">
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="Trip title"><input className={formInputClass} value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
        <Field label="Destination"><input className={formInputClass} value={form.destination} onChange={(event) => update("destination", event.target.value)} /></Field>
        <Field label="Start date"><input type="date" className={formInputClass} value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
        <Field label="End date"><input type="date" className={formInputClass} value={form.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field>
        <Field label="Timezone"><input className={formInputClass} value={form.timezone} onChange={(event) => update("timezone", event.target.value)} /></Field>
        <Field label="Currency"><input className={formInputClass} value={form.currency} onChange={(event) => update("currency", event.target.value)} maxLength={3} /></Field>
        <Field label="Date format"><input className={formInputClass} value={form.dateFormat} onChange={(event) => update("dateFormat", event.target.value)} /></Field>
        <Field label="Estimated budget"><input type="number" min="0" step="0.01" className={formInputClass} value={form.estimatedBudget} onChange={(event) => update("estimatedBudget", Number(event.target.value))} /></Field>
        <div className="md:col-span-2">
          <Field label="Default visibility">
            <OptionChips
              options={[{ value: "shared", label: "Shared" }, { value: "planner_only", label: "Planner Only" }, { value: "private", label: "Private" }]}
              value={form.defaultVisibility}
              onChange={(v) => update("defaultVisibility", v as TripInput["defaultVisibility"])}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Hotel/accommodation summary"><textarea className={formTextareaClass} value={form.hotelInfo} onChange={(event) => update("hotelInfo", event.target.value)} /></Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Emergency summary"><textarea className={formTextareaClass} value={form.emergencySummary} onChange={(event) => update("emergencySummary", event.target.value)} /></Field>
        </div>
        <div className="flex gap-2 md:col-span-2 mt-2">
          <Button type="submit" disabled={busy}>Save changes</Button>
          <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    </Modal>
    </>
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
  const [adding, setAdding] = useState(false);

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
    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    if (cleanDisplayName.length < 2 || cleanDisplayName.length > 120) {
      setError("Display name must be 2 to 120 characters.");
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 80 || !/^[a-z0-9._@-]+$/.test(cleanUsername)) {
      setError("Username must be 3 to 80 characters and can use letters, numbers, dots, underscores, hyphens, or a full email address.");
      return;
    }

    if (temporaryPassword.length < 8 || temporaryPassword.length > 128) {
      setError("Temporary password must be 8 to 128 characters.");
      return;
    }

    await run(async () => {
      const result = await manageOrganizer({
        action: "addOrganizer",
        tripId: data.trip.id,
        displayName: cleanDisplayName,
        username: cleanUsername,
        temporaryPassword
      });
      setDisplayName("");
      setUsername("");
      setTemporaryPassword("");
      setAdding(false);
      return result;
    }, `Organizer created. Share username "${cleanUsername}" and the temporary password securely.`);
  }

  if (role !== "owner") {
    return (
      <Card className="p-6 border-0 bg-clay-surface">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted" aria-hidden="true" />
          <h3 className="font-semibold text-primary">Organizers</h3>
        </div>
        <p className="mt-2 text-sm text-secondary">Only the trip owner can manage organizer access.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 bg-clay-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold text-primary">Organizers</h3>
        </div>
        <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add organizer</Button>
      </div>
      <p className="mt-2 text-sm text-secondary">
        Owner: {owner?.profile.displayName ?? "Not set"}. Organizers can manage planning data for this trip, but cannot delete or transfer trips.
      </p>

      {status ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">{status}</p> : null}

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add Organizer">
        {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
        <form className="grid gap-3" onSubmit={addOrganizer}>
          <Field label="Display name">
            <input className={formInputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label="Username">
            <input className={formInputClass} value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Temporary password">
            <input className={formInputClass} type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
          </Field>
          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={busy}>Add organizer</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

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

      <Modal isOpen={!!selectedOrganizer} onClose={() => setSelectedUserId("")} title={`Manage ${selectedOrganizer?.profile.displayName}`}>
        {selectedOrganizer ? (
          <div className="grid gap-3">
            {error ? <div className="mb-2"><ErrorState message={error} /></div> : null}
            <Field label="New display name">
              <input className={formInputClass} value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} />
            </Field>
            <Field label="Temporary password">
              <input className={formInputClass} type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
            </Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => manageOrganizer({ action: "updateDisplayName", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId, displayName: newDisplayName }),
                    "Organizer display name updated."
                  ).then(() => setSelectedUserId(""))
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
                  ).then(() => setSelectedUserId(""))
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
                    ).then(() => setSelectedUserId(""));
                  }
                }}
              >
                Transfer ownership
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                className="text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => {
                  if (window.confirm("Remove this organizer from the trip?")) {
                    void run(
                      () => manageOrganizer({ action: "removeOrganizer", tripId: data.trip.id, organizerUserId: selectedOrganizer.userId }),
                      "Organizer removed."
                    ).then(() => setSelectedUserId(""));
                  }
                }}
              >
                Remove organizer
              </Button>
            </div>
          </div>
        ) : <div />}
      </Modal>
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
      className={`flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all shadow-sm ${
        selected ? "border-primary bg-primary/8" : "border-border/50 bg-surface hover:border-primary/25 hover:bg-muted"
      }`}
    >
      <div>
        <p className="font-semibold text-primary">{member.profile.displayName}</p>
        <p className="text-sm text-secondary">{member.profile.username ?? "No username"} · Added by {invitedBy}</p>
        {member.createdAt ? <p className="text-xs text-muted">{new Date(member.createdAt).toLocaleDateString()}</p> : null}
      </div>
      <Badge tone="brand">{member.role}</Badge>
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
  const [adding, setAdding] = useState(false);

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
      setAdding(false);
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
      <Card className="p-6 border-0 bg-clay-surface">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted" aria-hidden="true" />
          <h3 className="font-semibold text-primary">Family share links</h3>
        </div>
        <p className="mt-2 text-sm text-secondary">Only the trip owner can create or revoke family share links.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 bg-clay-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold text-primary">Family share links</h3>
        </div>
        <Button onClick={() => setAdding(true)}>Create link</Button>
      </div>
      <p className="mt-2 text-sm text-secondary">
        Share links let family members open a shared view without Supabase Auth. Tokens are generated once and stored hashed.
      </p>

      {status ? (
        <div className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">
          <p className="break-all">{status}</p>
          {status.includes("https://") ? (
            <button type="button" className="mt-2 inline-flex items-center gap-2 font-semibold" onClick={() => void navigator.clipboard.writeText(status.replace("Share link created: ", ""))}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy URL
            </button>
          ) : null}
        </div>
      ) : null}

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Create Share Link">
        {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
        <form className="space-y-4" onSubmit={onCreate}>
          <Field label="Label">
            <input className={formInputClass} value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
              <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} />
              Comments
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
              <input type="checkbox" checked={allowVotes} onChange={(event) => setAllowVotes(event.target.checked)} />
              Votes
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
              <input type="checkbox" checked={allowPackingChecks} onChange={(event) => setAllowPackingChecks(event.target.checked)} />
              Packing checks
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Create link</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <div className="mt-5 space-y-3">
        {links.length === 0 ? <EmptyState title="No share links" body="Create a family share link when you are ready to invite relatives." /> : null}
        {links.map((link) => (
          <div key={link.id} className={`relative overflow-hidden rounded-3xl border-2 transition-all shadow-sm ${link.isEnabled ? "border-border/50 bg-surface" : "border-border/20 bg-muted/50 opacity-75"}`}>
            {link.isEnabled && <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20" />}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-bold text-lg text-primary">{link.label}</p>
                  <Badge tone={link.isEnabled ? "brand" : "red"}>{link.isEnabled ? "Active" : "Revoked"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {[link.allowComments ? "Comments" : null, link.allowVotes ? "Votes" : null, link.allowPackingChecks ? "Packing checks" : null].filter(Boolean).join(" · ")}
                </p>
                {link.token ? (
                  <p className="mt-2 break-all rounded-lg bg-muted px-2.5 py-2 text-xs font-mono text-secondary">{familyUrl(link.token)}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted">Full token hidden. Revoke and recreate if you need a new URL.</p>
                )}
              </div>
              <div className="shrink-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-dashed border-border/50 pt-4 sm:pt-0 sm:pl-5 flex items-center">
                <Button variant={link.isEnabled ? "ghost" : "secondary"} disabled={busy} onClick={() => void toggleLink(link, !link.isEnabled)} className={link.isEnabled ? "text-danger hover:text-danger hover:bg-danger/10" : ""}>
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  {link.isEnabled ? "Revoke pass" : "Reactivate"}
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
