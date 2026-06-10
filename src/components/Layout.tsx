import {
  CalendarDays,
  FileText,
  Home,
  Luggage,
  Map,
  ReceiptText,
  Settings,
  ShieldAlert
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppView } from "../hooks/useAppState";

const navItems: Array<{ id: AppView; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "itinerary", label: "Itinerary", icon: CalendarDays },
  { id: "map", label: "Map", icon: Map },
  { id: "documents", label: "Docs", icon: FileText },
  { id: "expenses", label: "Money", icon: ReceiptText },
  { id: "packing", label: "Packing", icon: Luggage },
  { id: "emergency", label: "Safety", icon: ShieldAlert },
  { id: "settings", label: "Settings", icon: Settings }
];

export function Layout({
  children,
  activeView,
  setActiveView,
  offline
}: {
  children: ReactNode;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  offline: boolean;
}) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3" href="#main">
        Skip to main content
      </a>
      {offline ? (
        <div className="sticky top-0 z-40 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
          Offline read-only mode. Recent trip data is shown from this device.
        </div>
      ) : null}
      <div className="mx-auto flex min-h-dvh max-w-7xl lg:gap-6 lg:px-6">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block">
          <div className="mb-8">
            <p className="text-sm font-semibold text-brand-700">Family Travel</p>
            <h1 className="text-2xl font-bold text-ink">Companion</h1>
          </div>
          <nav className="space-y-1" aria-label="Primary">
            {navItems.map((item) => (
              <NavButton key={item.id} {...item} active={activeView === item.id} onClick={() => setActiveView(item.id)} />
            ))}
          </nav>
        </aside>

        <main id="main" className="w-full px-4 pb-28 pt-5 sm:px-6 lg:px-0 lg:pb-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => (
            <MobileNavButton key={item.id} {...item} active={activeView === item.id} onClick={() => setActiveView(item.id)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  id,
  label,
  icon: Icon,
  active,
  onClick
}: {
  id: AppView;
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {label}
      <span className="sr-only">{id}</span>
    </button>
  );
}

function MobileNavButton({
  label,
  icon: Icon,
  active,
  onClick
}: {
  id: AppView;
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-medium transition ${
        active ? "bg-brand-50 text-brand-900" : "text-slate-600"
      }`}
    >
      <Icon className="mb-0.5 h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
