"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";
import type { ConstraintType, PairingPreference } from "./queries";

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

export type { ConstraintType, PairingPreference };
