import { createClient } from "@/lib/supabase/server";

export type QualificationRef = { id: string; name: string };

export type Position = {
  id: string;
  name: string;
  created_at: string;
  requiredQualifications: QualificationRef[];
  renewsQualifications: QualificationRef[];
};

type RawPosition = {
  id: string;
  name: string;
  created_at: string;
  requiredQualifications: { qualification: QualificationRef }[];
  renewsQualifications: { qualification: QualificationRef }[];
};

export async function listPositions(): Promise<Position[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select(
      `*,
      requiredQualifications:position_qualifications(qualification:qualifications(id, name)),
      renewsQualifications:position_renews_qualifications(qualification:qualifications(id, name))`,
    )
    .order("name");

  return ((data as unknown as RawPosition[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    requiredQualifications: p.requiredQualifications.map((r) => r.qualification),
    renewsQualifications: p.renewsQualifications.map((r) => r.qualification),
  }));
}