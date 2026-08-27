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

export type PendingApprovalWindow = {
  id: string;
  label: string;
  closesAt: string;
  unpublishedCount: number;
};

/** Windows whose registration period has ended and that still have at least one unpublished
 * shift -- surfaced on the admin home screen so a completed window doesn't get forgotten before
 * it's reviewed and published (per user feedback, 2026-08-27). */
export async function listWindowsPendingApproval(limit: number): Promise<PendingApprovalWindow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: windows } = await supabase
    .from("availability_windows")
    .select("id, label, closes_at")
    .lt("closes_at", now)
    .order("closes_at", { ascending: false });
  if (!windows || windows.length === 0) return [];

  const { data: shifts } = await supabase
    .from("shifts")
    .select("availability_window_id, published_at")
    .in("availability_window_id", windows.map((w) => w.id))
    .is("published_at", null);

  const unpublishedCountByWindow = new Map<string, number>();
  for (const s of shifts ?? []) {
    if (!s.availability_window_id) continue;
    unpublishedCountByWindow.set(
      s.availability_window_id,
      (unpublishedCountByWindow.get(s.availability_window_id) ?? 0) + 1,
    );
  }

  return windows
    .map((w) => ({
      id: w.id,
      label: w.label,
      closesAt: w.closes_at,
      unpublishedCount: unpublishedCountByWindow.get(w.id) ?? 0,
    }))
    .filter((w) => w.unpublishedCount > 0)
    .slice(0, limit);
}

export type ShiftAvailabilityResponse = {
  workerId: string;
  workerName: string;
  eligiblePositionIds: string[];
};

export type WindowShiftPosition = {
  positionId: string;
  positionName: string;
  headcountNeeded: number;
};

export type WindowShiftAvailability = {
  shiftId: string;
  shiftName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  positions: WindowShiftPosition[];
  /** Only workers who marked themselves available -- per user feedback, unavailable responses
   * aren't relevant on this page. */
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
  name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  links: {
    position_id: string;
    headcount_needed: number;
    position: { name: string } | null;
  }[];
  responses: {
    worker_id: string;
    is_available: boolean;
    worker: { full_name: string } | null;
  }[];
};

type RequirementRow = { position_id: string; qualification_id: string; option_id: string | null };
type HeldQualificationRow = { worker_id: string; qualification_id: string; option_id: string | null };

/** Per-shift breakdown of who's available and which positions they qualify for -- per user
 * feedback (2026-08-25, extended 2026-08-27): "a way to see which worker marked themselves
 * available for which shift," now also showing which required position(s) each available worker
 * actually qualifies for, so the admin doesn't have to cross-reference qualifications by hand. */
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
      `id, name, date, start_time, end_time,
      links:shift_positions!shift_positions_shift_id_fkey(position_id, headcount_needed, position:positions!shift_positions_position_id_fkey(name)),
      responses:availability(worker_id, is_available, worker:profiles!availability_worker_id_fkey(full_name))`,
    )
    .eq("availability_window_id", windowId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const rawShifts = (shifts as unknown as RawWindowShift[]) ?? [];
  const positionIds = [...new Set(rawShifts.flatMap((s) => s.links.map((l) => l.position_id)))];
  const workerIds = [
    ...new Set(rawShifts.flatMap((s) => s.responses.filter((r) => r.is_available).map((r) => r.worker_id))),
  ];

  const { data: requirementRows } = await supabase
    .from("position_qualifications")
    .select("position_id, qualification_id, option_id")
    .in("position_id", positionIds.length > 0 ? positionIds : [""]);
  const requirementsByPosition = new Map<string, { qualificationId: string; optionId: string | null }[]>();
  for (const r of (requirementRows as RequirementRow[] | null) ?? []) {
    const list = requirementsByPosition.get(r.position_id) ?? [];
    list.push({ qualificationId: r.qualification_id, optionId: r.option_id });
    requirementsByPosition.set(r.position_id, list);
  }

  const { data: heldRows } = await supabase
    .from("worker_qualifications")
    .select("worker_id, qualification_id, option_id")
    .eq("status", "approved")
    .in("worker_id", workerIds.length > 0 ? workerIds : [""]);
  const heldByWorker = new Map<string, { qualificationId: string; optionId: string | null }[]>();
  for (const h of (heldRows as HeldQualificationRow[] | null) ?? []) {
    const list = heldByWorker.get(h.worker_id) ?? [];
    list.push({ qualificationId: h.qualification_id, optionId: h.option_id });
    heldByWorker.set(h.worker_id, list);
  }

  function isEligible(workerId: string, positionId: string): boolean {
    const requirements = requirementsByPosition.get(positionId) ?? [];
    const held = heldByWorker.get(workerId) ?? [];
    return requirements.every((req) =>
      held.some((h) => h.qualificationId === req.qualificationId && h.optionId === req.optionId),
    );
  }

  return {
    id: window.id,
    label: window.label,
    opensAt: window.opens_at,
    closesAt: window.closes_at,
    shifts: rawShifts.map((s) => ({
      shiftId: s.id,
      shiftName: s.name,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      positions: s.links.map((l) => ({
        positionId: l.position_id,
        positionName: l.position?.name ?? "",
        headcountNeeded: l.headcount_needed,
      })),
      responses: s.responses
        .filter((r) => r.is_available)
        .map((r) => ({
          workerId: r.worker_id,
          workerName: r.worker?.full_name ?? "",
          eligiblePositionIds: s.links
            .map((l) => l.position_id)
            .filter((positionId) => isEligible(r.worker_id, positionId)),
        })),
    })),
  };
}
