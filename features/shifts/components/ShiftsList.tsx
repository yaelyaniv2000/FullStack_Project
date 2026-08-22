"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShiftForm } from "./ShiftForm";
import { deleteShift } from "@/features/shifts/actions";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import type { PositionRef } from "./ShiftPositionsPicker";

export function ShiftsList({
  shifts,
  allPositions,
  allQualifications,
  allTemplates,
}: {
  shifts: Shift[];
  allPositions: PositionRef[];
  allQualifications: Qualification[];
  allTemplates: ShiftTemplate[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteShift(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין משמרות מוגדרות.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <ul className="flex flex-col gap-3">
        {shifts.map((s) => (
          <li key={s.id} className="rounded border p-3">
            {editingId === s.id ? (
              <ShiftForm
                shift={s}
                allPositions={allPositions}
                allQualifications={allQualifications}
                allTemplates={allTemplates}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium" dir="ltr">
                      {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                    </span>
                    {s.location ? (
                      <span className="text-sm text-muted-foreground">{s.location}</span>
                    ) : null}
                    <Badge variant={s.publishedAt ? "default" : "outline"}>
                      {s.publishedAt ? "פורסמה" : "טיוטה"}
                    </Badge>
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
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(s.id)}>
                    עריכה
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
                    מחיקה
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
