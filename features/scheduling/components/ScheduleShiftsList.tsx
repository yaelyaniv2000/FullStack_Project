"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScheduleShiftCard } from "./ScheduleShiftCard";
import type { ScheduleShift } from "../queries";
import type { Profile } from "@/lib/auth";

export function ScheduleShiftsList({
  windowId,
  shifts,
  allWorkers,
}: {
  windowId: string;
  shifts: ScheduleShift[];
  allWorkers: Profile[];
}) {
  const [query, setQuery] = useState("");

  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">אין משמרות בחלון זה.</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? shifts.filter((s) =>
        [
          s.shiftName,
          s.date,
          ...s.positions.map((p) => p.positionName),
          ...s.positions.flatMap((p) => p.assignments.map((a) => a.workerName)),
        ]
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
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">לא נמצאו משמרות תואמות.</p>
      ) : (
        filtered.map((shift) => (
          <ScheduleShiftCard key={shift.shiftId} windowId={windowId} shift={shift} allWorkers={allWorkers} />
        ))
      )}
    </div>
  );
}
