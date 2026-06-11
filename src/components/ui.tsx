import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Category colour system
// Returns Tailwind class strings — all must be full literal strings so
// Tailwind's content scanner can detect and include them in the bundle.
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryStyle {
  /** Soft coloured background, e.g. for icon circles */
  iconBg: string;
  /** Icon / text colour */
  iconText: string;
  /** Badge background + text combo classes */
  badgeBg: string;
  badgeText: string;
  /** Subtle ring for badges */
  badgeRing: string;
}

export function categoryStyles(cat: string): CategoryStyle {
  switch (cat) {
    case "flight":
      return {
        iconBg: "bg-sky-100 dark:bg-sky-950",
        iconText: "text-sky-600 dark:text-sky-400",
        badgeBg: "bg-sky-100 dark:bg-sky-950",
        badgeText: "text-sky-700 dark:text-sky-300",
        badgeRing: "ring-sky-200 dark:ring-sky-800"
      };
    case "hotel":
      return {
        iconBg: "bg-indigo-100 dark:bg-indigo-950",
        iconText: "text-indigo-600 dark:text-indigo-400",
        badgeBg: "bg-indigo-100 dark:bg-indigo-950",
        badgeText: "text-indigo-700 dark:text-indigo-300",
        badgeRing: "ring-indigo-200 dark:ring-indigo-800"
      };
    case "food":
      return {
        iconBg: "bg-amber-100 dark:bg-amber-950",
        iconText: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-100 dark:bg-amber-950",
        badgeText: "text-amber-700 dark:text-amber-300",
        badgeRing: "ring-amber-200 dark:ring-amber-800"
      };
    case "activity":
      return {
        iconBg: "bg-emerald-100 dark:bg-emerald-950",
        iconText: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-100 dark:bg-emerald-950",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeRing: "ring-emerald-200 dark:ring-emerald-800"
      };
    case "transport":
      return {
        iconBg: "bg-cyan-100 dark:bg-cyan-950",
        iconText: "text-cyan-700 dark:text-cyan-400",
        badgeBg: "bg-cyan-100 dark:bg-cyan-950",
        badgeText: "text-cyan-700 dark:text-cyan-300",
        badgeRing: "ring-cyan-200 dark:ring-cyan-800"
      };
    case "shopping":
      return {
        iconBg: "bg-rose-100 dark:bg-rose-950",
        iconText: "text-rose-600 dark:text-rose-400",
        badgeBg: "bg-rose-100 dark:bg-rose-950",
        badgeText: "text-rose-700 dark:text-rose-300",
        badgeRing: "ring-rose-200 dark:ring-rose-800"
      };
    case "free_time":
      return {
        iconBg: "bg-zinc-100 dark:bg-zinc-800",
        iconText: "text-zinc-600 dark:text-zinc-400",
        badgeBg: "bg-zinc-100 dark:bg-zinc-800",
        badgeText: "text-zinc-600 dark:text-zinc-300",
        badgeRing: "ring-zinc-200 dark:ring-zinc-700"
      };
    case "emergency":
      return {
        iconBg: "bg-red-100 dark:bg-red-950",
        iconText: "text-red-600 dark:text-red-400",
        badgeBg: "bg-red-100 dark:bg-red-950",
        badgeText: "text-red-700 dark:text-red-300",
        badgeRing: "ring-red-200 dark:ring-red-800"
      };
    default:
      return {
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconText: "text-slate-500 dark:text-slate-400",
        badgeBg: "bg-slate-100 dark:bg-slate-800",
        badgeText: "text-slate-600 dark:text-slate-300",
        badgeRing: "ring-slate-200 dark:ring-slate-700"
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl bg-surface shadow-soft ring-1 ring-border/50 ${className}`}
    >
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Travel UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 ${className}`}>
      {children}
    </div>
  );
}

export function StatPill({ label, value, inverse = false }: { label: string; value: string; inverse?: boolean }) {
  if (inverse) {
    return (
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-white truncate">{value}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/50 px-3 py-2 text-center ring-1 ring-border/30">
      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">{label}</span>
      <span className="mt-0.5 text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

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
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary opacity-80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-bold text-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "slate",
  className = ""
}: {
  children: ReactNode;
  tone?: "brand" | "coral" | "slate" | "amber" | "red" | "overlay" | "sky" | "indigo" | "emerald" | "rose" | "cyan" | "zinc";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand:   "bg-primary/10 text-primary ring-primary/20",
    coral:   "bg-coral/10 text-coral ring-coral/20",
    slate:   "bg-muted text-secondary ring-border",
    amber:   "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
    red:     "bg-danger/10 text-danger ring-danger/20",
    overlay: "bg-white/15 text-white ring-white/25",
    sky:     "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800",
    indigo:  "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
    rose:    "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800",
    cyan:    "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-800",
    zinc:    "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tones[tone] ?? tones.slate} ${className}`}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Badge (uses categoryStyles automatically)
// ─────────────────────────────────────────────────────────────────────────────

export function CategoryBadge({ category }: { category: string }) {
  const s = categoryStyles(category);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.badgeBg} ${s.badgeText} ${s.badgeRing}`}
    >
      {category.replace("_", " ")}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  body,
  icon,
  action
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
      {icon ? (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-secondary">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState
// ─────────────────────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/8 p-4 text-danger"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadingState
// ─────────────────────────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading trip" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-3 text-secondary">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────────────────────

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
      <span className="text-sm font-medium text-primary">{label}</span>
      <div className="mt-1.5">{children}</div>
      {helper ? <span className="mt-1 block text-xs text-muted">{helper}</span> : null}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  className,
  onClick
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] shadow-sm",
    secondary:
      "bg-muted text-primary hover:bg-muted/80 active:bg-muted/60 active:scale-[0.98] shadow-sm ring-1 ring-border/60",
    ghost:
      "bg-transparent text-primary hover:bg-muted active:bg-muted/80 active:scale-[0.98]",
    danger:
      "bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/30 active:scale-[0.98] ring-1 ring-danger/20"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className || ""}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form class constants
// ─────────────────────────────────────────────────────────────────────────────

export const formInputClass =
  "min-h-12 w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-primary placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 transition-shadow";

export const formTextareaClass =
  "min-h-24 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 transition-shadow";

export const formSelectClass =
  "min-h-12 w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 transition-shadow";
