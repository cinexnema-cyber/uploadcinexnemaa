import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined;

export function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function getUserFromRequest(req: { headers: any }) {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const auth = req.headers?.authorization as string | undefined;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}
