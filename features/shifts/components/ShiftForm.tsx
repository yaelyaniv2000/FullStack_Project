"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { createShift, updateShift, type ShiftState } from "@/features/shifts/actions";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";
import { AvailabilityWindowForm } from "@/features/availability-windows/components/AvailabilityWindowForm";
import { ShiftPositionsPicker, type PositionRef, type SelectedPosition } from "./ShiftPositionsPicker";

const NO_WINDOW = "__none__";

/** Reused for both create and edit -- edit mode is just "a shift was passed in." */
export function ShiftForm({
  shift,
  allPositions,
  allQualifications,
  allTemplates,
  allAvailabilityWindows,
  onDone,
}: {
  shift?: Shift;
  allPositions: PositionRef[];
  allQualifications: Qualification[];
  allTemplates: ShiftTemplate[];
  allAvailabilityWindows: AvailabilityWindow[];
  onDone?: () => void;
}) {
  const action = shift ? updateShift.bind(null, shift.id) : createShift;
  const [state, formAction, pending] = useActionState<ShiftState, FormData>(action, undefined);
  const [windowId, setWindowId] = useState(shift?.availabilityWindowId ?? NO_WINDOW);
  const [extraWindows, setExtraWindows] = useState<AvailabilityWindow[]>([]);
  const [createWindowOpen, setCreateWindowOpen] = useState(false);
  // Same dedup reasoning as ShiftPositionsPicker's extraPositions: a just-created window can
  // end up back in `allAvailabilityWindows` once the page's server data catches up.
  const combinedWindows = [
    ...allAvailabilityWindows,
    ...extraWindows.filter((w) => !allAvailabilityWindows.some((a) => a.id === w.id)),
  ];

  // Bumped after a successful submit (clears the picker, same reasoning as PositionForm) and
  // whenever a template is chosen (remounts the picker with that template's positions as its
  // initial selection -- the picker owns its selection state internally, so this is the only way
  // to inject a different starting point from outside).
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerInitial, setPickerInitial] = useState<SelectedPosition[] | undefined>(
    shift?.positions,
  );
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
      setPickerInitial(undefined);
      setPickerKey((k) => k + 1);
      setWindowId(NO_WINDOW);
    }
  }, [state, onDone]);

  function handleTemplateChange(templateId: string) {
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setPickerInitial(template.positions);
    setPickerKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!shift && allTemplates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>התחלה מתבנית (אופציונלי)</Label>
          <Popover open={templateMenuOpen} onOpenChange={setTemplateMenuOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-64 justify-between font-normal text-muted-foreground"
                />
              }
            >
              בחירת תבנית
              <ChevronsUpDown className="size-4 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandInput placeholder="חיפוש תבנית..." />
                <CommandList>
                  <CommandEmpty>לא נמצאו תבניות</CommandEmpty>
                  <CommandGroup>
                    {allTemplates.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() => {
                          handleTemplateChange(t.id);
                          setTemplateMenuOpen(false);
                        }}
                      >
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">שם המשמרת (אופציונלי)</Label>
        <Input id="name" name="name" defaultValue={shift?.name ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">תאריך</Label>
        <Input
          id="date"
          name="date"
          type="date"
          dir="ltr"
          className="w-40 text-center"
          defaultValue={shift?.date}
          required
        />
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startTime">שעת התחלה</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            dir="ltr"
            className="w-28 text-center"
            defaultValue={shift?.startTime}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endTime">שעת סיום</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            dir="ltr"
            className="w-28 text-center"
            defaultValue={shift?.endTime}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">מיקום (אופציונלי)</Label>
        <Input id="location" name="location" defaultValue={shift?.location ?? ""} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>חלון זמינות (אופציונלי)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={windowId}
            onValueChange={(v) => setWindowId(v as string)}
            items={[
              { value: NO_WINDOW, label: "ללא" },
              ...combinedWindows.map((w) => ({ value: w.id, label: w.label })),
            ]}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_WINDOW}>ללא</SelectItem>
              {combinedWindows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreateWindowOpen(true)}>
            <Plus className="size-4" />
            חלון זמינות חדש
          </Button>
        </div>
        <input
          type="hidden"
          name="availabilityWindowId"
          value={windowId === NO_WINDOW ? "" : windowId}
        />
      </div>

      <Dialog open={createWindowOpen} onOpenChange={setCreateWindowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>פתיחת חלון זמינות חדש</DialogTitle>
          </DialogHeader>
          <AvailabilityWindowForm
            onCreated={(newWindow) => {
              setExtraWindows((prev) =>
                prev.some((w) => w.id === newWindow.id) ? prev : [...prev, { ...newWindow, opensAt: "", closesAt: "" }],
              );
              setWindowId(newWindow.id);
              setCreateWindowOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ShiftPositionsPicker
        key={pickerKey}
        allPositions={allPositions}
        allQualifications={allQualifications}
        initialSelected={pickerInitial}
      />

      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : shift ? "שמור שינויים" : "הוסף משמרת"}
        </Button>
        {shift ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  );
}
