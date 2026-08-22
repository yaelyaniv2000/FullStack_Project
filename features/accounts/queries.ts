import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export async function listWorkers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", { ascending: false });

  return (data as Profile[]) ?? [];
}