"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { QualificationOption } from "@/features/qualifications/queries";

type Row = { id?: string; label: string };

/**
 * Renders parallel optionId[]/optionLabel[] hidden+visible inputs -- read back in the server
 * action via formData.getAll(). Purely client-side list state; nothing is submitted until the
 * surrounding form's own submit button is pressed.
 */
export function QualificationOptionsEditor({
  initialOptions = [],
}: {
  initialOptions?: QualificationOption[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialOptions.map((o) => ({ id: o.id, label: o.label })),
  );

  function updateLabel(index: number, label: string) {
    setRows(rows.map((row, i) => (i === index ? { ...row, label } : row)));
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>אפשרויות בחירה (השאירו ריק אם הכשירות בינארית — יש/אין)</Label>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input type="hidden" name="optionId" value={row.id ?? ""} />
          <Input
            name="optionLabel"
            value={row.label}
            onChange={(e) => updateLabel(i, e.target.value)}
            placeholder="לדוגמה: קבוע"
            className="max-w-48"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="הסרת אפשרות"
            onClick={() => removeRow(i)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setRows([...rows, { label: "" }])}
      >
        <Plus className="size-4" />
        הוספת אפשרות
      </Button>
    </div>
  );
}