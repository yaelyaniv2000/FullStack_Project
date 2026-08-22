import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getWorker } from "@/features/accounts/queries";
import { listQualifications } from "@/features/qualifications/queries";
import { listWorkerQualifications } from "@/features/worker-qualifications/queries";
import { GrantQualificationForm } from "@/features/worker-qualifications/components/GrantQualificationForm";
import { WorkerQualificationsList } from "@/features/worker-qualifications/components/WorkerQualificationsList";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  const worker = await getWorker(workerId);
  if (!worker) notFound();

  const [allQualifications, workerQualifications] = await Promise.all([
    listQualifications(),
    listWorkerQualifications(workerId),
  ]);
  const alreadyHeldQualificationIds = workerQualifications
    .filter((q) => q.status !== "rejected")
    .map((q) => q.qualificationId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{worker.full_name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>הענקת כשירות</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantQualificationForm
            workerId={workerId}
            allQualifications={allQualifications}
            alreadyHeldQualificationIds={alreadyHeldQualificationIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כשירויות ({workerQualifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkerQualificationsList workerId={workerId} qualifications={workerQualifications} />
        </CardContent>
      </Card>
    </div>
  );
}
