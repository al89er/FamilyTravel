import { useEffect, useState, useMemo, useCallback } from "react";
import { AppData, TripGalleryMediaItem } from "../types";
import { Card, EmptyState, LoadingState } from "../components/ui";
import { BookHeart, CalendarDays, ImageIcon } from "lucide-react";
import { listTripGalleryMediaItems } from "../lib/supabase";
import { GalleryThumbnail } from "./Gallery";
import { GalleryLightbox } from "./GalleryLightbox";

interface TripDay {
  dayNumber: number;
  dateStr: string;
  items: TripGalleryMediaItem[];
}

export function Memories({ data, accessMode }: { data: AppData; accessMode: string }) {
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<TripGalleryMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<TripGalleryMediaItem[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchItems() {
      if (!data.trip.id) return;
      setLoading(true);
      setError(null);
      try {
        const items = await listTripGalleryMediaItems(data.trip.id);
        if (!active) return;
        // Filter out removed items
        const visibleItems = items.filter(item => !item.is_removed);
        setMediaItems(visibleItems);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load memories.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchItems();
    return () => { active = false; };
  }, [data.trip.id]);

  // Grouping logic
  const { tripDays, unsortedItems, allSortedItemsForLightbox } = useMemo(() => {
    // Generate trip dates array using UTC to prevent local timezone shifts
    const start = new Date(`${data.trip.startDate}T00:00:00Z`);
    const end = new Date(`${data.trip.endDate}T00:00:00Z`);
    
    // Safety check for invalid dates
    const tripDaysMap = new Map<string, TripDay>();
    const tripDaysArr: TripDay[] = [];
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      let current = new Date(start);
      let dayNum = 1;
      // Generate up to 100 days to prevent infinite loops from bad data
      while (current <= end && dayNum <= 100) {
        const dateStr = current.toISOString().split("T")[0];
        const dayObj = { dayNumber: dayNum, dateStr, items: [] };
        tripDaysMap.set(dateStr, dayObj);
        tripDaysArr.push(dayObj);
        
        current.setUTCDate(current.getUTCDate() + 1);
        dayNum++;
      }
    }

    const unsorted: TripGalleryMediaItem[] = [];
    const sortedTimelineItems: TripGalleryMediaItem[] = [];

    // Assign items to days based on memoryDate
    mediaItems.forEach(item => {
      // memoryDate logic: takenAt (EXIF) -> createdAt (fallback)
      const dateStringToUse = item.takenAt || item.createdAt;
      
      if (!dateStringToUse) {
        unsorted.push(item);
        return;
      }

      // We extract just the YYYY-MM-DD part based on the local/stored timezone format
      // E.g., '2026-08-22T14:30:00Z' -> '2026-08-22'
      const dateStr = dateStringToUse.split("T")[0];

      if (tripDaysMap.has(dateStr)) {
        tripDaysMap.get(dateStr)!.items.push(item);
      } else {
        unsorted.push(item);
      }
    });

    // Sort items within each day by time
    tripDaysArr.forEach(day => {
      day.items.sort((a, b) => {
        const timeA = new Date(a.takenAt || a.createdAt).getTime();
        const timeB = new Date(b.takenAt || b.createdAt).getTime();
        return timeA - timeB;
      });
      sortedTimelineItems.push(...day.items);
    });

    // Sort unsorted items as well
    unsorted.sort((a, b) => {
      const timeA = new Date(a.takenAt || a.createdAt).getTime();
      const timeB = new Date(b.takenAt || b.createdAt).getTime();
      return timeA - timeB;
    });
    sortedTimelineItems.push(...unsorted);

    return { 
      tripDays: tripDaysArr, 
      unsortedItems: unsorted, 
      allSortedItemsForLightbox: sortedTimelineItems 
    };
  }, [data.trip.startDate, data.trip.endDate, mediaItems]);

  const openLightbox = useCallback((item: TripGalleryMediaItem) => {
    // Find index of the item in the flat array
    const index = allSortedItemsForLightbox.findIndex(m => m.id === item.id);
    if (index >= 0) {
      setLightboxItems(allSortedItemsForLightbox);
      setLightboxIndex(index);
      setIsLightboxOpen(true);
    }
  }, [allSortedItemsForLightbox]);

  const isOwner = accessMode === "owner";
  
  // No-op for timeline, removing is done in Gallery tab for now
  const handleRemoveMediaItem = async (id: string) => {
    alert("Removing photos from the timeline is not yet supported. Please use the Gallery tab.");
  };

  function fmtDateLong(d: string): string {
    if (!d) return d;
    const [y, m, day] = d.split("-");
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
    return dt.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  }

  // Count days that have at least one photo
  const daysWithPhotos = tripDays.filter(day => day.items.length > 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-400 to-rose-500 shadow-clay-card text-white shrink-0">
          <BookHeart className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-clay-primary">Trip Memories</h2>
          <p className="text-sm font-bold text-clay-secondary">Relive your trip day by day</p>
        </div>
      </div>

      {error ? (
        <div className="mx-4 lg:mx-0 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200">
          {error}
        </div>
      ) : loading ? (
        <div className="py-12">
          <LoadingState label="Loading your memories..." />
        </div>
      ) : mediaItems.length === 0 ? (
        <EmptyState 
          icon={<BookHeart className="h-10 w-10 text-pink-400" />} 
          title="No memories yet" 
          body="Photos will appear here grouped by day once they are uploaded to the Gallery." 
        />
      ) : (
        <div className="space-y-8 px-4 lg:px-0">
          {daysWithPhotos.length === 0 && unsortedItems.length === 0 ? (
             <EmptyState 
               icon={<CalendarDays className="h-10 w-10 text-clay-secondary/40" />} 
               title="No matching days" 
               body="Could not group photos by trip days." 
             />
          ) : (
            <>
              {tripDays.map(day => {
                // Render all days, even empty ones? The user said:
                // "If a specific day has no photos: Show a subtle empty state inside that day"
                return (
                  <Card key={day.dateStr} className="overflow-hidden border-0 bg-clay-surface shadow-clay-card rounded-[32px]">
                    <div className="px-5 py-4 border-b border-border/40 bg-clay-canvas/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-clay-primary">Day {day.dayNumber}</h3>
                          <p className="text-sm font-bold text-clay-secondary mt-0.5">{fmtDateLong(day.dateStr)}</p>
                        </div>
                        {/* Could put an itinerary summary here later */}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {day.items.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                          {day.items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => openLightbox(item)}
                              className="group relative aspect-square overflow-hidden rounded-[16px] bg-clay-recessed focus:outline-none focus:ring-2 focus:ring-primary shadow-clay-pressed"
                            >
                              <GalleryThumbnail item={item} tripId={data.trip.id} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm font-medium text-clay-secondary/60">
                          No photos for this day yet.
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              {unsortedItems.length > 0 && (
                <div className="pt-8">
                  <h4 className="text-lg font-extrabold text-clay-primary px-2 mb-4">Outside trip dates</h4>
                  <Card className="overflow-hidden border-0 bg-clay-surface shadow-clay-card rounded-[32px] p-5">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {unsortedItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => openLightbox(item)}
                          className="group relative aspect-square overflow-hidden rounded-[16px] bg-clay-recessed focus:outline-none focus:ring-2 focus:ring-primary shadow-clay-pressed"
                        >
                          <GalleryThumbnail item={item} tripId={data.trip.id} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reused Gallery Lightbox */}
      <GalleryLightbox
        tripId={data.trip.id}
        mediaItems={lightboxItems}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        isOwner={isOwner}
        onRemoveMediaItem={handleRemoveMediaItem}
      />
    </div>
  );
}
