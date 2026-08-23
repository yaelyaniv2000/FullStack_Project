import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireWorker } from "@/lib/auth";
import { listWorkerQualifications } from "@/features/worker-qualifications/queries";
import { MyQualificationsList } from "@/features/worker-qualifications/components/MyQualificationsList";

export default async function MyQualificationsPage() {
  const worker = await requireWorker();
  const qualifications = await listWorkerQualifications(worker.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">הכשירויות שלי</h1>

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
