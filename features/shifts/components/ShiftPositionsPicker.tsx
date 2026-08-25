"use client";

import { useState } from "react";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PositionForm } from "@/features/positions/components/PositionForm";
import type { Qualification } from "@/features/qualifications/queries";

export type PositionRef = { id: string; name: string };
export type SelectedPosition = { positionId: string; positionName: string; headcountNeeded: number };

/**
 * Like ShiftTemplatePositionsPicker (searchable combobox + a headcount number input per row),
 * plus a "תפקיד חדש" button that opens the real PositionForm in a dialog -- per user feedback
 * (2026-08-22), picking positions for a shift shouldn't force a detour to /admin/positions.
 * A freshly created position isn't in `allPositions` (that was fetched before the dialog ever
 * opened), so it's tracked in local `extraPositions` and auto-selected.
 */
export function ShiftPositionsPicker({
  allPositions,
  allQualifications,
  initialSelected = [],
}: {
  allPositions: PositionRef[];
  allQualifications: Qualification[];
  initialSelected?: SelectedPosition[];
}) {
  const [selected, setSelected] = useState<SelectedPosition[]>(initialSelected);
  const [extraPositions, setExtraPositions] = useState<PositionRef[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // extraPositions can end up re-included in allPositions once the page's server data catches
  // up (any server action triggers a refresh of the current route, not just the explicitly
  // revalidated path) -- dedupe so a just-created position doesn't render as two entries.
  const combinedPositions = [
    ...allPositions,
    ...extraPositions.filter((p) => !allPositions.some((a) => a.id === p.id)),
  ];
  const selectedIds = new Set(selected.map((s) => s.positionId));
  const available = combinedPositions.filter((p) => !selectedIds.has(p.id));

  function handlePick(positionId: string) {
    const position = combinedPositions.find((p) => p.id === positionId);
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

      <div className="flex flex-wrap items-center gap-2">
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
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          תפקיד חדש
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת תפקיד חדש</DialogTitle>
          </DialogHeader>
          <PositionForm
            allQualifications={allQualifications}
            onCreated={(position) => {
              // Guards against React Strict Mode's dev-mode double-invoke of effects, which
              // would otherwise fire this twice and add two same-keyed entries -- React's own
              // reconciliation can silently drop children when keys collide, which previously
              // corrupted the whole picker's state, not just the duplicate.
              setExtraPositions((prev) =>
                prev.some((p) => p.id === position.id) ? prev : [...prev, position],
              );
              setSelected((prev) =>
                prev.some((s) => s.positionId === position.id)
                  ? prev
                  : [
                      ...prev,
                      { positionId: position.id, positionName: position.name, headcountNeeded: 1 },
                    ],
              );
              setCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
