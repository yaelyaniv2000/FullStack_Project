/**
 * The scheduling matching heuristic -- a pure function, deliberately. No DB calls in here; the
 * caller (generateSchedule in actions.ts) fetches everything, calls this, then writes the
 * result. Keeping it pure is what makes it unit-testable without a live database (see TODO.md's
 * test-infra sequencing note, 2026-08-27).
 *
 * Algorithm exactly as specified in docs/technical-plan.md -> "Scheduling engine": flatten to
 * slots -> compute eligibility -> sort by scarcity -> greedy assign with a fairness+pairing
 * tiebreak -> flag unfilled slots and soft-avoid conflicts. Don't change this shape without
 * updating that doc.
 */

export type ConstraintType = "min_rest_hours" | "max_shifts_per_window";
export type PairingPreference = "avoid" | "prefer_avoid" | "prefer";

export type HeldQualification = {
  qualificationId: string;
  optionId: string | null;
};

export type PositionRequirement = {
  qualificationId: string;
  optionId: string | null;
};

export type HeuristicSlot = {
  shiftId: string;
  positionId: string;
  /** Which unit of headcount this is (a position needing 3 becomes 3 slots) -- not used by the
   * algorithm itself, just lets the caller correlate results back to a specific unit if needed. */
  slotIndex: number;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;
  requirements: PositionRequirement[];
};

export type HeuristicWorker = {
  id: string;
  /** Approved qualifications only -- pending/rejected ones never make a worker eligible. */
  heldQualifications: HeldQualification[];
  availableShiftIds: string[];
  /** Dates the worker is already committed to from OUTSIDE this run (prior scheduling runs,
   * manual admin assignments). Used only for the double-booking check -- min_rest_hours is
   * scoped to "within this run" only, per docs/technical-plan.md. */
  existingAssignedDates: string[];
};

/**
 * One row per scheduling_constraints DB row -- qualificationOptionId null is the type's default,
 * non-null is a per-category override. Each row (default AND override) carries its OWN `enabled`
 * flag, matching the actual schema (see the /admin/settings ConstraintTypeEditor, which lets an
 * admin toggle a category's override on/off independently of the default). This is why it's an
 * array of rows here rather than one enabled/value pair per type -- a constraint can be enabled
 * only for a specific category while off for everyone else, or vice versa.
 */
export type ConstraintRow = {
  type: ConstraintType;
  qualificationOptionId: string | null;
  enabled: boolean;
  value: number;
};

export type PairingInput = {
  workerId1: string;
  workerId2: string;
  preference: PairingPreference;
};

export type HeuristicInput = {
  slots: HeuristicSlot[];
  workers: HeuristicWorker[];
  constraints: ConstraintRow[];
  pairings: PairingInput[];
};

export type ProposedAssignment = {
  shiftId: string;
  positionId: string;
  workerId: string;
};

export type SlotRef = {
  shiftId: string;
  positionId: string;
};

export type PairConflictRef = {
  workerId1: string;
  workerId2: string;
  shiftId: string;
};

export type HeuristicResult = {
  assignments: ProposedAssignment[];
  unfilledSlots: SlotRef[];
  softAvoidConflicts: PairConflictRef[];
};

function qualKey(qualificationId: string, optionId: string | null): string {
  return `${qualificationId}:${optionId ?? ""}`;
}

function toTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}`).getTime();
}

/** Internal per-worker lookup structures, built once per run. */
type WorkerState = {
  worker: HeuristicWorker;
  qualificationKeys: Set<string>;
  optionIds: Set<string>;
  availableShiftIds: Set<string>;
  existingAssignedDates: Set<string>;
};

function buildWorkerState(worker: HeuristicWorker): WorkerState {
  return {
    worker,
    qualificationKeys: new Set(
      worker.heldQualifications.map((h) => qualKey(h.qualificationId, h.optionId)),
    ),
    optionIds: new Set(
      worker.heldQualifications.flatMap((h) => (h.optionId ? [h.optionId] : [])),
    ),
    availableShiftIds: new Set(worker.availableShiftIds),
    existingAssignedDates: new Set(worker.existingAssignedDates),
  };
}

/**
 * Resolves a worker's effective enabled/value for one constraint type. If the worker holds an
 * option with a matching override row, that override governs completely -- including its OWN
 * enabled flag -- regardless of the default row's state. This lets an admin scope a constraint to
 * only a category (default disabled, override enabled) or exempt a category from an
 * otherwise-active constraint (default enabled, override disabled). Only falls back to the
 * default row when the worker matches no override at all. Among multiple matching *enabled*
 * overrides (e.g. two different qualifications both happen to have one), the most restrictive
 * value wins (max for min_rest_hours -- more rest required; min for max_shifts_per_window --
 * fewer shifts allowed), so one override can never accidentally loosen another.
 */
function effectiveConstraint(
  type: ConstraintType,
  state: WorkerState,
  rows: ConstraintRow[],
): { enabled: boolean; value: number } | null {
  const rowsForType = rows.filter((r) => r.type === type);
  const matchingOverrides = rowsForType.filter(
    (r) => r.qualificationOptionId !== null && state.optionIds.has(r.qualificationOptionId),
  );

  if (matchingOverrides.length > 0) {
    const enabled = matchingOverrides.filter((r) => r.enabled);
    if (enabled.length === 0) return { enabled: false, value: 0 };
    const values = enabled.map((r) => r.value);
    return { enabled: true, value: type === "min_rest_hours" ? Math.max(...values) : Math.min(...values) };
  }

  const defaultRow = rowsForType.find((r) => r.qualificationOptionId === null);
  return defaultRow ? { enabled: defaultRow.enabled, value: defaultRow.value } : null;
}

/** Run-in-progress state, mutated as slots get assigned. */
type RunState = {
  assignmentsByWorker: Map<string, { date: string; startTime: string; endTime: string }[]>;
  assignedDatesByWorker: Map<string, Set<string>>;
  assignmentCountByWorker: Map<string, number>;
  workersByShift: Map<string, Set<string>>;
};

function createRunState(): RunState {
  return {
    assignmentsByWorker: new Map(),
    assignedDatesByWorker: new Map(),
    assignmentCountByWorker: new Map(),
    workersByShift: new Map(),
  };
}

function partnerIdIfPairedWith(pairing: PairingInput, workerId: string): string | null {
  if (pairing.workerId1 === workerId) return pairing.workerId2;
  if (pairing.workerId2 === workerId) return pairing.workerId1;
  return null;
}

function satisfiesMinRest(
  state: WorkerState,
  slot: HeuristicSlot,
  runState: RunState,
  minHours: number,
): boolean {
  const existing = runState.assignmentsByWorker.get(state.worker.id) ?? [];
  const slotStart = toTimestamp(slot.date, slot.startTime);
  const slotEnd = toTimestamp(slot.date, slot.endTime);
  for (const other of existing) {
    const otherStart = toTimestamp(other.date, other.startTime);
    const otherEnd = toTimestamp(other.date, other.endTime);
    const gapHours =
      slotStart >= otherEnd
        ? (slotStart - otherEnd) / 3_600_000
        : (otherStart - slotEnd) / 3_600_000;
    if (gapHours < minHours) return false;
  }
  return true;
}

const CONSTRAINT_TYPES: ConstraintType[] = ["min_rest_hours", "max_shifts_per_window"];

function isEligible(
  state: WorkerState,
  slot: HeuristicSlot,
  constraints: ConstraintRow[],
  pairings: PairingInput[],
  runState: RunState,
): boolean {
  for (const req of slot.requirements) {
    if (!state.qualificationKeys.has(qualKey(req.qualificationId, req.optionId))) return false;
  }

  if (!state.availableShiftIds.has(slot.shiftId)) return false;

  const assignedDatesThisRun = runState.assignedDatesByWorker.get(state.worker.id);
  if (
    state.existingAssignedDates.has(slot.date) ||
    assignedDatesThisRun?.has(slot.date)
  ) {
    return false;
  }

  for (const type of CONSTRAINT_TYPES) {
    const resolved = effectiveConstraint(type, state, constraints);
    if (!resolved || !resolved.enabled) continue;
    const value = resolved.value;
    if (type === "min_rest_hours") {
      if (!satisfiesMinRest(state, slot, runState, value)) return false;
    } else {
      const countSoFar = runState.assignmentCountByWorker.get(state.worker.id) ?? 0;
      if (countSoFar >= value) return false;
    }
  }

  const shiftWorkers = runState.workersByShift.get(slot.shiftId);
  if (shiftWorkers) {
    for (const pairing of pairings) {
      if (pairing.preference !== "avoid") continue;
      const partnerId = partnerIdIfPairedWith(pairing, state.worker.id);
      if (partnerId && shiftWorkers.has(partnerId)) return false;
    }
  }

  return true;
}

/** fewest-assignments-so-far, adjusted for pairing preference with whoever's already on this
 * shift this run. Higher score wins. */
function scoreWorker(
  state: WorkerState,
  slot: HeuristicSlot,
  pairings: PairingInput[],
  runState: RunState,
): number {
  const countSoFar = runState.assignmentCountByWorker.get(state.worker.id) ?? 0;
  let score = -countSoFar;

  const shiftWorkers = runState.workersByShift.get(slot.shiftId);
  if (shiftWorkers) {
    for (const pairing of pairings) {
      const partnerId = partnerIdIfPairedWith(pairing, state.worker.id);
      if (!partnerId || !shiftWorkers.has(partnerId)) continue;
      if (pairing.preference === "prefer") score += 10;
      if (pairing.preference === "prefer_avoid") score -= 10;
    }
  }

  return score;
}

export function runSchedulingHeuristic(input: HeuristicInput): HeuristicResult {
  const states = new Map(input.workers.map((w) => [w.id, buildWorkerState(w)]));
  const runState = createRunState();

  const assignments: ProposedAssignment[] = [];
  const unfilledSlots: SlotRef[] = [];
  const softAvoidConflicts: PairConflictRef[] = [];

  function eligibleFor(slot: HeuristicSlot): WorkerState[] {
    return input.workers
      .map((w) => states.get(w.id)!)
      .filter((state) => isEligible(state, slot, input.constraints, input.pairings, runState));
  }

  // Scarcity order is computed once, up front -- re-sorting mid-run as eligibility shifts would
  // second-guess the very slots already committed to, which isn't what "fill hardest first"
  // means; it's a snapshot ordering, not a re-evaluated one.
  const orderedSlots = [...input.slots].sort(
    (a, b) => eligibleFor(a).length - eligibleFor(b).length,
  );

  for (const slot of orderedSlots) {
    const eligible = eligibleFor(slot);
    if (eligible.length === 0) {
      unfilledSlots.push({ shiftId: slot.shiftId, positionId: slot.positionId });
      continue;
    }

    let chosen = eligible[0];
    let bestScore = scoreWorker(chosen, slot, input.pairings, runState);
    for (const candidate of eligible.slice(1)) {
      const score = scoreWorker(candidate, slot, input.pairings, runState);
      if (score > bestScore) {
        chosen = candidate;
        bestScore = score;
      }
    }

    assignments.push({ shiftId: slot.shiftId, positionId: slot.positionId, workerId: chosen.worker.id });

    const shiftWorkers = runState.workersByShift.get(slot.shiftId) ?? new Set<string>();
    for (const pairing of input.pairings) {
      if (pairing.preference !== "prefer_avoid") continue;
      const partnerId = partnerIdIfPairedWith(pairing, chosen.worker.id);
      if (partnerId && shiftWorkers.has(partnerId)) {
        softAvoidConflicts.push({
          workerId1: pairing.workerId1,
          workerId2: pairing.workerId2,
          shiftId: slot.shiftId,
        });
      }
    }

    shiftWorkers.add(chosen.worker.id);
    runState.workersByShift.set(slot.shiftId, shiftWorkers);

    const workerAssignments = runState.assignmentsByWorker.get(chosen.worker.id) ?? [];
    workerAssignments.push({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
    runState.assignmentsByWorker.set(chosen.worker.id, workerAssignments);

    const assignedDates = runState.assignedDatesByWorker.get(chosen.worker.id) ?? new Set<string>();
    assignedDates.add(slot.date);
    runState.assignedDatesByWorker.set(chosen.worker.id, assignedDates);

    runState.assignmentCountByWorker.set(
      chosen.worker.id,
      (runState.assignmentCountByWorker.get(chosen.worker.id) ?? 0) + 1,
    );
  }

  return { assignments, unfilledSlots, softAvoidConflicts };
}
