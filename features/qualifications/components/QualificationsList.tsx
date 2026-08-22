"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QualificationForm } from "./QualificationForm";
import { deleteQualification } from "@/features/qualifications/actions";
import type { Qualification } from "@/features/qualifications/queries";

export function QualificationsList({
  qualifications,
}: {
  qualifications: Qualification[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteQualification(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (qualifications.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין כשירויות מוגדרות.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <ul className="flex flex-col gap-3">
        {qualifications.map((q) => (
          <li key={q.id} className="rounded border p-3">
            {editingId === q.id ? (
              <QualificationForm qualification={q} onDone={() => setEditingId(null)} />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{q.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.renewal_interval_days
                      ? `מתחדשת כל ${q.renewal_interval_days} ימים`
                      : "לא פגה"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(q.id)}>
                    עריכה
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(q.id)}>
                    מחיקה
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}