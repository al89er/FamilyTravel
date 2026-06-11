import { AccessGate, AccessStatusCard } from "./features/AuthPanel";
import { Assignments } from "./features/Assignments";
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
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const {
    activeView,
    setActiveView,
    data,
    loading,
    accessStatus,
    error,
    offline,
    role,
    accessMode,
    familySession,
    shareTokenFromUrl,
    availableTrips,
    loadAdminTrips,
    openAuthenticatedTrip,
    createTrip,
    refreshCurrentTrip,
    joinFamilyTrip,
    leaveSession,
    refreshFamilySession
  } = useAppState();

  useTheme(); // Initialize theme on app load

  function openView(view: string) {
    setActiveView(view as AppView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canEdit = accessMode === "owner" || accessMode === "organizer";

  if (!data) {
    return (
      <AccessGate
        loading={loading}
        error={error}
        accessStatus={accessStatus}
        availableTrips={availableTrips}
        shareTokenFromUrl={shareTokenFromUrl}
        onAdminAuthenticated={loadAdminTrips}
        onSelectTrip={openAuthenticatedTrip}
        onCreateTrip={createTrip}
        onFamilyJoin={joinFamilyTrip}
      />
    );
  }

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      offline={offline}
      topBar={
        <div className="flex items-center justify-between px-4 py-3 lg:px-0 lg:py-0">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-primary">{data.trip.title}</h1>
            <p className="truncate text-xs font-medium text-muted">
              {data.trip.destination} <span className="mx-1">•</span> {accessModeLabel(accessMode)}
            </p>
          </div>
        </div>
      }
    >
      {loading ? <LoadingState /> : null}
      {error ? <div className="mb-5"><ErrorState message={error} /></div> : null}
      {!loading ? (
        <>
          {activeView === "dashboard" ? <Dashboard data={data} openView={openView} canEdit={canEdit} /> : null}
          {activeView === "itinerary" ? <Itinerary data={data} familySession={familySession} canEdit={canEdit} onRefresh={refreshCurrentTrip} onRefreshFamily={refreshFamilySession} /> : null}
          {activeView === "map" ? <MapPlaces data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "documents" ? <Documents data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "expenses" ? <Expenses data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "packing" ? <Packing data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} familySession={familySession} onRefreshFamily={refreshFamilySession} /> : null}
          {activeView === "emergency" ? <Emergency data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "assignments" ? <Assignments data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "settings" ? <Settings data={data} role={role} accessMode={accessMode} familySession={familySession} onRefresh={refreshCurrentTrip} onLeave={leaveSession} /> : null}
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
    assignments: "Family Assignments",
    settings: "Settings"
  };
  return titles[view];
}

function accessModeLabel(mode: string) {
  if (mode === "owner") return "Owner mode";
  if (mode === "organizer") return "Organizer mode";
  if (mode === "family") return "Family share mode";
  return "";
}
