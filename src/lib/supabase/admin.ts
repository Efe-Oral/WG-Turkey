import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: it bypasses Row Level Security, so every caller must
 * check ownership first. The server-only import stops it reaching the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
