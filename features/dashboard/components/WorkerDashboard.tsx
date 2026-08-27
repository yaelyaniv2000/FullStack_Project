import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMyUpcomingShifts } from "@/features/shifts/queries";
import { listWorkerQualifications } from "@/features/worker-qualifications/queries";
import { listOpenWindowsWithShifts } from "@/features/availability/queries";
import { listMyNotifications } from "@/features/notifications/queries";
import { getAppSettings } from "@/features/settings/queries";
import { MyQualificationsList } from "@/features/worker-qualifications/components/MyQualificationsList";

/** The worker's home screen (per user feedback 2026-08-25: no longer a nav-menu item, the logo
 * click leads here -- see AppHeader). Assembles already-built data sources; no new queries
 * beyond limiting/reusing what /my-shifts, /my-qualifications, /availability, /notifications
 * already expose. */
export async function WorkerDashboard({ workerId }: { workerId: string }) {
  const [shifts, qualifications, openWindows, notifications, { expiringSoonDays }] = await Promise.all([
    listMyUpcomingShifts(workerId),
    listWorkerQualifications(workerId),
    listOpenWindowsWithShifts(workerId),
    listMyNotifications(workerId),
    getAppSettings(),
  ]);
  const unreadNotifications = notifications.filter((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-4">
      {openWindows.length > 0 ? (
        <Card className="border-primary">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6">
            <span className="text-sm font-medium">יש חלון זמינות פתוח להגשה</span>
            <Link href="/availability" className="text-sm underline">
              להגשת זמינות ←
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>משמרות קרובות</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין לך משמרות קרובות משובצות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shifts.slice(0, 3).map((s) => (
                <li key={`${s.shiftId}-${s.positionId}`} className="text-sm">
                  <span dir="ltr">
                    {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </span>{" "}
                  · {s.positionName}
                </li>
              ))}
            </ul>
          )}
          <Link href="/my-shifts" className="text-sm text-muted-foreground hover:underline">
            לכל המשמרות ←
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>סטטוס כשירויות</CardTitle>
        </CardHeader>
        <CardContent>
          <MyQualificationsList qualifications={qualifications} expiringSoonDays={expiringSoonDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            התראות
            {unreadNotifications.length > 0 ? (
              <Badge variant="default">{unreadNotifications.length}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין לך עדיין התראות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notifications.slice(0, 3).map((n) => (
                <li key={n.id} className="text-sm">
                  {n.message}
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" className="text-sm text-muted-foreground hover:underline">
            לכל ההתראות ←
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
