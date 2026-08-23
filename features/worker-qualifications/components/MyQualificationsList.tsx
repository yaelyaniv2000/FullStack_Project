import { Badge } from "@/components/ui/badge";
import type { WorkerQualification } from "../queries";

const STATUS_LABEL: Record<WorkerQualification["status"], string> = {
  approved: "מאושר",
  pending: "ממתין לאישור",
  rejected: "נדחה",
};

const STATUS_VARIANT: Record<
  WorkerQualification["status"],
  "default" | "secondary" | "outline"
> = {
  approved: "default",
  pending: "secondary",
  rejected: "outline",
};

/** Read-only worker-facing view -- same data as WorkerQualificationsList (the admin's
 * grant/revoke/review screen), but with no admin actions. */
export function MyQualificationsList({
  qualifications,
}: {
  qualifications: WorkerQualification[];
}) {
  if (qualifications.length === 0) {
    return <p className="text-sm text-muted-foreground">עדיין אין לך כשירויות רשומות.</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="flex flex-col gap-2">
      {qualifications.map((q) => {
        const expired = q.expiresOn !== null && q.expiresOn < today;
        return (
          <li key={q.id} className="rounded border p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{q.qualificationName}</span>
              {q.optionLabel ? <Badge variant="secondary">{q.optionLabel}</Badge> : null}
              <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
              {expired && q.status === "approved" ? (
                <Badge variant="destructive">פג תוקף</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              התקבל: <span dir="ltr">{q.obtainedAt}</span>
              {q.expiresOn ? (
                <>
                  {" "}
                  · {expired ? "פג תוקף ב־" : "בתוקף עד"}: <span dir="ltr">{q.expiresOn}</span>
                </>
              ) : (
                " · אינה פגה"
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
