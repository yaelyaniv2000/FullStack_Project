"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShift, updateShift, type ShiftState } from "@/features/shifts/actions";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import { ShiftPositionsPicker, type PositionRef, type SelectedPosition } from "./ShiftPositionsPicker";

/** Reused for both create and edit -- edit mode is just "a shift was passed in." */
export function ShiftForm({
  shift,
  allPositions,
  allQualifications,
  allTemplates,
  onDone,
}: {
  shift?: Shift;
  allPositions: PositionRef[];
  allQualifications: Qualification[];
  allTemplates: ShiftTemplate[];
  onDone?: () => void;
}) {
  const action = shift ? updateShift.bind(null, shift.id) : createShift;
  const [state, formAction, pending] = useActionState<ShiftState, FormData>(action, undefined);

  // Bumped after a successful submit (clears the picker, same reasoning as PositionForm) and
  // whenever a template is chosen (remounts the picker with that template's positions as its
  // initial selection -- the picker owns its selection state internally, so this is the only way
  // to inject a different starting point from outside).
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerInitial, setPickerInitial] = useState<SelectedPosition[] | undefined>(
    shift?.positions,
  );

  useEffect(() => {
    if (state?.success) {
      onDone?.();
      setPickerInitial(undefined);
      setPickerKey((k) => k + 1);
    }
  }, [state, onDone]);

  function handleTemplateChange(templateId: string) {
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setPickerInitial(template.positions);
    setPickerKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!shift && allTemplates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>התחלה מתבנית (אופציונלי)</Label>
          <Select
            onValueChange={(v) => handleTemplateChange(v as string)}
            items={allTemplates.map((t) => ({ value: t.id, label: t.name }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחירת תבנית" />
            </SelectTrigger>
            <SelectContent>
              {allTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="date">תאריך</Label>
        <Input id="date" name="date" type="date" dir="ltr" defaultValue={shift?.date} required />
      </div>
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="startTime">שעת התחלה</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            dir="ltr"
            defaultValue={shift?.startTime}
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="endTime">שעת סיום</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            dir="ltr"
            defaultValue={shift?.endTime}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">מיקום (אופציונלי)</Label>
        <Input id="location" name="location" defaultValue={shift?.location ?? ""} />
      </div>

      <ShiftPositionsPicker
        key={pickerKey}
        allPositions={allPositions}
        allQualifications={allQualifications}
        initialSelected={pickerInitial}
      />

      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : shift ? "שמור שינויים" : "הוסף משמרת"}
        </Button>
        {shift ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}
