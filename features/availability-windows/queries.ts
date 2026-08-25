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

export type ShiftAvailabilityResponse = {
  workerId: string;
  workerName: string;
  isAvailable: boolean;
};

export type WindowShiftAvailability = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  responses: ShiftAvailabilityResponse[];
};

export type AvailabilityWindowDetail = {
  id: string;
  label: string;
  opensAt: string;
  closesAt: string;
  shifts: WindowShiftAvailability[];
};

type RawWindowShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  responses: {
    worker_id: string;
    is_available: boolean;
    worker: { full_name: string } | null;
  }[];
};

/** Per-shift breakdown of who responded available/unavailable for a window -- per user feedback
 * (2026-08-25): "a way to see which worker marked themselves available for which shift." */
export async function getAvailabilityWindowDetail(
  windowId: string,
): Promise<AvailabilityWindowDetail | null> {
  const supabase = await createClient();
  const { data: window } = await supabase
    .from("availability_windows")
    .select("id, label, opens_at, closes_at")
    .eq("id", windowId)
    .single();
  if (!window) return null;

  const { data: shifts } = await supabase
    .from("shifts")
    .select(
      `id, date, start_time, end_time,
      responses:availability(worker_id, is_available, worker:profiles!availability_worker_id_fkey(full_name))`,
    )
    .eq("availability_window_id", windowId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  return {
    id: window.id,
    label: window.label,
    opensAt: window.opens_at,
    closesAt: window.closes_at,
    shifts: ((shifts as unknown as RawWindowShift[]) ?? []).map((s) => ({
      shiftId: s.id,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      responses: s.responses.map((r) => ({
        workerId: r.worker_id,
        workerName: r.worker?.full_name ?? "",
        isAvailable: r.is_available,
      })),
    })),
  };
}
