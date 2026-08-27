import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listUnderstaffedShifts, listUpcomingShifts } from "@/features/shifts/queries";
import {
  listPendingApprovals,
  listExpiringQualifications,
} from "@/features/worker-qualifications/queries";
import { listActivePairingConflicts } from "@/features/scheduling/queries";
import { listWindowsPendingApproval } from "@/features/availability-windows/queries";
import { getAppSettings } from "@/features/settings/queries";

/**
 * The admin's landing page: what needs attention, not just a pile of CRUD links (see
 * CLAUDE.md "The admin has a dashboard as their default landing page"). Built last in Phase 3,
 * after shifts/templates/availability-windows existed for the understaffed/upcoming widgets to
 * have real data to query -- see the TODO.md ordering note.
 */
export async function AdminDashboard() {
  const { expiringSoonDays } = await getAppSettings();
  const [understaffed, pending, upcoming, expiring, pairingConflicts, pendingApproval] = await Promise.all([
    listUnderstaffedShifts(5),
    listPendingApprovals(5),
    listUpcomingShifts(5),
    listExpiringQualifications(expiringSoonDays, 5),
    listActivePairingConflicts(5),
    listWindowsPendingApproval(5),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pendingApproval.length > 0 ? (
        <Card className="border-primary sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              שיבוצים ממתינים לאישור
              <Badge variant="default">{pendingApproval.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {pendingApproval.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {w.label} · {w.unpublishedCount} משמרות לא מפורסמות
                  </span>
                  <Link href={`/admin/schedule/${w.id}`} className="text-sm underline">
                    לצפייה ←
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            משמרות תת-מאוישות
            {understaffed.length > 0 ? (
              <Badge variant="destructive">{understaffed.length}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {understaffed.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין משמרות תת-מאוישות קרובות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {understaffed.map((s) => (
                <li key={s.id} className="text-sm">
                  <span dir="ltr">
                    {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.unfilledPositions.map((p) => (
                      <Badge key={p.positionName} variant="outline">
                        {p.positionName}: {p.assigned}/{p.needed}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/shifts" className="text-sm text-muted-foreground hover:underline">
            כל המשמרות ←
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            אישורי כשירות ממתינים
            {pending.length > 0 ? <Badge variant="secondary">{pending.length}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין בקשות ממתינות לאישור.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href={`/admin/personnel/${p.workerId}`} className="hover:underline">
                    {p.workerName}
                  </Link>{" "}
                  — {p.qualificationName}
                  {p.optionLabel ? `: ${p.optionLabel}` : ""}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>משמרות קרובות</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין משמרות קרובות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((s) => (
                <li key={s.id} className="text-sm">
                  <span dir="ltr">
                    {s.date} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </span>
                  {s.location ? ` · ${s.location}` : ""}
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/shifts" className="text-sm text-muted-foreground hover:underline">
            כל המשמרות ←
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            כשירויות שפגות בקרוב
            {expiring.length > 0 ? <Badge variant="secondary">{expiring.length}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין כשירויות שפגות בקרוב.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expiring.map((e) => (
                <li key={e.id} className="text-sm">
                  <Link href={`/admin/personnel/${e.workerId}`} className="hover:underline">
                    {e.workerName}
                  </Link>{" "}
                  — {e.qualificationName} · <span dir="ltr">{e.expiresOn}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            התנגשויות העדפת שיבוץ
            {pairingConflicts.length > 0 ? (
              <Badge variant="destructive">{pairingConflicts.length}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pairingConflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין התנגשויות העדפה במשמרות קרובות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pairingConflicts.map((c, i) => (
                <li key={`${c.shiftId}-${i}`} className="text-sm">
                  <Link href={`/admin/schedule/${c.windowId}`} className="hover:underline">
                    {c.workerName1} × {c.workerName2}
                  </Link>{" "}
                  · <span dir="ltr">{c.date} {c.startTime.slice(0, 5)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
