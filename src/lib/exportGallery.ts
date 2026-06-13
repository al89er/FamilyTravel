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

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // Get auth token for fetch request
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("You must be logged in to export photos.");
  }

  // Get supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured.");
  }

  for (const item of mediaItems) {
    if (item.is_removed) {
      current++;
      onProgress({ current, total, message: `Skipping removed photo...` });
      continue;
    }

    onProgress({ current: current + 1, total, message: `Preparing photo ${current + 1} of ${total}...` });

    try {
      // Use standard fetch to avoid functions.invoke JSON parsing of binary blobs
      const response = await fetch(`${supabaseUrl}/functions/v1/gallery-export-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          trip_id: tripId, 
          media_item_row_id: item.id,
          export_size: "download"
        })
      });

      if (!response.ok) {
        let errorText = await response.text();
        console.error(`Export error for ${item.id} (Status ${response.status}):`, errorText);
        throw new Error(`Failed to export media item ${item.id}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        console.error(`Export error for ${item.id}: Blob size is 0`);
        throw new Error(`Received empty file for ${item.id}`);
      }
      
      if (!blob.type.startsWith("image/")) {
        console.error(`Export error for ${item.id}: Invalid blob type ${blob.type}`);
        throw new Error(`Received invalid file type ${blob.type} for ${item.id}`);
      }
      
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

      const fileType = blob.type || 'image/jpeg';
      const file = new File([blob], finalFilename, { type: fileType });
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
