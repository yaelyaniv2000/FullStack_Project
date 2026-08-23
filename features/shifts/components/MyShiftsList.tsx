import { Badge } from "@/components/ui/badge";
import type { MyShift } from "../queries";

export function MyShiftsList({ shifts }: { shifts: MyShift[] }) {
  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">אין לך משמרות קרובות משובצות.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {shifts.map((s) => (
        <li
          key={`${s.shiftId}-${s.positionId}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
        >
          <span className="text-sm">
            <span dir="ltr">
              {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
            </span>
            {s.location ? ` · ${s.location}` : ""}
          </span>
          <Badge variant="secondary">{s.positionName}</Badge>
        </li>
      ))}
    </ul>
  );
}
