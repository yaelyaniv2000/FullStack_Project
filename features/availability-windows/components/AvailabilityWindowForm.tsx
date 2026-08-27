"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAvailabilityWindow,
  updateAvailabilityWindow,
  type AvailabilityWindowState,
} from "@/features/availability-windows/actions";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

/** timestamptz from the DB (e.g. "2026-09-01T08:00:00+00:00") -> separate date ("2026-09-01") and
 * time ("08:00") strings for the two split inputs. Pure string slicing, no timezone math -- this
 * app treats all date/times as literal wall-clock values throughout (see `shifts`), not real
 * timezone-aware instants, so round-tripping via slice is consistent with how they're written in
 * the first place. */
function splitIso(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Reused for both create and edit -- edit mode is just "a window was passed in." Date and time
 * are separate inputs (per UX feedback), combined into the single `opensAt`/`closesAt` value the
 * server action expects -- form-only change, no schema/action impact, same pattern as
 * min_rest_hours' days+hours combining in features/scheduling/actions.ts. */
export function AvailabilityWindowForm({
  window,
  onDone,
  onCreated,
}: {
  window?: AvailabilityWindow;
  onDone?: () => void;
  /** Fired only on a successful create (not edit), same pattern as PositionForm -- lets a caller
   * embedding this form in a dialog (e.g. ShiftForm's "חלון זמינות חדש") select the newly
   * created window immediately without waiting for a full page refresh. */
  onCreated?: (window: { id: string; label: string }) => void;
}) {
  const action = window
    ? updateAvailabilityWindow.bind(null, window.id)
    : createAvailabilityWindow;
  const [state, formAction, pending] = useActionState<AvailabilityWindowState, FormData>(
    action,
    undefined,
  );

  const initialOpens = splitIso(window?.opensAt);
  const initialCloses = splitIso(window?.closesAt);
  const [opensDate, setOpensDate] = useState(initialOpens.date);
  const [opensTime, setOpensTime] = useState(initialOpens.time);
  const [closesDate, setClosesDate] = useState(initialCloses.date);
  const [closesTime, setClosesTime] = useState(initialCloses.time);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
      if (!window && state.data) onCreated?.(state.data);
    }
  }, [state, onDone, onCreated, window]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">שם החלון</Label>
        <Input id="label" name="label" className="max-w-56" defaultValue={window?.label} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label>פתיחה</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            dir="ltr"
            className="w-40 text-right"
            value={opensDate}
            onChange={(e) => setOpensDate(e.target.value)}
            required
          />
          <Input
            type="time"
            dir="ltr"
            className="w-28 text-right"
            value={opensTime}
            onChange={(e) => setOpensTime(e.target.value)}
            required
          />
        </div>
        <input type="hidden" name="opensAt" value={opensDate && opensTime ? `${opensDate}T${opensTime}` : ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>סגירה</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            dir="ltr"
            className="w-40 text-right"
            value={closesDate}
            onChange={(e) => setClosesDate(e.target.value)}
            required
          />
          <Input
            type="time"
            dir="ltr"
            className="w-28 text-right"
            value={closesTime}
            onChange={(e) => setClosesTime(e.target.value)}
            required
          />
        </div>
        <input type="hidden" name="closesAt" value={closesDate && closesTime ? `${closesDate}T${closesTime}` : ""} />
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
