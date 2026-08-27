"use server";

import { revalidatePath } from "next/cache";
import { requireWorker } from "@/lib/auth";
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
