"use client";

import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Position } from "@/features/positions/queries";

export type SelectedPosition = {
  positionId: string;
  positionName: string;
  headcountNeeded: number;
};

/**
 * Like QualificationMultiPicker, but each chip also carries a required headcount (a shift
 * template needs to know not just which positions, but how many of each) -- so rows instead of
 * badges, with a small number input per row.
 */
export function ShiftTemplatePositionsPicker({
  allPositions,
  initialSelected = [],
}: {
  allPositions: Position[];
  initialSelected?: SelectedPosition[];
}) {
  const [selected, setSelected] = useState<SelectedPosition[]>(initialSelected);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const selectedIds = new Set(selected.map((s) => s.positionId));
  const available = allPositions.filter((p) => !selectedIds.has(p.id));

  function handlePick(positionId: string) {
    const position = allPositions.find((p) => p.id === positionId);
    if (!position) return;
    setSelected([...selected, { positionId, positionName: position.name, headcountNeeded: 1 }]);
  }

  function updateHeadcount(positionId: string, headcountNeeded: number) {
    setSelected(
      selected.map((s) => (s.positionId === positionId ? { ...s, headcountNeeded } : s)),
    );
  }

  function remove(positionId: string) {
    setSelected(selected.filter((s) => s.positionId !== positionId));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>תפקידים נדרשים</Label>

      {selected.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {selected.map((s) => (
            <div key={s.positionId} className="flex items-center gap-2 rounded-md border p-2">
              <span className="flex-1 text-sm">{s.positionName}</span>
              <Input
                type="number"
                min={1}
                value={s.headcountNeeded}
                onChange={(e) => updateHeadcount(s.positionId, Number(e.target.value))}
                className="w-16"
              />
              <input type="hidden" name="positionId" value={s.positionId} />
              <input type="hidden" name="headcountNeeded" value={s.headcountNeeded} />
              <button
                type="button"
                aria-label={`הסרת ${s.positionName}`}
                onClick={() => remove(s.positionId)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {available.length > 0 ? (
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
            הוספת תפקיד...
            <ChevronsUpDown className="size-4 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0">
            <Command>
              <CommandInput placeholder="חיפוש תפקיד..." />
              <CommandList>
                <CommandEmpty>לא נמצאו תפקידים</CommandEmpty>
                <CommandGroup>
                  {available.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        handlePick(p.id);
                        setAddMenuOpen(false);
                      }}
                    >
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <p className="text-sm text-muted-foreground">כל התפקידים כבר נוספו.</p>
      )}
    </div>
  );
}
