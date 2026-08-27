import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateWorkerForm } from "@/features/accounts/components/CreateWorkerForm";
import { WorkersList } from "@/features/accounts/components/WorkersList";
import { listWorkers } from "@/features/accounts/queries";

export default async function PersonnelPage() {
  const workers = await listWorkers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול אנשי צוות</h1>

      <Card>
        <CardHeader>
          <CardTitle>הוספת עובד חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateWorkerForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>עובדים קיימים ({workers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkersList workers={workers} />
        </CardContent>
      </Card>
    </div>
  );
}