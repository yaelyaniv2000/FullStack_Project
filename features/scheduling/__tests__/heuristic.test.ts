import { describe, expect, test } from "vitest";
import {
  runSchedulingHeuristic,
  type ConstraintRow,
  type HeuristicSlot,
  type HeuristicWorker,
} from "../heuristic";

function worker(id: string, overrides: Partial<HeuristicWorker> = {}): HeuristicWorker {
  return {
    id,
    heldQualifications: [],
    availableShiftIds: [],
    existingAssignedDates: [],
    ...overrides,
  };
}

function slot(overrides: Partial<HeuristicSlot> = {}): HeuristicSlot {
  return {
    shiftId: "shift-1",
    positionId: "position-1",
    slotIndex: 0,
    date: "2026-09-01",
    startTime: "08:00",
    endTime: "16:00",
    requirements: [],
    ...overrides,
  };
}

/** Builds a single default row (qualificationOptionId: null) by default -- pass
 * `qualificationOptionId` to build an override row instead. */
function constraintRow(overrides: Partial<ConstraintRow> = {}): ConstraintRow {
  return {
    type: "min_rest_hours",
    qualificationOptionId: null,
    enabled: false,
    value: 8,
    ...overrides,
  };
}

describe("qualifications", () => {
  test("worker missing the required qualification is ineligible", () => {
    const result = runSchedulingHeuristic({
      slots: [slot({ requirements: [{ qualificationId: "rank", optionId: null }] })],
      workers: [worker("w1", { availableShiftIds: ["shift-1"] })],
      constraints: [],
      pairings: [],
    });
    expect(result.assignments).toHaveLength(0);
    expect(result.unfilledSlots).toEqual([{ shiftId: "shift-1", positionId: "position-1" }]);
  });

  test("worker with the required qualification (and matching option) is eligible", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ requirements: [{ qualificationId: "rank", optionId: "captain" }] }),
      ],
      workers: [
        worker("w1", {
          heldQualifications: [{ qualificationId: "rank", optionId: "captain" }],
          availableShiftIds: ["shift-1"],
        }),
      ],
      constraints: [],
      pairings: [],
    });
    expect(result.assignments).toEqual([
      { shiftId: "shift-1", positionId: "position-1", workerId: "w1" },
    ]);
  });

  test("holding the qualification with the WRONG option does not satisfy an option-specific requirement", () => {
    const result = runSchedulingHeuristic({
      slots: [slot({ requirements: [{ qualificationId: "rank", optionId: "captain" }] })],
      workers: [
        worker("w1", {
          heldQualifications: [{ qualificationId: "rank", optionId: "lieutenant" }],
          availableShiftIds: ["shift-1"],
        }),
      ],
      constraints: [],
      pairings: [],
    });
    expect(result.unfilledSlots).toHaveLength(1);
  });
});

describe("availability", () => {
  test("worker who didn't mark themselves available is ineligible", () => {
    const result = runSchedulingHeuristic({
      slots: [slot()],
      workers: [worker("w1", { availableShiftIds: [] })],
      constraints: [],
      pairings: [],
    });
    expect(result.unfilledSlots).toHaveLength(1);
  });
});

describe("no double-booking", () => {
  test("a worker already committed to that date (outside this run) is ineligible", () => {
    const result = runSchedulingHeuristic({
      slots: [slot({ date: "2026-09-01" })],
      workers: [
        worker("w1", { availableShiftIds: ["shift-1"], existingAssignedDates: ["2026-09-01"] }),
      ],
      constraints: [],
      pairings: [],
    });
    expect(result.unfilledSlots).toHaveLength(1);
  });

  test("a worker already assigned to another shift the same date THIS run is ineligible for a second one", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "shift-1", positionId: "pos-a", date: "2026-09-01" }),
        slot({ shiftId: "shift-2", positionId: "pos-b", date: "2026-09-01" }),
      ],
      workers: [
        worker("w1", { availableShiftIds: ["shift-1", "shift-2"] }),
      ],
      constraints: [],
      pairings: [],
    });
    // Only one of the two same-date slots can be filled by the one available worker.
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilledSlots).toHaveLength(1);
  });
});

describe("min_rest_hours constraint", () => {
  // Two consecutive dates, deliberately -- min_rest_hours is only ever reachable across
  // different dates, since the double-booking rule already blocks two assignments on the SAME
  // date regardless of this constraint. Gap here, verified by hand: shift-1 ends 22:00 on
  // 09-01, shift-2 starts 00:00 on 09-02 -- exactly 2 hours.
  const twoHourGapSlots = [
    slot({ shiftId: "shift-1", positionId: "pos-a", date: "2026-09-01", startTime: "20:00", endTime: "22:00" }),
    slot({ shiftId: "shift-2", positionId: "pos-b", date: "2026-09-02", startTime: "00:00", endTime: "06:00" }),
  ];

  test("disabled: a 2-hour gap is still eligible (today's behavior, unaffected)", () => {
    const result = runSchedulingHeuristic({
      slots: twoHourGapSlots,
      workers: [worker("w1", { availableShiftIds: ["shift-1", "shift-2"] })],
      constraints: [constraintRow({ enabled: false, value: 10 })],
      pairings: [],
    });
    expect(result.assignments).toHaveLength(2);
  });

  test("enabled at 10h: a 2-hour gap is correctly rejected", () => {
    const result = runSchedulingHeuristic({
      slots: twoHourGapSlots,
      workers: [worker("w1", { availableShiftIds: ["shift-1", "shift-2"] })],
      constraints: [constraintRow({ enabled: true, value: 10 })],
      pairings: [],
    });
    // The scarcity sort fills whichever slot is tied for hardest first; either way only one of
    // the two can end up filled once the first assignment blocks the other via the rest gap.
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilledSlots).toHaveLength(1);
  });

  test("per-category override: a worker holding the overridden option needs more rest than the default", () => {
    // Gap here, verified by hand: shift-1 ends 22:00 on 09-01, shift-2 starts 08:00 on 09-02 --
    // exactly 10 hours. Enough for the 8h default, not enough for the 16h override.
    const slots = [
      slot({ shiftId: "shift-1", positionId: "pos-a", date: "2026-09-01", startTime: "20:00", endTime: "22:00" }),
      slot({ shiftId: "shift-2", positionId: "pos-b", date: "2026-09-02", startTime: "08:00", endTime: "16:00" }),
    ];
    const constraints = [
      constraintRow({ enabled: true, value: 8 }), // regular worker: 10h gap is enough
      constraintRow({ qualificationOptionId: "reserve", enabled: true, value: 16 }), // reserve: 10h is NOT enough
    ];

    const regular = runSchedulingHeuristic({
      slots,
      workers: [worker("regular", { availableShiftIds: ["shift-1", "shift-2"] })],
      constraints,
      pairings: [],
    });
    expect(regular.assignments).toHaveLength(2);

    const reserve = runSchedulingHeuristic({
      slots,
      workers: [
        worker("reserve", {
          availableShiftIds: ["shift-1", "shift-2"],
          heldQualifications: [{ qualificationId: "service-type", optionId: "reserve" }],
        }),
      ],
      constraints,
      pairings: [],
    });
    expect(reserve.assignments).toHaveLength(1);
    expect(reserve.unfilledSlots).toHaveLength(1);
  });

  test("an override can EXEMPT its category even while the default stays enabled for everyone else", () => {
    const constraints = [
      constraintRow({ enabled: true, value: 10 }), // default: enforced
      constraintRow({ qualificationOptionId: "exempt", enabled: false, value: 10 }), // this category: not enforced
    ];

    const result = runSchedulingHeuristic({
      slots: twoHourGapSlots,
      workers: [
        worker("exempt-worker", {
          availableShiftIds: ["shift-1", "shift-2"],
          heldQualifications: [{ qualificationId: "service-type", optionId: "exempt" }],
        }),
      ],
      constraints,
      pairings: [],
    });
    // A disabled override governs completely for that category -- the enabled default doesn't
    // leak through, so both slots get filled despite the (real) 2-hour gap.
    expect(result.assignments).toHaveLength(2);
  });

  test("an override can enable a constraint for only one category while the default stays disabled", () => {
    const constraints = [
      constraintRow({ enabled: false, value: 10 }), // default: not enforced
      constraintRow({ qualificationOptionId: "restricted", enabled: true, value: 10 }), // this category: enforced
    ];

    const result = runSchedulingHeuristic({
      slots: twoHourGapSlots,
      workers: [
        worker("restricted-worker", {
          availableShiftIds: ["shift-1", "shift-2"],
          heldQualifications: [{ qualificationId: "service-type", optionId: "restricted" }],
        }),
      ],
      constraints,
      pairings: [],
    });
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilledSlots).toHaveLength(1);
  });
});

describe("max_shifts_per_window constraint", () => {
  test("enabled at 3: a worker already at 3 assignments this run is ineligible for a 4th", () => {
    const slots = [
      slot({ shiftId: "s1", positionId: "p1", date: "2026-09-01" }),
      slot({ shiftId: "s2", positionId: "p1", date: "2026-09-02" }),
      slot({ shiftId: "s3", positionId: "p1", date: "2026-09-03" }),
      slot({ shiftId: "s4", positionId: "p1", date: "2026-09-04" }),
    ];
    const result = runSchedulingHeuristic({
      slots,
      workers: [worker("w1", { availableShiftIds: ["s1", "s2", "s3", "s4"] })],
      constraints: [
        constraintRow({ type: "max_shifts_per_window", enabled: true, value: 3 }),
      ],
      pairings: [],
    });
    expect(result.assignments).toHaveLength(3);
    expect(result.unfilledSlots).toHaveLength(1);
  });
});

describe("worker pairing preferences", () => {
  test("avoid (hard): never pairs, even if it leaves the slot unfilled", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "shift-1", positionId: "pos-a" }),
        slot({ shiftId: "shift-1", positionId: "pos-b" }),
      ],
      workers: [
        worker("a", { availableShiftIds: ["shift-1"] }),
        worker("b", { availableShiftIds: ["shift-1"] }),
      ],
      constraints: [],
      pairings: [{ workerId1: "a", workerId2: "b", preference: "avoid" }],
    });
    // Whichever of a/b fills pos-a first, the other becomes ineligible for pos-b -- one slot
    // stays unfilled rather than ever pairing them.
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilledSlots).toHaveLength(1);
  });

  test("prefer_avoid (soft): pairs anyway when it's the only way to fill the slot, and flags it", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "shift-1", positionId: "pos-a" }),
        slot({ shiftId: "shift-1", positionId: "pos-b" }),
      ],
      workers: [
        worker("a", { availableShiftIds: ["shift-1"] }),
        worker("b", { availableShiftIds: ["shift-1"] }),
      ],
      constraints: [],
      pairings: [{ workerId1: "a", workerId2: "b", preference: "prefer_avoid" }],
    });
    // Unlike hard avoid, both slots get filled -- b is the only eligible worker left for pos-b.
    expect(result.assignments).toHaveLength(2);
    expect(result.unfilledSlots).toHaveLength(0);
    expect(result.softAvoidConflicts).toEqual([
      { workerId1: "a", workerId2: "b", shiftId: "shift-1" },
    ]);
  });

  test("prefer_avoid (soft): does NOT pair them when another eligible worker exists", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "shift-1", positionId: "pos-a" }),
        slot({ shiftId: "shift-1", positionId: "pos-b" }),
      ],
      workers: [
        worker("a", { availableShiftIds: ["shift-1"] }),
        worker("b", { availableShiftIds: ["shift-1"] }),
        worker("c", { availableShiftIds: ["shift-1"] }),
      ],
      constraints: [],
      pairings: [{ workerId1: "a", workerId2: "b", preference: "prefer_avoid" }],
    });
    expect(result.assignments).toHaveLength(2);
    expect(result.softAvoidConflicts).toHaveLength(0);
    const assignedIds = result.assignments.map((a) => a.workerId).sort();
    // a plus c, never b, since c was available to avoid the soft-avoid pair.
    expect(assignedIds).toEqual(["a", "c"]);
  });

  test("prefer (soft): tiebreak favors a worker whose preferred partner is already on the shift", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "shift-1", positionId: "pos-a" }),
        slot({ shiftId: "shift-1", positionId: "pos-b" }),
      ],
      workers: [
        worker("a", { availableShiftIds: ["shift-1"] }),
        worker("b", { availableShiftIds: ["shift-1"] }), // a's preferred partner
        worker("c", { availableShiftIds: ["shift-1"] }), // no preference either way
      ],
      constraints: [],
      pairings: [{ workerId1: "a", workerId2: "b", preference: "prefer" }],
    });
    const assignedIds = result.assignments.map((r) => r.workerId).sort();
    expect(assignedIds).toEqual(["a", "b"]);
  });
});

describe("fairness tiebreak", () => {
  test("with no pairing signal, the worker with fewer assignments so far wins the tiebreak", () => {
    const slots = [
      slot({ shiftId: "s1", positionId: "p1", date: "2026-09-01" }),
      slot({ shiftId: "s2", positionId: "p1", date: "2026-09-02" }),
      slot({ shiftId: "s3", positionId: "p1", date: "2026-09-03" }),
    ];
    const result = runSchedulingHeuristic({
      slots,
      workers: [
        worker("a", { availableShiftIds: ["s1", "s2", "s3"] }),
        worker("b", { availableShiftIds: ["s1", "s2", "s3"] }),
      ],
      constraints: [],
      pairings: [],
    });
    const countA = result.assignments.filter((r) => r.workerId === "a").length;
    const countB = result.assignments.filter((r) => r.workerId === "b").length;
    // 3 slots, 2 equally-eligible workers, no other signal -> load should split, not all go to one.
    expect(Math.abs(countA - countB)).toBeLessThanOrEqual(1);
  });
});

describe("scarcity ordering", () => {
  test("the slot with only one eligible worker gets filled even when a more-open slot is also unfilled", () => {
    const result = runSchedulingHeuristic({
      slots: [
        slot({ shiftId: "s1", positionId: "p1", requirements: [{ qualificationId: "rare", optionId: null }] }),
        slot({ shiftId: "s2", positionId: "p1" }),
      ],
      workers: [
        worker("specialist", {
          availableShiftIds: ["s1", "s2"],
          heldQualifications: [{ qualificationId: "rare", optionId: null }],
        }),
      ],
      constraints: [],
      pairings: [],
    });
    // Only one worker total, and only they can fill s1 (the scarce slot); if scarcity ordering
    // works, s1 gets them, not s2.
    expect(result.assignments).toEqual([{ shiftId: "s1", positionId: "p1", workerId: "specialist" }]);
    expect(result.unfilledSlots).toEqual([{ shiftId: "s2", positionId: "p1" }]);
  });
});
