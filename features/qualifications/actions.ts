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

/** Zips the parallel optionId[]/optionLabel[] form fields back into rows, dropping blanks. */
function parseOptionRows(formData: FormData): { id?: string; label: string }[] {
  const ids = formData.getAll("optionId").map(String);
  const labels = formData.getAll("optionLabel").map(String);
  return ids
    .map((id, i) => ({ id: id || undefined, label: labels[i]?.trim() ?? "" }))
    .filter((row) => row.label.length > 0);
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
  const options = parseOptionRows(formData);

  const supabase = await createClient();
  const { data: qualification, error } = await supabase
    .from("qualifications")
    .insert({
      name: parsed.data.name,
      renewal_interval_days: parsed.data.renewalIntervalDays,
    })
    .select()
    .single();
  if (error || !qualification) {
    return {
      success: false,
      error: error?.code === "23505" ? "כשירות בשם הזה כבר קיימת" : "שגיאה ביצירת הכשירות",
    };
  }

  if (options.length > 0) {
    const { error: optionsError } = await supabase.from("qualification_options").insert(
      options.map((o, i) => ({
        qualification_id: qualification.id,
        label: o.label,
        sort_order: i,
      })),
    );
    if (optionsError) {
      // Avoid an orphaned qualification with no matching options.
      await supabase.from("qualifications").delete().eq("id", qualification.id);
      return {
        success: false,
        error:
          optionsError.code === "23505"
            ? "יש כפילות בשמות האפשרויות"
            : "שגיאה ביצירת אפשרויות הבחירה",
      };
    }
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
  const submittedOptions = parseOptionRows(formData);

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

  const { data: existing } = await supabase
    .from("qualification_options")
    .select("id")
    .eq("qualification_id", id);
  const existingIds = new Set((existing ?? []).map((o) => o.id));
  const submittedIds = new Set(submittedOptions.filter((o) => o.id).map((o) => o.id));

  const toDelete = [...existingIds].filter((existingId) => !submittedIds.has(existingId));
  const toUpdate = submittedOptions.filter((o) => o.id && existingIds.has(o.id));
  const toInsert = submittedOptions.filter((o) => !o.id);

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("qualification_options")
      .delete()
      .in("id", toDelete);
    if (deleteError) {
      return {
        success: false,
        error:
          deleteError.code === "23503"
            ? "לא ניתן להסיר אפשרות שכבר משויכת לעובד"
            : "שגיאה בעדכון אפשרויות הבחירה",
      };
    }
  }
  for (const [i, o] of toUpdate.entries()) {
    await supabase
      .from("qualification_options")
      .update({ label: o.label, sort_order: i })
      .eq("id", o.id!);
  }
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("qualification_options").insert(
      toInsert.map((o, i) => ({
        qualification_id: id,
        label: o.label,
        sort_order: toUpdate.length + i,
      })),
    );
    if (insertError) {
      return {
        success: false,
        error:
          insertError.code === "23505" ? "יש כפילות בשמות האפשרויות" : "שגיאה בהוספת אפשרויות",
      };
    }
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