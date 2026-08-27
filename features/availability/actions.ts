"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireWorker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

/** Upsert on (worker_id, shift_id) -- resubmission just overwrites, per
 * docs/technical-plan.md's CRUD table ("no separate delete"). Accepts multiple shift IDs so one
 * response can cover every shift in an overlapping-time slot group (see
 * features/availability/queries.ts's AvailabilitySlot) -- a plain single-shift response is just
 * the one-element case. */
export async function submitAvailability(
  shiftIds: string[],
  isAvailable: boolean,
): Promise<Result<void>> {
  const worker = await requireWorker();

  const supabase = await createClient();
  const { error } = await supabase.from("availability").upsert(
    shiftIds.map((shiftId) => ({
      worker_id: worker.id,
      shift_id: shiftId,
      is_available: isAvailable,
      responded_at: new Date().toISOString(),
    })),
    { onConflict: "worker_id,shift_id" },
  );
  if (error) {
    return { success: false, error: "שגיאה בשמירת הזמינות" };
  }

  revalidatePath("/availability");
  return { success: true, data: undefined };
}

/** Worker-side flag for "I marked available but can't actually make it," raised after a window
 * has closed and the worker can no longer just toggle their response. Doesn't touch `assignments`
 * or `availability` itself -- the admin sees it, acknowledges it, and makes (or doesn't make) the
 * schedule change manually, per user feedback (2026-08-28). */
export async function requestAvailabilityChange(
  shiftId: string,
  message: string | null,
): Promise<Result<void>> {
  const worker = await requireWorker();

  const supabase = await createClient();
  const { error } = await supabase.from("availability_change_requests").insert({
    worker_id: worker.id,
    shift_id: shiftId,
    message: message?.trim() || null,
  });
  if (error) {
    return { success: false, error: "שגיאה בשליחת הבקשה" };
  }

  revalidatePath("/availability");
  return { success: true, data: undefined };
}

/** Admin marks a change request as seen -- the worker then sees "אושר ע״י האדמין" on their own
 * closed-window view. Purely an acknowledgment; making (or not making) the actual schedule
 * change is a separate, manual step via the existing add/remove-assignment UI. */
export async function acknowledgeChangeRequest(id: string, windowId: string): Promise<Result<void>> {
  const admin = await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_change_requests")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: admin.id })
    .eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה בסימון הבקשה כנצפתה" };
  }

  revalidatePath(`/admin/schedule/${windowId}`);
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
