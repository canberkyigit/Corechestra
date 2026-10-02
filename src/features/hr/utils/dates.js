/** Local-calendar ISO date (YYYY-MM-DD). `toISOString()` is UTC and shifts the day near midnight. */
export function toLocalIsoDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatShortDate(iso) {
  const date = parseIsoDate(String(iso || "").slice(0, 10));
  if (!date) return iso || "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}
