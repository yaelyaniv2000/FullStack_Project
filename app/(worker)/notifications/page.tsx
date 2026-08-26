import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireWorker } from "@/lib/auth";
import { listMyNotifications } from "@/features/notifications/queries";
import { NotificationsList } from "@/features/notifications/components/NotificationsList";

export default async function NotificationsPage() {
  const worker = await requireWorker();
  const notifications = await listMyNotifications(worker.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">התראות</h1>

      <Card>
        <CardHeader>
          <CardTitle>ההתראות שלי ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsList notifications={notifications} />
        </CardContent>
      </Card>
    </div>
  );
}
