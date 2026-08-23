import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireWorker } from "@/lib/auth";
import { listMyUpcomingShifts } from "@/features/shifts/queries";
import { MyShiftsList } from "@/features/shifts/components/MyShiftsList";

export default async function MyShiftsPage() {
  const worker = await requireWorker();
  const shifts = await listMyUpcomingShifts(worker.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">המשמרות שלי</h1>

      <Card>
        <CardHeader>
          <CardTitle>משמרות קרובות ({shifts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MyShiftsList shifts={shifts} />
        </CardContent>
      </Card>
    </div>
  );
}
