import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getScheduleReview } from "@/features/scheduling/queries";
import { listWorkers } from "@/features/accounts/queries";
import { GenerateScheduleButton } from "@/features/scheduling/components/GenerateScheduleButton";
import { PublishAllButton } from "@/features/scheduling/components/PublishAllButton";
import { ScheduleShiftsList } from "@/features/scheduling/components/ScheduleShiftsList";

export default async function ScheduleReviewPage({
  params,
}: {
  params: Promise<{ windowId: string }>;
}) {
  const { windowId } = await params;
  const review = await getScheduleReview(windowId);
  if (!review) notFound();
  const workers = await listWorkers();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/availability-windows"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        חזרה לחלונות זמינות
      </Link>
      <h1 className="text-2xl font-bold">שיבוץ עבור {review.windowLabel}</h1>

      <Card>
        <CardHeader>
          <CardTitle>יצירת שיבוץ ופרסום</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <GenerateScheduleButton windowId={windowId} />
          <PublishAllButton windowId={windowId} />
        </CardContent>
      </Card>

      {review.conflicts.length > 0 ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              התנגשויות העדפה ({review.conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {review.conflicts.map((c, i) => {
                const shift = review.shifts.find((s) => s.shiftId === c.shiftId);
                return (
                  <li key={`${c.shiftId}-${c.workerId1}-${c.workerId2}-${i}`}>
                    {c.workerName1} × {c.workerName2}
                    {shift ? (
                      <>
                        {" "}
                        · <span dir="ltr">{shift.date} {shift.startTime.slice(0, 5)}</span>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <ScheduleShiftsList windowId={windowId} shifts={review.shifts} allWorkers={workers} />
    </div>
  );
}
