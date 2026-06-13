import { supabase } from "./supabase";
import JSZip from "jszip";

export interface ExportProgress {
  current: number;
  total: number;
  message: string;
}

export interface ExportResult {
  files: File[];
  failedCount: number;
}

export async function prepareExportFiles(
  tripId: string, 
  mediaItems: any[], 
  onProgress: (progress: ExportProgress) => void
): Promise<ExportResult> {
  const files: File[] = [];
  const filenameCounts: Record<string, number> = {};

  let current = 0;
  const total = mediaItems.length;
  let failedCount = 0;

  for (const item of mediaItems) {
    if (item.is_removed) {
      current++;
      onProgress({ current, total, message: `Skipping removed photo...` });
      continue;
    }

    onProgress({ current: current + 1, total, message: `Preparing photo ${current + 1} of ${total}...` });

    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      
      const { data, error } = await supabase.functions.invoke("gallery-download-media", {
        body: { tripId, mediaItemId: item.id }
      });

      if (error) {
        console.error(`Failed to download media ${item.id}:`, error);
        throw error;
      }
      
      if (data?.error) {
        console.error(`Error downloading media ${item.id}:`, data.error);
        throw new Error(data.error);
      }

      const blob = data instanceof Blob ? data : new Blob([data], { type: 'image/jpeg' });
      
      let baseFilename = item.filename || 'family-travel-photo.jpg';
      let extension = '';
      const dotIndex = baseFilename.lastIndexOf('.');
      if (dotIndex > 0) {
        extension = baseFilename.substring(dotIndex);
        baseFilename = baseFilename.substring(0, dotIndex);
      }

      let finalFilename = baseFilename + extension;
      if (filenameCounts[finalFilename]) {
        filenameCounts[finalFilename]++;
        finalFilename = `${baseFilename}(${filenameCounts[finalFilename]})${extension}`;
      } else {
        filenameCounts[finalFilename] = 1;
      }

      const file = new File([blob], finalFilename, { type: blob.type || 'image/jpeg' });
      files.push(file);
    } catch (e) {
      console.error("Error preparing file", e);
      failedCount++;
    }
    
    current++;
  }

  return { files, failedCount };
}

export async function downloadAsZip(tripName: string, files: File[]) {
  const zip = new JSZip();
  
  for (const file of files) {
    zip.file(file.name, file);
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(zipBlob);
  
  const safeName = (tripName || 'trip').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `family-travel-${safeName}-photos.zip`;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}
