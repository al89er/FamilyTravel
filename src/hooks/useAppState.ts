import { useEffect, useMemo, useState } from "react";
import { demoData } from "../data/demoData";
import { loadTripSnapshot, saveTripSnapshot } from "../lib/offline";
import { hasSupabaseConfig, loadFamilyTrip, supabase } from "../lib/supabase";
import type { AppData, FamilySession } from "../types";

export type AppView =
  | "dashboard"
  | "itinerary"
  | "map"
  | "documents"
  | "expenses"
  | "packing"
  | "emergency"
  | "settings";

export function useAppState() {
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [data, setData] = useState<AppData>(() => loadTripSnapshot() ?? demoData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [familyRefreshKey, setFamilyRefreshKey] = useState(0);
  const [shareIntent] = useState(() => Boolean(new URLSearchParams(window.location.search).get("share")));
  const [familySession, setFamilySession] = useState<FamilySession | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("share") ?? "";
    const savedName = localStorage.getItem("family-travel-display-name") ?? "";
    const savedToken = localStorage.getItem("family-travel-share-token") ?? "";
    const shareToken = urlToken || savedToken;
    if (!shareToken || !savedName) return null;
    return {
      displayName: savedName,
      shareToken,
      permissions: { comments: false, votes: false, packingChecks: false }
    };
  });

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
    saveTripSnapshot(data);
  }, [data]);

  useEffect(() => {
    async function loadRemote() {
      if (!supabase || familySession) return;

      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const { data: trips, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: true })
        .limit(1);

      if (tripError) {
        setError(tripError.message);
      } else if (!trips?.length) {
        setError("No trips are available for this account yet.");
      }

      setLoading(false);
    }

    void loadRemote();
  }, []);

  useEffect(() => {
    if (!familySession?.displayName || !familySession.shareToken || !hasSupabaseConfig) return;
    const session = familySession;

    async function loadFamily() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadFamilyTrip(session.displayName, session.shareToken);
        setData(result.data);
        setFamilySession(result.session);
        localStorage.setItem("family-travel-display-name", result.session.displayName);
        localStorage.setItem("family-travel-share-token", result.session.shareToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the shared trip.");
      } finally {
        setLoading(false);
      }
    }

    void loadFamily();
  }, [familySession?.displayName, familySession?.shareToken, familyRefreshKey]);

  const role = useMemo(() => {
    return data.members.find((member) => member.profileId === data.currentUser.id)?.role ?? "organizer";
  }, [data.currentUser.id, data.members]);

  return {
    activeView,
    setActiveView,
    data,
    setData,
    loading,
    error,
    offline,
    role,
    accessMode: (familySession || shareIntent ? "family" : "admin") as "family" | "admin",
    familySession,
    setFamilySession,
    refreshFamilySession: () => setFamilyRefreshKey((key) => key + 1),
    configured: hasSupabaseConfig
  };
}
