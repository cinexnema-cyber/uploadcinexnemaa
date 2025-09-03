import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL as string | undefined;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function uploadVideoBackend(
  filePath: string,
  options?: { bucket?: string; prefix?: string; upsert?: boolean },
) {
  const bucket = options?.bucket ?? "videos";
  const prefix = options?.prefix ?? "uploads";

  const file = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const key = `${prefix}/${encodeURIComponent(fileName)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, file, { upsert: options?.upsert ?? true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  console.log("Link do vídeo:", data.publicUrl);
  return { publicUrl: data.publicUrl, path: key, bucket };
}

if (require.main === module) {
  const argPath = process.argv[2];
  if (!argPath) {
    console.error(
      "Uso: ts-node server/scripts/uploadVideo.ts <caminho-do-arquivo>",
    );
    process.exit(1);
  }
  uploadVideoBackend(argPath).catch((e) => {
    console.error("Erro no upload:", e);
    process.exit(1);
  });
}
