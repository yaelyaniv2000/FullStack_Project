"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShiftTemplateForm } from "./ShiftTemplateForm";
import { deleteShiftTemplate } from "@/features/shift-templates/actions";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Position } from "@/features/positions/queries";

export function ShiftTemplatesList({
  templates,
  allPositions,
}: {
  templates: ShiftTemplate[];
  allPositions: Position[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteShiftTemplate(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (templates.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין תבניות משמרת מוגדרות.</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : templates;

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="חיפוש תבנית..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">לא נמצאו תבניות תואמות.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((t) => (
            <li key={t.id} className="rounded border p-3">
              {editingId === t.id ? (
                <ShiftTemplateForm
                  template={t}
                  allPositions={allPositions}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      {t.positions.length === 0 ? (
                        <span>—</span>
                      ) : (
                        t.positions.map((p) => (
                          <Badge key={p.positionId} variant="secondary">
                            {p.positionName} ×{p.headcountNeeded}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(t.id)}>
                      עריכה
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(t.id)}>
                      מחיקה
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
