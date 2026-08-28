"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

export const windowSchema = z
  .object({
    label: z.string().min(1, "נא להזין שם"),
    opensAt: z.string().min(1, "נא לבחור תאריך פתיחה"),
    closesAt: z.string().min(1, "נא לבחור תאריך סגירה"),
  })
  .refine((v) => v.closesAt > v.opensAt, {
    message: "תאריך הסגירה חייב להיות אחרי תאריך הפתיחה",
    path: ["closesAt"],
  });

function parseWindowFields(formData: FormData) {
  return windowSchema.safeParse({
    label: formData.get("label"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
  });
}

export type AvailabilityWindowState = Result<{ id: string; label: string }> | undefined;

export async function createAvailabilityWindow(
  _prevState: AvailabilityWindowState,
  formData: FormData,
): Promise<AvailabilityWindowState> {
  await requireAdmin();

  const parsed = parseWindowFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: window, error } = await supabase
    .from("availability_windows")
    .insert({
      label: parsed.data.label,
      opens_at: parsed.data.opensAt,
      closes_at: parsed.data.closesAt,
    })
    .select()
    .single();
  if (error || !window) {
    return { success: false, error: "שגיאה ביצירת חלון הזמינות" };
  }

  revalidatePath("/admin/availability-windows");
  revalidatePath("/admin/shifts");
  return { success: true, data: { id: window.id, label: window.label } };
}

export async function updateAvailabilityWindow(
  id: string,
  _prevState: AvailabilityWindowState,
  formData: FormData,
): Promise<AvailabilityWindowState> {
  await requireAdmin();

  const parsed = parseWindowFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_windows")
    .update({
      label: parsed.data.label,
      opens_at: parsed.data.opensAt,
      closes_at: parsed.data.closesAt,
    })
    .eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה בעדכון חלון הזמינות" };
  }

  revalidatePath("/admin/availability-windows");
  return { success: true, data: { id, label: parsed.data.label } };
}

export async function deleteAvailabilityWindow(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("availability_windows").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      error:
        error.code === "23503"
          ? "לא ניתן למחוק — קיימות משמרות המשויכות לחלון זה"
          : "שגיאה במחיקת חלון הזמינות",
    };
  }

  revalidatePath("/admin/availability-windows");
  return { success: true, data: undefined };
}
