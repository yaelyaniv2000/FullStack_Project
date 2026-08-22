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

export async function getWorker(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "worker")
    .single();

  return (data as Profile) ?? null;
}