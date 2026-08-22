import { createClient } from "@/lib/supabase/server";

export type QualificationOption = {
  id: string;
  label: string;
  sort_order: number;
};

export type Qualification = {
  id: string;
  name: string;
  renewal_interval_days: number | null;
  created_at: string;
  options: QualificationOption[];
};

export async function listQualifications(): Promise<Qualification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qualifications")
    .select("*, options:qualification_options(id, label, sort_order)")
    .order("name");

  return ((data as (Qualification & { options: QualificationOption[] })[]) ?? []).map((q) => ({
    ...q,
    options: [...q.options].sort((a, b) => a.sort_order - b.sort_order),
  }));
}