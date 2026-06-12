import { Ban, Copy, KeyRound, Link2, LogOut, Shield, UserPlus, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal, OptionChips } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { createShareLink, listShareLinks, manageOrganizer, setShareLinkEnabled, updateTrip } from "../lib/supabase";
import type { AccessMode, AppData, Role, ShareLink, TripInput, TripMember, FamilySession } from "../types";

const FAMILY_TRAVEL_PUBLIC_URL = "https://al89er.github.io/FamilyTravel/";

// ─────────────────────────────────────────────────────────────────────────────
// Settings root
// ─────────────────────────────────────────────────────────────────────────────

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
  // ── Family mode view ──────────────────────────────────────────────────────
  if (accessMode === "family") {
    return (
      <div className="space-y-5">
        <SectionHeader title="Trip Control Centre" eyebrow="Family mode" />

        {/* Family session info */}
        <Card className="p-6 border-0 bg-clay-surface">
          <h2 className="text-lg font-bold text-clay-primary">Your Family Session</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-border/40 pb-3">
              <span className="text-sm text-clay-secondary">Guest name</span>
              <span className="text-sm font-semibold text-clay-primary">{familySession?.displayName || "Guest"}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-3">
              <span className="text-sm text-clay-secondary">Share token used</span>
              <span className="text-sm font-mono text-clay-primary truncate max-w-[200px]">{familySession?.shareToken || "None"}</span>
            </div>
          </div>
        </Card>

        {/* Permissions */}
        <Card className="p-6 border-0 bg-clay-surface">
          <h2 className="text-lg font-bold text-clay-primary">Permissions Granted</h2>
          <p className="mt-1 text-sm text-clay-secondary">Your access level is controlled by the trip organizer via the share link configuration.</p>
          <div className="mt-4 space-y-2">
            <PermissionRow
              label="Submit votes on itinerary items"
              allowed={!!familySession?.permissions.votes}
            />
            <PermissionRow
              label="Add comments / notes"
              allowed={!!familySession?.permissions.comments}
            />
            <PermissionRow
              label="Check off packing list items"
              allowed={!!familySession?.permissions.packingChecks}
            />
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

  // ── Organizer / Owner view ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <SectionHeader title="Trip Control Centre" eyebrow={`Current role: ${role}`} />

      {/* Signed-in user card */}
      {onLeave ? (
        <Card className="overflow-hidden border-0 bg-clay-surface p-0">
          <div className="flex items-center gap-4 bg-primary/8 px-5 py-4">
            {/* Avatar orb — saturated violet so white initials are safe */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn text-white text-sm font-black">
              {data.currentUser.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-clay-primary truncate">{data.currentUser.displayName}</p>
              <p className="text-xs text-clay-secondary capitalize">{accessMode} mode</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// PermissionRow helper
// ─────────────────────────────────────────────────────────────────────────────

function PermissionRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 py-3">
      <span className="text-sm font-medium text-clay-primary">{label}</span>
      <Badge tone={allowed ? "brand" : "red"}>
        {allowed ? "Allowed" : "Restricted"}
      </Badge>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeSettings — disabled, dark mode frozen
// ─────────────────────────────────────────────────────────────────────────────

function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  const options = [
    { key: "light"  as const, label: "Light",  icon: Sun,     color: "text-amber-500"   },
    { key: "dark"   as const, label: "Dark",   icon: Moon,    color: "text-indigo-500"  },
    { key: "system" as const, label: "System", icon: Monitor, color: "text-clay-primary" },
  ];

  return (
    <Card className="p-6 border-0 bg-clay-surface shadow-clay-card">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-clay-secondary">Appearance</p>
        <p className="mt-1 text-sm text-clay-secondary">
          Dark mode will be re-enabled after the light theme is finalized.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 opacity-50 pointer-events-none select-none">
        {options.map(({ key, label, icon: Icon, color }) => {
          const active = theme === key;
          return (
            <button
              key={key}
              type="button"
              disabled
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 p-4 transition-all ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-clay-surface shadow-clay-surface"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${active ? "bg-primary/15" : "bg-clay-recessed"}`}>
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

// ─────────────────────────────────────────────────────────────────────────────
// TripOverviewEditor
// ─────────────────────────────────────────────────────────────────────────────

function TripOverviewEditor({ data, onRefresh }: { data: AppData; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TripInput>({
    title:              data.trip.title,
    destination:        data.trip.destination,
    startDate:          data.trip.startDate,
    endDate:            data.trip.endDate,
    timezone:           data.trip.timezone,
    currency:           data.trip.currency,
    dateFormat:         data.trip.dateFormat,
    defaultVisibility:  data.trip.defaultVisibility,
    hotelInfo:          data.trip.hotelInfo,
    emergencySummary:   data.trip.emergencySummary,
    estimatedBudget:    data.trip.estimatedBudget
  });
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [status, setStatus]   = useState<string | null>(null);

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
        title:           form.title.trim(),
        destination:     form.destination.trim(),
        currency:        form.currency.trim().toUpperCase() || data.trip.currency,
        timezone:        form.timezone.trim()               || data.trip.timezone,
        dateFormat:      form.dateFormat.trim()             || data.trip.dateFormat,
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
          <h3 className="font-bold text-clay-primary">Trip overview</h3>
          <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        {status ? (
          <p className="mt-4 rounded-[16px] bg-primary/10 shadow-clay-pressed px-4 py-3 text-sm text-primary">
            {status}
          </p>
        ) : null}
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
                options={[
                  { value: "shared",       label: "Shared"       },
                  { value: "planner_only", label: "Planner Only" },
                  { value: "private",      label: "Private"      },
                ]}
                value={form.defaultVisibility}
                onChange={(v) => update("defaultVisibility", v as TripInput["defaultVisibility"])}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Hotel/accommodation summary">
              <textarea className={formTextareaClass} value={form.hotelInfo} onChange={(event) => update("hotelInfo", event.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Emergency summary">
              <textarea className={formTextareaClass} value={form.emergencySummary} onChange={(event) => update("emergencySummary", event.target.value)} />
            </Field>
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

// ─────────────────────────────────────────────────────────────────────────────
// OrganizerManagement
// ─────────────────────────────────────────────────────────────────────────────

function OrganizerManagement({ data, role }: { data: AppData; role: Role }) {
  const [displayName, setDisplayName]             = useState("");
  const [username, setUsername]                   = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedUserId, setSelectedUserId]       = useState("");
  const [newDisplayName, setNewDisplayName]       = useState("");
  const [status, setStatus]                       = useState<string | null>(null);
  const [error, setError]                         = useState<string | null>(null);
  const [busy, setBusy]                           = useState(false);
  const [adding, setAdding]                       = useState(false);

  const owner              = data.members.find((member) => member.role === "owner");
  const organizers         = useMemo(() => data.members.filter((member) => member.role === "organizer"), [data.members]);
  const selectedOrganizer  = organizers.find((member) => member.userId === selectedUserId);

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
    const cleanUsername    = username.trim().toLowerCase();
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
          <Shield className="h-5 w-5 text-clay-secondary" aria-hidden="true" />
          <h3 className="font-bold text-clay-primary">Organizers</h3>
        </div>
        <p className="mt-2 text-sm text-clay-secondary">Only the trip owner can manage organizer access.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 bg-clay-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-bold text-clay-primary">Organizers</h3>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add organizer
        </Button>
      </div>
      <p className="text-sm text-clay-secondary">
        Owner: {owner?.profile.displayName ?? "Not set"}. Organizers can manage planning data for this trip, but cannot delete or transfer trips.
      </p>

      {status ? (
        <p className="mt-4 rounded-[16px] bg-primary/10 shadow-clay-pressed px-4 py-3 text-sm text-primary">
          {status}
        </p>
      ) : null}

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

// ─────────────────────────────────────────────────────────────────────────────
// OrganizerRow
// ─────────────────────────────────────────────────────────────────────────────

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
      className={`flex min-h-[4rem] w-full flex-wrap items-center justify-between gap-3 rounded-[24px] border-2 p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary/8 shadow-clay-pressed"
          : "border-border/40 bg-clay-recessed shadow-clay-surface hover:border-primary/25 hover:shadow-clay-card"
      }`}
    >
      <div>
        <p className="font-semibold text-clay-primary">{member.profile.displayName}</p>
        <p className="text-sm text-clay-secondary">{member.profile.username ?? "No username"} · Added by {invitedBy}</p>
        {member.createdAt ? <p className="text-xs text-clay-secondary mt-0.5">{new Date(member.createdAt).toLocaleDateString()}</p> : null}
      </div>
      <Badge tone="brand">{member.role}</Badge>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShareLinkManagement
// ─────────────────────────────────────────────────────────────────────────────

function ShareLinkManagement({ data, role }: { data: AppData; role: Role }) {
  const [links, setLinks]                         = useState<ShareLink[]>([]);
  const [label, setLabel]                         = useState("Family share link");
  const [allowComments, setAllowComments]         = useState(true);
  const [allowVotes, setAllowVotes]               = useState(true);
  const [allowPackingChecks, setAllowPackingChecks] = useState(true);
  const [status, setStatus]                       = useState<string | null>(null);
  const [error, setError]                         = useState<string | null>(null);
  const [busy, setBusy]                           = useState(false);
  const [adding, setAdding]                       = useState(false);

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
          <Link2 className="h-5 w-5 text-clay-secondary" aria-hidden="true" />
          <h3 className="font-bold text-clay-primary">Family share links</h3>
        </div>
        <p className="mt-2 text-sm text-clay-secondary">Only the trip owner can create or revoke family share links.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 bg-clay-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-bold text-clay-primary">Family share links</h3>
        </div>
        <Button onClick={() => setAdding(true)}>Create link</Button>
      </div>
      <p className="text-sm text-clay-secondary">
        Share links let family members open a shared view without Supabase Auth. Tokens are generated once and stored hashed.
      </p>

      {status ? (
        <div className="mt-4 rounded-[16px] bg-primary/10 shadow-clay-pressed px-4 py-3 text-sm text-primary">
          <p className="break-all">{status}</p>
          {status.includes("https://") ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 font-semibold text-primary hover:text-primary/80 transition-colors"
              onClick={() => void navigator.clipboard.writeText(status.replace("Share link created: ", ""))}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy URL
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Create share link modal */}
      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Create Share Link">
        {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
        <form className="space-y-4" onSubmit={onCreate}>
          <Field label="Label">
            <input className={formInputClass} value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          {/* Permission toggles — clay recessed chips */}
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "Comments",      checked: allowComments,      onChange: setAllowComments      },
              { label: "Votes",         checked: allowVotes,          onChange: setAllowVotes          },
              { label: "Packing checks",checked: allowPackingChecks,  onChange: setAllowPackingChecks  },
            ].map(({ label: lbl, checked, onChange }) => (
              <label
                key={lbl}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 text-sm font-medium text-clay-primary transition-all hover:bg-primary/5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onChange(event.target.checked)}
                  className="h-4 w-4 accent-primary rounded"
                />
                {lbl}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Create link</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Share link cards */}
      <div className="mt-5 space-y-3">
        {links.length === 0 ? (
          <EmptyState title="No share links" body="Create a family share link when you are ready to invite relatives." />
        ) : null}
        {links.map((link) => (
          <ShareLinkCard key={link.id} link={link} busy={busy} onToggle={toggleLink} />
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShareLinkCard — clay "boarding pass" style share pass
// ─────────────────────────────────────────────────────────────────────────────

function ShareLinkCard({
  link,
  busy,
  onToggle
}: {
  link: ShareLink;
  busy: boolean;
  onToggle: (link: ShareLink, enabled: boolean) => Promise<void>;
}) {
  const isActive = link.isEnabled;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] transition-all ${
        isActive
          ? "bg-clay-surface shadow-clay-card"
          : "bg-clay-recessed shadow-clay-pressed opacity-70"
      }`}
    >
      {/* Active top accent strip */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px] bg-gradient-to-r from-primary/60 to-primary/20" />
      )}

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-5">
        {/* Left: link info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-bold text-lg text-clay-primary">{link.label}</p>
            <Badge tone={isActive ? "brand" : "red"}>{isActive ? "Active" : "Revoked"}</Badge>
          </div>
          <p className="mt-1 text-xs text-clay-secondary">
            {[
              link.allowComments     ? "Comments"      : null,
              link.allowVotes        ? "Votes"          : null,
              link.allowPackingChecks? "Packing checks" : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {link.token ? (
            <p className="mt-2 break-all rounded-[14px] bg-clay-recessed shadow-clay-pressed px-3 py-2 text-xs font-mono text-clay-secondary">
              {familyUrl(link.token)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-clay-secondary">
              Full token hidden. Revoke and recreate if you need a new URL.
            </p>
          )}
        </div>

        {/* Right: action — dashed divider like a perforated boarding pass edge */}
        <div className="shrink-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-dashed border-border/50 pt-4 sm:pt-0 sm:pl-5 flex items-center">
          <Button
            variant={isActive ? "ghost" : "secondary"}
            disabled={busy}
            onClick={() => void onToggle(link, !isActive)}
            className={isActive ? "text-danger hover:text-danger hover:bg-danger/10" : ""}
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            {isActive ? "Revoke pass" : "Reactivate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateShareToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes    = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `ft_${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function familyUrl(token: string) {
  return `${FAMILY_TRAVEL_PUBLIC_URL}?share=${encodeURIComponent(token)}`;
}
