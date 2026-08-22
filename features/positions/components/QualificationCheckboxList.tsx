"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { QualificationRef } from "@/features/positions/queries";

/**
 * Renders one hidden input per checked qualification, all sharing `name` -- read back server-side
 * via formData.getAll(name).
 */
export function QualificationCheckboxList({
  name,
  label,
  allQualifications,
  initiallySelectedIds = [],
}: {
  name: string;
  label: string;
  allQualifications: QualificationRef[];
  initiallySelectedIds?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initiallySelectedIds));

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  if (allQualifications.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">אין עדיין כשירויות מוגדרות במערכת.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2">
        {allQualifications.map((q) => (
          <label key={q.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.has(q.id)}
              onCheckedChange={(checked) => toggle(q.id, checked === true)}
            />
            {q.name}
            {selected.has(q.id) ? <input type="hidden" name={name} value={q.id} /> : null}
          </label>
        ))}
      </div>
    </div>
  );
}