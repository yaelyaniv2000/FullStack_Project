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
import type { Position } from "@/features/positions/queries";
import type { Qualification } from "@/features/qualifications/queries";
import { QualificationMultiPicker } from "./QualificationMultiPicker";

/** Reused for both create and edit -- edit mode is just "a position was passed in." */
export function PositionForm({
  position,
  allQualifications,
  onDone,
  onCreated,
}: {
  position?: Position;
  allQualifications: Qualification[];
  onDone?: () => void;
  /** Fired only on a successful create (not edit), with the newly created position's id/name. */
  onCreated?: (position: { id: string; name: string }) => void;
}) {
  const action = position
    ? updatePosition.bind(null, position.id)
    : createPosition;
  const [state, formAction, pending] = useActionState<PositionState, FormData>(
    action,
    undefined,
  );
  // Same reasoning as QualificationForm: forces the pickers to remount and clear after a
  // successful create, since their selection state is local, not tied to native form reset.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
      if (!position && state.data) onCreated?.(state.data);
      setResetKey((k) => k + 1);
    }
  }, [state, onDone, onCreated, position]);

  // A qualification that never expires (renewal_interval_days null) has nothing to renew --
  // only offer expiring qualifications in the "renews" picker.
  const renewableQualifications = allQualifications.filter(
    (q) => q.renewal_interval_days !== null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">שם התפקיד</Label>
        <Input id="name" name="name" className="max-w-56" defaultValue={position?.name} required />
      </div>
      <QualificationMultiPicker
        key={`required-${resetKey}`}
        qualificationFieldName="requiredQualificationId"
        optionFieldName="requiredOptionId"
        label="כשירויות נדרשות"
        allQualifications={allQualifications}
        allowOptionSelection
        initialSelected={position?.requiredQualifications.map((r) => ({
          qualificationId: r.qualificationId,
          qualificationName: r.qualificationName,
          optionId: r.optionId,
          optionLabel: r.optionLabel,
        }))}
      />
      <QualificationMultiPicker
        key={`renews-${resetKey}`}
        qualificationFieldName="renewsQualificationId"
        optionFieldName="renewsOptionId__unused"
        label="כשירויות שהתפקיד מחדש (אופציונלי)"
        allQualifications={renewableQualifications}
        allowOptionSelection={false}
        initialSelected={position?.renewsQualifications.map((q) => ({
          qualificationId: q.id,
          qualificationName: q.name,
          optionId: null,
          optionLabel: null,
        }))}
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