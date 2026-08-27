"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createShiftTemplate,
  updateShiftTemplate,
  type ShiftTemplateState,
} from "@/features/shift-templates/actions";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Position } from "@/features/positions/queries";
import { ShiftTemplatePositionsPicker } from "./ShiftTemplatePositionsPicker";

/** Reused for both create and edit -- edit mode is just "a template was passed in." */
export function ShiftTemplateForm({
  template,
  allPositions,
  onDone,
}: {
  template?: ShiftTemplate;
  allPositions: Position[];
  onDone?: () => void;
}) {
  const action = template
    ? updateShiftTemplate.bind(null, template.id)
    : createShiftTemplate;
  const [state, formAction, pending] = useActionState<ShiftTemplateState, FormData>(
    action,
    undefined,
  );
  // Same reasoning as PositionForm: forces the picker to remount and clear after a successful
  // create, since its selection state is local, not tied to native form reset.
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
        <Label htmlFor="name">שם התבנית</Label>
        <Input id="name" name="name" className="max-w-56" defaultValue={template?.name} required />
      </div>
      <ShiftTemplatePositionsPicker
        key={resetKey}
        allPositions={allPositions}
        initialSelected={template?.positions}
      />
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : template ? "שמור שינויים" : "הוסף תבנית"}
        </Button>
        {template ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}
