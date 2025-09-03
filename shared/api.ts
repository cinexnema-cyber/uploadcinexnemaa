/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type VideoStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "rejected"
  | "approved";

export interface VideoRecord {
  id: string;
  title: string;
  createdAt: string;
  status: VideoStatus;
  approved: boolean;
  bio?: string | null;
  format?: "Filme" | "Série" | "Seriado" | null;
  genres?: string[] | null;
  project?: string | null;
  publicUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  uploadId?: string | null; // legacy (Mux)
  assetId?: string | null; // legacy (Mux)
  playbackId?: string | null; // legacy (Mux)
}
