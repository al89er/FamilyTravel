import { KeyRound, Link2, LogIn, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingState } from "../components/ui";
import {
  completeRequiredPasswordChange,
  getPasswordChangeRequired,
  hasSupabaseConfig,
  signInWithPassword
} from "../lib/supabase";
import type { AccessMode, AppData, FamilySession, TripSummary } from "../types";
import type { AccessStatus } from "../hooks/useAppState";

export function AccessGate({
  loading,
  error,
  accessStatus,
  availableTrips,
  shareTokenFromUrl,
  onAdminAuthenticated,
  onSelectTrip,
  onFamilyJoin,
  onTryDemo
}: {
  loading: boolean;
  error: string | null;
  accessStatus: AccessStatus;
  availableTrips: TripSummary[];
  shareTokenFromUrl: string;
  onAdminAuthenticated: () => Promise<void>;
  onSelectTrip: (tripId: string) => Promise<void>;
  onFamilyJoin: (displayName: string, shareToken: string) => Promise<void>;
  onTryDemo: () => void;
}) {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl content-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-brand-700">Private family planning workspace</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-ink sm:text-5xl">Family Travel Companion</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Sign in as the trip owner or organizer, join with a family share token, or open the sample trip deliberately.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onTryDemo}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Try Demo Trip
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-500">Trip details stay hidden until one of these access paths succeeds.</p>
        </section>

        <section className="space-y-4">
          {error ? <ErrorState message={error} /> : null}
          {loading || accessStatus === "checking" ? <LoadingState label="Checking access" /> : null}
          {accessStatus === "trip-select" ? <TripSelector trips={availableTrips} onSelectTrip={onSelectTrip} /> : null}
          {accessStatus === "empty" ? (
            <EmptyState
              title="No trips for this account"
              body="Create a trip row and add your Auth user to trip_members as owner, or ask the current owner to add you as an organizer."
            />
          ) : null}
          <AdminAccessCard disabled={loading} onAuthenticated={onAdminAuthenticated} />
          <FamilyAccessCard disabled={loading} initialShareToken={shareTokenFromUrl} onFamilyJoin={onFamilyJoin} />
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
  const label = accessMode === "owner" ? "Owner" : accessMode === "organizer" ? "Organizer" : accessMode === "family" ? "Family" : "Demo";
  const detail = accessMode === "family" ? familySession?.displayName : data.currentUser.displayName;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <h2 className="font-semibold text-slate-950">Access</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
        </div>
        <Badge tone={accessMode === "demo" ? "amber" : "brand"}>{label}</Badge>
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
      <h2 className="text-lg font-semibold text-slate-950">Owner / Organizer sign in</h2>
      <p className="mt-1 text-sm text-slate-600">Use the username and password managed in Supabase Auth.</p>
      {!hasSupabaseConfig ? (
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Add your Supabase anon key in `.env.local` to enable authentication.
        </div>
      ) : null}
      {mustChangePassword ? (
        <form className="mt-4 space-y-3" onSubmit={onPasswordChangeSubmit}>
          <Field label="New password">
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          {error ? <ErrorState message={error} /> : null}
          {status ? <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{status}</p> : null}
          <Button type="submit" disabled={busy || disabled || !hasSupabaseConfig}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Update password
          </Button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Field label="Username">
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          </Field>
          <Field label="Password">
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
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
      <h2 className="text-lg font-semibold text-slate-950">Family trip access</h2>
      <p className="mt-1 text-sm text-slate-600">No account needed. Use your name and the family share token.</p>
      <form className="mt-4 space-y-3" onSubmit={onFamilySubmit}>
        <Field label="Your name">
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
            type="text"
            autoComplete="name"
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="Auntie Lina"
          />
        </Field>
        <Field label="Share token">
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
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
      <h2 className="text-lg font-semibold text-slate-950">My Trips</h2>
      <p className="mt-1 text-sm text-slate-600">Choose which trip to open.</p>
      <div className="mt-4 space-y-2">
        {trips.map((trip) => (
          <button
            key={trip.id}
            type="button"
            onClick={() => void onSelectTrip(trip.id)}
            className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-brand-300 hover:bg-brand-50"
          >
            <span>
              <span className="block font-medium text-slate-950">{trip.title}</span>
              <span className="block text-sm text-slate-600">
                {trip.destination} | {trip.startDate} to {trip.endDate}
              </span>
            </span>
            <Badge>{trip.role}</Badge>
          </button>
        ))}
      </div>
    </Card>
  );
}
