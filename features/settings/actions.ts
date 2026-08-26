"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

const settingsSchema = z.object({
  expiringSoonDays: z.number().int("נא להזין מספר שלם").positive("נא להזין מספר חיובי"),
});

export type AppSettingsState = Result<void> | undefined;

/** app_settings is a true singleton (unique index enforces exactly one row), so this updates
 * with no filter -- there's only ever one row for it to match. */
export async function updateExpiringSoonDays(
  _prevState: AppSettingsState,
  formData: FormData,
): Promise<AppSettingsState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    expiringSoonDays: Number(formData.get("expiringSoonDays")),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ expiring_soon_days: parsed.data.expiringSoonDays, updated_at: new Date().toISOString() })
    .not("id", "is", null);
  if (error) {
    return { success: false, error: "שגיאה בעדכון ההגדרה" };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
