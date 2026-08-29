"use client";

import { useState } from "react";
import { List, CalendarDays, LayoutGrid, Rows3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShiftForm } from "./ShiftForm";
import { ShiftsList } from "./ShiftsList";
import { ShiftsCalendar } from "./ShiftsCalendar";
import { ShiftReadOnlyView } from "./ShiftReadOnlyView";
import { deleteShift } from "@/features/shifts/actions";
import { isShiftEditable } from "@/features/shifts/status";
import type { Shift } from "@/features/shifts/queries";
import type { ShiftTemplate } from "@/features/shift-templates/queries";
import type { Qualification } from "@/features/qualifications/queries";
import type { PositionRef } from "./ShiftPositionsPicker";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

function ToggleSegment({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

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
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function clearSelection() {
    setSelectedShift(null);
    setDeleteError(null);
  }

  async function handleDeleteSelected() {
    if (!selectedShift) return;
    setDeleteError(null);
    const result = await deleteShift(selectedShift.id);
    if (!result.success) {
      setDeleteError(result.error);
    } else {
      clearSelection();
    }
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
            <div className="flex flex-col gap-4">
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
              {editing ? (
                <div className="flex flex-col gap-2 border-t pt-4">
                  {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
                  <Button type="button" variant="outline" className="text-destructive" onClick={handleDeleteSelected}>
                    מחיקת משמרת
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:w-2/3">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>משמרות קיימות ({shifts.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              <ToggleSegment active={viewMode === "list"} onClick={() => setViewMode("list")}>
                <List className="size-4" />
                רשימה
              </ToggleSegment>
              <ToggleSegment active={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>
                <CalendarDays className="size-4" />
                לוח שנה
              </ToggleSegment>
            </div>
            {viewMode === "calendar" ? (
              <div className="flex rounded-md border p-0.5 ps-2">
                <ToggleSegment
                  active={calendarMode === "month"}
                  onClick={() => setCalendarMode("month")}
                  ariaLabel="תצוגת חודש"
                >
                  <LayoutGrid className="size-4" />
                </ToggleSegment>
                <ToggleSegment
                  active={calendarMode === "week"}
                  onClick={() => setCalendarMode("week")}
                  ariaLabel="תצוגת שבוע"
                >
                  <Rows3 className="size-4" />
                </ToggleSegment>
              </div>
            ) : null}
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
              mode={calendarMode}
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
