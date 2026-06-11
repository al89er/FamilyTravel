import {
  BedDouble,
  CalendarDays,
  FileText,
  Home,
  Luggage,
  Map,
  Menu,
  ReceiptText,
  Settings,
  ShieldAlert,
  X,
  LucideIcon
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AppView } from "../hooks/useAppState";

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "itinerary", label: "Plan", icon: CalendarDays },
  { id: "map", label: "Explore", icon: Map },
  { id: "expenses", label: "Money", icon: ReceiptText },
  { id: "documents", label: "Docs", icon: FileText },
  { id: "packing", label: "Packing", icon: Luggage },
  { id: "emergency", label: "Safety", icon: ShieldAlert },
  { id: "assignments", label: "Assignments", icon: BedDouble },
  { id: "settings", label: "Settings", icon: Settings }
];

// First 4 items live in the bottom bar; the rest go in the More drawer
const PRIMARY_COUNT = 4;

export function Layout({
  children,
  activeView,
  setActiveView,
  offline,
  topBar
}: {
  children: ReactNode;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  offline: boolean;
  topBar?: ReactNode;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function onViewChange(id: AppView) {
    setActiveView(id);
    setIsMoreOpen(false);
  }

  const moreActive = navItems.slice(PRIMARY_COUNT).some((i) => i.id === activeView);

  return (
    <div className="min-h-dvh bg-app flex flex-col">
      {/* Skip link */}
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-card"
        href="#main"
      >
        Skip to main content
      </a>

      {/* Offline banner */}
      {offline ? (
        <div className="sticky top-0 z-50 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm font-medium text-warning">
          Offline read-only mode. Recent trip data is shown.
        </div>
      ) : null}

      {/* Top bar – mobile only */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border/60 lg:hidden shadow-nav">
        {topBar}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 lg:gap-8 lg:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 bg-surface px-4 py-7 lg:flex">
          {/* Brand */}
          <div className="mb-8 px-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary opacity-70">
              Family
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">
              Travel
              <span className="ml-1.5 text-xl font-semibold text-secondary">Companion</span>
            </h1>
          </div>
          <nav className="flex-1 space-y-0.5" aria-label="Primary">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                {...item}
                active={activeView === item.id}
                onClick={() => onViewChange(item.id)}
              />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main id="main" className="w-full min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:px-0 lg:pb-10 lg:pt-8 flex-1">
          <div className="hidden lg:block mb-7">{topBar}</div>
          {children}
        </main>
      </div>

      {/* More drawer backdrop */}
      {isMoreOpen ? (
        <div
          className="fixed inset-0 z-40 bg-app/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* More nav drawer */}
      <div
        className={`fixed inset-x-0 bottom-[calc(3.5rem+max(env(safe-area-inset-bottom),0.5rem))] z-40 rounded-t-3xl bg-surface shadow-[0_-8px_32px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-in-out lg:hidden ${
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold text-primary">More</h2>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="rounded-full p-2 text-secondary hover:bg-muted transition-colors"
            aria-label="Close more menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {navItems.slice(PRIMARY_COUNT).map((item) => (
            <DrawerNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => {
                onViewChange(item.id);
                setIsMoreOpen(false);
              }}
            />
          ))}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-surface/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md shadow-nav lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.slice(0, PRIMARY_COUNT).map((item) => (
            <MobileNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
            />
          ))}
          {/* More button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            aria-expanded={isMoreOpen}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
              isMoreOpen || moreActive ? "text-primary" : "text-secondary hover:text-primary"
            }`}
          >
            <div
              className={`mb-0.5 rounded-lg p-1.5 transition-colors ${
                isMoreOpen || moreActive ? "bg-primary/10" : ""
              }`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </div>
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

// ── Desktop sidebar button ──────────────────────────────────────────────────

function NavButton({
  label,
  icon: Icon,
  active,
  onClick
}: {
  id: AppView;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-all ${
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-secondary hover:bg-muted hover:text-primary"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? "bg-primary/15" : ""
        }`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      {label}
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
    </button>
  );
}

// ── Mobile bottom nav item ──────────────────────────────────────────────────

function MobileNavItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
        active ? "text-primary" : "text-secondary hover:text-primary"
      }`}
    >
      <div
        className={`mb-0.5 rounded-lg p-1.5 transition-colors ${active ? "bg-primary/10" : ""}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      {label}
    </button>
  );
}

// ── More drawer item ────────────────────────────────────────────────────────

function DrawerNavItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-xs font-medium transition-all ${
        active ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted hover:text-primary"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      {label}
    </button>
  );
}
