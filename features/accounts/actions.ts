"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Result } from "@/lib/result";
import { createWorkerSchema } from "./schema";

export type CreateWorkerState = Result<void> | undefined;

/**
 * Admin-only: creates a worker's account directly (email + password the admin sets, no email
 * sent -- see CLAUDE.md). Uses the service-role client for both steps, since there is no RLS
 * policy that lets even an admin's own session INSERT into `profiles` directly (see the RLS
 * migration) -- account creation is deliberately a service-role-only path.
 */
export async function createWorkerAccount(
  _prevState: CreateWorkerState,
  formData: FormData,
): Promise<CreateWorkerState> {
  await requireAdmin();

  const parsed = createWorkerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();

  const { data, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !data.user) {
    return {
      success: false,
      error: createError?.message ?? "שגיאה ביצירת המשתמש",
    };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, full_name: parsed.data.fullName, role: "worker" });
  if (profileError) {
    // Avoid an orphaned auth user with no matching profile row.
    await admin.auth.admin.deleteUser(data.user.id);
    return { success: false, error: "שגיאה ביצירת הפרופיל" };
  }

  revalidatePath("/admin/personnel");
  return { success: true, data: undefined };
}