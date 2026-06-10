import { useState } from "react";
import { Mail, Chrome } from "lucide-react";
import { Button, Card, ErrorState, Field } from "../components/ui";
import { hasSupabaseConfig, signInWithEmail, signInWithGoogle } from "../lib/supabase";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const { error: authError } = await signInWithEmail(email);
      if (authError) throw authError;
      setStatus("Check your email for the sign-in link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-slate-950">Sign in</h2>
      <p className="mt-1 text-sm text-slate-600">
        Demo data is shown until Supabase keys are configured and a session is active.
      </p>
      {!hasSupabaseConfig ? (
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Add your Supabase anon key in `.env.local` to enable authentication.
        </div>
      ) : null}
      <form className="mt-4 space-y-3" onSubmit={onEmailSubmit}>
        <Field label="Email address">
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </Field>
        {error ? <ErrorState message={error} /> : null}
        {status ? <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{status}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || !hasSupabaseConfig}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email link
          </Button>
          <Button variant="ghost" disabled={!hasSupabaseConfig} onClick={onGoogleSignIn}>
            <Chrome className="h-4 w-4" aria-hidden="true" />
            Google
          </Button>
        </div>
      </form>
    </Card>
  );
}
