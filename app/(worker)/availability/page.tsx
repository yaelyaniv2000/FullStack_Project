import { requireWorker } from "@/lib/auth";
import { listOpenWindowsWithShifts, listRecentlyClosedWindowsWithResponses } from "@/features/availability/queries";
import { AvailabilityWindowsSection } from "@/features/availability/components/AvailabilityWindowsSection";
import { ClosedWindowsSection } from "@/features/availability/components/ClosedWindowsSection";

export default async function AvailabilityPage() {
  const worker = await requireWorker();
  const [windows, closedWindows] = await Promise.all([
    listOpenWindowsWithShifts(worker.id),
    listRecentlyClosedWindowsWithResponses(worker.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">הגשת זמינות</h1>
      <AvailabilityWindowsSection windows={windows} />
      <ClosedWindowsSection windows={closedWindows} />
    </div>
  );
}
