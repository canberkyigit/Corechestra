import { formatDistanceToNow } from "date-fns";

/** "3 days ago" style label; empty string for missing/invalid input. */
export function relativeTime(iso) {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
