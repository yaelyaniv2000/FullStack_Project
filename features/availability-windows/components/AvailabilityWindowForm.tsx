"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAvailabilityWindow,
  updateAvailabilityWindow,
  type AvailabilityWindowState,
} from "@/features/availability-windows/actions";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

/** timestamptz from the DB (e.g. "2026-09-01T08:00:00+00:00") -> what <input type="datetime-local">
 * expects ("2026-09-01T08:00"). Pure string slicing, no timezone math -- this app treats all
 * date/times as literal wall-clock values throughout (see `shifts`), not real timezone-aware
 * instants, so round-tripping via slice is consistent with how they're written in the first place. */
function toDatetimeLocalValue(iso?: string): string | undefined {
  return iso?.slice(0, 16);
}

/** Reused for both create and edit -- edit mode is just "a window was passed in." */
export function AvailabilityWindowForm({
  window,
  onDone,
}: {
  window?: AvailabilityWindow;
  onDone?: () => void;
}) {
  const action = window
    ? updateAvailabilityWindow.bind(null, window.id)
    : createAvailabilityWindow;
  const [state, formAction, pending] = useActionState<AvailabilityWindowState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">שם החלון</Label>
        <Input id="label" name="label" defaultValue={window?.label} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="opensAt">פתיחה</Label>
        <Input
          id="opensAt"
          name="opensAt"
          type="datetime-local"
          dir="ltr"
          defaultValue={toDatetimeLocalValue(window?.opensAt)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="closesAt">סגירה</Label>
        <Input
          id="closesAt"
          name="closesAt"
          type="datetime-local"
          dir="ltr"
          defaultValue={toDatetimeLocalValue(window?.closesAt)}
          required
        />
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : window ? "שמור שינויים" : "פתיחת חלון"}
        </Button>
        {window ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}
