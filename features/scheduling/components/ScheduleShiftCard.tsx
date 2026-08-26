"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addAssignment, removeAssignment } from "../actions";
import type { ScheduleShift } from "../queries";
import type { Profile } from "@/lib/auth";

function PositionRow({
  windowId,
  shiftId,
  position,
  allWorkers,
  disabled,
}: {
  windowId: string;
  shiftId: string;
  position: ScheduleShift["positions"][number];
  allWorkers: Profile[];
  disabled: boolean;
}) {
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(position.assignments.map((a) => a.workerId));
  const availableWorkers = allWorkers.filter((w) => !assignedIds.has(w.id));
  const unfilled = position.assignments.length < position.headcountNeeded;

  async function handleAdd(workerId: string) {
    if (!workerId) return;
    setError(null);
    setPendingWorkerId(workerId);
    const result = await addAssignment(windowId, shiftId, position.positionId, workerId);
    if (!result.success) setError(result.error);
    setPendingWorkerId(null);
  }

  async function handleRemove(workerId: string) {
    setError(null);
    setPendingWorkerId(workerId);
    const result = await removeAssignment(windowId, shiftId, position.positionId, workerId);
    if (!result.success) setError(result.error);
    setPendingWorkerId(null);
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{position.positionName}</span>
        <Badge variant={unfilled ? "destructive" : "secondary"}>
          {position.assignments.length}/{position.headcountNeeded}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {position.assignments.map((a) => (
          <Badge key={a.workerId} variant="outline" className="gap-1">
            {a.workerName}
            {!disabled ? (
              <button
                type="button"
                aria-label={`הסרת ${a.workerName}`}
                disabled={pendingWorkerId === a.workerId}
                onClick={() => handleRemove(a.workerId)}
              >
                ×
              </button>
            ) : null}
          </Badge>
        ))}
      </div>
      {!disabled && availableWorkers.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-lg border border-input bg-transparent px-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              const workerId = e.target.value;
              e.target.value = "";
              handleAdd(workerId);
            }}
          >
            <option value="" disabled>
              הוספת עובד/ת...
            </option>
            {availableWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function ScheduleShiftCard({
  windowId,
  shift,
  allWorkers,
}: {
  windowId: string;
  shift: ScheduleShift;
  allWorkers: Profile[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span dir="ltr">
            {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
          </span>
          <Badge variant={shift.publishedAt ? "default" : "outline"}>
            {shift.publishedAt ? "פורסמה" : "טיוטה"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {shift.positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תפקידים במשמרת זו.</p>
        ) : (
          shift.positions.map((p) => (
            <PositionRow
              key={p.positionId}
              windowId={windowId}
              shiftId={shift.shiftId}
              position={p}
              allWorkers={allWorkers}
              disabled={!!shift.publishedAt}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
