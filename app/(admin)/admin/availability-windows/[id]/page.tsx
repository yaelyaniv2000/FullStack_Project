import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAvailabilityWindowDetail } from "@/features/availability-windows/queries";

export default async function AvailabilityWindowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAvailabilityWindowDetail(id);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/availability-windows"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        חזרה לחלונות זמינות
      </Link>
      <h1 className="text-2xl font-bold">{detail.label}</h1>

      {detail.shifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין משמרות בחלון זה.</p>
      ) : (
        detail.shifts.map((s) => (
          <Card key={s.shiftId}>
            <CardHeader>
              <CardTitle>
                <span dir="ltr">
                  {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {s.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">אף עובד עדיין לא הגיב.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {s.responses.map((r) => (
                    <li key={r.workerId} className="flex items-center justify-between text-sm">
                      <span>{r.workerName}</span>
                      <Badge variant={r.isAvailable ? "default" : "outline"}>
                        {r.isAvailable ? "זמין/ה" : "לא זמין/ה"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
