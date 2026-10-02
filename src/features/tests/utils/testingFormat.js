// Formatting and small date helpers (pure, locale-stable).

export const DAY_MS = 86400000;

export function toTimestamp(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Local `YYYY-MM-DD` for a timestamp/ISO/Date. */
export function dayKey(value) {
  const ts = toTimestamp(value);
  if (!ts) return "";
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDay(value) {
  const date = new Date(toTimestamp(value) || Date.now());
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Parses `YYYY-MM-DD` as a local date (not UTC). */
export function parseDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  const ts = toTimestamp(value);
  return ts ? new Date(ts) : null;
}

export function formatDate(value, fallback = "—") {
  const date = parseDateOnly(value);
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function formatDateTime(value, fallback = "—") {
  const ts = toTimestamp(value);
  if (!ts) return fallback;
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(value, now = Date.now()) {
  const ts = toTimestamp(value);
  if (!ts) return "—";
  const diff = toTimestamp(now) - ts;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";
  if (abs < 60000) return diff >= 0 ? "just now" : "in a moment";
  if (abs < 3600000) return `${Math.round(abs / 60000)}m ${suffix}`;
  if (abs < DAY_MS) return `${Math.round(abs / 3600000)}h ${suffix}`;
  if (abs < 30 * DAY_MS) return `${Math.round(abs / DAY_MS)}d ${suffix}`;
  return formatDate(ts);
}

/** Days from `now` until a date (negative = overdue), or null. */
export function daysUntil(value, now = new Date()) {
  const date = parseDateOnly(value);
  if (!date) return null;
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function formatDueLabel(value, now = new Date()) {
  const days = daysUntil(value, now);
  if (days === null) return "No due date";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days}d`;
  return `${Math.abs(days)}d overdue`;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatEstimate(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 60) return `${value}m`;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

/** Display name for a username/id using product People records. */
export function userLabel(users, username) {
  if (!username) return "Unassigned";
  const user = (users || []).find((item) => item && (item.username === username || item.id === username || item.email === username));
  return user?.name || username;
}

export function initials(name) {
  const parts = String(name || "?").replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

export function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
