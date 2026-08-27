"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestAvailabilityChange } from "../actions";
import type { ClosedWindow, ClosedWindowShift } from "../queries";

function ShiftRow({ shift }: { shift: ClosedWindowShift }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    startTransition(async () => {
      const result = await requestAvailabilityChange(shift.shiftId, message || null);
      if (result.success) {
        setSubmitted(true);
        setOpen(false);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          <span dir="ltr">
            {shift.date} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
          </span>
          {shift.location ? ` · ${shift.location}` : ""}
        </span>
        <Badge variant={shift.isAvailable ? "default" : "outline"}>
          {shift.isAvailable ? "סימנת זמין/ה" : "סימנת לא זמין/ה"}
        </Badge>
      </div>

      {shift.isAvailable && (shift.changeRequest || submitted) ? (
        <p className="text-sm text-muted-foreground">
          {shift.changeRequest?.acknowledgedAt
            ? "שלחת בקשת שינוי — האדמין ראה וטיפל בהתאם"
            : "שלחת בקשת שינוי — ממתין לאדמין"}
        </p>
      ) : shift.isAvailable && open ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="פרטים נוספים (אופציונלי)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={submit}>
              {isPending ? "שולח..." : "שליחת בקשה"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </div>
        </div>
      ) : shift.isAvailable ? (
        <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          לא אוכל להגיע
        </Button>
      ) : null}
    </li>
  );
}

/** Read-only view of a worker's own past responses once a window has closed and they can no
 * longer toggle them -- per user feedback (2026-08-28), the window shouldn't just disappear. */
export function ClosedWindowsSection({ windows }: { windows: ClosedWindow[] }) {
  if (windows.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">חלונות זמינות שנסגרו</h2>
      {windows.map((w) => (
        <Card key={w.id}>
          <CardHeader>
            <CardTitle>{w.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {w.shifts.map((s) => (
                <ShiftRow key={s.shiftId} shift={s} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
