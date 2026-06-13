import { Cloud, UploadCloud } from "lucide-react";
import { Card, Button } from "../components/ui";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-clay-surface shadow-clay-card rounded-[20px] ${className}`}
      {...props}
    />
  );
}

export function GalleryPhotoCardSkeleton() {
  return (
    <div className="group relative bg-clay-recessed rounded-[20px] shadow-clay-pressed overflow-hidden aspect-square flex flex-col">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );
}

export function GalleryGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 lg:px-0">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4 lg:px-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <GalleryPhotoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function GallerySetupSkeleton() {
  return (
    <Card className="mx-4 lg:mx-0 mt-8 mb-8 border border-border/40 p-6 md:p-8 relative overflow-hidden bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-[20px] shadow-sm text-indigo-500">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <Skeleton className="h-6 w-48 mb-2 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </Card>
  );
}

export function GalleryUploadSkeleton() {
  return (
    <Card className="mx-4 lg:mx-0 mb-8 p-6 md:p-8 bg-clay-recessed shadow-clay-pressed">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-clay-surface shadow-clay-card rounded-[20px] text-clay-secondary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <Skeleton className="h-6 w-40 mb-2 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <Skeleton className="h-32 w-full rounded-[24px]" />
      </div>
    </Card>
  );
}

export function GalleryPageSkeleton({ canManageGoogleConnection, canUploadPhotos }: { canManageGoogleConnection: boolean, canUploadPhotos: boolean }) {
  return (
    <div className="max-w-4xl mx-auto pb-24 pt-6 animate-in fade-in duration-500">
      <div className="mb-8 px-4 lg:px-0">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
        <Skeleton className="h-4 w-64 mt-2 rounded-md" />
      </div>

      {canManageGoogleConnection && (
        <GallerySetupSkeleton />
      )}

      {canUploadPhotos && (
        <GalleryUploadSkeleton />
      )}

      <GalleryGridSkeleton />
    </div>
  );
}
