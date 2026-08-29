"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShiftStatusBadge } from "./ShiftStatusBadge";
import type { Shift } from "@/features/shifts/queries";

/** A published shift shown from the calendar -- view-only, per the same "already occurred/
 * finalized -- can't edit, can only see who was assigned" rule already established for past
 * shifts (ShiftsList's readOnly mode) and for the deferred calendar's color states. */
export function ShiftReadOnlyView({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {shift.name ? <span className="font-bold">{shift.name}</span> : null}
        <span dir="ltr" className={shift.name ? "text-sm text-muted-foreground" : "font-medium"}>
          {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
        </span>
        {shift.location ? <span className="text-sm text-muted-foreground">{shift.location}</span> : null}
        <ShiftStatusBadge shift={shift} />
        {shift.availabilityWindowLabel ? (
          <Badge variant="secondary">{shift.availabilityWindowLabel}</Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">תפקידים נדרשים</span>
        <div className="flex flex-wrap gap-1.5">
          {shift.positions.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : (
            shift.positions.map((p) => (
              <Badge key={p.positionId} variant="secondary">
                {p.positionName} ×{p.headcountNeeded}
              </Badge>
            ))
          )}
        </div>
      </div>

      {shift.assignedWorkerNames.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">משובצים</span>
          <div className="flex flex-wrap gap-1.5">
            {shift.assignedWorkerNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        משמרת שפורסמה לא ניתנת לעריכה מכאן — ניתן לנהל שיבוצים דרך עמוד שיבוץ המשמרות.
      </p>

      <Button type="button" variant="outline" onClick={onClose}>
        סגירה
      </Button>
    </div>
  );
}
