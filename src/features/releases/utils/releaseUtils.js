import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { taskKey } from "../../../shared/utils/helpers";

// "YYYY-MM-DD" must be parsed as a local date (new Date() would use UTC midnight).
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const parsed = parseISO(String(dateStr));
  return isValid(parsed) ? parsed : null;
}

export function daysRelative(dateStr) {
  const target = parseDate(dateStr);
  if (!target) return null;
  const diffDays = differenceInCalendarDays(target, new Date());
  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `In ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
}

export function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Task-key aware search used by the release form and the "Add Task" popup. */
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
