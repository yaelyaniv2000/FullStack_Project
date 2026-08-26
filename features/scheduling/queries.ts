import { createClient } from "@/lib/supabase/server";

export type ConstraintType = "min_rest_hours" | "max_shifts_per_window";

export type ConstraintRow = {
  id: string;
  type: ConstraintType;
  qualificationOptionId: string | null;
  qualificationName: string | null;
  optionLabel: string | null;
  enabled: boolean;
  value: number;
};

type RawConstraintRow = {
  id: string;
  type: ConstraintType;
  qualification_option_id: string | null;
  enabled: boolean;
  value: number;
  option: { label: string; qualification: { name: string } | null } | null;
};

export async function listSchedulingConstraints(): Promise<ConstraintRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduling_constraints")
    .select(
      `id, type, qualification_option_id, enabled, value,
      option:qualification_options!scheduling_constraints_qualification_option_id_fkey(
        label, qualification:qualifications!qualification_options_qualification_id_fkey(name)
      )`,
    )
    .order("type", { ascending: true });

  return ((data as unknown as RawConstraintRow[]) ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    qualificationOptionId: r.qualification_option_id,
    qualificationName: r.option?.qualification?.name ?? null,
    optionLabel: r.option?.label ?? null,
    enabled: r.enabled,
    value: r.value,
  }));
}

export type PairingPreference = "avoid" | "prefer_avoid" | "prefer";

export type WorkerPairing = {
  id: string;
  workerId1: string;
  workerName1: string;
  workerId2: string;
  workerName2: string;
  preference: PairingPreference;
};

type RawPairing = {
  id: string;
  worker_id_1: string;
  worker_id_2: string;
  preference: PairingPreference;
  worker1: { full_name: string } | null;
  worker2: { full_name: string } | null;
};

export async function listWorkerPairingPreferences(): Promise<WorkerPairing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_pairing_preferences")
    .select(
      `id, worker_id_1, worker_id_2, preference,
      worker1:profiles!worker_pairing_preferences_worker_id_1_fkey(full_name),
      worker2:profiles!worker_pairing_preferences_worker_id_2_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });

  return ((data as unknown as RawPairing[]) ?? []).map((r) => ({
    id: r.id,
    workerId1: r.worker_id_1,
    workerName1: r.worker1?.full_name ?? "",
    workerId2: r.worker_id_2,
    workerName2: r.worker2?.full_name ?? "",
    preference: r.preference,
  }));
}

export type ScheduleAssignment = {
  workerId: string;
  workerName: string;
};

export type SchedulePosition = {
  positionId: string;
  positionName: string;
  headcountNeeded: number;
  assignments: ScheduleAssignment[];
};

export type ScheduleShift = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  publishedAt: string | null;
  positions: SchedulePosition[];
};

export type ScheduleConflict = {
  shiftId: string;
  workerId1: string;
  workerName1: string;
  workerId2: string;
  workerName2: string;
};

export type ScheduleReview = {
  windowId: string;
  windowLabel: string;
  shifts: ScheduleShift[];
  conflicts: ScheduleConflict[];
};

type RawScheduleShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  published_at: string | null;
  links: {
    position_id: string;
    headcount_needed: number;
    position: { name: string } | null;
  }[];
};

type RawAssignment = {
  shift_id: string;
  position_id: string;
  worker_id: string;
  worker: { full_name: string } | null;
};

type RawPreferAvoidPairing = {
  worker_id_1: string;
  worker_id_2: string;
  worker1: { full_name: string } | null;
  worker2: { full_name: string } | null;
};

/**
 * Unfilled slots and soft-avoid conflicts are both computed at read time from current
 * assignments -- same "computed, not stored" convention used elsewhere (qualification expiry,
 * understaffed-shift detection) -- so they stay accurate after any manual edit, not just
 * immediately after generateSchedule runs, and remain visible after publish too.
 */
export async function getScheduleReview(windowId: string): Promise<ScheduleReview | null> {
  const supabase = await createClient();
  const { data: window } = await supabase
    .from("availability_windows")
    .select("id, label")
    .eq("id", windowId)
    .single();
  if (!window) return null;

  const { data: shifts } = await supabase
    .from("shifts")
    .select(
      `id, date, start_time, end_time, published_at,
      links:shift_positions!shift_positions_shift_id_fkey(position_id, headcount_needed, position:positions!shift_positions_position_id_fkey(name))`,
    )
    .eq("availability_window_id", windowId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const shiftIds = (shifts ?? []).map((s) => s.id);

  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select(
      "shift_id, position_id, worker_id, worker:profiles!assignments_worker_id_fkey(full_name)",
    )
    .in("shift_id", shiftIds.length > 0 ? shiftIds : [""]);

  const { data: pairingRows } = await supabase
    .from("worker_pairing_preferences")
    .select(
      `worker_id_1, worker_id_2,
      worker1:profiles!worker_pairing_preferences_worker_id_1_fkey(full_name),
      worker2:profiles!worker_pairing_preferences_worker_id_2_fkey(full_name)`,
    )
    .eq("preference", "prefer_avoid");

  const scheduleShifts: ScheduleShift[] = ((shifts as unknown as RawScheduleShift[]) ?? []).map(
    (s) => ({
      shiftId: s.id,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      publishedAt: s.published_at,
      positions: s.links.map((l) => ({
        positionId: l.position_id,
        positionName: l.position?.name ?? "",
        headcountNeeded: l.headcount_needed,
        assignments: ((assignmentRows as unknown as RawAssignment[]) ?? [])
          .filter((a) => a.shift_id === s.id && a.position_id === l.position_id)
          .map((a) => ({ workerId: a.worker_id, workerName: a.worker?.full_name ?? "" })),
      })),
    }),
  );

  const conflicts: ScheduleConflict[] = [];
  for (const shift of scheduleShifts) {
    const assignedWorkerIds = new Set(
      shift.positions.flatMap((p) => p.assignments.map((a) => a.workerId)),
    );
    for (const pairing of (pairingRows as unknown as RawPreferAvoidPairing[]) ?? []) {
      if (assignedWorkerIds.has(pairing.worker_id_1) && assignedWorkerIds.has(pairing.worker_id_2)) {
        conflicts.push({
          shiftId: shift.shiftId,
          workerId1: pairing.worker_id_1,
          workerName1: pairing.worker1?.full_name ?? "",
          workerId2: pairing.worker_id_2,
          workerName2: pairing.worker2?.full_name ?? "",
        });
      }
    }
  }

  return { windowId: window.id, windowLabel: window.label, shifts: scheduleShifts, conflicts };
}
