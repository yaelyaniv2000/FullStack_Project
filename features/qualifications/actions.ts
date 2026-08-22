"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

const qualificationSchema = z.object({
  name: z.string().min(1, "נא להזין שם"),
  renewalIntervalDays: z
    .number()
    .int("נא להזין מספר שלם")
    .positive("נא להזין מספר חיובי")
    .nullable(),
});

/** Empty input means "never expires" (null) -- NaN means the user typed something invalid. */
function parseRenewalInterval(raw: FormDataEntryValue | null): number | null {
  if (raw === null || String(raw).trim() === "") return null;
  return Number(raw);
}

export type QualificationState = Result<void> | undefined;

export async function createQualification(
  _prevState: QualificationState,
  formData: FormData,
): Promise<QualificationState> {
  await requireAdmin();

  const parsed = qualificationSchema.safeParse({
    name: formData.get("name"),
    renewalIntervalDays: parseRenewalInterval(formData.get("renewalIntervalDays")),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("qualifications").insert({
    name: parsed.data.name,
    renewal_interval_days: parsed.data.renewalIntervalDays,
  });
  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "כשירות בשם הזה כבר קיימת" : "שגיאה ביצירת הכשירות",
    };
  }

  revalidatePath("/admin/qualifications");
  return { success: true, data: undefined };
}

export async function updateQualification(
  id: string,
  _prevState: QualificationState,
  formData: FormData,
): Promise<QualificationState> {
  await requireAdmin();

  const parsed = qualificationSchema.safeParse({
    name: formData.get("name"),
    renewalIntervalDays: parseRenewalInterval(formData.get("renewalIntervalDays")),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("qualifications")
    .update({
      name: parsed.data.name,
      renewal_interval_days: parsed.data.renewalIntervalDays,
    })
    .eq("id", id);
  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "כשירות בשם הזה כבר קיימת" : "שגיאה בעדכון הכשירות",
    };
  }

  revalidatePath("/admin/qualifications");
  return { success: true, data: undefined };
}

export async function deleteQualification(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("qualifications").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      error:
        error.code === "23503"
          ? "לא ניתן למחוק — הכשירות עדיין בשימוש (משויכת לתפקיד או לעובד)"
          : "שגיאה במחיקת הכשירות",
    };
  }

  revalidatePath("/admin/qualifications");
  return { success: true, data: undefined };
}