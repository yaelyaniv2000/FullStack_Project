"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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

function timeRange(s: Shift): string {
  return `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`;
}

export function ShiftsCalendar({
  mode,
  shifts,
  selectedShiftId,
  onSelectShift,
  onDeleted,
}: {
  mode: "month" | "week";
  shifts: Shift[];
  selectedShiftId?: string | null;
  onSelectShift: (shift: Shift) => void;
  /** Called after a successful delete -- lets the parent clear its selection if the deleted
   * shift was the one currently open in the edit form. */
  onDeleted?: (id: string) => void;
}) {
  const today = new Date();
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
    () => (mode === "month" ? buildMonthGrid(anchor) : buildWeekRow(anchor)),
    [mode, anchor],
  );

  function goToPrev() {
    setAnchor((a) => (mode === "month" ? addMonths(a, -1) : addDays(a, -7)));
  }

  function goToNext() {
    setAnchor((a) => (mode === "month" ? addMonths(a, 1) : addDays(a, 7)));
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

  const cellMinHeight = mode === "month" ? "min-h-24" : "min-h-48";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {mode === "month" ? (
            `${HEBREW_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
          ) : (
            <span dir="ltr">{formatWeekRange(anchor)}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
            היום
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={goToPrev} aria-label="הקודם">
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={goToNext} aria-label="הבא">
            <ChevronLeft className="size-4" />
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
                {dayShifts.map((s) =>
                  mode === "month" ? (
                    <MonthChip
                      key={s.id}
                      shift={s}
                      selected={selectedShiftId === s.id}
                      onSelect={() => onSelectShift(s)}
                    />
                  ) : (
                    <WeekCard
                      key={s.id}
                      shift={s}
                      selected={selectedShiftId === s.id}
                      onSelect={() => onSelectShift(s)}
                      onDelete={() => handleDelete(s.id)}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact month-view chip: named shifts show their name (not the time, which barely fits at
 * this size anyway) -- the time is still available via the hover tooltip. No inline delete here
 * on purpose (per user feedback: the × ate too much of the little space this size has); deleting
 * happens from the edit form the chip opens instead. */
function MonthChip({ shift, selected, onSelect }: { shift: Shift; selected: boolean; onSelect: () => void }) {
  const status = getShiftStatus(shift);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onSelect}
            className={`w-full truncate rounded px-1.5 py-0.5 text-start text-xs ${STATUS_BADGE_CLASSES[status]} ${
              selected ? "ring-2 ring-ring" : ""
            }`}
          >
            {shift.name ?? <span dir="ltr">{shift.startTime.slice(0, 5)}</span>}
          </button>
        }
      />
      <TooltipContent side="top">
        <div className="flex flex-col gap-0.5">
          {shift.name ? <span className="font-medium">{shift.name}</span> : null}
          <span dir="ltr">{timeRange(shift)}</span>
          {shift.location ? <span>{shift.location}</span> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Week-view card: more room, so it shows what the month chip can't -- name, hours, and location
 * -- plus keeps the delete affordance the month view dropped. */
function WeekCard({
  shift,
  selected,
  onSelect,
  onDelete,
}: {
  shift: Shift;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const status = getShiftStatus(shift);
  const editable = isShiftEditable(shift);
  return (
    <div
      className={`flex items-start gap-1 rounded px-1.5 py-1 text-xs ${STATUS_BADGE_CLASSES[status]} ${
        selected ? "ring-2 ring-ring" : ""
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-start">
        <div className="flex flex-col">
          {shift.name ? (
            <span className="truncate font-medium">{shift.name}</span>
          ) : null}
          <span dir="ltr">{timeRange(shift)}</span>
          {shift.location ? <span className="truncate">{shift.location}</span> : null}
        </div>
      </button>
      {editable ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחיקת משמרת"
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
