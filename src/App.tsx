import { AuthPanel } from "./features/AuthPanel";
import { Dashboard } from "./features/Dashboard";
import { Documents } from "./features/Documents";
import { Emergency } from "./features/Emergency";
import { Expenses } from "./features/Expenses";
import { Itinerary } from "./features/Itinerary";
import { MapPlaces } from "./features/MapPlaces";
import { Packing } from "./features/Packing";
import { Settings } from "./features/Settings";
import { Layout } from "./components/Layout";
import { ErrorState, LoadingState } from "./components/ui";
import { useAppState, type AppView } from "./hooks/useAppState";

export default function App() {
  const { activeView, setActiveView, data, loading, error, offline, role } = useAppState();

  function openView(view: string) {
    setActiveView(view as AppView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} offline={offline}>
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-sm font-semibold text-brand-700">{data.trip.destination}</p>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{pageTitle(activeView)}</h1>
        </div>
        <AuthPanel />
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <div className="mb-5"><ErrorState message={error} /></div> : null}
      {!loading ? (
        <>
          {activeView === "dashboard" ? <Dashboard data={data} openView={openView} /> : null}
          {activeView === "itinerary" ? <Itinerary data={data} /> : null}
          {activeView === "map" ? <MapPlaces data={data} /> : null}
          {activeView === "documents" ? <Documents data={data} /> : null}
          {activeView === "expenses" ? <Expenses data={data} /> : null}
          {activeView === "packing" ? <Packing data={data} /> : null}
          {activeView === "emergency" ? <Emergency data={data} /> : null}
          {activeView === "settings" ? <Settings data={data} role={role} /> : null}
        </>
      ) : null}
    </Layout>
  );
}

function pageTitle(view: AppView) {
  const titles: Record<AppView, string> = {
    dashboard: "Family Travel Companion",
    itinerary: "Itinerary",
    map: "Map & Places",
    documents: "Documents Vault",
    expenses: "Expense Tracker",
    packing: "Packing Lists",
    emergency: "Emergency & Medical",
    settings: "Settings"
  };
  return titles[view];
}
