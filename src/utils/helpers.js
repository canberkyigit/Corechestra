import { PRIORITY_STYLES } from "../constants";

export function generateSubtasks(title, min = 3, max = 5) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return Array.from({ length: count }, (_, i) => ({
    id: `${title.replace(/\s+/g, "_").toLowerCase()}_sub_${i + 1}`,
    title: `Subtask ${i + 1}`,
    done: Math.random() < 0.5,
  }));
}

export function getPriorityColor(priority) {
  return PRIORITY_STYLES[(priority || "medium").toLowerCase()] || PRIORITY_STYLES.medium;
}

export function getRetroItemColor(score) {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const s = clamp(score, -10, 10);
  if (s === 0) return "white";
  if (s < 0) {
    const pct = Math.abs(s) / 10;
    const sat = 70 * (1 - pct);
    const l = 90 + 10 * (1 - pct);
    return `hsl(120,${sat}%,${l}%)`;
  } else {
    const pct = s / 10;
    const sat = 70 * pct;
    const l = 100 - 10 * pct;
    return `hsl(0,${sat}%,${l}%)`;
  }
}

export function normalizeStatus(val) {
  return (val || "").toLowerCase().replace(/[\s-]/g, "");
}

export function generateId() {
  return `CY-${Math.floor(Math.random() * 100000)}`;
}

export function getSprintLabel(sprint) {
  if (!sprint) return "";
  if (sprint.value === "active") return "Active Sprint";
  return sprint.label || "";
}
