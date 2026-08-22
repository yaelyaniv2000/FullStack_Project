"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

const templateSchema = z.object({
  name: z.string().min(1, "נא להזין שם"),
});

/** Zips the parallel positionId[]/headcountNeeded[] fields back into rows, dropping invalid ones. */
function parsePositionRows(formData: FormData): { positionId: string; headcountNeeded: number }[] {
  const positionIds = formData.getAll("positionId").map(String);
  const headcounts = formData.getAll("headcountNeeded").map(String);
  return positionIds
    .map((positionId, i) => ({ positionId, headcountNeeded: Number(headcounts[i]) }))
    .filter((row) => row.positionId && Number.isInteger(row.headcountNeeded) && row.headcountNeeded > 0);
}

export type ShiftTemplateState = Result<void> | undefined;

export async function createShiftTemplate(
  _prevState: ShiftTemplateState,
  formData: FormData,
): Promise<ShiftTemplateState> {
  await requireAdmin();

  const parsed = templateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const positionRows = parsePositionRows(formData);

  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("shift_templates")
    .insert({ name: parsed.data.name })
    .select()
    .single();
  if (error || !template) {
    return { success: false, error: "שגיאה ביצירת התבנית" };
  }

  if (positionRows.length > 0) {
    const { error: posError } = await supabase.from("shift_template_positions").insert(
      positionRows.map((r) => ({
        template_id: template.id,
        position_id: r.positionId,
        headcount_needed: r.headcountNeeded,
      })),
    );
    if (posError) {
      // Avoid an orphaned template with no matching positions.
      await supabase.from("shift_templates").delete().eq("id", template.id);
      return { success: false, error: "שגיאה בשיוך תפקידים לתבנית" };
    }
  }

  revalidatePath("/admin/shift-templates");
  return { success: true, data: undefined };
}

export async function updateShiftTemplate(
  id: string,
  _prevState: ShiftTemplateState,
  formData: FormData,
): Promise<ShiftTemplateState> {
  await requireAdmin();

  const parsed = templateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const positionRows = parsePositionRows(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_templates")
    .update({ name: parsed.data.name })
    .eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה בעדכון התבנית" };
  }

  // Replace-all sync: these join rows have no independent identity referenced elsewhere, so a
  // clean delete-then-reinsert is safe and much simpler than a diff (same reasoning as
  // position_qualifications in features/positions/actions.ts).
  await supabase.from("shift_template_positions").delete().eq("template_id", id);
  if (positionRows.length > 0) {
    const { error: posError } = await supabase.from("shift_template_positions").insert(
      positionRows.map((r) => ({
        template_id: id,
        position_id: r.positionId,
        headcount_needed: r.headcountNeeded,
      })),
    );
    if (posError) {
      return { success: false, error: "שגיאה בעדכון תפקידי התבנית" };
    }
  }

  revalidatePath("/admin/shift-templates");
  return { success: true, data: undefined };
}

export async function deleteShiftTemplate(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("shift_templates").delete().eq("id", id);
  if (error) {
    return { success: false, error: "שגיאה במחיקת התבנית" };
  }

  revalidatePath("/admin/shift-templates");
  return { success: true, data: undefined };
}
