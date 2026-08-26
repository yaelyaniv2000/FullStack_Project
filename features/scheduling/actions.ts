"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";
import type { ConstraintType, PairingPreference } from "./queries";
import {
  runSchedulingHeuristic,
  type ConstraintRow,
  type HeuristicSlot,
  type HeuristicWorker,
  type PairConflictRef,
  type PairingInput,
  type SlotRef,
} from "./heuristic";

const constraintSchema = z.object({
  type: z.enum(["min_rest_hours", "max_shifts_per_window"]),
  qualificationOptionId: z.string().nullable(),
  enabled: z.boolean(),
  value: z.number().int("נא להזין מספר שלם").positive("נא להזין מספר חיובי"),
});

export type ConstraintState = Result<void> | undefined;

/**
 * No DB-level upsert here on purpose: the partial unique indexes (one for the default row, one
 * per override) can't be targeted by Postgres's ON CONFLICT without also repeating their WHERE
 * predicate, which the Supabase JS client's upsert() doesn't expose. A plain find-then-write is
 * simpler and just as correct given how infrequently this table is written.
 */
export async function setSchedulingConstraint(
  type: ConstraintType,
  qualificationOptionId: string | null,
  _prevState: ConstraintState,
  formData: FormData,
): Promise<ConstraintState> {
  await requireAdmin();

  // min_rest_hours is entered as days+hours in the UI and combined here -- value is still
  // stored as a single number of hours, form-only convenience (see the migration's comment).
  const rawValue =
    type === "min_rest_hours"
      ? Number(formData.get("days") ?? 0) * 24 + Number(formData.get("hoursOnly") ?? 0)
      : Number(formData.get("value"));

  const parsed = constraintSchema.safeParse({
    type,
    qualificationOptionId,
    enabled: formData.get("enabled") === "on",
    value: rawValue,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  let existingQuery = supabase.from("scheduling_constraints").select("id").eq("type", type);
  existingQuery = qualificationOptionId
    ? existingQuery.eq("qualification_option_id", qualificationOptionId)
    : existingQuery.is("qualification_option_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const error = existing
    ? (
        await supabase
          .from("scheduling_constraints")
          .update({
            enabled: parsed.data.enabled,
            value: parsed.data.value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      ).error
    : (
        await supabase.from("scheduling_constraints").insert({
          type: parsed.data.type,
          qualification_option_id: parsed.data.qualificationOptionId,
          enabled: parsed.data.enabled,
          value: parsed.data.value,
        })
      ).error;
  if (error) {
    return { success: false, error: "שגיאה בשמירת האילוץ" };
  }

  revalidatePath("/admin/settings");
  return { success: true, data: undefined };
}

/** Only ever removes an override row -- the two default rows are seeded once by migration and
 * never deletable from the UI, matching the narrow-settings-page decision. */
export async function deleteSchedulingConstraintOverride(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduling_constraints")
    .delete()
    .eq("id", id)
    .not("qualification_option_id", "is", null);
  if (error) {
    return { success: false, error: "שגיאה במחיקת החריגה" };
  }

  revalidatePath("/admin/settings");
  return { success: true, data: undefined };
}

const pairingSchema = z.object({
  workerId1: z.string().min(1),
  workerId2: z.string().min(1),
  preference: z.enum(["avoid", "prefer_avoid", "prefer"]),
});

export type PairingState = Result<void> | undefined;

export async function setWorkerPairingPreference(
  _prevState: PairingState,
  formData: FormData,
): Promise<PairingState> {
  await requireAdmin();

  const rawA = String(formData.get("workerA") ?? "");
  const rawB = String(formData.get("workerB") ?? "");
  if (rawA && rawB && rawA === rawB) {
    return { success: false, error: "נא לבחור שני עובדים שונים" };
  }
  // Canonical ordering matches the DB check constraint (worker_id_1 < worker_id_2).
  const [workerId1, workerId2] = [rawA, rawB].sort();

  const parsed = pairingSchema.safeParse({
    workerId1,
    workerId2,
    preference: formData.get("preference"),
  });
  if (!parsed.success) {
    return { success: false, error: "נא לבחור שני עובדים והעדפה" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("worker_pairing_preferences").upsert(
    {
      worker_id_1: parsed.data.workerId1,
      worker_id_2: parsed.data.workerId2,
      preference: parsed.data.preference,
    },
    { onConflict: "worker_id_1,worker_id_2" },
  );
  if (error) {
    return { success: false, error: "שגיאה בשמירת ההעדפה" };
  }

  revalidatePath("/admin/settings");
  return { success: true, data: undefined };
}

export async function deleteWorkerPairingPreference(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("worker_pairing_preferences").delete().eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה במחיקת ההעדפה" };
  }

  revalidatePath("/admin/settings");
  return { success: true, data: undefined };
}

export type GenerateScheduleResult = {
  proposedCount: number;
  unfilledSlots: SlotRef[];
  softAvoidConflicts: PairConflictRef[];
};

/**
 * Fetches everything the pure heuristic needs for one availability window and assembles it into
 * HeuristicInput. Kept separate from runSchedulingHeuristic on purpose (see heuristic.ts's top
 * comment) -- all the DB/RLS-specific code lives here, the algorithm stays pure and testable
 * without a live database.
 */
async function buildHeuristicInputForWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  windowId: string,
): Promise<{ input: import("./heuristic").HeuristicInput; shiftIds: string[] } | null> {
  // Only unpublished shifts get (re)generated -- a published shift's assignments are locked in,
  // matching the CRUD table's "assignments deletable only before publish."
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time")
    .eq("availability_window_id", windowId)
    .is("published_at", null);
  if (!shifts || shifts.length === 0) return null;
  const shiftIds = shifts.map((s) => s.id);

  const { data: shiftPositions } = await supabase
    .from("shift_positions")
    .select("shift_id, position_id, headcount_needed")
    .in("shift_id", shiftIds);
  const positionIds = [...new Set((shiftPositions ?? []).map((sp) => sp.position_id))];

  const { data: positionQuals } = await supabase
    .from("position_qualifications")
    .select("position_id, qualification_id, option_id")
    .in("position_id", positionIds.length > 0 ? positionIds : [""]);
  const requirementsByPosition = new Map<string, { qualificationId: string; optionId: string | null }[]>();
  for (const pq of positionQuals ?? []) {
    const list = requirementsByPosition.get(pq.position_id) ?? [];
    list.push({ qualificationId: pq.qualification_id, optionId: pq.option_id });
    requirementsByPosition.set(pq.position_id, list);
  }

  const slots: HeuristicSlot[] = [];
  for (const sp of shiftPositions ?? []) {
    const shift = shifts.find((s) => s.id === sp.shift_id)!;
    const requirements = requirementsByPosition.get(sp.position_id) ?? [];
    for (let i = 0; i < sp.headcount_needed; i++) {
      slots.push({
        shiftId: sp.shift_id,
        positionId: sp.position_id,
        slotIndex: i,
        date: shift.date,
        startTime: shift.start_time,
        endTime: shift.end_time,
        requirements,
      });
    }
  }

  const { data: workerProfiles } = await supabase.from("profiles").select("id").eq("role", "worker");
  const workerIds = (workerProfiles ?? []).map((w) => w.id);

  const { data: approvedQuals } = await supabase
    .from("worker_qualifications")
    .select("worker_id, qualification_id, option_id")
    .eq("status", "approved")
    .in("worker_id", workerIds.length > 0 ? workerIds : [""]);

  const { data: availabilityRows } = await supabase
    .from("availability")
    .select("worker_id, shift_id")
    .eq("is_available", true)
    .in("shift_id", shiftIds);

  // Every existing assignment EXCEPT ones on the shifts being regenerated right now (those get
  // cleared and replaced below) -- a worker already committed elsewhere (published or not)
  // shouldn't be double-booked into this window either.
  const { data: existingAssignments } = await supabase
    .from("assignments")
    .select("worker_id, shift:shifts!assignments_shift_id_fkey(id, date)")
    .not("shift_id", "in", `(${shiftIds.join(",")})`);

  const workers: HeuristicWorker[] = workerIds.map((id) => ({
    id,
    heldQualifications: (approvedQuals ?? [])
      .filter((q) => q.worker_id === id)
      .map((q) => ({ qualificationId: q.qualification_id, optionId: q.option_id })),
    availableShiftIds: (availabilityRows ?? [])
      .filter((a) => a.worker_id === id)
      .map((a) => a.shift_id),
    existingAssignedDates: (existingAssignments as unknown as { worker_id: string; shift: { date: string } | null }[] ?? [])
      .filter((a) => a.worker_id === id && a.shift)
      .map((a) => a.shift!.date),
  }));

  const { data: constraintRows } = await supabase
    .from("scheduling_constraints")
    .select("type, qualification_option_id, enabled, value");
  const constraints: ConstraintRow[] = (constraintRows ?? []).map((c) => ({
    type: c.type as ConstraintType,
    qualificationOptionId: c.qualification_option_id,
    enabled: c.enabled,
    value: c.value,
  }));

  const { data: pairingRows } = await supabase
    .from("worker_pairing_preferences")
    .select("worker_id_1, worker_id_2, preference");
  const pairings: PairingInput[] = (pairingRows ?? []).map((p) => ({
    workerId1: p.worker_id_1,
    workerId2: p.worker_id_2,
    preference: p.preference as PairingPreference,
  }));

  return { input: { slots, workers, constraints, pairings }, shiftIds };
}

export type GenerateScheduleState = Result<GenerateScheduleResult>;

/**
 * Regenerates the proposed schedule for every unpublished shift in this window: clears whatever
 * assignments currently exist for those shifts (engine-generated or manual -- see TODO.md, this
 * is a deliberate "always a fresh start" choice, not a merge) and writes fresh proposed
 * assignments (created_by: null) from the heuristic. Nothing is published -- the admin reviews
 * via updateAssignment before calling publishSchedule.
 */
export async function generateSchedule(windowId: string): Promise<GenerateScheduleState> {
  await requireAdmin();

  const supabase = await createClient();
  const built = await buildHeuristicInputForWindow(supabase, windowId);
  if (!built) {
    return { success: true, data: { proposedCount: 0, unfilledSlots: [], softAvoidConflicts: [] } };
  }
  const { input, shiftIds } = built;

  const result = runSchedulingHeuristic(input);

  const { error: deleteError } = await supabase.from("assignments").delete().in("shift_id", shiftIds);
  if (deleteError) {
    return { success: false, error: "שגיאה בניקוי השיבוצים הקודמים" };
  }

  if (result.assignments.length > 0) {
    const { error: insertError } = await supabase.from("assignments").insert(
      result.assignments.map((a) => ({
        shift_id: a.shiftId,
        position_id: a.positionId,
        worker_id: a.workerId,
        created_by: null,
      })),
    );
    if (insertError) {
      return { success: false, error: "שגיאה בשמירת השיבוצים המוצעים" };
    }
  }

  revalidatePath(`/admin/schedule/${windowId}`);
  return {
    success: true,
    data: {
      proposedCount: result.assignments.length,
      unfilledSlots: result.unfilledSlots,
      softAvoidConflicts: result.softAvoidConflicts,
    },
  };
}

/** Manual admin overrides, deliberately unvalidated against qualifications/availability/rest --
 * the whole point of the review step is that the admin has final say and can fix what the
 * heuristic couldn't. The DB's own composite primary key on assignments (shift_id, position_id,
 * worker_id) already prevents an exact duplicate row. */
export async function addAssignment(
  windowId: string,
  shiftId: string,
  positionId: string,
  workerId: string,
): Promise<Result<void>> {
  const admin = await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    shift_id: shiftId,
    position_id: positionId,
    worker_id: workerId,
    created_by: admin.id,
  });
  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "העובד/ת כבר משובץ/ת לתפקיד זה" : "שגיאה בשיבוץ",
    };
  }

  revalidatePath(`/admin/schedule/${windowId}`);
  return { success: true, data: undefined };
}

export async function removeAssignment(
  windowId: string,
  shiftId: string,
  positionId: string,
  workerId: string,
): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("shift_id", shiftId)
    .eq("position_id", positionId)
    .eq("worker_id", workerId);
  if (error) {
    return { success: false, error: "שגיאה בהסרת השיבוץ" };
  }

  revalidatePath(`/admin/schedule/${windowId}`);
  return { success: true, data: undefined };
}

type NotifiableShift = { id: string; date: string; start_time: string; end_time: string };

/** Writes one notification per worker assigned to any of these shifts -- called right after a
 * publish, since that's the moment a shift's assignments become real/visible to the worker
 * (see CLAUDE.md's `assignments` has no status column, publish-timing rule). Best-effort: a
 * notification write failing doesn't roll back the publish itself. */
async function notifyAssignedWorkers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shifts: NotifiableShift[],
): Promise<void> {
  if (shifts.length === 0) return;
  const { data: assignments } = await supabase
    .from("assignments")
    .select("shift_id, worker_id, position:positions!assignments_position_id_fkey(name)")
    .in("shift_id", shifts.map((s) => s.id));
  if (!assignments || assignments.length === 0) return;

  await supabase.from("notifications").insert(
    assignments.map((a) => {
      const shift = shifts.find((s) => s.id === a.shift_id)!;
      const base = `שובצת למשמרת ${shift.date} ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`;
      return {
        worker_id: a.worker_id,
        shift_id: a.shift_id,
        message: a.position?.name ? `${base} · ${a.position.name}` : base,
      };
    }),
  );
}

function revalidateAfterPublishChange(windowId: string) {
  revalidatePath(`/admin/schedule/${windowId}`);
  revalidatePath("/admin/shifts");
  revalidatePath("/my-shifts");
  revalidatePath("/dashboard");
}

/** Publishes one shift (no-op if already published) and notifies every worker assigned to it.
 * Per-shift, not whole-window, on purpose -- an admin should be able to resolve one shift (e.g.
 * a phone call to fill a gap) before publishing it separately from the rest of the window. */
export async function publishShift(windowId: string, shiftId: string): Promise<Result<void>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: shift } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time, published_at")
    .eq("id", shiftId)
    .single();
  if (!shift) {
    return { success: false, error: "המשמרת לא נמצאה" };
  }
  if (shift.published_at) {
    return { success: true, data: undefined };
  }

  const { error } = await supabase
    .from("shifts")
    .update({ published_at: new Date().toISOString() })
    .eq("id", shiftId);
  if (error) {
    return { success: false, error: "שגיאה בפרסום המשמרת" };
  }

  await notifyAssignedWorkers(supabase, [shift]);

  revalidateAfterPublishChange(windowId);
  return { success: true, data: undefined };
}

/** Reverts a mistaken publish -- RLS's publish-timing rule means workers immediately lose
 * visibility of the shift again. Doesn't retract notifications already sent (they're a factual
 * historical record of what was announced, not a live view). */
export async function unpublishShift(windowId: string, shiftId: string): Promise<Result<void>> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update({ published_at: null })
    .eq("id", shiftId);
  if (error) {
    return { success: false, error: "שגיאה בביטול הפרסום" };
  }

  revalidateAfterPublishChange(windowId);
  return { success: true, data: undefined };
}

export type PublishAllResult = { publishedCount: number };

/** Bulk convenience over publishShift -- publishes every still-unpublished shift in the window
 * in one action, for the common case of "generate, review, publish everything at once." */
export async function publishAllShiftsInWindow(windowId: string): Promise<Result<PublishAllResult>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time")
    .eq("availability_window_id", windowId)
    .is("published_at", null);
  if (!shifts || shifts.length === 0) {
    return { success: true, data: { publishedCount: 0 } };
  }
  const shiftIds = shifts.map((s) => s.id);

  const { error } = await supabase
    .from("shifts")
    .update({ published_at: new Date().toISOString() })
    .in("id", shiftIds);
  if (error) {
    return { success: false, error: "שגיאה בפרסום המשמרות" };
  }

  await notifyAssignedWorkers(supabase, shifts);

  revalidateAfterPublishChange(windowId);
  return { success: true, data: { publishedCount: shiftIds.length } };
}

export type { ConstraintType, PairingPreference };
