import { createClient } from "@/lib/supabase/server";

export type AppSettings = {
  expiringSoonDays: number;
};

/** app_settings is a true singleton (enforced by a unique index in the migration) -- reads the
 * one row that always exists. */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("expiring_soon_days").single();
  return { expiringSoonDays: data?.expiring_soon_days ?? 30 };
}
