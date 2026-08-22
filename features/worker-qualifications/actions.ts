"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

const grantSchema = z.object({
  qualificationId: z.string().min(1, "נא לבחור כשירות"),
  optionId: z.string().nullable(),
  obtainedAt: z.string().min(1, "נא לבחור תאריך"),
});

export type GrantQualificationState = Result<void> | undefined;

export async function grantQualification(
  workerId: string,
  _prevState: GrantQualificationState,
  formData: FormData,
): Promise<GrantQualificationState> {
  const admin = await requireAdmin();

  const rawOptionId = String(formData.get("optionId") ?? "");
  const parsed = grantSchema.safeParse({
    qualificationId: formData.get("qualificationId"),
    optionId: rawOptionId || null,
    obtainedAt: formData.get("obtainedAt"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("worker_qualifications").insert({
    worker_id: workerId,
    qualification_id: parsed.data.qualificationId,
    option_id: parsed.data.optionId,
    source: "admin_granted",
    status: "approved",
    obtained_at: parsed.data.obtainedAt,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  });
  if (error) {
    return {
      success: false,
      error:
        error.code === "23505"
          ? "לעובד/ת כבר יש כשירות זו"
          : error.code === "P0001"
            ? "בחירת האפשרות אינה תואמת לכשירות שנבחרה"
            : "שגיאה בהענקת הכשירות",
    };
  }

  revalidatePath(`/admin/personnel/${workerId}`);
  return { success: true, data: undefined };
}

async function updateQualificationStatus(
  id: string,
  workerId: string,
  status: "approved" | "rejected",
  errorMessage: string,
): Promise<Result<void>> {
  const admin = await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("worker_qualifications")
    .update({ status, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return { success: false, error: errorMessage };
  }

  revalidatePath(`/admin/personnel/${workerId}`);
  return { success: true, data: undefined };
}

/** Cancels a currently-active (admin-granted or already-approved) qualification. */
export async function revokeQualification(id: string, workerId: string): Promise<Result<void>> {
  return updateQualificationStatus(id, workerId, "rejected", "שגיאה בביטול הכשירות");
}

/** Approves or rejects a worker's pending self-reported qualification. */
export async function reviewQualification(
  id: string,
  workerId: string,
  decision: "approved" | "rejected",
): Promise<Result<void>> {
  return updateQualificationStatus(id, workerId, decision, "שגיאה בעדכון סטטוס הכשירות");
}
