"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";
import { shiftSchema } from "./schema";

/** Zips the parallel positionId[]/headcountNeeded[] fields back into rows, dropping invalid ones. */
function parsePositionRows(formData: FormData): { positionId: string; headcountNeeded: number }[] {
  const positionIds = formData.getAll("positionId").map(String);
  const headcounts = formData.getAll("headcountNeeded").map(String);
  return positionIds
    .map((positionId, i) => ({ positionId, headcountNeeded: Number(headcounts[i]) }))
    .filter((row) => row.positionId && Number.isInteger(row.headcountNeeded) && row.headcountNeeded > 0);
}

function parseShiftFields(formData: FormData) {
  const rawName = String(formData.get("name") ?? "").trim();
  const rawLocation = String(formData.get("location") ?? "").trim();
  const rawWindowId = String(formData.get("availabilityWindowId") ?? "").trim();
  return shiftSchema.safeParse({
    name: rawName || null,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: rawLocation || null,
    availabilityWindowId: rawWindowId || null,
  });
}

export type ShiftState = Result<void> | undefined;

export async function createShift(
  _prevState: ShiftState,
  formData: FormData,
): Promise<ShiftState> {
  await requireAdmin();

  const parsed = parseShiftFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const positionRows = parsePositionRows(formData);

  const supabase = await createClient();
  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      name: parsed.data.name,
      date: parsed.data.date,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      location: parsed.data.location,
      availability_window_id: parsed.data.availabilityWindowId,
    })
    .select()
    .single();
  if (error || !shift) {
    return { success: false, error: "שגיאה ביצירת המשמרת" };
  }

  if (positionRows.length > 0) {
    const { error: posError } = await supabase.from("shift_positions").insert(
      positionRows.map((r) => ({
        shift_id: shift.id,
        position_id: r.positionId,
        headcount_needed: r.headcountNeeded,
      })),
    );
    if (posError) {
      // Avoid an orphaned shift with no matching positions.
      await supabase.from("shifts").delete().eq("id", shift.id);
      return { success: false, error: "שגיאה בשיוך תפקידים למשמרת" };
    }
  }

  revalidatePath("/admin/shifts");
  return { success: true, data: undefined };
}

export async function updateShift(
  id: string,
  _prevState: ShiftState,
  formData: FormData,
): Promise<ShiftState> {
  await requireAdmin();

  const parsed = parseShiftFields(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const positionRows = parsePositionRows(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      name: parsed.data.name,
      date: parsed.data.date,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      location: parsed.data.location,
      availability_window_id: parsed.data.availabilityWindowId,
    })
    .eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה בעדכון המשמרת" };
  }

  // Replace-all sync: these join rows have no independent identity referenced elsewhere, same
  // reasoning as position_qualifications / shift_template_positions.
  await supabase.from("shift_positions").delete().eq("shift_id", id);
  if (positionRows.length > 0) {
    const { error: posError } = await supabase.from("shift_positions").insert(
      positionRows.map((r) => ({
        shift_id: id,
        position_id: r.positionId,
        headcount_needed: r.headcountNeeded,
      })),
    );
    if (posError) {
      return { success: false, error: "שגיאה בעדכון תפקידי המשמרת" };
    }
  }

  revalidatePath("/admin/shifts");
  return { success: true, data: undefined };
}

export async function deleteShift(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: shift } = await supabase
    .from("shifts")
    .select("published_at")
    .eq("id", id)
    .single();
  if (shift?.published_at) {
    return { success: false, error: "לא ניתן למחוק משמרת שפורסמה" };
  }

  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה במחיקת המשמרת" };
  }

  revalidatePath("/admin/shifts");
  return { success: true, data: undefined };
}
