import { Hospital, MapPinned } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

export function MapPlaces({ data }: { data: AppData }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Map Places" eyebrow="Provider-ready abstraction" />
      <Card className="overflow-hidden">
        <div className="flex min-h-[260px] items-center justify-center bg-[linear-gradient(135deg,#dbeafe_0%,#ecfdf5_55%,#fff7ed_100%)] p-5 text-center">
          <div>
            <MapPinned className="mx-auto h-10 w-10 text-brand-700" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-900">Map provider placeholder</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-700">
              Places are stored with optional coordinates. The MapProvider component can be replaced with Google Maps or Mapbox without changing trip data.
            </p>
          </div>
        </div>
      </Card>

      {data.places.length === 0 ? (
        <EmptyState title="No places saved" body="Add hotels, restaurants, attractions, pharmacies, hospitals, and meeting points." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.places.map((place) => (
            <Card key={place.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-800">
                  {place.category === "hospital" ? <Hospital className="h-5 w-5" /> : <MapPinned className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{place.name}</h3>
                    <Badge>{place.category.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{place.address}</p>
                  {place.notes ? <p className="mt-2 text-sm text-slate-700">{place.notes}</p> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
