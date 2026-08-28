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
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -d.getDay());
}

const STATUS_BADGE_CLASSES: Record<ShiftStatus, string> = {
  draft: "border border-border bg-background text-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  published: "bg-primary text-primary-foreground",
};

type CalendarCell = { date: Date; key: string } | null;

function buildMonthGrid(anchor: Date): CalendarCell[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, key: dateKey(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildWeekRow(anchor: Date): CalendarCell[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, key: dateKey(date) };
  });
}

/** D.M -- D.M, deliberately wrapped in dir="ltr": a dash-separated numeric range is exactly the
 * bidi-reordering case CLAUDE.md's date/time rule warns about. */
function formatWeekRange(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`;
  return `${fmt(start)}–${fmt(end)}`;
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
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(startOfDay(today));
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const todayKey = dateKey(today);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [shifts]);

  const cells = useMemo(
    () => (calendarMode === "month" ? buildMonthGrid(anchor) : buildWeekRow(anchor)),
    [calendarMode, anchor],
  );

  function goToPrev() {
    setAnchor((a) => (calendarMode === "month" ? addMonths(a, -1) : addDays(a, -7)));
  }

  function goToNext() {
    setAnchor((a) => (calendarMode === "month" ? addMonths(a, 1) : addDays(a, 7)));
  }

  function goToToday() {
    setAnchor(startOfDay(today));
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

  const cellMinHeight = calendarMode === "month" ? "min-h-24" : "min-h-40";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" onClick={goToPrev} aria-label="הקודם">
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={goToNext} aria-label="הבא">
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
            היום
          </Button>
        </div>
        <span className="font-medium">
          {calendarMode === "month" ? (
            `${HEBREW_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
          ) : (
            <span dir="ltr">{formatWeekRange(anchor)}</span>
          )}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={calendarMode === "month" ? "default" : "outline"}
            onClick={() => setCalendarMode("month")}
          >
            חודש
          </Button>
          <Button
            type="button"
            size="sm"
            variant={calendarMode === "week" ? "default" : "outline"}
            onClick={() => setCalendarMode("week")}
          >
            שבוע
          </Button>
        </div>
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
          if (!cell) return <div key={i} className={`${cellMinHeight} rounded border border-transparent`} />;

          const dayShifts = shiftsByDate.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;

          return (
            <div
              key={cell.key}
              className={`flex ${cellMinHeight} flex-col gap-1 rounded border p-1 ${
                isToday ? "border-primary" : "border-border"
              }`}
            >
              <span className="text-xs text-muted-foreground">{cell.date.getDate()}</span>
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
                        <span dir="ltr">
                          {calendarMode === "week"
                            ? `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`
                            : s.startTime.slice(0, 5)}
                        </span>
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
