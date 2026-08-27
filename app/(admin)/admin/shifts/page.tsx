import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShiftForm } from "@/features/shifts/components/ShiftForm";
import { ShiftsList } from "@/features/shifts/components/ShiftsList";
import { listShifts } from "@/features/shifts/queries";
import { listPositions } from "@/features/positions/queries";
import { listQualifications } from "@/features/qualifications/queries";
import { listShiftTemplates } from "@/features/shift-templates/queries";
import { listAvailabilityWindows } from "@/features/availability-windows/queries";

export default async function ShiftsPage() {
  const [shifts, positions, qualifications, templates, availabilityWindows] = await Promise.all([
    listShifts(),
    listPositions(),
    listQualifications(),
    listShiftTemplates(),
    listAvailabilityWindows(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול משמרות</h1>

      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="md:w-2/3">
          <CardHeader>
            <CardTitle>הוספת משמרת חדשה</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftForm
              allPositions={positions}
              allQualifications={qualifications}
              allTemplates={templates}
              allAvailabilityWindows={availabilityWindows}
            />
          </CardContent>
        </Card>

        <Card className="md:w-1/3">
          <CardHeader>
            <CardTitle>משמרות קיימות ({shifts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftsList
              shifts={shifts}
              allPositions={positions}
              allQualifications={qualifications}
              allTemplates={templates}
              allAvailabilityWindows={availabilityWindows}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
