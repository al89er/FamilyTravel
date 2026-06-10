import { useState } from "react";
import { Link2, LogIn } from "lucide-react";
import { Button, Card, ErrorState, Field } from "../components/ui";
import { hasSupabaseConfig, signInWithPassword } from "../lib/supabase";
import type { FamilySession } from "../types";

export function AuthPanel({
  accessMode,
  familySession,
  onFamilyJoin
}: {
  accessMode: "admin" | "family";
  familySession: FamilySession | null;
  onFamilyJoin: (session: FamilySession) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState(familySession?.displayName ?? "");
  const [shareToken, setShareToken] = useState(familySession?.shareToken ?? new URLSearchParams(window.location.search).get("share") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

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
      const { error: authError } = await signInWithPassword(username, password);
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your username and password.");
    } finally {
      setBusy(false);
    }
  }

  function onFamilySubmit(event: React.FormEvent) {
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

    onFamilyJoin({
      displayName: familyName.trim(),
      shareToken: shareToken.trim(),
      permissions: { comments: false, votes: false, packingChecks: false }
    });
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-slate-950">{accessMode === "family" ? "Family access" : "Admin access"}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {accessMode === "family" ? "No account needed. Use your name and share token." : "Planner account managed in Supabase Auth."}
      </p>
      {!hasSupabaseConfig ? (
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Add your Supabase anon key in `.env.local` to enable authentication.
        </div>
      ) : null}
      {accessMode === "family" ? (
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
              placeholder="bali-family-2026"
            />
          </Field>
          {error ? <ErrorState message={error} /> : null}
          <Button type="submit" disabled={!hasSupabaseConfig}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Open trip
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
            placeholder="username"
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || !hasSupabaseConfig}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Button>
        </div>
      </form>
      )}
    </Card>
  );
}
