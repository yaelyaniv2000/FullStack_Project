"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

const positionSchema = z.object({
  name: z.string().min(1, "נא להזין שם"),
});

function parseIds(formData: FormData, fieldName: string): string[] {
  return formData.getAll(fieldName).map(String);
}

/** Zips the parallel requiredQualificationId[]/requiredOptionId[] fields back into pairs. */
function parseRequirements(formData: FormData): { qualificationId: string; optionId: string | null }[] {
  const qualIds = formData.getAll("requiredQualificationId").map(String);
  const optionIds = formData.getAll("requiredOptionId").map(String);
  return qualIds.map((qualificationId, i) => ({
    qualificationId,
    optionId: optionIds[i] || null,
  }));
}

export type PositionState = Result<{ id: string; name: string }> | undefined;

export async function createPosition(
  _prevState: PositionState,
  formData: FormData,
): Promise<PositionState> {
  await requireAdmin();

  const parsed = positionSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const requirements = parseRequirements(formData);
  const renewsIds = parseIds(formData, "renewsQualificationId");

  const supabase = await createClient();
  const { data: position, error } = await supabase
    .from("positions")
    .insert({ name: parsed.data.name })
    .select()
    .single();
  if (error || !position) {
    return {
      success: false,
      error: error?.code === "23505" ? "תפקיד בשם הזה כבר קיים" : "שגיאה ביצירת התפקיד",
    };
  }

  if (requirements.length > 0) {
    const { error: reqError } = await supabase.from("position_qualifications").insert(
      requirements.map((r) => ({
        position_id: position.id,
        qualification_id: r.qualificationId,
        option_id: r.optionId,
      })),
    );
    if (reqError) {
      await supabase.from("positions").delete().eq("id", position.id);
      return { success: false, error: "שגיאה בשיוך כשירויות נדרשות" };
    }
  }
  if (renewsIds.length > 0) {
    const { error: renError } = await supabase
      .from("position_renews_qualifications")
      .insert(renewsIds.map((qid) => ({ position_id: position.id, qualification_id: qid })));
    if (renError) {
      // Cascades away the required-qualification links inserted above too.
      await supabase.from("positions").delete().eq("id", position.id);
      return { success: false, error: "שגיאה בשיוך כשירויות מתחדשות" };
    }
  }

  revalidatePath("/admin/positions");
  return { success: true, data: { id: position.id, name: position.name } };
}

export async function updatePosition(
  id: string,
  _prevState: PositionState,
  formData: FormData,
): Promise<PositionState> {
  await requireAdmin();

  const parsed = positionSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const requirements = parseRequirements(formData);
  const renewsIds = parseIds(formData, "renewsQualificationId");

  const supabase = await createClient();
  const { error } = await supabase
    .from("positions")
    .update({ name: parsed.data.name })
    .eq("id", id);
  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "תפקיד בשם הזה כבר קיים" : "שגיאה בעדכון התפקיד",
    };
  }

  // Replace-all sync: these join rows have no independent identity referenced elsewhere
  // (unlike qualification_options, which worker_qualifications.option_id points at), so a
  // clean delete-then-reinsert is safe and much simpler than a diff.
  await supabase.from("position_qualifications").delete().eq("position_id", id);
  if (requirements.length > 0) {
    const { error: reqError } = await supabase.from("position_qualifications").insert(
      requirements.map((r) => ({
        position_id: id,
        qualification_id: r.qualificationId,
        option_id: r.optionId,
      })),
    );
    if (reqError) {
      return { success: false, error: "שגיאה בעדכון כשירויות נדרשות" };
    }
  }

  await supabase.from("position_renews_qualifications").delete().eq("position_id", id);
  if (renewsIds.length > 0) {
    await supabase
      .from("position_renews_qualifications")
      .insert(renewsIds.map((qid) => ({ position_id: id, qualification_id: qid })));
  }

  revalidatePath("/admin/positions");
  return { success: true, data: { id, name: parsed.data.name } };
}

export async function deletePosition(id: string): Promise<Result<void>> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("positions").delete().eq("id", id);
  if (error) {
    return {
      success: false,
      error:
        error.code === "23503"
          ? "לא ניתן למחוק — התפקיד עדיין בשימוש (במשמרת או בתבנית)"
          : "שגיאה במחיקת התפקיד",
    };
  }

  revalidatePath("/admin/positions");
  return { success: true, data: undefined };
}