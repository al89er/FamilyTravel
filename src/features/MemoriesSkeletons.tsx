import { BookHeart } from "lucide-react";
import { Card } from "../components/ui";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-clay-surface shadow-clay-card motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
}

export function MemoriesPhotoPreviewSkeleton() {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[16px] bg-clay-recessed shadow-clay-pressed">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

export function MemoriesNoteSkeleton() {
  return (
    <div className="mt-4 rounded-[20px] bg-clay-canvas/30 p-5 border border-border/30">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-8 rounded-[12px] shrink-0" />
        <div className="space-y-2 flex-1 mt-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-[90%] rounded-md" />
          <Skeleton className="h-4 w-[60%] rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MemoriesItinerarySkeleton() {
  return (
    <div className="mt-4 px-1">
      <Skeleton className="h-3 w-3/4 rounded-md" />
    </div>
  );
}

export function MemoriesDayCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-clay-surface shadow-clay-card rounded-[32px] w-full">
      <div className="px-5 py-4 border-b border-border/40 bg-clay-canvas/50 flex justify-between items-start gap-4">
        <div>
          <Skeleton className="h-7 w-24 rounded-md mb-2" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      </div>
      
      <div className="p-5 sm:p-6 space-y-6">
        <MemoriesItinerarySkeleton />
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MemoriesPhotoPreviewSkeleton key={i} />
          ))}
        </div>
        
        <MemoriesNoteSkeleton />
      </div>
    </Card>
  );
}

export function MemoriesPageSkeleton() {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-400 to-rose-500 shadow-clay-card text-white shrink-0">
          <BookHeart className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>

      <div className="space-y-8 px-4 lg:px-0">
        <MemoriesDayCardSkeleton />
        <MemoriesDayCardSkeleton />
      </div>
    </div>
  );
}
