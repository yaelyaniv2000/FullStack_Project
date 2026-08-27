import { createClient } from "@/lib/supabase/server";
import { listWorkerQualifications } from "@/features/worker-qualifications/queries";
import { getAppSettings } from "@/features/settings/queries";

/**
 * One or more shifts sharing the exact same date/start/end time -- a worker responds to the
 * group once, and that response is written to every underlying shift (per user feedback,
 * 2026-08-27: "two parallel shifts should only need one availability response, the system
 * understands it covers both"). Grouping is by exact time-range match, not partial overlap --
 * intentionally the simpler of the two rules discussed, matching "parallel" in the original
 * feedback. Computed at read time from the current set of open shifts, same convention as
 * everywhere else -- not a stored grouping, so it stays correct as shifts are added/edited.
 */
export type AvailabilitySlot = {
  shiftIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  /** Distinct locations across the grouped shifts, for display. */
  locations: string[];
  /** Representative response for the group -- in practice all grouped shifts are written
   * together by submitAvailability, so they stay in sync; if they ever disagree (e.g. a shift
   * joined the group after an earlier individual response), the first shift's response wins. */
  isAvailable: boolean | null;
  /** True if some position on any shift in this slot, that the worker is qualified for, would
   * renew one of their soon-expiring qualifications -- per user feedback (2026-08-27): highlight
   * a shift that can renew a qualification about to lapse. */
  mayRenewExpiringQualification: boolean;
};

export type OpenWindow = {
  id: string;
  label: string;
  closesAt: string;
  slots: AvailabilitySlot[];
};

type RequirementRow = { position_id: string; qualification_id: string; option_id: string | null };
type HeldQualificationRow = { qualification_id: string; option_id: string | null };
type RenewsRow = { position_id: string; qualification_id: string };

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

  const shiftIds = (shifts ?? []).map((s) => s.id);
  const { data: shiftPositions } = await supabase
    .from("shift_positions")
    .select("shift_id, position_id")
    .in("shift_id", shiftIds.length > 0 ? shiftIds : [""]);
  const positionIds = [...new Set((shiftPositions ?? []).map((sp) => sp.position_id))];

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

  const { data: renewsRows } = await supabase
    .from("position_renews_qualifications")
    .select("position_id, qualification_id")
    .in("position_id", positionIds.length > 0 ? positionIds : [""]);
  const renewedQualIdsByPosition = new Map<string, string[]>();
  for (const r of (renewsRows as RenewsRow[] | null) ?? []) {
    const list = renewedQualIdsByPosition.get(r.position_id) ?? [];
    list.push(r.qualification_id);
    renewedQualIdsByPosition.set(r.position_id, list);
  }

  const { data: heldRows } = await supabase
    .from("worker_qualifications")
    .select("qualification_id, option_id")
    .eq("worker_id", workerId)
    .eq("status", "approved");
  const held = (heldRows as HeldQualificationRow[] | null) ?? [];

  const [{ expiringSoonDays }, myQualifications] = await Promise.all([
    getAppSettings(),
    listWorkerQualifications(workerId),
  ]);
  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + expiringSoonDays);
  const soonThresholdStr = soonThreshold.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoonQualIds = new Set(
    myQualifications
      .filter(
        (q) =>
          q.status === "approved" &&
          q.expiresOn !== null &&
          q.expiresOn >= today &&
          q.expiresOn <= soonThresholdStr,
      )
      .map((q) => q.qualificationId),
  );

  function isEligible(positionId: string): boolean {
    const requirements = requirementsByPosition.get(positionId) ?? [];
    return requirements.every((req) =>
      held.some((h) => h.qualification_id === req.qualificationId && h.option_id === req.optionId),
    );
  }

  function mayRenewExpiring(shiftId: string): boolean {
    if (expiringSoonQualIds.size === 0) return false;
    const positions = (shiftPositions ?? []).filter((sp) => sp.shift_id === shiftId);
    return positions.some((sp) => {
      if (!isEligible(sp.position_id)) return false;
      const renewedIds = renewedQualIdsByPosition.get(sp.position_id) ?? [];
      return renewedIds.some((id) => expiringSoonQualIds.has(id));
    });
  }

  return windows.map((w) => {
    const windowShifts = (shifts ?? []).filter((s) => s.availability_window_id === w.id);

    const groups = new Map<string, typeof windowShifts>();
    for (const s of windowShifts) {
      const key = `${s.date}T${s.start_time}T${s.end_time}`;
      const group = groups.get(key) ?? [];
      group.push(s);
      groups.set(key, group);
    }

    const slots: AvailabilitySlot[] = [...groups.values()].map((group) => {
      const first = group[0];
      return {
        shiftIds: group.map((s) => s.id),
        date: first.date,
        startTime: first.start_time,
        endTime: first.end_time,
        locations: [...new Set(group.map((s) => s.location).filter((l): l is string => !!l))],
        isAvailable: responseMap.get(first.id) ?? null,
        mayRenewExpiringQualification: group.some((s) => mayRenewExpiring(s.id)),
      };
    });

    return { id: w.id, label: w.label, closesAt: w.closes_at, slots };
  });
}

export type ChangeRequestState = {
  id: string;
  message: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
};

export type ClosedWindowShift = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  isAvailable: boolean;
  changeRequest: ChangeRequestState | null;
};

export type ClosedWindow = {
  id: string;
  label: string;
  closesAt: string;
  shifts: ClosedWindowShift[];
};

/**
 * Once a window closes, a worker can no longer toggle their response -- per user feedback
 * (2026-08-28), it shouldn't just disappear either. Shows the worker's own past responses
 * read-only, for the most recently closed windows they responded to, plus whether they've
 * already flagged a problem with a specific shift (`availability_change_requests`) and whether
 * an admin has acknowledged it. Only includes shifts the worker actually responded to -- nothing
 * to show or flag for one they never answered.
 */
export async function listRecentlyClosedWindowsWithResponses(
  workerId: string,
  windowLimit = 3,
): Promise<ClosedWindow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: windows } = await supabase
    .from("availability_windows")
    .select("id, label, closes_at")
    .lt("closes_at", now)
    .order("closes_at", { ascending: false })
    .limit(windowLimit);
  if (!windows || windows.length === 0) return [];

  const windowIds = windows.map((w) => w.id);
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time, location, availability_window_id")
    .in("availability_window_id", windowIds)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  const shiftIds = (shifts ?? []).map((s) => s.id);

  const { data: responses } = await supabase
    .from("availability")
    .select("shift_id, is_available")
    .eq("worker_id", workerId)
    .in("shift_id", shiftIds.length > 0 ? shiftIds : [""]);
  const responseMap = new Map((responses ?? []).map((r) => [r.shift_id, r.is_available]));

  const { data: changeRequests } = await supabase
    .from("availability_change_requests")
    .select("id, shift_id, message, created_at, acknowledged_at")
    .eq("worker_id", workerId)
    .in("shift_id", shiftIds.length > 0 ? shiftIds : [""]);
  const changeRequestByShift = new Map(
    (changeRequests ?? []).map((c) => [
      c.shift_id,
      { id: c.id, message: c.message, createdAt: c.created_at, acknowledgedAt: c.acknowledged_at },
    ]),
  );

  return windows
    .map((w) => ({
      id: w.id,
      label: w.label,
      closesAt: w.closes_at,
      shifts: (shifts ?? [])
        .filter((s) => s.availability_window_id === w.id && responseMap.has(s.id))
        .map((s) => ({
          shiftId: s.id,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          location: s.location,
          isAvailable: responseMap.get(s.id)!,
          changeRequest: changeRequestByShift.get(s.id) ?? null,
        })),
    }))
    .filter((w) => w.shifts.length > 0);
}

export type AdminChangeRequest = {
  id: string;
  workerId: string;
  workerName: string;
  shiftId: string;
  windowId: string;
  date: string;
  startTime: string;
  message: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
};

type RawAdminChangeRequest = {
  id: string;
  worker_id: string;
  shift_id: string;
  message: string | null;
  created_at: string;
  acknowledged_at: string | null;
  worker: { full_name: string } | null;
  shift: { date: string; start_time: string; availability_window_id: string | null } | null;
};

/** All change requests raised against shifts in this window -- admin-facing, shown on the
 * schedule review page since that's where the admin is already deciding what to do about a gap. */
export async function listChangeRequestsForWindow(windowId: string): Promise<AdminChangeRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_change_requests")
    .select(
      `id, worker_id, shift_id, message, created_at, acknowledged_at,
      worker:profiles!availability_change_requests_worker_id_fkey(full_name),
      shift:shifts!availability_change_requests_shift_id_fkey(date, start_time, availability_window_id)`,
    )
    .order("created_at", { ascending: false });

  return ((data as unknown as RawAdminChangeRequest[]) ?? [])
    .filter((c) => c.shift?.availability_window_id === windowId)
    .map((c) => ({
      id: c.id,
      workerId: c.worker_id,
      workerName: c.worker?.full_name ?? "",
      shiftId: c.shift_id,
      windowId: c.shift!.availability_window_id!,
      date: c.shift!.date,
      startTime: c.shift!.start_time,
      message: c.message,
      createdAt: c.created_at,
      acknowledgedAt: c.acknowledged_at,
    }));
}

/** Unacknowledged change requests across every window -- dashboard-level surfacing, same
 * "per-page detail + global aggregate" pattern already used for pairing conflicts. */
export async function listPendingChangeRequests(limit: number): Promise<AdminChangeRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_change_requests")
    .select(
      `id, worker_id, shift_id, message, created_at, acknowledged_at,
      worker:profiles!availability_change_requests_worker_id_fkey(full_name),
      shift:shifts!availability_change_requests_shift_id_fkey(date, start_time, availability_window_id)`,
    )
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as unknown as RawAdminChangeRequest[]) ?? [])
    .filter((c) => c.shift?.availability_window_id)
    .map((c) => ({
      id: c.id,
      workerId: c.worker_id,
      workerName: c.worker?.full_name ?? "",
      shiftId: c.shift_id,
      windowId: c.shift!.availability_window_id!,
      date: c.shift!.date,
      startTime: c.shift!.start_time,
      message: c.message,
      createdAt: c.created_at,
      acknowledgedAt: c.acknowledged_at,
    }));
}
