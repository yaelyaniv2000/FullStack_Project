import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateWorkerForm } from "@/features/accounts/components/CreateWorkerForm";
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
          {workers.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין עדיין עובדים רשומים.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {workers.map((worker) => (
                <li key={worker.id} className="text-sm">
                  <Link href={`/admin/personnel/${worker.id}`} className="hover:underline">
                    {worker.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}