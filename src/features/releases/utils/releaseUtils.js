import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { taskKey } from "../../../shared/utils/helpers";

// "YYYY-MM-DD" must be parsed as a local date (new Date() would use UTC midnight).
export function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isValid(dateStr) ? dateStr : null;
  const parsed = parseISO(String(dateStr));
  return isValid(parsed) ? parsed : null;
}

export function toDateKey(date) {
  const d = parseDate(date);
  return d ? format(d, "yyyy-MM-dd") : "";
}

/** Calendar days from `now` to `dateStr` (negative = past). */
export function daysUntil(dateStr, now = new Date()) {
  const target = parseDate(dateStr);
  if (!target) return null;
  return differenceInCalendarDays(target, now);
}

export function daysRelative(dateStr, now = new Date()) {
  const diffDays = daysUntil(dateStr, now);
  if (diffDays === null) return null;
  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `In ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
}

/**
 * Relative label for a release's target date. Active releases past their date
 * are "overdue" (tone red); shipped ones read as plain history.
 */
export function describeTargetDate(dateStr, { active = true, now = new Date() } = {}) {
  const diff = daysUntil(dateStr, now);
  if (diff === null) return { text: "No target date", tone: "muted" };
  const plural = (n) => `${n} day${n !== 1 ? "s" : ""}`;
  if (diff === 0) return { text: active ? "Due today" : "Today", tone: active ? "warn" : "muted" };
  if (diff > 0) return { text: `in ${plural(diff)}`, tone: active && diff <= 3 ? "warn" : "muted" };
  if (active) return { text: `${plural(Math.abs(diff))} overdue`, tone: "danger" };
  return { text: `${plural(Math.abs(diff))} ago`, tone: "muted" };
}

export function formatDate(dateStr, pattern = "MMM d, yyyy") {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return format(d, pattern);
}

export function formatDateTime(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return format(d, "MMM d, yyyy · HH:mm");
}

/** Task-key aware search used by the release form and the link popup. */
export function matchesTaskQuery(task, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return (task.title || "").toLowerCase().includes(q)
    || taskKey(task.id).toLowerCase().includes(q)
    || String(task.id ?? "").toLowerCase() === q;
}

/** Releases without a projectId are legacy/global and stay visible everywhere. */
export function isReleaseVisibleInProject(release, projectId) {
  return !release?.projectId || !projectId || release.projectId === projectId;
}

export function findUser(users, key) {
  if (!key) return null;
  return (users || []).find((user) => user.id === key || user.username === key || user.name === key) || null;
}

export function userDisplayName(users, key) {
  const user = findUser(users, key);
  return user?.name || user?.username || key || "Unassigned";
}

export function initialsOf(name) {
  const parts = String(name || "?").replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
