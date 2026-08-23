import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvailabilityWindowForm } from "@/features/availability-windows/components/AvailabilityWindowForm";
import { AvailabilityWindowsList } from "@/features/availability-windows/components/AvailabilityWindowsList";
import { listAvailabilityWindows } from "@/features/availability-windows/queries";

export default async function AvailabilityWindowsPage() {
  const windows = await listAvailabilityWindows();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול חלונות זמינות</h1>

      <Card>
        <CardHeader>
          <CardTitle>פתיחת חלון חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityWindowForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>חלונות קיימים ({windows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityWindowsList windows={windows} />
        </CardContent>
      </Card>
    </div>
  );
}
