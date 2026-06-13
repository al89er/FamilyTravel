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
  Images,
  BookHeart,
  X,
  LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AppView } from "../hooks/useAppState";
import type { AccessMode } from "../types";

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "dashboard",   label: "Home",              icon: Home       },
  { id: "itinerary",   label: "Plan",              icon: CalendarDays },
  { id: "map",         label: "Explore",           icon: Map        },
  { id: "memories",    label: "Memories",          icon: BookHeart  },
  { id: "gallery",     label: "Gallery",           icon: Images     },
  { id: "expenses",    label: "Money",             icon: ReceiptText },
  { id: "documents",   label: "Docs",              icon: FileText   },
  { id: "packing",     label: "Packing",           icon: Luggage    },
  { id: "emergency",   label: "Safety",            icon: ShieldAlert },
  { id: "assignments", label: "Rooms & Seats",     icon: BedDouble  },
  { id: "settings",    label: "Trip Settings",     icon: Settings   },
];

// First 4 items live in the bottom bar; the rest go in the More drawer
const PRIMARY_COUNT = 4;

export function Layout({
  children,
  activeView,
  setActiveView,
  offline,
  topBar,
  accessMode,
}: {
  children: ReactNode;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  offline: boolean;
  topBar?: ReactNode;
  accessMode?: AccessMode;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function onViewChange(id: AppView) {
    setActiveView(id);
    setIsMoreOpen(false);
  }

  const visibleNavItems = navItems.filter((item) => {
    return true;
  });

  const moreActive = visibleNavItems.slice(PRIMARY_COUNT).some((i) => i.id === activeView);

  return (
    <div className="min-h-dvh bg-clay-canvas flex flex-col relative overflow-hidden text-clay-primary selection:bg-primary/20">

      {/* ── Ambient decorative blobs (light-mode only, below all content) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.07]"
      >
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl animate-blob" />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-pink-400 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-20 h-96 w-96 rounded-full bg-sky-400 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* ── Skip link ── */}
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1050] focus:rounded-[20px] focus:bg-clay-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-clay-primary focus:shadow-clay-card"
        href="#main"
      >
        Skip to main content
      </a>

      {/* ── Offline banner ── */}
      {offline ? (
        <div className="sticky top-0 z-[1040] border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm font-medium text-warning">
          Offline read-only mode. Recent trip data is shown.
        </div>
      ) : null}

      {/* ── Top bar – mobile only ── */}
      <div className="sticky top-0 z-[1000] bg-clay-surface border-b border-border/50 lg:hidden shadow-clay-surface">
        {topBar}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 lg:gap-8 lg:px-6 relative z-10">

        {/* ── Desktop sidebar ── */}
        <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-[260px] shrink-0 flex-col rounded-[32px] bg-clay-surface shadow-clay-card px-5 py-7 lg:flex ml-6">
          {/* Brand */}
          <div className="mb-8 px-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary opacity-60">
              Family
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-clay-primary">
              Travel
              <span className="ml-1.5 text-xl font-semibold text-clay-secondary">Companion</span>
            </h1>
          </div>
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 pb-6 custom-scrollbar">
            {visibleNavItems.map((item) => (
              <NavButton
                key={item.id}
                {...item}
                active={activeView === item.id}
                onClick={() => onViewChange(item.id)}
              />
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main
          id="main"
          className="w-full min-w-0 px-4 pb-32 pt-5 sm:px-6 lg:px-0 lg:pb-10 lg:pt-8 flex-1"
        >
          <div className="hidden lg:block mb-7">{topBar}</div>
          {children}
        </main>
      </div>

      {/* ── More drawer backdrop ── */}
      {isMoreOpen ? (
        <div
          className="fixed inset-0 z-[1040] bg-ink/20 lg:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* ── More nav drawer ── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[1045] rounded-t-[40px] bg-clay-surface shadow-clay-card transition-transform duration-300 ease-in-out lg:hidden pb-[max(env(safe-area-inset-bottom),2rem)] ${
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <h2 className="text-base font-bold text-clay-primary">More</h2>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-recessed text-clay-secondary hover:text-clay-primary transition-colors shadow-clay-pressed"
            aria-label="Close more menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {visibleNavItems.slice(PRIMARY_COUNT).map((item) => (
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

      {/* ── Mobile bottom nav dock ── */}
      <nav
        className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem))] z-[1030] mx-auto max-w-md rounded-[32px] bg-clay-surface shadow-clay-card px-2 py-2 lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="flex w-full justify-around items-end">
          {visibleNavItems.slice(0, PRIMARY_COUNT).map((item) => (
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
            className={`flex flex-col items-center justify-center gap-0.5 rounded-[24px] py-2 text-[10px] font-bold transition-all active:scale-[0.90] ${
              isMoreOpen || moreActive
                ? "text-primary"
                : "text-clay-secondary hover:text-clay-primary"
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-[16px] transition-all ${
                isMoreOpen || moreActive
                  ? "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn text-white"
                  : "text-clay-secondary"
              }`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </div>
            <span>More</span>
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
  onClick,
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
      className={`flex min-h-12 w-full items-center gap-3 rounded-[20px] px-3 text-left text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
        active
          ? "bg-clay-recessed shadow-clay-pressed text-clay-primary font-bold"
          : "text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] transition-all ${
          active
            ? "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn text-white"
            : "text-clay-secondary"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span>{label}</span>
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
  onClick,
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
      className={`flex flex-col items-center justify-center gap-0.5 rounded-[24px] py-2 text-[10px] font-bold transition-all active:scale-[0.90] ${
        active
          ? "text-primary"
          : "text-clay-secondary hover:text-clay-primary"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[16px] transition-all ${
          active
            ? "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn text-white"
            : "text-clay-secondary"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span>{label}</span>
    </button>
  );
}

// ── More drawer item ────────────────────────────────────────────────────────

function DrawerNavItem({
  icon: Icon,
  label,
  active,
  onClick,
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
      className={`flex flex-col items-center justify-center gap-1.5 rounded-[24px] p-3 text-xs font-medium transition-all active:scale-[0.94] ${
        active
          ? "bg-clay-recessed shadow-clay-pressed text-clay-primary font-bold"
          : "text-clay-secondary hover:bg-clay-recessed hover:text-clay-primary"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-[18px] transition-all ${
          active
            ? "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn text-white"
            : "bg-clay-recessed shadow-clay-surface text-clay-secondary"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
