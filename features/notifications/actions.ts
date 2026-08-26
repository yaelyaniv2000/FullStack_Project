"use server";

import { revalidatePath } from "next/cache";
import { requireWorker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

/** RLS already scopes updates to the caller's own notifications (worker_id = auth.uid()); the
 * explicit .eq is defense in depth, same convention used elsewhere in this codebase. */
export async function markNotificationRead(id: string): Promise<Result<void>> {
  const worker = await requireWorker();

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("worker_id", worker.id);
  if (error) {
    return { success: false, error: "שגיאה בסימון ההתראה כנקראה" };
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function markAllNotificationsRead(): Promise<Result<void>> {
  const worker = await requireWorker();

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("worker_id", worker.id)
    .is("read_at", null);
  if (error) {
    return { success: false, error: "שגיאה בסימון ההתראות כנקראו" };
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
