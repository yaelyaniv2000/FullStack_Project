import { createClient } from "@/lib/supabase/server";

export type AvailabilityWindow = {
  id: string;
  label: string;
  opensAt: string;
  closesAt: string;
};

export async function listAvailabilityWindows(): Promise<AvailabilityWindow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_windows")
    .select("*")
    .order("opens_at", { ascending: false });

  return ((data ?? []) as { id: string; label: string; opens_at: string; closes_at: string }[]).map(
    (w) => ({
      id: w.id,
      label: w.label,
      opensAt: w.opens_at,
      closesAt: w.closes_at,
    }),
  );
}
