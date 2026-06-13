import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Category colour system — Light mode only
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
        iconBg:    "bg-sky-100",
        iconText:  "text-sky-600",
        badgeBg:   "bg-sky-100",
        badgeText: "text-sky-700",
        badgeRing: "ring-sky-200",
      };
    case "hotel":
      return {
        iconBg:    "bg-indigo-100",
        iconText:  "text-indigo-600",
        badgeBg:   "bg-indigo-100",
        badgeText: "text-indigo-700",
        badgeRing: "ring-indigo-200",
      };
    case "food":
      return {
        iconBg:    "bg-amber-100",
        iconText:  "text-amber-600",
        badgeBg:   "bg-amber-100",
        badgeText: "text-amber-700",
        badgeRing: "ring-amber-200",
      };
    case "activity":
      return {
        iconBg:    "bg-emerald-100",
        iconText:  "text-emerald-600",
        badgeBg:   "bg-emerald-100",
        badgeText: "text-emerald-700",
        badgeRing: "ring-emerald-200",
      };
    case "transport":
      return {
        iconBg:    "bg-cyan-100",
        iconText:  "text-cyan-700",
        badgeBg:   "bg-cyan-100",
        badgeText: "text-cyan-700",
        badgeRing: "ring-cyan-200",
      };
    case "shopping":
      return {
        iconBg:    "bg-rose-100",
        iconText:  "text-rose-600",
        badgeBg:   "bg-rose-100",
        badgeText: "text-rose-700",
        badgeRing: "ring-rose-200",
      };
    case "free_time":
      return {
        iconBg:    "bg-zinc-100",
        iconText:  "text-zinc-600",
        badgeBg:   "bg-zinc-100",
        badgeText: "text-zinc-600",
        badgeRing: "ring-zinc-200",
      };
    case "emergency":
      return {
        iconBg:    "bg-red-100",
        iconText:  "text-red-600",
        badgeBg:   "bg-red-100",
        badgeText: "text-red-700",
        badgeRing: "ring-red-200",
      };
    default:
      return {
        iconBg:    "bg-slate-100",
        iconText:  "text-slate-500",
        badgeBg:   "bg-slate-100",
        badgeText: "text-slate-600",
        badgeRing: "ring-slate-200",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card — solid clay surface with multi-layer shadow
// ─────────────────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[32px] bg-clay-surface shadow-clay-card ${className}`}>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GlassPanel — alias kept for compatibility; uses same clay surface
// ─────────────────────────────────────────────────────────────────────────────

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[32px] bg-clay-surface shadow-clay-card ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — raised or recessed stat display
// ─────────────────────────────────────────────────────────────────────────────

export function StatPill({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: string;
  inverse?: boolean;
}) {
  if (inverse) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[20px] bg-gradient-to-br from-primary/5 to-primary/10 px-3 py-2 text-center shadow-clay-surface border border-primary/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-80">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-clay-primary truncate">{value}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] bg-clay-recessed shadow-clay-pressed px-3 py-2 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-clay-secondary">{label}</span>
      <span className="mt-0.5 text-sm font-bold text-clay-primary">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
  eyebrow,
  className,
}: {
  title: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className ?? ""}`}>
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary opacity-80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-bold text-clay-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge — light mode only, no dark: variants
// ─────────────────────────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?:
    | "brand"
    | "coral"
    | "slate"
    | "amber"
    | "red"
    | "overlay"
    | "sky"
    | "indigo"
    | "emerald"
    | "rose"
    | "cyan"
    | "zinc";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand:   "bg-primary/10 text-primary ring-primary/20",
    coral:   "bg-coral/10 text-coral ring-coral/20",
    slate:   "bg-clay-recessed text-clay-secondary ring-border/50",
    amber:   "bg-amber-100 text-amber-700 ring-amber-200",
    red:     "bg-danger/10 text-danger ring-danger/20",
    overlay: "bg-clay-surface text-clay-primary ring-black/10 shadow-clay-surface",
    sky:     "bg-sky-100 text-sky-700 ring-sky-200",
    indigo:  "bg-indigo-100 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    rose:    "bg-rose-100 text-rose-700 ring-rose-200",
    cyan:    "bg-cyan-100 text-cyan-700 ring-cyan-200",
    zinc:    "bg-zinc-100 text-zinc-600 ring-zinc-200",
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
// CategoryBadge
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
  action,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[32px] bg-clay-recessed shadow-clay-pressed px-6 py-14 text-center">
      {icon ? (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-clay-surface">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-bold text-clay-primary">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-clay-secondary">{body}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState
// ─────────────────────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[20px] border border-danger/20 bg-danger/8 p-4 text-danger"
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
    <div className="flex min-h-[240px] items-center justify-center gap-3 text-clay-secondary">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────────────────────

export function Field({
  label,
  children,
  helper,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-clay-primary">{label}</span>
      <div className="mt-1.5">{children}</div>
      {helper ? <span className="mt-1 block text-xs text-clay-secondary">{helper}</span> : null}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button — claymorphic raised style
// ─────────────────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  className,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const variants: Record<string, string> = {
    // Primary: violet gradient, white text, strong raised clay shadow
    primary:
      "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-btn " +
      "hover:shadow-[0_12px_32px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 " +
      "active:scale-[0.92] active:shadow-clay-pressed",

    // Secondary: white clay surface, dark text
    secondary:
      "bg-clay-surface text-clay-primary shadow-clay-card " +
      "hover:shadow-clay-hover hover:-translate-y-0.5 " +
      "active:scale-[0.92] active:shadow-clay-pressed",

    // Ghost: transparent, recessed on hover
    ghost:
      "bg-transparent text-clay-primary " +
      "hover:bg-clay-recessed hover:shadow-clay-pressed " +
      "active:scale-[0.92]",

    // Danger: soft red tint with red border
    danger:
      "bg-danger/10 text-danger border border-danger " +
      "hover:bg-danger/20 active:bg-danger/30 active:scale-[0.92] focus-visible:outline-danger",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-[3rem] items-center justify-center gap-2",
        "rounded-[20px] px-5 py-3",
        "text-sm font-bold",
        "transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "disabled:hover:translate-y-0 disabled:active:scale-100",
        variants[variant],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form class constants — recessed clay inputs
// ─────────────────────────────────────────────────────────────────────────────

export const formInputClass = [
  "min-h-[3rem] w-full",
  "rounded-[20px] border-0",
  "bg-clay-recessed px-5 py-3",
  "text-clay-primary placeholder:text-clay-secondary",
  "shadow-clay-pressed",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-[#F8F5FF]",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "transition-all duration-150",
].join(" ");

export const formTextareaClass = [
  "min-h-[6rem] w-full",
  "rounded-[20px] border-0",
  "bg-clay-recessed px-5 py-3",
  "text-clay-primary placeholder:text-clay-secondary",
  "shadow-clay-pressed",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-[#F8F5FF]",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "resize-y transition-all duration-150",
].join(" ");

export const formSelectClass = [
  "min-h-[3rem] w-full",
  "rounded-[20px] border-0",
  "bg-clay-recessed px-5 py-3",
  "text-clay-primary",
  "shadow-clay-pressed",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-[#F8F5FF]",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "appearance-none transition-all duration-150",
].join(" ");

// ─────────────────────────────────────────────────────────────────────────────
// Modal — clay bottom sheet (mobile) / centred dialog (desktop)
// ─────────────────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Dimmed overlay — no blur, solid clay ink */}
        <Dialog.Overlay className="fixed inset-0 z-[1050] bg-ink/30 transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />

        {/* Sheet / dialog */}
        <Dialog.Content
          className={[
            // Mobile: full-width bottom sheet
            "fixed z-[1060] flex flex-col",
            "bg-clay-surface shadow-clay-card",
            "transition-all duration-300",
            "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
            // Mobile slide-up
            "inset-x-0 bottom-0 max-h-[92dvh]",
            "rounded-t-[40px]",
            "data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
            // Desktop: centred dialog
            "sm:inset-x-auto sm:bottom-auto",
            "sm:left-1/2 sm:top-1/2",
            "sm:w-full sm:max-w-lg",
            "sm:rounded-[40px]",
            "sm:data-[state=closed]:-translate-x-1/2 sm:data-[state=closed]:-translate-y-[48%]",
            "sm:data-[state=open]:-translate-x-1/2  sm:data-[state=open]:-translate-y-1/2",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-clay-primary">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-clay-secondary">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary hover:bg-border hover:text-clay-primary active:scale-90 transition-all shadow-clay-pressed">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* Sticky footer for action buttons */}
          {footer && (
            <div className="shrink-0 border-t border-border/30 bg-clay-surface px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OptionChips — pill-style single-select
// ─────────────────────────────────────────────────────────────────────────────

export function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "inline-flex items-center gap-2 rounded-[20px] px-5 py-2.5 text-sm font-semibold transition-all duration-150",
              isSelected
                ? "bg-gradient-to-br from-violet-200 to-violet-300 text-violet-900 ring-2 ring-violet-400 shadow-clay-pressed scale-95"
                : "bg-clay-surface text-clay-secondary shadow-clay-card hover:-translate-y-1 hover:shadow-clay-hover",
            ].join(" ")}
          >
            {opt.icon && (
              <span className={isSelected ? "text-violet-900" : "text-clay-secondary opacity-70"}>
                {opt.icon}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SegmentedControl
// ─────────────────────────────────────────────────────────────────────────────

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex w-full rounded-[20px] bg-clay-recessed p-1 shadow-clay-pressed">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 rounded-[16px] py-2 text-sm font-semibold transition-all duration-150",
              isSelected
                ? "bg-clay-surface text-clay-primary shadow-clay-card"
                : "text-clay-secondary hover:text-clay-primary",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DayPickerChips
// ─────────────────────────────────────────────────────────────────────────────

export function DayPickerChips({
  dates,
  dateFormat,
  value,
  onChange,
}: {
  dates: string[];
  dateFormat: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
      {dates.map((date, idx) => {
        const isSelected = value === date;
        const d = new Date(date + "T00:00:00");
        const weekday = isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-GB", { weekday: "short" });
        const dayMonth = isNaN(d.getTime())
          ? date
          : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

        return (
          <button
            key={date}
            type="button"
            onClick={() => onChange(date)}
            className={[
              "flex min-w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center",
              "rounded-[20px] p-2 transition-all duration-150",
              isSelected
                ? "bg-gradient-to-br from-violet-200 to-violet-300 text-violet-900 shadow-clay-pressed ring-2 ring-violet-400 scale-95"
                : "bg-clay-surface text-clay-secondary shadow-clay-card hover:-translate-y-1 hover:shadow-clay-hover",
            ].join(" ")}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Day {idx + 1}
            </span>
            <span className="mt-1 font-bold">{weekday}</span>
            <span className={`text-xs ${isSelected ? "opacity-90" : "text-clay-secondary"}`}>
              {dayMonth}
            </span>
          </button>
        );
      })}
    </div>
  );
}
