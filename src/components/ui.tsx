import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-soft ${className}`}>{children}</section>;
}

export function SectionHeader({
  title,
  action,
  eyebrow
}: {
  title: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-normal text-brand-700">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate"
}: {
  children: ReactNode;
  tone?: "brand" | "coral" | "slate" | "amber" | "red";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-900 ring-brand-100",
    coral: "bg-orange-50 text-orange-800 ring-orange-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading trip" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-3 text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Field({
  label,
  children,
  helper
}: {
  label: string;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1">{children}</div>
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variants = {
    primary: "bg-brand-700 text-white hover:bg-brand-900",
    secondary: "bg-slate-900 text-white hover:bg-slate-700",
    ghost: "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
