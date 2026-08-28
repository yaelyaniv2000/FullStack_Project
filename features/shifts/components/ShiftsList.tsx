"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShiftForm } from "./ShiftForm";
import { ShiftStatusBadge } from "./ShiftStatusBadge";
import { deleteShift } from "@/features/shifts/actions";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import type { PositionRef } from "./ShiftPositionsPicker";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

export function ShiftsList({
  shifts,
  allPositions,
  allQualifications,
  allTemplates,
  allAvailabilityWindows,
  readOnly = false,
}: {
  shifts: Shift[];
  allPositions?: PositionRef[];
  allQualifications?: Qualification[];
  allTemplates?: ShiftTemplate[];
  allAvailabilityWindows?: AvailabilityWindow[];
  /** Past shifts: view-only, per the same "already occurred -- can't edit, can only see who was
   * assigned" rule already established for the (deferred) calendar's color states. */
  readOnly?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteShift(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין משמרות מוגדרות.</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredShifts = normalizedQuery
    ? shifts.filter((s) =>
        [s.name, s.location, s.date, ...s.positions.map((p) => p.positionName), ...s.assignedWorkerNames]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(normalizedQuery)),
      )
    : shifts;

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="חיפוש משמרת..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      {filteredShifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">לא נמצאו משמרות תואמות.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredShifts.map((s) => (
            <li key={s.id} className="rounded border p-3">
              {!readOnly && editingId === s.id ? (
                <ShiftForm
                  key={`${s.id}-${s.name}-${s.date}-${s.startTime}-${s.endTime}-${s.location}-${s.availabilityWindowId}`}
                  shift={s}
                  allPositions={allPositions!}
                  allQualifications={allQualifications!}
                  allTemplates={allTemplates!}
                  allAvailabilityWindows={allAvailabilityWindows!}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.name ? <span className="font-bold">{s.name}</span> : null}
                      <span className={s.name ? "text-sm text-muted-foreground" : "font-medium"} dir="ltr">
                        {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                      </span>
                      {s.location ? (
                        <span className="text-sm text-muted-foreground">{s.location}</span>
                      ) : null}
                      <ShiftStatusBadge shift={s} />
                      {s.availabilityWindowLabel ? (
                        <Badge variant="secondary">{s.availabilityWindowLabel}</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      {s.positions.length === 0 ? (
                        <span>—</span>
                      ) : (
                        s.positions.map((p) => (
                          <Badge key={p.positionId} variant="secondary">
                            {p.positionName} ×{p.headcountNeeded}
                          </Badge>
                        ))
                      )}
                    </div>
                    {readOnly && s.assignedWorkerNames.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <span>משובצים:</span>
                        {s.assignedWorkerNames.map((name) => (
                          <Badge key={name} variant="outline">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(s.id)}>
                        עריכה
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
                        מחיקה
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
