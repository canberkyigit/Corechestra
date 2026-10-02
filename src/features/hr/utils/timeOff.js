import { parseIsoDate, toLocalIsoDate, isWeekend } from "./dates";

export const TIME_OFF_TYPES = [
  "Vacation",
  "Sick leave",
  "Unpaid leave",
  "Parental leave",
  "Bereavement leave",
];

export const DEFAULT_VACATION_DAYS = 20;

/** Normalises the stored type label ("Vacation", "Sick leave", "sick", …) into a calendar kind. */
export function getTimeOffKind(type) {
  const value = String(type || "").toLowerCase();
  if (!value) return null;
  if (value.includes("sick")) return "sick";
  if (value.includes("vacation") || value.includes("annual")) return "vacation";
  if (value.includes("parental")) return "parental";
  if (value.includes("unpaid")) return "unpaid";
  return "other";
}

export const TIME_OFF_KIND_STYLES = {
  sick: { label: "Sick leave", cell: "bg-purple-50 dark:bg-purple-900/10", chip: "bg-purple-200 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  vacation: { label: "Vacation", cell: "bg-amber-50 dark:bg-amber-900/10", chip: "bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  parental: { label: "Parental leave", cell: "bg-pink-50 dark:bg-pink-900/10", chip: "bg-pink-200 dark:bg-pink-800/40 text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  unpaid: { label: "Unpaid leave", cell: "bg-slate-100 dark:bg-slate-800/40", chip: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
  other: { label: "Leave", cell: "bg-teal-50 dark:bg-teal-900/10", chip: "bg-teal-200 dark:bg-teal-800/40 text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
};

export function getRequestStatus(request) {
  return request?.status || "pending";
}

export function isActiveTimeOff(request) {
  const status = getRequestStatus(request);
  return status !== "rejected" && status !== "cancelled";
}

/** Working days between two ISO dates (inclusive), excluding weekends and the given holiday ISO dates. */
export function countBusinessDays(fromIso, toIso, holidayIsoDates = []) {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to || from > to) return 0;
  const holidays = new Set(holidayIsoDates);
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (!isWeekend(cursor) && !holidays.has(toLocalIsoDate(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Annual leave balance for `year`: allowance minus approved vacation working days,
 * with pending vacation days reported separately.
 */
export function computeVacationBalance(requests, allowance, year, holidayIsoDates = []) {
  const total = Number.isFinite(Number(allowance)) && allowance !== "" && allowance !== null && allowance !== undefined
    ? Number(allowance)
    : DEFAULT_VACATION_DAYS;
  let used = 0;
  let pending = 0;
  (requests || []).forEach((request) => {
    if (getTimeOffKind(request.type || request.typeName) !== "vacation") return;
    const from = request.fromDate > `${year}-01-01` ? request.fromDate : `${year}-01-01`;
    const to = request.toDate < `${year}-12-31` ? request.toDate : `${year}-12-31`;
    const days = countBusinessDays(from, to, holidayIsoDates);
    const status = getRequestStatus(request);
    if (status === "approved") used += days;
    else if (status === "pending") pending += days;
  });
  return { total, used, pending, remaining: total - used };
}

/** Returns the requests covering a given ISO date. */
export function requestsOnDate(requests, isoDate) {
  return (requests || []).filter((request) => request.fromDate <= isoDate && request.toDate >= isoDate);
}
