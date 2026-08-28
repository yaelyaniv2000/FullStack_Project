import { Badge } from "@/components/ui/badge";
import { getShiftStatus } from "@/features/shifts/status";
import type { Shift } from "@/features/shifts/queries";

export function ShiftStatusBadge({ shift }: { shift: Pick<Shift, "publishedAt" | "assignedWorkerNames"> }) {
  const status = getShiftStatus(shift);
  if (status === "published") return <Badge variant="default">פורסמה</Badge>;
  if (status === "assigned") return <Badge variant="secondary">שובצה</Badge>;
  return <Badge variant="outline">טיוטה</Badge>;
}
