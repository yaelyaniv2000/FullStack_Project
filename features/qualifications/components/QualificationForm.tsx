"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createQualification,
  updateQualification,
  type QualificationState,
} from "@/features/qualifications/actions";
import type { Qualification } from "@/features/qualifications/queries";

/** Reused for both create and edit -- edit mode is just "a qualification was passed in." */
export function QualificationForm({
  qualification,
  onDone,
}: {
  qualification?: Qualification;
  onDone?: () => void;
}) {
  const action = qualification
    ? updateQualification.bind(null, qualification.id)
    : createQualification;
  const [state, formAction, pending] = useActionState<QualificationState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">שם הכשירות</Label>
        <Input id="name" name="name" defaultValue={qualification?.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="renewalIntervalDays">תוקף בימים (השאירו ריק אם אינה פגה)</Label>
        <Input
          id="renewalIntervalDays"
          name="renewalIntervalDays"
          type="number"
          min={1}
          defaultValue={qualification?.renewal_interval_days ?? ""}
        />
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : qualification ? "שמור שינויים" : "הוסף כשירות"}
        </Button>
        {qualification ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}