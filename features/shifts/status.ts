import type { Shift } from "./queries";

export type ShiftStatus = "draft" | "assigned" | "published";

/** Same three states the "שובצה" badge (Batch A UX pass) already established -- shared here so
 * the calendar view can color-code shifts identically instead of re-deriving the same logic. */
export function getShiftStatus(shift: Pick<Shift, "publishedAt" | "assignedWorkerNames">): ShiftStatus {
  if (shift.publishedAt) return "published";
  if (shift.assignedWorkerNames.length > 0) return "assigned";
  return "draft";
}

/** Whether a shift can still be edited/deleted through the calendar's click-to-edit flow --
 * matches the one real boundary the rest of the app already enforces (deleteShift blocks only
 * published shifts; RLS/publish-timing treats `published_at` as the meaningful line everywhere
 * else too), not the narrower "no assignments yet" reading. */
export function isShiftEditable(shift: Pick<Shift, "publishedAt" | "assignedWorkerNames">): boolean {
  return getShiftStatus(shift) !== "published";
}
