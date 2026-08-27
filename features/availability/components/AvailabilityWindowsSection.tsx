import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvailabilityShiftRow } from "./AvailabilityShiftRow";
import type { OpenWindow } from "../queries";

export function AvailabilityWindowsSection({ windows }: { windows: OpenWindow[] }) {
  if (windows.length === 0) {
    return <p className="text-sm text-muted-foreground">אין כרגע חלון זמינות פתוח.</p>;
  }

  return (
    <>
      {windows.map((w) => (
        <Card key={w.id}>
          <CardHeader>
            <CardTitle>{w.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {w.slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין משמרות בחלון זה.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {w.slots.map((s) => (
                  <AvailabilityShiftRow key={s.shiftIds.join(",")} slot={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
