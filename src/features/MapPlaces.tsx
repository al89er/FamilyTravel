import L from "leaflet";
import { AlertTriangle, ExternalLink, Hospital, MapPinned, Pencil, Plus, Trash2, Route, Star, Map as MapIcon, Bed, Utensils, Palmtree, Plane, Users, HeartPulse } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass, Modal, OptionChips, SegmentedControl } from "../components/ui";
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
    return [...markerPlaces].sort(compareRoutePlaces);
  }, [markerPlaces]);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title="Explore"
        eyebrow="Interactive map and destination guide"
        action={canEdit ? <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" aria-hidden="true" />Add place</Button> : null}
      />
      {canEdit ? (
        <PlaceForm
          isOpen={showForm}
          data={data}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await onRefresh?.();
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4 mb-4">
        {/* Day filter chips */}
        <div className="flex flex-wrap gap-2 items-center bg-clay-surface p-2.5 rounded-[24px] shadow-clay-card w-fit">
          <span className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary px-2">Day</span>
          <FilterChip active={filters.date === "all"} onClick={() => setFilters(c => ({ ...c, date: "all" }))}>All</FilterChip>
          {itineraryDates.map((date) => (
            <FilterChip key={date} active={filters.date === date} onClick={() => setFilters(c => ({ ...c, date }))}>
              {formatDateLabel(date, data.trip.dateFormat).split(',')[0]}
            </FilterChip>
          ))}
        </div>
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 items-center bg-clay-surface p-2.5 rounded-[24px] shadow-clay-card w-fit">
          <span className="text-[10px] font-bold uppercase tracking-widest text-clay-secondary px-2">Type</span>
          <FilterChip active={filters.category === "all"} onClick={() => setFilters(c => ({ ...c, category: "all" }))}>All</FilterChip>
          {placeCategories.map((category) => (
            <FilterChip key={category} active={filters.category === category} onClick={() => setFilters(c => ({ ...c, category }))}
            >
              {formatCategory(category)}
            </FilterChip>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0 relative border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
        <div className="h-[360px] min-h-[320px] w-full sm:h-[440px] relative">
          <LeafletTripMap places={markerPlaces} routePlaces={routePlaces} dateFormat={data.trip.dateFormat} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-[16px] bg-clay-recessed shadow-clay-pressed px-4 py-2 text-xs font-bold text-primary">
          <MapIcon className="h-3.5 w-3.5" />
          {markerPlaces.length} mapped
        </div>
        {routePlaces.length > 1 ? (
          <div className="flex items-center gap-1.5 rounded-[16px] bg-sky-100 shadow-clay-pressed px-4 py-2 text-xs font-bold text-sky-700">
            <Route className="h-3.5 w-3.5" />
            Route drawn
          </div>
        ) : null}
      </div>

      {filteredPlaces.length === 0 ? (
        <EmptyState 
          icon={<MapPinned className="h-8 w-8" />}
          title="Add your first place" 
          body="Hotels, restaurants, attractions, pharmacies, and meeting points will appear here." 
        />
      ) : (
        <div className="space-y-4 mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-clay-secondary flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> 
              {filters.date !== "all" ? "Today's Route" : "Trip Stops"}
            </h3>
            <div className="h-px flex-1 bg-border/40 ml-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {filteredPlaces.map((place, idx) => (
              <PlaceCard key={place.id} data={data} place={place} itineraryItem={place.itineraryItemId ? itineraryById.get(place.itineraryItemId) : undefined} canEdit={canEdit} onRefresh={onRefresh} listIndex={idx + 1} />
            ))}
          </div>
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
      {routePositions.length > 1 ? <Polyline positions={routePositions} pathOptions={{ color: "#7C3AED", weight: 4, opacity: 0.82 }} /> : null}
      {routePositions.length > 1 ? <RouteArrows places={routePlaces} /> : null}
      {places.map((place, index) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={numberedIcon(place.routeOrder ?? index + 1, place.category === "hospital")}
        >
          <Popup>
            <div className="space-y-1 font-sans">
              <p className="font-bold text-clay-primary text-sm">{place.name}</p>
              <p className="text-xs text-clay-secondary uppercase font-semibold">{formatCategory(place.category)}</p>
              {place.itineraryItem ? <p className="text-xs text-primary font-medium">{formatDateLabel(place.itineraryItem.date, dateFormat)} | Stop {place.itineraryItem.sortOrder}</p> : null}
              {place.address ? <p className="text-xs mt-1">{place.address}</p> : null}
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

function compareRoutePlaces(left: CoordinatePlace, right: CoordinatePlace) {
  return (
    (left.itineraryItem?.date ?? "").localeCompare(right.itineraryItem?.date ?? "") ||
    (left.routeOrder ?? 9999) - (right.routeOrder ?? 9999) ||
    left.name.localeCompare(right.name)
  );
}

function PlaceCard({ data, place, itineraryItem, canEdit, onRefresh, listIndex }: { data: AppData; place: Place; itineraryItem?: ItineraryItem; canEdit: boolean; onRefresh?: () => Promise<void>; listIndex: number }) {
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

  const isHospital = place.category === "hospital";
  const isPharmacy = place.category === "pharmacy";
  const isHotel = place.category === "hotel";
  const isRestaurant = place.category === "restaurant";
  const isAttraction = place.category === "attraction";
  const isAirport = place.category === "airport";
  const isMeeting = place.category === "meeting_point";

  let icon = <MapPinned className="h-8 w-8 text-white" />;
  let orbClass = "bg-gradient-to-br from-slate-400 to-slate-600";
  let badgeTone = "slate";
  let bubbleClass = "bg-slate-700";

  if (isHospital) { icon = <Hospital className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-red-400 to-red-600"; badgeTone = "red"; bubbleClass = "bg-red-700"; }
  else if (isPharmacy) { icon = <HeartPulse className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-emerald-400 to-teal-600"; badgeTone = "emerald"; bubbleClass = "bg-teal-700"; }
  else if (isHotel) { icon = <Bed className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-indigo-400 to-indigo-600"; badgeTone = "indigo"; bubbleClass = "bg-indigo-700"; }
  else if (isRestaurant) { icon = <Utensils className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-amber-400 to-orange-500"; badgeTone = "amber"; bubbleClass = "bg-orange-600"; }
  else if (isAttraction) { icon = <Palmtree className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-emerald-400 to-emerald-600"; badgeTone = "emerald"; bubbleClass = "bg-emerald-700"; }
  else if (isAirport) { icon = <Plane className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-sky-400 to-blue-600"; badgeTone = "sky"; bubbleClass = "bg-blue-700"; }
  else if (isMeeting) { icon = <Users className="h-8 w-8 text-white" />; orbClass = "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]"; badgeTone = "brand"; bubbleClass = "bg-[#6D28D9]"; }

  return (
    <>
      <Card className="relative overflow-hidden group hover:-translate-y-1 hover:shadow-clay-hover transition-all border-0 bg-clay-surface shadow-clay-card rounded-[32px] p-5 sm:p-6">
        <div className="flex gap-4 sm:gap-6">
          <div className={`relative shrink-0 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[20px] sm:rounded-[24px] shadow-clay-btn ${orbClass}`}>
            {icon}
            <div className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full ${bubbleClass} text-[10px] font-bold text-white shadow-sm ring-2 ring-clay-surface`}>
              {listIndex}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-clay-primary truncate">{place.name}</h3>
              <Badge tone={badgeTone as any} className="capitalize text-[10px] shadow-sm">{formatCategory(place.category)}</Badge>
              {place.visibility !== "shared" && <Badge tone="zinc" className="text-[10px] shadow-sm">{place.visibility.replace("_", " ")}</Badge>}
            </div>
            <p className="mt-1 text-sm font-medium text-clay-secondary line-clamp-2 leading-relaxed">{place.address || "No address saved"}</p>
            {itineraryItem ? (
              <p className="mt-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                {formatDateLabel(itineraryItem.date, data.trip.dateFormat).split(',')[0]} · Stop {itineraryItem.sortOrder}
              </p>
            ) : null}
            
            {place.latitude != null && place.longitude != null ? null : (
              <div className="mt-3 flex w-fit items-center gap-2 rounded-[14px] bg-clay-recessed px-3 py-2 shadow-clay-pressed">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">No coordinates — list only</p>
              </div>
            )}
            
            {place.notes ? (
              <p className="mt-3 text-sm text-clay-secondary bg-clay-recessed shadow-clay-pressed p-3.5 rounded-[16px]">
                {place.notes}
              </p>
            ) : null}
            
            <div className="mt-4 flex flex-wrap gap-2 pt-2">
              <Button variant="ghost" className="h-9 text-xs font-bold uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/15" onClick={() => window.open(googleMapsUrl(place), "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Maps
              </Button>
              {canEdit ? (
                <>
                  <Button variant="ghost" className="h-9 text-xs font-bold uppercase tracking-wider text-clay-secondary bg-clay-recessed shadow-clay-pressed hover:bg-clay-recessed/80" disabled={busy} onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Edit
                  </Button>
                  <Button variant="ghost" className="h-9 text-xs font-bold uppercase tracking-wider text-danger bg-danger/5 hover:bg-danger/15" disabled={busy} onClick={() => void remove()}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Delete
                  </Button>
                </>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
          </div>
        </div>
      </Card>
      {canEdit && (
        <PlaceForm
          isOpen={editing}
          data={data}
          place={place}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onRefresh?.();
          }}
        />
      )}
    </>
  );
}

function PlaceForm({ isOpen, data, place, onSaved, onCancel }: { isOpen: boolean; data: AppData; place?: Place; onSaved: () => Promise<void>; onCancel: () => void }) {
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
    <Modal isOpen={isOpen} onClose={onCancel} title={place ? "Edit Destination" : "Add a Place"}>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
        <div className="space-y-2 md:col-span-2">
          <Field label="Search place">
            <input
              className={formInputClass}
              placeholder="Search a hotel, restaurant, landmark, or address"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          <p className="text-[11px] text-clay-secondary font-medium uppercase tracking-wider ml-1">Search powered by OpenStreetMap.</p>
          {searchLoading ? <p className="text-sm font-semibold text-primary ml-1">Searching...</p> : null}
          {searchError ? <p className="text-sm font-semibold text-danger ml-1">{searchError}</p> : null}
          
          {searchResults.length ? (
            <div className="overflow-hidden rounded-[24px] bg-clay-recessed shadow-clay-pressed mt-2">
              {searchResults.map((result) => (
                <button
                  className="block w-full border-b border-border/30 px-5 py-3.5 text-left last:border-b-0 hover:bg-primary/5 focus:bg-primary/10 transition-colors"
                  key={`${result.osm_type ?? "place"}-${result.osm_id ?? result.place_id ?? result.display_name}`}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                >
                  <span className="block text-sm font-bold text-clay-primary">{result.name || result.display_name.split(",")[0]}</span>
                  <span className="mt-1 block text-xs font-medium text-clay-secondary truncate">{result.display_name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Field label="Name *"><input className={formInputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required /></Field>
        <div className="md:col-span-2">
          <Field label="Category">
            <OptionChips
              options={placeCategories.map(c => ({ value: c, label: formatCategory(c) }))}
              value={form.category}
              onChange={(v) => update("category", v)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Visibility">
            <SegmentedControl
              options={visibilityOptions.map(v => ({ value: v, label: v.replace("_", " ") }))}
              value={form.visibility}
              onChange={(v) => update("visibility", v)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Linked itinerary item">
            <select className={formSelectClass} value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}>
              <option value="">None</option>
              {data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.date} - {item.title}</option>)}
            </select>
          </Field>
        </div>
        <div className="md:col-span-2"><Field label="Address"><input className={formInputClass} value={form.address} onChange={(event) => update("address", event.target.value)} /></Field></div>
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Field label="Latitude"><input type="number" min="-90" max="90" step="0.0000001" className={formInputClass} value={form.latitude ?? ""} onChange={(event) => update("latitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
          <Field label="Longitude"><input type="number" min="-180" max="180" step="0.0000001" className={formInputClass} value={form.longitude ?? ""} onChange={(event) => update("longitude", event.target.value ? Number(event.target.value) : undefined)} /></Field>
        </div>
        <div className="md:col-span-2"><Field label="Notes"><textarea className={formTextareaClass} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} /></Field></div>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2 pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={busy}>Save destination</Button>
        </div>
      </form>
    </Modal>
  );
}

function numberedIcon(number: number, isHospital: boolean) {
  const color = isHospital ? "#dc2626" : "#7C3AED";
  return L.divIcon({
    className: "",
    html: `<div class="map-numbered-marker shadow-sm" style="background:${color}">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

function arrowIcon(angle: number) {
  return L.divIcon({
    className: "",
    html: `<div class="map-route-arrow text-primary" style="transform: rotate(${angle}deg)">&#9650;</div>`,
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

function FilterChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[14px] px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
        active
          ? "bg-primary text-white shadow-clay-button"
          : "bg-clay-recessed text-clay-secondary shadow-clay-pressed hover:bg-clay-surface hover:shadow-clay-surface"
      }`}
    >
      {children}
    </button>
  );
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
