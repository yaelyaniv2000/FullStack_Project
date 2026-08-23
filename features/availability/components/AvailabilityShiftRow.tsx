"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitAvailability } from "../actions";
import type { AvailabilityShift } from "../queries";

/** Instant toggle feel for a quick phone interaction (per CLAUDE.md's state-management
 * conventions: useOptimistic for the few interactions worth it, availability toggles being the
 * canonical example). */
export function AvailabilityShiftRow({ shift }: { shift: AvailabilityShift }) {
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(shift.isAvailable);
  const [isPending, startTransition] = useTransition();

  function respond(value: boolean) {
    startTransition(async () => {
      setOptimisticAvailable(value);
      await submitAvailability(shift.shiftId, value);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
      <span className="text-sm">
        <span dir="ltr">
          {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
        </span>
        {shift.location ? ` · ${shift.location}` : ""}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={optimisticAvailable === true ? "default" : "outline"}
          disabled={isPending}
          onClick={() => respond(true)}
        >
          זמין/ה
        </Button>
        <Button
          size="sm"
          variant={optimisticAvailable === false ? "destructive" : "outline"}
          disabled={isPending}
          onClick={() => respond(false)}
        >
          לא זמין/ה
        </Button>
      </div>
    </li>
  );
}
