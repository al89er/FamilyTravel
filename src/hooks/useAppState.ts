import { useEffect, useMemo, useState } from "react";
import { demoData } from "../data/demoData";
import { saveTripSnapshot } from "../lib/offline";
import {
  createAuthenticatedTrip,
  hasSupabaseConfig,
  loadAuthenticatedTrip,
  loadAuthenticatedTrips,
  loadFamilyTrip,
  signOut,
  supabase
} from "../lib/supabase";
import type { AccessMode, AppData, FamilySession, NewTripInput, TripSummary } from "../types";

export type AppView =
  | "dashboard"
  | "itinerary"
  | "map"
  | "documents"
  | "expenses"
  | "packing"
  | "emergency"
  | "settings";

export type AccessStatus = "checking" | "locked" | "loading" | "trip-select" | "empty" | "ready";

export function useAppState() {
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [familyRefreshKey, setFamilyRefreshKey] = useState(0);
  const [familySession, setFamilySession] = useState<FamilySession | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>("locked");
  const [availableTrips, setAvailableTrips] = useState<TripSummary[]>([]);

  const shareTokenFromUrl = useMemo(() => new URLSearchParams(window.location.search).get("share") ?? "", []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!data || accessStatus !== "ready") return;
    saveTripSnapshot(data);
  }, [accessStatus, data]);

  useEffect(() => {
    if (accessMode !== "family" || !familySession?.displayName || !familySession.shareToken) return;
    if (familyRefreshKey === 0) return;
    void joinFamilyTrip(familySession.displayName, familySession.shareToken);
  }, [familyRefreshKey]);

  useEffect(() => {
    async function restoreAuthenticatedSession() {
      if (!supabase) {
        setAccessStatus("locked");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setAccessStatus("locked");
        return;
      }

      await loadAdminTrips();
    }

    void restoreAuthenticatedSession();
  }, []);

  async function loadAdminTrips() {
    setLoading(true);
    setAccessStatus("loading");
    setError(null);
    setFamilySession(null);

    try {
      const trips = await loadAuthenticatedTrips();
      setAvailableTrips(trips);

      if (trips.length === 0) {
        setData(null);
        setAccessMode("locked");
        setAccessStatus("empty");
        return;
      }

      if (trips.length === 1) {
        await openAuthenticatedTrip(trips[0].id, trips);
        return;
      }

      setData(null);
      setAccessMode("locked");
      setAccessStatus("trip-select");
    } catch (err) {
      setData(null);
      setAccessMode("locked");
      setAccessStatus("locked");
      setError(err instanceof Error ? err.message : "Could not load trips for this account.");
    } finally {
      setLoading(false);
    }
  }

  async function openAuthenticatedTrip(tripId: string, knownTrips = availableTrips) {
    setLoading(true);
    setAccessStatus("loading");
    setError(null);
    setFamilySession(null);

    try {
      const tripData = await loadAuthenticatedTrip(tripId);
      const summary = knownTrips.find((trip) => trip.id === tripId);
      const role = summary?.role ?? tripData.members.find((member) => member.userId === tripData.currentUser.id)?.role ?? "organizer";
      setData(tripData);
      setAccessMode(role);
      setActiveView("dashboard");
      setAccessStatus("ready");
    } catch (err) {
      setData(null);
      setAccessMode("locked");
      setAccessStatus(knownTrips.length > 1 ? "trip-select" : "locked");
      setError(err instanceof Error ? err.message : "Could not open this trip.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentTrip() {
    if (!data || accessMode === "family") return;
    if (accessMode === "demo") {
      setData({ ...data });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await loadAuthenticatedTrip(data.trip.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh trip data.");
    } finally {
      setLoading(false);
    }
  }

  async function createTrip(input: NewTripInput) {
    setLoading(true);
    setAccessStatus("loading");
    setError(null);
    setFamilySession(null);

    try {
      const tripId = await createAuthenticatedTrip(input);
      const trips = await loadAuthenticatedTrips();
      setAvailableTrips(trips);
      await openAuthenticatedTrip(tripId, trips);
    } catch (err) {
      setData(null);
      setAccessMode("locked");
      setAccessStatus(availableTrips.length > 0 ? "trip-select" : "empty");
      setError(err instanceof Error ? err.message : "Could not create the trip.");
    } finally {
      setLoading(false);
    }
  }

  async function joinFamilyTrip(displayName: string, shareToken: string) {
    setLoading(true);
    setAccessStatus("loading");
    setError(null);

    try {
      const result = await loadFamilyTrip(displayName, shareToken);
      setData(result.data);
      setFamilySession(result.session);
      setAccessMode("family");
      setActiveView("dashboard");
      setAccessStatus("ready");
      window.history.replaceState({}, "", `${window.location.pathname}?share=${encodeURIComponent(result.session.shareToken)}`);
    } catch (err) {
      setData(null);
      setFamilySession(null);
      setAccessMode("locked");
      setAccessStatus("locked");
      setError(err instanceof Error ? err.message : "Could not load the shared trip.");
    } finally {
      setLoading(false);
    }
  }

  function startDemo() {
    setError(null);
    setFamilySession(null);
    setData(demoData);
    setAccessMode("demo");
    setActiveView("dashboard");
    setAccessStatus("ready");
  }

  async function leaveSession() {
    await signOut();
    setData(null);
    setFamilySession(null);
    setAccessMode("locked");
    setAvailableTrips([]);
    setActiveView("dashboard");
    setAccessStatus("locked");
  }

  const role = useMemo(() => {
    if (!data || accessMode === "family" || accessMode === "demo") return "organizer";
    return data.members.find((member) => member.userId === data.currentUser.id)?.role ?? "organizer";
  }, [accessMode, data]);

  return {
    activeView,
    setActiveView,
    data,
    setData,
    loading,
    accessStatus,
    error,
    setError,
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
    startDemo,
    leaveSession,
    refreshFamilySession: () => setFamilyRefreshKey((key) => key + 1),
    configured: hasSupabaseConfig
  };
}
