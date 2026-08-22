import { createClient } from "@/lib/supabase/server";

export type QualificationRef = { id: string; name: string };

export type RequiredQualification = {
  qualificationId: string;
  qualificationName: string;
  optionId: string | null;
  optionLabel: string | null;
};

export type Position = {
  id: string;
  name: string;
  created_at: string;
  requiredQualifications: RequiredQualification[];
  renewsQualifications: QualificationRef[];
};

type RawPosition = {
  id: string;
  name: string;
  created_at: string;
  requiredLinks: {
    qualification: QualificationRef;
    option: { id: string; label: string } | null;
  }[];
  renewsQualifications: { qualification: QualificationRef }[];
};

export async function listPositions(): Promise<Position[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select(
      `*,
      requiredLinks:position_qualifications(qualification:qualifications(id, name), option:qualification_options(id, label)),
      renewsQualifications:position_renews_qualifications(qualification:qualifications(id, name))`,
    )
    .order("name");

  return ((data as unknown as RawPosition[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    requiredQualifications: p.requiredLinks.map((r) => ({
      qualificationId: r.qualification.id,
      qualificationName: r.qualification.name,
      optionId: r.option?.id ?? null,
      optionLabel: r.option?.label ?? null,
    })),
    renewsQualifications: p.renewsQualifications.map((r) => r.qualification),
  }));
}