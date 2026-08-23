import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireWorker } from "@/lib/auth";
import { listWorkerQualifications } from "@/features/worker-qualifications/queries";
import { listQualifications } from "@/features/qualifications/queries";
import { MyQualificationsList } from "@/features/worker-qualifications/components/MyQualificationsList";
import { SelfReportQualificationForm } from "@/features/worker-qualifications/components/SelfReportQualificationForm";

export default async function MyQualificationsPage() {
  const worker = await requireWorker();
  const [qualifications, allQualifications] = await Promise.all([
    listWorkerQualifications(worker.id),
    listQualifications(),
  ]);
  const alreadyHeldQualificationIds = qualifications
    .filter((q) => q.status !== "rejected")
    .map((q) => q.qualificationId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">הכשירויות שלי</h1>

      <Card>
        <CardHeader>
          <CardTitle>דיווח כשירות חדשה</CardTitle>
        </CardHeader>
        <CardContent>
          <SelfReportQualificationForm
            allQualifications={allQualifications}
            alreadyHeldQualificationIds={alreadyHeldQualificationIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כשירויות ({qualifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MyQualificationsList qualifications={qualifications} />
        </CardContent>
      </Card>
    </div>
  );
}
