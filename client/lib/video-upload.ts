import { supabase } from "./supabase";

export async function uploadVideo(
  file: File,
  options?: {
    bucket?: string;
    prefix?: string;
    upsert?: boolean;
    cacheControl?: string;
  },
) {
  if (!supabase) throw new Error("Supabase não configurado no cliente");
  const bucket = options?.bucket ?? "videos";
  const prefix = options?.prefix ?? "uploads";
  const key = `${prefix}/${encodeURIComponent(file.name)}`;

  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    cacheControl: options?.cacheControl ?? "3600",
    upsert: options?.upsert ?? true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return { publicUrl: data.publicUrl, path: key, bucket };
}

export async function uploadVideoViaSignedUrl(
  file: File,
  options?: { bucket?: string; prefix?: string },
) {
  if (!supabase) throw new Error("Supabase não configurado no cliente");
  const bucket = options?.bucket ?? "videos";
  const prefix = options?.prefix ?? "uploads";

  const res = await fetch("/api/storage/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, filename: file.name, prefix }),
  });
  const cfg = await res.json();
  if (!res.ok)
    throw new Error(cfg?.message || cfg?.error || `HTTP ${res.status}`);

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(cfg.path, cfg.token, file, {
      contentType: file.type,
      upsert: true,
    });
  if (error) throw new Error(error.message);

  return {
    publicUrl: cfg.publicUrl as string,
    path: cfg.path as string,
    bucket,
  };
}
