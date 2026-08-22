"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PositionForm } from "./PositionForm";
import { deletePosition } from "@/features/positions/actions";
import type { Position, QualificationRef } from "@/features/positions/queries";

export function PositionsList({
  positions,
  allQualifications,
}: {
  positions: Position[];
  allQualifications: QualificationRef[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deletePosition(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (positions.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין תפקידים מוגדרים.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <ul className="flex flex-col gap-3">
        {positions.map((p) => (
          <li key={p.id} className="rounded border p-3">
            {editingId === p.id ? (
              <PositionForm
                position={p}
                allQualifications={allQualifications}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">{p.name}</p>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>דורש:</span>
                      {p.requiredQualifications.length === 0 ? (
                        <span>—</span>
                      ) : (
                        p.requiredQualifications.map((q) => (
                          <Badge key={q.id} variant="secondary">
                            {q.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    {p.renewsQualifications.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>מחדש:</span>
                        {p.renewsQualifications.map((q) => (
                          <Badge key={q.id} variant="outline">
                            {q.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(p.id)}>
                    עריכה
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}>
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