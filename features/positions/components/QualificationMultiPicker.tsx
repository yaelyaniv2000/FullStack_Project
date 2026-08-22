"use client";

import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Qualification } from "@/features/qualifications/queries";

export type SelectedRequirement = {
  qualificationId: string;
  qualificationName: string;
  optionId: string | null;
  optionLabel: string | null;
};

/**
 * A dropdown that adds qualifications as removable chips. When `allowOptionSelection` is true
 * (the "required" list) and the chosen qualification defines options, a second dropdown opens
 * to pick which option is required -- the chip is only added once that's chosen. The "renews"
 * list passes `allowOptionSelection={false}` (see CLAUDE.md for why renewal doesn't target a
 * specific option).
 */
export function QualificationMultiPicker({
  qualificationFieldName,
  optionFieldName,
  label,
  allQualifications,
  initialSelected = [],
  allowOptionSelection,
}: {
  qualificationFieldName: string;
  optionFieldName: string;
  label: string;
  allQualifications: Qualification[];
  initialSelected?: SelectedRequirement[];
  allowOptionSelection: boolean;
}) {
  const [selected, setSelected] = useState<SelectedRequirement[]>(initialSelected);
  const [pendingQualificationId, setPendingQualificationId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const selectedIds = new Set(selected.map((s) => s.qualificationId));
  const available = allQualifications.filter(
    (q) => !selectedIds.has(q.id) && q.id !== pendingQualificationId,
  );
  const pendingQualification = allQualifications.find((q) => q.id === pendingQualificationId);

  function handlePick(qualificationId: string) {
    const qualification = allQualifications.find((q) => q.id === qualificationId);
    if (!qualification) return;
    if (allowOptionSelection && qualification.options.length > 0) {
      setPendingQualificationId(qualificationId);
      return;
    }
    setSelected([
      ...selected,
      {
        qualificationId,
        qualificationName: qualification.name,
        optionId: null,
        optionLabel: null,
      },
    ]);
  }

  function handlePickOption(optionId: string) {
    if (!pendingQualification) return;
    const option = pendingQualification.options.find((o) => o.id === optionId);
    if (!option) return;
    setSelected([
      ...selected,
      {
        qualificationId: pendingQualification.id,
        qualificationName: pendingQualification.name,
        optionId: option.id,
        optionLabel: option.label,
      },
    ]);
    setPendingQualificationId(null);
  }

  function remove(qualificationId: string) {
    setSelected(selected.filter((s) => s.qualificationId !== qualificationId));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s.qualificationId} variant="secondary" className="gap-1">
              {s.qualificationName}
              {s.optionLabel ? `: ${s.optionLabel}` : ""}
              <input type="hidden" name={qualificationFieldName} value={s.qualificationId} />
              <input type="hidden" name={optionFieldName} value={s.optionId ?? ""} />
              <button
                type="button"
                aria-label={`הסרת ${s.qualificationName}`}
                onClick={() => remove(s.qualificationId)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {pendingQualification ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">בחר/י אופציה עבור &quot;{pendingQualification.name}&quot;:</span>
          <Select onValueChange={(value) => handlePickOption(value as string)}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="בחירת אופציה" />
            </SelectTrigger>
            <SelectContent>
              {pendingQualification.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPendingQualificationId(null)}
          >
            ביטול
          </Button>
        </div>
      ) : available.length > 0 ? (
        <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-56 justify-between font-normal text-muted-foreground"
              />
            }
          >
            הוספת כשירות...
            <ChevronsUpDown className="size-4 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0">
            <Command>
              <CommandInput placeholder="חיפוש כשירות..." />
              <CommandList>
                <CommandEmpty>לא נמצאו כשירויות</CommandEmpty>
                <CommandGroup>
                  {available.map((q) => (
                    <CommandItem
                      key={q.id}
                      value={q.name}
                      onSelect={() => {
                        handlePick(q.id);
                        setAddMenuOpen(false);
                      }}
                    >
                      {q.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <p className="text-sm text-muted-foreground">כל הכשירויות כבר נוספו.</p>
      )}
    </div>
  );
}