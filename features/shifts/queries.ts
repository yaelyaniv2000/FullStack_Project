import { createClient } from "@/lib/supabase/server";

export type ShiftPosition = {
  positionId: string;
  positionName: string;
  headcountNeeded: number;
};

export type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  publishedAt: string | null;
  positions: ShiftPosition[];
};

type RawShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  published_at: string | null;
  links: {
    position_id: string;
    headcount_needed: number;
    position: { name: string } | null;
  }[];
};

export async function listShifts(): Promise<Shift[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shifts")
    .select(
      `*,
      links:shift_positions!shift_positions_shift_id_fkey(position_id, headcount_needed, position:positions!shift_positions_position_id_fkey(name))`,
    )
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  return ((data as unknown as RawShift[]) ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    location: s.location,
    publishedAt: s.published_at,
    positions: s.links.map((l) => ({
      positionId: l.position_id,
      positionName: l.position?.name ?? "",
      headcountNeeded: l.headcount_needed,
    })),
  }));
}
