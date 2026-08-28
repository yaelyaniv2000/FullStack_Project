"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteShift } from "@/features/shifts/actions";
import { getShiftStatus, isShiftEditable, type ShiftStatus } from "@/features/shifts/status";
import type { Shift } from "@/features/shifts/queries";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const WEEKDAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/** Local Y-M-D key, deliberately not Date#toISOString() -- that converts to UTC first, which can
 * shift the calendar date by a day depending on the browser's timezone offset. `shift.date` is a
 * plain Postgres `date` (no time/timezone component), so the grid needs the same plain
 * year/month/day construction to line up with it. */
function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const STATUS_BADGE_CLASSES: Record<ShiftStatus, string> = {
  draft: "border border-border bg-background text-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  published: "bg-primary text-primary-foreground",
};

type CalendarCell = { day: number; key: string } | null;

function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day, key: dateKey(year, month, day) });
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ShiftsCalendar({
  shifts,
  selectedShiftId,
  onSelectShift,
  onDeleted,
}: {
  shifts: Shift[];
  selectedShiftId?: string | null;
  onSelectShift: (shift: Shift) => void;
  /** Called after a successful delete -- lets the parent clear its selection if the deleted
   * shift was the one currently open in the edit form. */
  onDeleted?: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [shifts]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function goToPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteShift(id);
    if (!result.success) {
      setDeleteError(result.error);
    } else {
      onDeleted?.(id);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" onClick={goToPrevMonth} aria-label="חודש קודם">
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={goToNextMonth} aria-label="חודש הבא">
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
            היום
          </Button>
        </div>
        <span className="font-medium">
          {HEBREW_MONTHS[month]} {year}
        </span>
      </div>

      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="min-h-24 rounded border border-transparent" />;

          const dayShifts = shiftsByDate.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;

          return (
            <div
              key={cell.key}
              className={`flex min-h-24 flex-col gap-1 rounded border p-1 ${
                isToday ? "border-primary" : "border-border"
              }`}
            >
              <span className="text-xs text-muted-foreground">{cell.day}</span>
              <div className="flex flex-col gap-1">
                {dayShifts.map((s) => {
                  const editable = isShiftEditable(s);
                  const status = getShiftStatus(s);
                  return (
                    <div key={s.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectShift(s)}
                        className={`min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-start text-xs ${STATUS_BADGE_CLASSES[status]} ${
                          selectedShiftId === s.id ? "ring-2 ring-ring" : ""
                        }`}
                        title={s.name ?? undefined}
                      >
                        <span dir="ltr">{s.startTime.slice(0, 5)}</span>
                        {s.name ? ` ${s.name}` : ""}
                      </button>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          aria-label="מחיקת משמרת"
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
