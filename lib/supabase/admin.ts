import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role client — bypasses RLS entirely. Only ever use this for deliberate admin
 * operations (e.g. auth.admin.createUser) that genuinely need to act outside RLS, never as a
 * general-purpose data client. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}