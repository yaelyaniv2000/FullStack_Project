"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeQualification, reviewQualification } from "../actions";
import type { WorkerQualification } from "../queries";

const STATUS_LABEL: Record<WorkerQualification["status"], string> = {
  approved: "מאושר",
  pending: "ממתין לאישור",
  rejected: "בוטל",
};

const STATUS_VARIANT: Record<
  WorkerQualification["status"],
  "default" | "secondary" | "outline"
> = {
  approved: "default",
  pending: "secondary",
  rejected: "outline",
};

export function WorkerQualificationsList({
  workerId,
  qualifications,
}: {
  workerId: string;
  qualifications: WorkerQualification[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setError(null);
    setPendingId(id);
    const result = await revokeQualification(id, workerId);
    if (!result.success) setError(result.error);
    setPendingId(null);
  }

  async function handleReview(id: string, decision: "approved" | "rejected") {
    setError(null);
    setPendingId(id);
    const result = await reviewQualification(id, workerId, decision);
    if (!result.success) setError(result.error);
    setPendingId(null);
  }

  if (qualifications.length === 0) {
    return <p className="text-sm text-muted-foreground">לעובד/ת אין עדיין כשירויות.</p>;
  }

  const today = todayIsoDate();

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {qualifications.map((q) => {
          const expired = q.expiresOn !== null && q.expiresOn < today;
          return (
            <li key={q.id} className="flex items-center justify-between rounded border p-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{q.qualificationName}</span>
                  {q.optionLabel ? <Badge variant="secondary">{q.optionLabel}</Badge> : null}
                  <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                  {q.status === "pending" && q.source === "self_reported" ? (
                    <Badge variant="outline">דווח על ידי העובד/ת</Badge>
                  ) : null}
                  {expired && q.status === "approved" ? (
                    <Badge variant="destructive">פג תוקף</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  התקבל: {q.obtainedAt}
                  {q.expiresOn ? ` · בתוקף עד: ${q.expiresOn}` : " · אינה פגה"}
                </p>
              </div>
              {q.status === "approved" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === q.id}
                  onClick={() => handleRevoke(q.id)}
                >
                  ביטול
                </Button>
              ) : q.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pendingId === q.id}
                    onClick={() => handleReview(q.id, "approved")}
                  >
                    אישור
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === q.id}
                    onClick={() => handleReview(q.id, "rejected")}
                  >
                    דחייה
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
