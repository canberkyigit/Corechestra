import { format, isThisYear, isToday, isYesterday, differenceInCalendarDays } from "date-fns";

export function formatMessageTime(ms) {
  if (!ms) return "";
  return format(new Date(ms), "HH:mm");
}

export function formatFullTimestamp(ms) {
  if (!ms) return "";
  return format(new Date(ms), "EEEE, d MMMM yyyy 'at' HH:mm");
}

export function formatDayDivider(ms, now = Date.now()) {
  const date = new Date(ms);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (differenceInCalendarDays(now, date) < 7) return format(date, "EEEE");
  return isThisYear(date) ? format(date, "EEEE, d MMMM") : format(date, "d MMMM yyyy");
}

/** Compact time for lists: 14:05 · Yesterday · Mon · 3 Sep · 3 Sep 2024 */
export function formatListTime(ms, now = Date.now()) {
  if (!ms) return "";
  const date = new Date(ms);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (differenceInCalendarDays(now, date) < 7) return format(date, "EEE");
  return isThisYear(date) ? format(date, "d MMM") : format(date, "d MMM yyyy");
}

export function formatLocalTime(timezone, now = Date.now()) {
  if (!timezone) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(now));
  } catch {
    return "";
  }
}

export const STATUS_DURATIONS = [
  { id: "30m", label: "30 minutes", ms: 30 * 60 * 1000 },
  { id: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { id: "4h", label: "4 hours", ms: 4 * 60 * 60 * 1000 },
  { id: "today", label: "Today", ms: null },
  { id: "week", label: "This week", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "never", label: "Don't clear", ms: 0 },
];

export function resolveStatusExpiry(durationId, now = Date.now()) {
  const duration = STATUS_DURATIONS.find((entry) => entry.id === durationId);
  if (!duration || duration.ms === 0) return 0;
  if (duration.ms === null) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }
  return now + duration.ms;
}
