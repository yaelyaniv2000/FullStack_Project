import { requireWorker } from "@/lib/auth";
import { listOpenWindowsWithShifts } from "@/features/availability/queries";
import { AvailabilityWindowsSection } from "@/features/availability/components/AvailabilityWindowsSection";

export default async function AvailabilityPage() {
  const worker = await requireWorker();
  const windows = await listOpenWindowsWithShifts(worker.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">הגשת זמינות</h1>
      <AvailabilityWindowsSection windows={windows} />
    </div>
  );
}
