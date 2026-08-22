"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPosition,
  updatePosition,
  type PositionState,
} from "@/features/positions/actions";
import type { Position, QualificationRef } from "@/features/positions/queries";
import { QualificationCheckboxList } from "./QualificationCheckboxList";

/** Reused for both create and edit -- edit mode is just "a position was passed in." */
export function PositionForm({
  position,
  allQualifications,
  onDone,
}: {
  position?: Position;
  allQualifications: QualificationRef[];
  onDone?: () => void;
}) {
  const action = position
    ? updatePosition.bind(null, position.id)
    : createPosition;
  const [state, formAction, pending] = useActionState<PositionState, FormData>(
    action,
    undefined,
  );
  // Same reasoning as QualificationForm: forces the checkbox lists to remount and clear
  // after a successful create, since their selection state is local, not tied to native
  // form reset.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
      setResetKey((k) => k + 1);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">שם התפקיד</Label>
        <Input id="name" name="name" defaultValue={position?.name} required />
      </div>
      <QualificationCheckboxList
        key={`required-${resetKey}`}
        name="requiredQualificationId"
        label="כשירויות נדרשות"
        allQualifications={allQualifications}
        initiallySelectedIds={position?.requiredQualifications.map((q) => q.id)}
      />
      <QualificationCheckboxList
        key={`renews-${resetKey}`}
        name="renewsQualificationId"
        label="כשירויות שהתפקיד מחדש (אופציונלי)"
        allQualifications={allQualifications}
        initiallySelectedIds={position?.renewsQualifications.map((q) => q.id)}
      />
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : position ? "שמור שינויים" : "הוסף תפקיד"}
        </Button>
        {position ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}