import { createClient } from "@/lib/supabase/server";

export type Qualification = {
  id: string;
  name: string;
  renewal_interval_days: number | null;
  created_at: string;
};

export async function listQualifications(): Promise<Qualification[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("qualifications").select("*").order("name");
  return (data as Qualification[]) ?? [];
}