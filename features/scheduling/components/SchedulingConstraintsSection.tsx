import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConstraintTypeEditor } from "./ConstraintTypeEditor";
import type { ConstraintRow } from "../queries";
import type { Qualification } from "@/features/qualifications/queries";

export function SchedulingConstraintsSection({
  constraints,
  allQualifications,
}: {
  constraints: ConstraintRow[];
  allQualifications: Qualification[];
}) {
  const restRows = constraints.filter((c) => c.type === "min_rest_hours");
  const maxShiftsRows = constraints.filter((c) => c.type === "max_shifts_per_window");

  return (
    <Card>
      <CardHeader>
        <CardTitle>אילוצי שיבוץ</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ConstraintTypeEditor
          type="min_rest_hours"
          title="מנוחה מינימלית בין משמרות"
          isHours
          rows={restRows}
          allQualifications={allQualifications}
        />
        <ConstraintTypeEditor
          type="max_shifts_per_window"
          title="מקסימום משמרות לחלון זמינות"
          isHours={false}
          rows={maxShiftsRows}
          allQualifications={allQualifications}
        />
      </CardContent>
    </Card>
  );
}
