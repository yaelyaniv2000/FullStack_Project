"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addAssignment, removeAssignment } from "../actions";
import { PublishShiftButton } from "./PublishShiftButton";
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
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  const assignedIds = new Set(position.assignments.map((a) => a.workerId));
  const eligibleIds = new Set(position.eligibleWorkerIds);
  const candidateWorkers = allWorkers.filter(
    (w) => !assignedIds.has(w.id) && (showAllWorkers || eligibleIds.has(w.id)),
  );
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
      {!disabled ? (
        <div className="flex flex-wrap items-center gap-2">
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
            {candidateWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </select>
          {!showAllWorkers ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setShowAllWorkers(true)}
            >
              הצג את כל העובדים
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setShowAllWorkers(false)}
            >
              הצג מתאימים בלבד
            </button>
          )}
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
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 flex-wrap items-center gap-2 text-start"
          onClick={() => setExpanded((v) => !v)}
        >
          <CardTitle className="flex flex-wrap items-center gap-2">
            {shift.shiftName ? <span className="font-bold">{shift.shiftName}</span> : null}
            <span dir="ltr">
              {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
            </span>
            <Badge variant={shift.publishedAt ? "default" : "outline"}>
              {shift.publishedAt ? "פורסמה" : "טיוטה"}
            </Badge>
            <Badge variant="secondary">{shift.availableCount} זמינים</Badge>
          </CardTitle>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <PublishShiftButton windowId={windowId} shiftId={shift.shiftId} published={!!shift.publishedAt} />
      </CardHeader>
      {expanded ? (
        <CardContent className="flex flex-col gap-2 border-t pt-4">
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
      ) : null}
    </Card>
  );
}
