import { useEffect, useMemo, useState } from "react";
import { demoData } from "../data/demoData";
import { loadTripSnapshot, saveTripSnapshot } from "../lib/offline";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import type { AppData } from "../types";

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
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

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
      if (!supabase) return;

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

  const role = useMemo(() => {
    return data.members.find((member) => member.profileId === data.currentUser.id)?.role ?? "viewer";
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
    configured: hasSupabaseConfig
  };
}
