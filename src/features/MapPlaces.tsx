import L from "leaflet";
import { ExternalLink, Hospital, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deletePlace, upsertPlace } from "../lib/supabase";
import type { AppData, ItineraryItem, Place, PlaceCategory, PlaceInput, Visibility } from "../types";

const placeCategories: PlaceCategory[] = ["hotel", "restaurant", "attraction", "airport", "meeting_point", "pharmacy", "hospital", "custom"];
const visibilityOptions: Visibility[] = ["shared", "planner_only", "private"];
const defaultCenter: [number, number] = [3.139, 101.6869];

type CoordinatePlace = Place & {
  latitude: number;
  longitude: number;
  routeOrder?: number;
  itineraryItem?: ItineraryItem;
};

type MapFilters = {
  date: string;
  category: "all" | PlaceCategory;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
};

export function MapPlaces({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({ date: "all", category: "all" });
  const itineraryById = useMemo(() => new Map(data.itinerary.map((item) => [item.id, item])), [data.itinerary]);
  const itineraryDates = useMemo(() => {
    return Array.from(new Set(data.itinerary.map((item) => item.date))).sort((left, right) => left.localeCompare(right));
  }, [data.itinerary]);

  const filteredPlaces = useMemo(() => {
    return data.places
      .filter((place) => {
        const itineraryItem = place.itineraryItemId ? itineraryById.get(place.itineraryItemId) : undefined;
        const matchesDate = filters.date === "all" || itineraryItem?.date === filters.date;
        const matchesCategory = filters.category === "all" || place.category === filters.category;
        return matchesDate && matchesCategory;
      })
      .sort((left, right) => {
        const leftItem = left.itineraryItemId ? itineraryById.get(left.itineraryItemId) : undefined;
        const rightItem = right.itineraryItemId ? itineraryById.get(right.itineraryItemId) : undefined;
        return (leftItem?.date ?? "").localeCompare(rightItem?.date ?? "") || (leftItem?.sortOrder ?? 9999) - (rightItem?.sortOrder ?? 9999) || left.name.localeCompare(right.name);
      });
  }, [data.places, filters, itineraryById]);

  const markerPlaces = useMemo<CoordinatePlace[]>(() => {
    return filteredPlaces.flatMap((place) => {
      const latitude = typeof place.latitude === "number" ? place.latitude : undefined;
      const longitude = typeof place.longitude === "number" ? place.longitude : undefined;
      if (latitude == null || longitude == null) return [];
      const itineraryItem = place.itineraryItemId ? itineraryById.get(place.itineraryItemId) : undefined;
      const coordinatePlace: CoordinatePlace = {
        ...place,
        latitude,
        longitude,
        routeOrder: itineraryItem?.sortOrder,
        itineraryItem
      };
      return [coordinatePlace];
    });
  }, [filteredPlaces, itineraryById]);

  const routePlaces = useMemo(() => {
    if (filters.date === "all") return [];
    return markerPlaces
      .filter((place) => place.itineraryItem?.date === filters.date)
      .sort((left, right) => (left.itineraryItem?.sortOrder ?? 9999) - (right.itineraryItem?.sortOrder ?? 9999));
  }, [filters.date, markerPlaces]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Map Places"
        eyebrow="OpenStreetMap route planning"
        action={canEdit ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" aria-hidden="true" />Add place</Button> : null}
      />
      {canEdit && showForm ? (
        <PlaceForm
          data={data}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}

      <Card className="p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Day">
            <select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}>
              <option value="all">All days</option>
              {itineraryDates.map((date) => (
                <option key={date} value={date}>{formatDateLabel(date, data.trip.dateFormat)}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as MapFilters["category"] }))}>
              <option value="all">All categories</option>
              {placeCategories.map((category) => (
                <option key={category} value={category}>{formatCategory(category)}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-[360px] min-h-[320px] w-full sm:h-[440px]">
          <LeafletTripMap places={markerPlaces} routePlaces={routePlaces} dateFormat={data.trip.dateFormat} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Badge>{filteredPlaces.length} places</Badge>
        <Badge>{markerPlaces.length} mapped</Badge>
        {filters.date !== "all" ? <Badge>{routePlaces.length > 1 ? "Route drawn" : "Add two mapped itinerary places for a route"}</Badge> : null}
      </div>

      {filteredPlaces.length === 0 ? (
        <EmptyState title="No places match the filters" body="Add hotels, restaurants, attractions, pharmacies, hospitals, and meeting points." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredPlaces.map((place) => (
            <PlaceCard key={place.id} data={data} place={place} itineraryItem={place.itineraryItemId ? itineraryById.get(place.itineraryItemId) : undefined} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeafletTripMap({ places, routePlaces, dateFormat }: { places: CoordinatePlace[]; routePlaces: CoordinatePlace[]; dateFormat: string }) {
  const center = places[0] ? ([places[0].latitude, places[0].longitude] as [number, number]) : defaultCenter;
  const routePositions = routePlaces.map((place) => [place.latitude, place.longitude] as [number, number]);

  return (
    <MapContainer center={center} zoom={places.length ? 12 : 5} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds places={places} />
      {routePositions.length > 1 ? <Polyline positions={routePositions} pathOptions={{ color: "#0f766e", weight: 4, opacity: 0.82 }} /> : null}
      {routePositions.length > 1 ? <RouteArrows places={routePlaces} /> : null}
      {places.map((place, index) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={numberedIcon(place.routeOrder ?? index + 1, place.category === "hospital")}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{place.name}</p>
              <p>{formatCategory(place.category)}</p>
              {place.itineraryItem ? <p>{formatDateLabel(place.itineraryItem.date, dateFormat)} | Stop {place.itineraryItem.sortOrder}</p> : null}
              {place.address ? <p>{place.address}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function MapBounds({ places }: { places: CoordinatePlace[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map((place) => [place.latitude, place.longitude]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }, [map, places]);

  return null;
}

function RouteArrows({ places }: { places: CoordinatePlace[] }) {
  return (
    <>
      {places.slice(0, -1).map((place, index) => {
        const next = places[index + 1];
        const midpoint: [number, number] = [(place.latitude + next.latitude) / 2, (place.longitude + next.longitude) / 2];
        return <Marker key={`${place.id}-${next.id}`} position={midpoint} interactive={false} icon={arrowIcon(bearing(place, next))} />;
      })}
    </>
  );
}

function PlaceCard({ data, place, itineraryItem, canEdit, onRefresh }: { data: AppData; place: Place; itineraryItem?: ItineraryItem; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this place?")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlace(data.trip.id, place.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete place.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <PlaceForm data={data} place={place} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-800">
          {place.category === "hospital" ? <Hospital className="h-5 w-5" /> : <MapPinned className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{place.name}</h3>
            <Badge>{formatCategory(place.category)}</Badge>
            <Badge>{place.visibility.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{place.address || "No address saved"}</p>
          {itineraryItem ? <p className="mt-1 text-xs text-slate-500">{formatDateLabel(itineraryItem.date, data.trip.dateFormat)} | Stop {itineraryItem.sortOrder}: {itineraryItem.title}</p> : null}
          {place.latitude != null && place.longitude != null ? <p className="mt-1 text-xs text-slate-500">{place.latitude}, {place.longitude}</p> : <p className="mt-1 text-xs text-amber-700">No coordinates saved. This place appears in the list only.</p>}
          {place.notes ? <p className="mt-2 text-sm text-slate-700">{place.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => window.open(googleMapsUrl(place), "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />Open in Google Maps
            </Button>
            {canEdit ? (
              <>
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
              </>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function PlaceForm({ data, place, onSaved, onCancel }: { data: AppData; place?: Place; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<PlaceInput>({
    name: place?.name ?? "",
    category: place?.category ?? "custom",
    address: place?.address ?? "",
    latitude: place?.latitude,
    longitude: place?.longitude,
    visibility: place?.visibility ?? data.trip.defaultVisibility,
    notes: place?.notes,
    itineraryItemId: place?.itineraryItemId
  });
  const [searchQuery, setSearchQuery] = useState(place?.name ?? "");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const selectedSearchQuery = useRef("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    if (query === selectedSearchQuery.current) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "5"
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        });
        if (!response.ok) throw new Error("Place search is temporarily unavailable.");
        const results = (await response.json()) as NominatimResult[];
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setSearchError(err instanceof Error ? err.message : "Could not search places.");
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

  function update<K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectSearchResult(result: NominatimResult) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const name = (result.name || result.display_name.split(",")[0] || "").trim();
    setForm((current) => ({
      ...current,
      name: name || current.name,
      address: result.display_name,
      latitude: Number.isFinite(latitude) ? latitude : current.latitude,
      longitude: Number.isFinite(longitude) ? longitude : current.longitude
    }));
    selectedSearchQuery.current = result.display_name;
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setSearchError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Place name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertPlace(data.trip.id, { ...form, name: form.name.trim(), address: form.address.trim() }, place?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save place.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <div className="space-y-2 md:col-span-2">
          <Field label="Search place">
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
              placeholder="Search a hotel, restaurant, landmark, or address"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          <p className="text-xs text-slate-500">Search is powered by OpenStreetMap Nominatim. Please verify coordinates before travel.</p>
          {searchLoading ? <p className="text-sm text-slate-600">Searching places...</p> : null}
          {searchError ? <p className="text-sm text-red-700">{searchError}</p> : null}
          {searchResults.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {searchResults.map((result) => (
                <button
                  className="block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-slate-50 focus:bg-slate-50"
                  key={`${result.osm_type ?? "place"}-${result.osm_id ?? result.place_id ?? result.display_name}`}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                >
                  <span className="block text-sm font-semibold text-slate-900">{result.name || result.display_name.split(",")[0]}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{result.display_name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Field label="Name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
        <Field label="Category"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value as PlaceCategory)}>{placeCategories.map((category) => <option key={category} value={category}>{formatCategory(category)}</option>)}</select></Field>
        <Field label="Visibility"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.visibility} onChange={(event) => update("visibility", event.target.value as Visibility)}>{visibilityOptions.map((visibility) => <option key={visibility} value={visibility}>{visibility.replace("_", " ")}</option>)}</select></Field>
        <Field label="Linked itinerary item"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}><option value="">None</option>{data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.date} - {item.title}</option>)}</select></Field>
        <Field label="Address"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input type="number" min="-90" max="90" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.latitude ?? ""} onChange={(event) => update("latitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
          <Field label="Longitude"><input type="number" min="-180" max="180" step="0.0000001" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.longitude ?? ""} onChange={(event) => update("longitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
        </div>
        <Field label="Notes"><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function numberedIcon(number: number, isHospital: boolean) {
  const color = isHospital ? "#b91c1c" : "#0f766e";
  return L.divIcon({
    className: "",
    html: `<div class="map-numbered-marker" style="background:${color}">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

function arrowIcon(angle: number) {
  return L.divIcon({
    className: "",
    html: `<div class="map-route-arrow" style="transform: rotate(${angle}deg)">&#9650;</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function bearing(from: CoordinatePlace, to: CoordinatePlace) {
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function googleMapsUrl(place: Place) {
  const query = place.latitude != null && place.longitude != null ? `${place.latitude},${place.longitude}` : `${place.name} ${place.address}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatCategory(category: string) {
  return category.replace("_", " ");
}

function formatDateLabel(date: string, _dateFormat: string) {
  if (!date) return "No date";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
