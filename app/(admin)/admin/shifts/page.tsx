import Link from "next/link";
import { ShiftsPanel } from "@/features/shifts/components/ShiftsPanel";
import { listShifts } from "@/features/shifts/queries";
import { listPositions } from "@/features/positions/queries";
import { listQualifications } from "@/features/qualifications/queries";
import { listShiftTemplates } from "@/features/shift-templates/queries";
import { listAvailabilityWindows } from "@/features/availability-windows/queries";

export default async function ShiftsPage() {
  const [shifts, positions, qualifications, templates, availabilityWindows] = await Promise.all([
    listShifts({ scope: "upcoming" }),
    listPositions(),
    listQualifications(),
    listShiftTemplates(),
    listAvailabilityWindows(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">ניהול משמרות</h1>
        <Link href="/admin/shifts/past" className="text-sm text-muted-foreground hover:underline">
          לצפייה במשמרות ישנות ←
        </Link>
      </div>

      <ShiftsPanel
        shifts={shifts}
        allPositions={positions}
        allQualifications={qualifications}
        allTemplates={templates}
        allAvailabilityWindows={availabilityWindows}
      />
    </div>
  );
}
