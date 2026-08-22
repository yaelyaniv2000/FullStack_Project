import { createClient } from "@/lib/supabase/server";

export type TemplatePosition = {
  positionId: string;
  positionName: string;
  headcountNeeded: number;
};

export type ShiftTemplate = {
  id: string;
  name: string;
  created_at: string;
  positions: TemplatePosition[];
};

type RawShiftTemplate = {
  id: string;
  name: string;
  created_at: string;
  links: {
    position_id: string;
    headcount_needed: number;
    position: { name: string } | null;
  }[];
};

export async function listShiftTemplates(): Promise<ShiftTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shift_templates")
    .select(
      `*,
      links:shift_template_positions(position_id, headcount_needed, position:positions(name))`,
    )
    .order("name");

  return ((data as unknown as RawShiftTemplate[]) ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    created_at: t.created_at,
    positions: t.links.map((l) => ({
      positionId: l.position_id,
      positionName: l.position?.name ?? "",
      headcountNeeded: l.headcount_needed,
    })),
  }));
}
