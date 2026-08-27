"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitAvailability } from "../actions";
import type { AvailabilitySlot } from "../queries";

/** Instant toggle feel for a quick phone interaction (per CLAUDE.md's state-management
 * conventions: useOptimistic for the few interactions worth it, availability toggles being the
 * canonical example). One row per time slot, which may cover more than one underlying shift
 * (see AvailabilitySlot) -- responding writes to all of them at once. */
export function AvailabilityShiftRow({ slot }: { slot: AvailabilitySlot }) {
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(slot.isAvailable);
  const [isPending, startTransition] = useTransition();

  function respond(value: boolean) {
    startTransition(async () => {
      setOptimisticAvailable(value);
      await submitAvailability(slot.shiftIds, value);
    });
  }

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded border p-3 ${
        slot.mayRenewExpiringQualification ? "border-primary bg-primary/5" : ""
      }`}
    >
      <span className="flex flex-wrap items-center gap-1.5 text-sm">
        <span dir="ltr">
          {slot.date} · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
        </span>
        {slot.locations.length > 0 ? ` · ${slot.locations.join(", ")}` : ""}
        {slot.mayRenewExpiringQualification ? (
          <Badge variant="default">מחדשת כשירות שעומדת לפוג</Badge>
        ) : null}
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
