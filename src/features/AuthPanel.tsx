import { CalendarPlus, KeyRound, Link2, LogIn, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingState, formInputClass } from "../components/ui";
import {
  completeRequiredPasswordChange,
  getPasswordChangeRequired,
  hasSupabaseConfig,
  signInWithPassword
} from "../lib/supabase";
import type { AccessMode, AppData, FamilySession, NewTripInput, TripSummary } from "../types";
import type { AccessStatus } from "../hooks/useAppState";

export function AccessGate({
  loading,
  error,
  accessStatus,
  availableTrips,
  shareTokenFromUrl,
  onAdminAuthenticated,
  onSelectTrip,
  onCreateTrip,
  onFamilyJoin
}: {
  loading: boolean;
  error: string | null;
  accessStatus: AccessStatus;
  availableTrips: TripSummary[];
  shareTokenFromUrl: string;
  onAdminAuthenticated: () => Promise<void>;
  onSelectTrip: (tripId: string) => Promise<void>;
  onCreateTrip: (input: NewTripInput) => Promise<void>;
  onFamilyJoin: (displayName: string, shareToken: string) => Promise<void>;
}) {
  const showFamilyFormByDefault = !!shareTokenFromUrl;
  const [showFamilyAccess, setShowFamilyAccess] = useState(showFamilyFormByDefault);

  if (accessStatus === "checking") {
    return (
      <main className="min-h-dvh bg-app flex items-center justify-center p-4">
        <LoadingState label="Checking access..." />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-app px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-lg content-center gap-6">
        <section className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Family Travel Companion</h1>
          <p className="mt-3 text-base text-secondary">Plan together. Travel easier.</p>
        </section>

        <section className="space-y-4">
          {error ? <ErrorState message={error} /> : null}
          {loading ? <LoadingState label="Loading" /> : null}
          {accessStatus === "trip-select" ? <TripSelector trips={availableTrips} onSelectTrip={onSelectTrip} /> : null}
          {accessStatus === "empty" ? (
            <EmptyState
              title="No trips for this account"
              body="Create your first trip here, or ask the current owner to add you as an organizer."
            />
          ) : null}
          {accessStatus === "empty" || accessStatus === "trip-select" ? <CreateTripCard disabled={loading} onCreateTrip={onCreateTrip} /> : null}
          
          {(accessStatus === "locked") ? (
            <>
              {!showFamilyAccess && !showFamilyFormByDefault ? (
                <>
                  <AdminAccessCard disabled={loading} onAuthenticated={onAdminAuthenticated} />
                  <div className="text-center pt-4">
                     <p className="text-sm text-secondary mb-3">Joining as family?</p>
                     <Button variant="secondary" onClick={() => setShowFamilyAccess(true)}>Join a family trip</Button>
                  </div>
                </>
              ) : (
                <>
                  <FamilyAccessCard disabled={loading} initialShareToken={shareTokenFromUrl} onFamilyJoin={onFamilyJoin} />
                  {!showFamilyFormByDefault ? (
                    <div className="text-center mt-6">
                       <p className="text-sm text-muted mb-3">Are you the trip organizer?</p>
                       <Button variant="ghost" onClick={() => setShowFamilyAccess(false)}>Planner sign in</Button>
                    </div>
                  ) : (
                    <div className="text-center mt-6">
                       <p className="text-sm text-muted mb-3">Are you the trip organizer?</p>
                       <Button variant="ghost" onClick={() => window.location.href = window.location.pathname}>Planner sign in</Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function AccessStatusCard({
  accessMode,
  data,
  familySession,
  onLeave
}: {
  accessMode: AccessMode;
  data: AppData;
  familySession: FamilySession | null;
  onLeave: () => Promise<void>;
}) {
  const label = accessMode === "owner" ? "Owner" : accessMode === "organizer" ? "Organizer" : "Family";
  const detail = accessMode === "family" ? familySession?.displayName : data.currentUser.displayName;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold text-primary">Access</h2>
          </div>
          <p className="mt-1 text-sm text-secondary">{detail}</p>
        </div>
        <Badge tone="brand">{label}</Badge>
      </div>
      <Button variant="ghost" onClick={() => void onLeave()}>
        Sign out
      </Button>
    </Card>
  );
}

function AdminAccessCard({
  disabled,
  onAuthenticated
}: {
  disabled: boolean;
  onAuthenticated: () => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (username.trim().length < 3) {
      setError("Enter your username.");
      return;
    }

    if (password.length < 6) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      const { data, error: authError } = await signInWithPassword(username, password);
      if (authError) throw authError;
      if (data.user && (await getPasswordChangeRequired(data.user.id))) {
        setMustChangePassword(true);
        setStatus("Set a new password before continuing.");
      } else {
        await onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your username and password.");
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordChangeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await completeRequiredPasswordChange(newPassword);
      setMustChangePassword(false);
      setNewPassword("");
      await onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-primary">Owner / Organizer sign in</h2>
      <p className="mt-1 text-sm text-secondary">Use the username and password managed in Supabase Auth.</p>
      {!hasSupabaseConfig ? (
        <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-secondary">
          Add your Supabase anon key in `.env.local` to enable authentication.
        </div>
      ) : null}
      {mustChangePassword ? (
        <form className="mt-4 space-y-3" onSubmit={onPasswordChangeSubmit}>
          <Field label="New password">
            <input
              className={formInputClass}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          {error ? <ErrorState message={error} /> : null}
          {status ? <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">{status}</p> : null}
          <Button type="submit" disabled={busy || disabled || !hasSupabaseConfig}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Update password
          </Button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Field label="Username">
            <input
              className={formInputClass}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          </Field>
          <Field label="Password">
            <input
              className={formInputClass}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </Field>
          {error ? <ErrorState message={error} /> : null}
          <Button type="submit" disabled={busy || disabled || !hasSupabaseConfig}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Button>
        </form>
      )}
    </Card>
  );
}

function FamilyAccessCard({
  disabled,
  initialShareToken,
  onFamilyJoin
}: {
  disabled: boolean;
  initialShareToken: string;
  onFamilyJoin: (displayName: string, shareToken: string) => Promise<void>;
}) {
  const [familyName, setFamilyName] = useState("");
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShareToken(initialShareToken);
  }, [initialShareToken]);

  async function onFamilySubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (familyName.trim().length < 2) {
      setError("Enter your name.");
      return;
    }

    if (shareToken.trim().length < 6) {
      setError("Enter the family share token.");
      return;
    }

    setBusy(true);
    try {
      await onFamilyJoin(familyName.trim(), shareToken.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this family trip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-primary">Family trip access</h2>
      <p className="mt-1 text-sm text-secondary">No account needed. Use your name and the family share token.</p>
      <form className="mt-4 space-y-3" onSubmit={onFamilySubmit}>
        <Field label="Your name">
          <input
            className={formInputClass}
            type="text"
            autoComplete="name"
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="Auntie Lina"
          />
        </Field>
        <Field label="Share token">
          <input
            className={formInputClass}
            type="text"
            value={shareToken}
            onChange={(event) => setShareToken(event.target.value)}
            placeholder="ft_..."
          />
        </Field>
        {error ? <ErrorState message={error} /> : null}
        <Button type="submit" disabled={busy || disabled || !hasSupabaseConfig}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Open trip
        </Button>
      </form>
    </Card>
  );
}

function TripSelector({ trips, onSelectTrip }: { trips: TripSummary[]; onSelectTrip: (tripId: string) => Promise<void> }) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-primary">My Trips</h2>
      <p className="mt-1 text-sm text-secondary">Choose which trip to open.</p>
      <div className="mt-4 space-y-2">
        {trips.length === 0 ? (
          <p className="text-sm text-secondary">No trips available.</p>
        ) : (
          trips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => void onSelectTrip(trip.id)}
              className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/20 hover:bg-primary/5 transition-colors"
            >
              <span>
                <span className="block font-medium text-primary">{trip.title}</span>
                <span className="block text-sm text-secondary">
                  {trip.destination} | {trip.startDate} to {trip.endDate}
                </span>
              </span>
              <Badge>{trip.role}</Badge>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

function CreateTripCard({
  disabled,
  onCreateTrip
}: {
  disabled: boolean;
  onCreateTrip: (input: NewTripInput) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<NewTripInput>({
    title: "",
    destination: "",
    startDate: today,
    endDate: today,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    currency: "USD",
    dateFormat: "DD MMM YYYY"
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof NewTripInput>(key: K, value: NewTripInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.title.trim().length < 2) {
      setError("Enter a trip title.");
      return;
    }

    if (form.destination.trim().length < 2) {
      setError("Enter a destination.");
      return;
    }

    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setError("Choose valid trip dates.");
      return;
    }

    setBusy(true);
    try {
      await onCreateTrip({
        ...form,
        title: form.title.trim(),
        destination: form.destination.trim(),
        timezone: form.timezone.trim() || "UTC",
        currency: form.currency.trim().toUpperCase() || "USD",
        dateFormat: form.dateFormat.trim() || "DD MMM YYYY"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the trip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-primary">Create a new trip</h2>
      </div>
      <p className="mt-1 text-sm text-secondary">The new trip opens immediately with you as Owner.</p>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <Field label="Trip title">
          <input
            className={formInputClass}
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Bali Family Trip"
          />
        </Field>
        <Field label="Destination">
          <input
            className={formInputClass}
            value={form.destination}
            onChange={(event) => update("destination", event.target.value)}
            placeholder="Bali, Indonesia"
          />
        </Field>
        <Field label="Start date">
          <input
            className={formInputClass}
            type="date"
            value={form.startDate}
            onChange={(event) => update("startDate", event.target.value)}
          />
        </Field>
        <Field label="End date">
          <input
            className={formInputClass}
            type="date"
            value={form.endDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </Field>
        <Field label="Timezone">
          <input
            className={formInputClass}
            value={form.timezone}
            onChange={(event) => update("timezone", event.target.value)}
          />
        </Field>
        <Field label="Currency">
          <input
            className={formInputClass}
            value={form.currency}
            onChange={(event) => update("currency", event.target.value)}
            maxLength={3}
          />
        </Field>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy || disabled || !hasSupabaseConfig}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Create trip
          </Button>
        </div>
      </form>
    </Card>
  );
}
