import { AccessGate, AccessStatusCard } from "./features/AuthPanel";
import { Assignments } from "./features/Assignments";
import { useEffect } from "react";
import { Dashboard } from "./features/Dashboard";
import { Documents } from "./features/Documents";
import { Emergency } from "./features/Emergency";
import { Expenses } from "./features/Expenses";
import { Gallery } from "./features/Gallery";
import { Itinerary } from "./features/Itinerary";
import { MapPlaces } from "./features/MapPlaces";
import { Packing } from "./features/Packing";
import { Settings } from "./features/Settings";
import { Layout } from "./components/Layout";
import { ErrorState, LoadingState } from "./components/ui";
import { useAppState, type AppView, isValidAppView, saveLastViewForTrip } from "./hooks/useAppState";
import { useTheme } from "./hooks/useTheme";
import { Sparkles } from "lucide-react";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

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

  // Check for googlePhotos OAuth return
  useEffect(() => {
    const url = new URL(window.location.href);
    const gPhotos = url.searchParams.get("googlePhotos");
    const msg = url.searchParams.get("msg");

    if (gPhotos) {
      url.searchParams.delete("googlePhotos");
      url.searchParams.delete("msg");
      window.history.replaceState({}, "", url.toString());

      if (gPhotos === "connected") {
        alert("Google Photos connected successfully!");
      } else if (gPhotos === "error") {
        alert(`Google Photos connection failed: ${msg || "Unknown error"}`);
      }
    }
  }, []);

  function handleSetActiveView(view: string) {
    if (!isValidAppView(view)) return;
    setActiveView(view);
    if (data?.trip?.id) {
      saveLastViewForTrip(data.trip.id, view);
    }
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

  const renderTopBar = () => {
    if (activeView === "dashboard") {
      const name = data.currentUser?.displayName || data.currentUser?.username || "traveller";
      return (
        <div className="flex items-center justify-between px-4 py-3 lg:px-0 lg:py-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary mb-0.5">Holiday mode</p>
            <h1 className="truncate text-lg font-extrabold text-clay-primary leading-tight">Welcome, {name}</h1>
            <p className="truncate text-xs font-medium text-clay-secondary/80 mt-0.5">
              Ready for your getaway?
            </p>
          </div>
          <div className="ml-4 shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 shadow-clay-card text-white">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 lg:px-0 lg:py-0">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-primary">{data.trip.title}</h1>
          <p className="truncate text-xs font-medium text-muted">
            {data.trip.destination} <span className="mx-1">•</span> {accessModeLabel(accessMode)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={handleSetActiveView as (v: AppView) => void} 
      offline={offline}
      topBar={renderTopBar()}
      accessMode={accessMode}
    >
      {loading ? <LoadingState /> : null}
      {error ? <div className="mb-5"><ErrorState message={error} /></div> : null}
      {!loading ? (
        <>
          {activeView === "dashboard" ? <Dashboard data={data} openView={handleSetActiveView} canEdit={canEdit} /> : null}
          {activeView === "itinerary" ? <Itinerary data={data} familySession={familySession} canEdit={canEdit} onRefresh={refreshCurrentTrip} onRefreshFamily={refreshFamilySession} /> : null}
          {activeView === "map" ? <MapPlaces data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "documents" ? <Documents data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "expenses" ? <Expenses data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "packing" ? <Packing data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} familySession={familySession} onRefreshFamily={refreshFamilySession} /> : null}
          {activeView === "emergency" ? <Emergency data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "assignments" ? <Assignments data={data} canEdit={canEdit} onRefresh={refreshCurrentTrip} /> : null}
          {activeView === "gallery" ? <Gallery data={data} openView={handleSetActiveView} /> : null}
          {activeView === "settings" ? <Settings data={data} role={role} accessMode={accessMode} familySession={familySession} onRefresh={refreshCurrentTrip} onLeave={leaveSession} /> : null}
        </>
      ) : null}
      
      <PWAInstallPrompt />
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
    gallery: "Trip Gallery",
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
