import { createClient } from "@/lib/supabase/server";

export type AvailabilityShift = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  isAvailable: boolean | null;
};

export type OpenWindow = {
  id: string;
  label: string;
  closesAt: string;
  shifts: AvailabilityShift[];
};

/** Shifts in every currently-open availability window (opens_at <= now <= closes_at), with the
 * worker's own response per shift (null = hasn't responded yet). */
export async function listOpenWindowsWithShifts(workerId: string): Promise<OpenWindow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: windows } = await supabase
    .from("availability_windows")
    .select("id, label, closes_at")
    .lte("opens_at", now)
    .gte("closes_at", now)
    .order("closes_at", { ascending: true });

  if (!windows || windows.length === 0) return [];

  const windowIds = windows.map((w) => w.id);
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time, location, availability_window_id")
    .in("availability_window_id", windowIds)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: responses } = await supabase
    .from("availability")
    .select("shift_id, is_available")
    .eq("worker_id", workerId);

  const responseMap = new Map((responses ?? []).map((r) => [r.shift_id, r.is_available]));

  return windows.map((w) => ({
    id: w.id,
    label: w.label,
    closesAt: w.closes_at,
    shifts: (shifts ?? [])
      .filter((s) => s.availability_window_id === w.id)
      .map((s) => ({
        shiftId: s.id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        location: s.location,
        isAvailable: responseMap.get(s.id) ?? null,
      })),
  }));
}
