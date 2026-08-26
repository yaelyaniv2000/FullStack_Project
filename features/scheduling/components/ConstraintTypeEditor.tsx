"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  setSchedulingConstraint,
  deleteSchedulingConstraintOverride,
  type ConstraintState,
} from "../actions";
import type { ConstraintRow, ConstraintType } from "../queries";
import type { Qualification } from "@/features/qualifications/queries";

function hoursToDaysHours(totalHours: number) {
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

/** One constraint row's own form -- the default row (qualificationOptionId null, always exists,
 * no delete) or an override row (existing: rowId set, or freshly picked and not yet saved:
 * rowId null, delete disabled until it exists). */
function ConstraintRowForm({
  type,
  qualificationOptionId,
  rowId,
  label,
  enabled,
  value,
  isHours,
  onCreated,
  onCancelPending,
}: {
  type: ConstraintType;
  qualificationOptionId: string | null;
  rowId: string | null;
  label: string;
  enabled: boolean;
  value: number;
  isHours: boolean;
  onCreated?: () => void;
  onCancelPending?: () => void;
}) {
  const action = setSchedulingConstraint.bind(null, type, qualificationOptionId);
  const [state, formAction, pending] = useActionState<ConstraintState, FormData>(
    action,
    undefined,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { days, hours } = hoursToDaysHours(value);

  useEffect(() => {
    if (state?.success && !rowId) onCreated?.();
  }, [state, rowId, onCreated]);

  async function handleDelete() {
    if (!rowId) return;
    setDeleting(true);
    const result = await deleteSchedulingConstraintOverride(rowId);
    if (!result.success) {
      setDeleteError(result.error);
      setDeleting(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-3">
      <div className="flex items-center gap-2">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isHours ? (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">ימים</Label>
            <Input type="number" min={0} name="days" defaultValue={days} className="w-16" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">שעות</Label>
            <Input
              type="number"
              min={0}
              max={23}
              name="hoursOnly"
              defaultValue={hours}
              className="w-16"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">ערך</Label>
          <Input type="number" min={1} name="value" defaultValue={value} className="w-16" />
        </div>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        שמירה
      </Button>
      {qualificationOptionId ? (
        rowId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
          >
            מחיקה
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelPending}>
            <X className="size-4" />
            ביטול
          </Button>
        )
      ) : null}
      {state && !state.success ? (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      ) : null}
      {deleteError ? <p className="w-full text-sm text-destructive">{deleteError}</p> : null}
    </form>
  );
}

export function ConstraintTypeEditor({
  type,
  title,
  isHours,
  rows,
  allQualifications,
}: {
  type: ConstraintType;
  title: string;
  isHours: boolean;
  rows: ConstraintRow[];
  allQualifications: Qualification[];
}) {
  const defaultRow = rows.find((r) => r.qualificationOptionId === null);
  const overrideRows = rows.filter((r) => r.qualificationOptionId !== null);

  const [pendingNewOptionIds, setPendingNewOptionIds] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  const allOptions = allQualifications.flatMap((q) =>
    q.options.map((o) => ({ id: o.id, label: `${q.name}: ${o.label}` })),
  );
  const usedIds = new Set([
    ...overrideRows.map((r) => r.qualificationOptionId!),
    ...pendingNewOptionIds,
  ]);
  const availableOptions = allOptions.filter((o) => !usedIds.has(o.id));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">{title}</h3>
      {defaultRow ? (
        <ConstraintRowForm
          // Remount whenever the persisted value actually changes (not just on every render) --
          // these are uncontrolled inputs (defaultValue), and Base UI's Input warns if an
          // already-mounted one gets a new defaultValue instead of being remounted. Same reason
          // every other form in this codebase bumps a resetKey after a successful save.
          key={`${defaultRow.id}-${defaultRow.enabled}-${defaultRow.value}`}
          type={type}
          qualificationOptionId={null}
          rowId={defaultRow.id}
          label="ברירת מחדל"
          enabled={defaultRow.enabled}
          value={defaultRow.value}
          isHours={isHours}
        />
      ) : null}

      {overrideRows.map((r) => (
        <ConstraintRowForm
          key={`${r.id}-${r.enabled}-${r.value}`}
          type={type}
          qualificationOptionId={r.qualificationOptionId}
          rowId={r.id}
          label={`${r.qualificationName}: ${r.optionLabel}`}
          enabled={r.enabled}
          value={r.value}
          isHours={isHours}
        />
      ))}

      {pendingNewOptionIds.map((optionId) => {
        const opt = allOptions.find((o) => o.id === optionId);
        return (
          <ConstraintRowForm
            key={optionId}
            type={type}
            qualificationOptionId={optionId}
            rowId={null}
            label={opt?.label ?? ""}
            enabled={false}
            value={isHours ? 0 : 1}
            isHours={isHours}
            onCreated={() =>
              setPendingNewOptionIds((prev) => prev.filter((id) => id !== optionId))
            }
            onCancelPending={() =>
              setPendingNewOptionIds((prev) => prev.filter((id) => id !== optionId))
            }
          />
        );
      })}

      {availableOptions.length > 0 ? (
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-64 justify-between font-normal text-muted-foreground"
              />
            }
          >
            הוספת חריגה לפי קטגוריה...
            <ChevronsUpDown className="size-4 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <Command>
              <CommandInput placeholder="חיפוש..." />
              <CommandList>
                <CommandEmpty>לא נמצאו אפשרויות</CommandEmpty>
                <CommandGroup>
                  {availableOptions.map((o) => (
                    <CommandItem
                      key={o.id}
                      value={o.label}
                      onSelect={() => {
                        setPendingNewOptionIds((prev) => [...prev, o.id]);
                        setComboOpen(false);
                      }}
                    >
                      {o.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
