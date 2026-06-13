import { Images, ExternalLink, Settings as SettingsIcon } from "lucide-react";
import { AppData } from "../types";
import { AppView } from "../hooks/useAppState";
import { Card, Button, EmptyState } from "../components/ui";

export function Gallery({ data, openView }: { data: AppData; openView: (view: AppView) => void }) {
  const url = data.trip.googlePhotosAlbumUrl;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3 mb-6 px-4 lg:px-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-indigo-400 to-purple-500 shadow-clay-card text-white shrink-0">
          <Images className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-clay-primary">Trip Gallery</h2>
          <p className="text-sm font-bold text-clay-secondary">Family photos for this getaway</p>
        </div>
      </div>

      {!url ? (
        <Card className="p-6 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0">
          <EmptyState 
            title="No trip album linked yet" 
            body="Add your Google Photos shared album link in Settings." 
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={() => openView("settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Settings
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8 border-0 bg-clay-surface shadow-clay-card rounded-[32px] mx-4 lg:mx-0 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-clay-recessed shadow-clay-pressed rounded-[24px] flex items-center justify-center mb-6">
            <Images className="h-10 w-10 text-indigo-500" />
          </div>
          
          <h3 className="text-xl font-black text-clay-primary mb-2">Trip Gallery</h3>
          <p className="text-sm font-bold text-clay-secondary mb-1">
            Family photos for {data.trip.destination}
          </p>
          <p className="text-xs font-medium text-clay-secondary/80 mb-8 max-w-xs mx-auto">
            Photos are stored in Google Photos, not Supabase.
          </p>
          
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-indigo-400 to-purple-500 px-8 text-sm font-black text-white shadow-clay-btn transition-all hover:-translate-y-0.5 hover:shadow-clay-hover active:scale-95"
          >
            Open Google Photos album
            <ExternalLink className="h-4 w-4" />
          </a>

          <div className="mt-8 pt-6 border-t border-border/50 w-full max-w-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-clay-secondary/70">
              Owner-only preview. Family access will open after upload/security phases are complete.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
