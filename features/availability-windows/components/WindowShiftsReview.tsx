"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { WindowShiftAvailability } from "../queries";

function ShiftCard({ shift }: { shift: WindowShiftAvailability }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-start"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {shift.shiftName ? <span className="font-bold">{shift.shiftName}</span> : null}
          <span dir="ltr" className="text-sm text-muted-foreground">
            {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
          </span>
          <Badge variant="secondary">{shift.responses.length} זמינים</Badge>
        </span>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {expanded ? (
        <CardContent className="border-t pt-4">
          {shift.responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">אף עובד עדיין לא סימן זמינות.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
                <span>תפקידים נדרשים:</span>
                {shift.positions.length === 0 ? (
                  <span>—</span>
                ) : (
                  shift.positions.map((p) => (
                    <Badge key={p.positionId} variant="outline">
                      {p.positionName} ×{p.headcountNeeded}
                    </Badge>
                  ))
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {shift.responses.map((r) => (
                  <li key={r.workerId} className="flex flex-wrap items-center gap-1.5 rounded border p-2 text-sm">
                    <span className="font-medium">{r.workerName}</span>
                    {r.eligiblePositionIds.length === 0 ? (
                      <span className="text-muted-foreground">לא מתאים/ה לאף תפקיד נדרש</span>
                    ) : (
                      shift.positions
                        .filter((p) => r.eligiblePositionIds.includes(p.positionId))
                        .map((p) => (
                          <Badge key={p.positionId} variant="secondary">
                            {p.positionName}
                          </Badge>
                        ))
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function WindowShiftsReview({ shifts }: { shifts: WindowShiftAvailability[] }) {
  const [query, setQuery] = useState("");

  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">אין משמרות בחלון זה.</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? shifts.filter((s) =>
        [s.shiftName, s.date, ...s.positions.map((p) => p.positionName)]
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
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <ShiftCard key={s.shiftId} shift={s} />
          ))}
        </div>
      )}
    </div>
  );
}
