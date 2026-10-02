import { TASK_PRIORITY_HEX } from "../../../shared/constants/taskMeta";

const LANE_SEPARATOR = "::";

export const SWIMLANE_MODES = [
  { value: "none", label: "No swimlanes" },
  { value: "assignee", label: "By assignee" },
  { value: "epic", label: "By epic" },
  { value: "priority", label: "By priority" },
];

const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

export function encodeDroppableId(columnId, laneKey) {
  return laneKey === undefined || laneKey === null ? columnId : `${columnId}${LANE_SEPARATOR}${laneKey}`;
}

export function parseDroppableId(droppableId) {
  const value = String(droppableId || "");
  const separatorIndex = value.indexOf(LANE_SEPARATOR);
  if (separatorIndex < 0) return { columnId: value, laneKey: null };
  return {
    columnId: value.slice(0, separatorIndex),
    laneKey: value.slice(separatorIndex + LANE_SEPARATOR.length),
  };
}

/** Lane key a task belongs to for the given swimlane mode. */
export function getLaneKey(task, mode) {
  if (mode === "assignee") return task.assignedTo && task.assignedTo !== "unassigned" ? task.assignedTo : "unassigned";
  if (mode === "epic") return task.epicId || "none";
  if (mode === "priority") return (task.priority || "medium").toLowerCase();
  return null;
}

/** Field patch applied when a card is dropped into another lane. */
export function getLanePatch(mode, laneKey) {
  if (mode === "assignee") return { assignedTo: laneKey === "unassigned" ? "unassigned" : laneKey };
  if (mode === "epic") return { epicId: laneKey === "none" ? null : laneKey };
  if (mode === "priority") return { priority: laneKey };
  return {};
}

/**
 * Builds swimlane descriptors `{ key, label, color, tasks }` for the visible
 * tasks. Lanes keep a stable, meaningful order per mode.
 */
export function buildSwimlanes(tasks, mode, { teamMembers = [], epics = [] } = {}) {
  if (!mode || mode === "none") return [];
  const byKey = new Map();
  tasks.forEach((task) => {
    const key = getLaneKey(task, mode);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(task);
  });

  const describe = (key) => {
    if (mode === "assignee") {
      if (key === "unassigned") return { label: "Unassigned", color: "#94a3b8" };
      const member = teamMembers.find((item) => item.value === key);
      return { label: member?.label || key, color: member?.color || "#64748b" };
    }
    if (mode === "epic") {
      if (key === "none") return { label: "No epic", color: "#94a3b8" };
      const epic = epics.find((item) => item.id === key);
      return { label: epic?.title || "Unknown epic", color: epic?.color || "#8b5cf6" };
    }
    return { label: key.charAt(0).toUpperCase() + key.slice(1), color: TASK_PRIORITY_HEX[key] || "#94a3b8" };
  };

  const keys = [...byKey.keys()];
  if (mode === "priority") {
    keys.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a);
      const bi = PRIORITY_ORDER.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  } else {
    // Keep the "empty" bucket last.
    const emptyKey = mode === "assignee" ? "unassigned" : "none";
    keys.sort((a, b) => (a === emptyKey) - (b === emptyKey));
  }

  return keys.map((key) => ({ key, ...describe(key), tasks: byKey.get(key) }));
}

/**
 * Translates a drop position inside a rendered (filtered / paginated) list
 * into anchors in the underlying unfiltered array.
 *
 * `visibleIds` are the ids rendered in the destination droppable (excluding
 * nothing); `draggedId` is removed first, mirroring how @hello-pangea/dnd
 * reports `destination.index`.
 */
export function getDropAnchors(visibleIds, draggedId, destinationIndex) {
  const ids = visibleIds.filter((id) => id !== draggedId);
  if (ids.length === 0) return { beforeTaskId: null, afterTaskId: null };
  if (destinationIndex < ids.length) return { beforeTaskId: ids[Math.max(0, destinationIndex)], afterTaskId: null };
  return { beforeTaskId: null, afterTaskId: ids[ids.length - 1] };
}

/**
 * Converts a rendered drop index into an index of the full list (without the
 * dragged item) — used for list-style droppables like backlog sections.
 */
export function toFullListIndex(fullIds, visibleIds, draggedId, destinationIndex) {
  const full = fullIds.filter((id) => id !== draggedId);
  const { beforeTaskId, afterTaskId } = getDropAnchors(visibleIds, draggedId, destinationIndex);
  if (beforeTaskId !== null) {
    const index = full.indexOf(beforeTaskId);
    return index >= 0 ? index : full.length;
  }
  if (afterTaskId !== null) {
    const index = full.indexOf(afterTaskId);
    return index >= 0 ? index + 1 : full.length;
  }
  return full.length;
}
