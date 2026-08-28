"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShiftForm } from "./ShiftForm";
import { ShiftsList } from "./ShiftsList";
import { ShiftsCalendar } from "./ShiftsCalendar";
import { ShiftReadOnlyView } from "./ShiftReadOnlyView";
import { isShiftEditable } from "@/features/shifts/status";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import type { PositionRef } from "./ShiftPositionsPicker";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

/** Owns the two pieces of state a calendar view needs that the plain list view never did: which
 * shift is selected (drives the left card swapping between create/edit/read-only) and which view
 * mode is active. Everything else (the form itself, the list itself) is reused as-is. */
export function ShiftsPanel({
  shifts,
  allPositions,
  allQualifications,
  allTemplates,
  allAvailabilityWindows,
}: {
  shifts: Shift[];
  allPositions: PositionRef[];
  allQualifications: Qualification[];
  allTemplates: ShiftTemplate[];
  allAvailabilityWindows: AvailabilityWindow[];
}) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  function clearSelection() {
    setSelectedShift(null);
  }

  const editing = selectedShift && isShiftEditable(selectedShift);
  const viewing = selectedShift && !isShiftEditable(selectedShift);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <Card className="md:w-1/3">
        <CardHeader>
          <CardTitle>
            {viewing ? "פרטי משמרת" : editing ? "עריכת משמרת" : "הוספת משמרת חדשה"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewing && selectedShift ? (
            <ShiftReadOnlyView shift={selectedShift} onClose={clearSelection} />
          ) : (
            <ShiftForm
              key={
                editing && selectedShift
                  ? `${selectedShift.id}-${selectedShift.name}-${selectedShift.date}-${selectedShift.startTime}-${selectedShift.endTime}-${selectedShift.location}-${selectedShift.availabilityWindowId}`
                  : "create"
              }
              shift={editing && selectedShift ? selectedShift : undefined}
              allPositions={allPositions}
              allQualifications={allQualifications}
              allTemplates={allTemplates}
              allAvailabilityWindows={allAvailabilityWindows}
              onDone={clearSelection}
            />
          )}
        </CardContent>
      </Card>

      <Card className="md:w-2/3">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>משמרות קיימות ({shifts.length})</CardTitle>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              רשימה
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "calendar" ? "default" : "outline"}
              onClick={() => setViewMode("calendar")}
            >
              לוח שנה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            <ShiftsList
              shifts={shifts}
              allPositions={allPositions}
              allQualifications={allQualifications}
              allTemplates={allTemplates}
              allAvailabilityWindows={allAvailabilityWindows}
            />
          ) : (
            <ShiftsCalendar
              shifts={shifts}
              selectedShiftId={selectedShift?.id}
              onSelectShift={setSelectedShift}
              onDeleted={(id) => {
                if (selectedShift?.id === id) clearSelection();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
