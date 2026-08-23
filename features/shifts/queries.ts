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
  availabilityWindowId: string | null;
  availabilityWindowLabel: string | null;
  positions: ShiftPosition[];
};

type RawShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  published_at: string | null;
  availability_window_id: string | null;
  window: { label: string } | null;
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
      window:availability_windows(label),
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
    availabilityWindowId: s.availability_window_id,
    availabilityWindowLabel: s.window?.label ?? null,
    positions: s.links.map((l) => ({
      positionId: l.position_id,
      positionName: l.position?.name ?? "",
      headcountNeeded: l.headcount_needed,
    })),
  }));
}

export type UpcomingShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
};

export async function listUpcomingShifts(limit: number): Promise<UpcomingShift[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time, location")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(limit);

  return (
    (data as { id: string; date: string; start_time: string; end_time: string; location: string | null }[]) ?? []
  ).map((s) => ({
    id: s.id,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    location: s.location,
  }));
}

export type UnderstaffedShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  unfilledPositions: { positionName: string; assigned: number; needed: number }[];
};

type RawUnderstaffedShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  links: {
    position_id: string;
    headcount_needed: number;
    position: { name: string } | null;
  }[];
  assignments: { position_id: string }[];
};

/**
 * "Understaffed" = fewer assignments than headcount_needed for some position on an upcoming
 * shift. `assignments` is always empty today (the scheduling engine is Phase 5, not built yet),
 * so right now this surfaces every upcoming shift with any position requirement -- correct given
 * nothing has been assigned yet, and it starts reflecting real staffing automatically once Phase
 * 5 exists, no rework needed here.
 */
export async function listUnderstaffedShifts(limit: number): Promise<UnderstaffedShift[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("shifts")
    .select(
      `id, date, start_time, end_time,
      links:shift_positions!shift_positions_shift_id_fkey(position_id, headcount_needed, position:positions!shift_positions_position_id_fkey(name)),
      assignments:assignments!assignments_shift_id_fkey(position_id)`,
    )
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  return ((data as unknown as RawUnderstaffedShift[]) ?? [])
    .map((s) => {
      const unfilledPositions = s.links
        .map((l) => ({
          positionName: l.position?.name ?? "",
          assigned: s.assignments.filter((a) => a.position_id === l.position_id).length,
          needed: l.headcount_needed,
        }))
        .filter((p) => p.assigned < p.needed);
      return {
        id: s.id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        unfilledPositions,
      };
    })
    .filter((s) => s.unfilledPositions.length > 0)
    .slice(0, limit);
}
