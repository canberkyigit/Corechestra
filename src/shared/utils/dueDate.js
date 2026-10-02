import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/** Days ahead (exclusive of today + N) that count as "due soon". */
export const DUE_SOON_DAYS = 3;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  try {
    const date = parseISO(String(value));
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/** Calendar-day distance from today (negative = past). `null` for invalid dates. */
export function daysUntil(dueDate, now = new Date()) {
  const date = toDate(dueDate);
  if (!date) return null;
  return differenceInCalendarDays(date, now);
}

/**
 * Single source of truth for due-date urgency across board, calendar,
 * dashboard and For You. Finished work is never overdue.
 *
 * @returns {"overdue"|"soon"|"ok"|null}
 */
export function getDueStatus(dueDate, status, now = new Date()) {
  if (status === "done") return null;
  const diff = daysUntil(dueDate, now);
  if (diff == null) return null;
  if (diff < 0) return "overdue";
  if (diff < DUE_SOON_DAYS) return "soon";
  return "ok";
}

export function isOverdue(dueDate, status, now = new Date()) {
  return getDueStatus(dueDate, status, now) === "overdue";
}

/** Short absolute label, e.g. "Oct 5". */
export function formatDueShort(dueDate) {
  const date = toDate(dueDate);
  return date ? format(date, "MMM d") : dueDate || "";
}

/** Friendly relative label, e.g. "Today", "Tomorrow", "in 4 days", "2 days ago". */
export function formatDueRelative(dueDate, now = new Date()) {
  const diff = daysUntil(dueDate, now);
  if (diff == null) return dueDate || "";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `in ${diff} days`;
  if (diff < -1 && diff >= -7) return `${-diff} days ago`;
  return formatDueShort(dueDate);
}
