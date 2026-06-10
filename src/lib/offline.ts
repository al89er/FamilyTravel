import type { AppData } from "../types";

const CACHE_KEY = "family-travel-current-trip";

export function saveTripSnapshot(data: AppData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
}

export function loadTripSnapshot(): AppData | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { data: AppData };
    return parsed.data;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}
