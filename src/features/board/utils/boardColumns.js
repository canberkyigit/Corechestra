import { DEFAULT_COLUMNS } from "../../../shared/context/AppSeeds";
import { TASK_STATUS_OPTIONS } from "../../../shared/constants/taskMeta";

export const UNMAPPED_COLUMN_ID = "__unmapped__";
export const UNMAPPED_COLUMN = { id: UNMAPPED_COLUMN_ID, title: "Other / Unmapped", unmapped: true };

const BUILT_IN_LABELS = Object.fromEntries(TASK_STATUS_OPTIONS.map((option) => [option.value, option.label]));

export function resolveColumns(columns) {
  return Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS;
}

export function getStatusTitle(status, columns) {
  return resolveColumns(columns).find((column) => column.id === status)?.title
    || BUILT_IN_LABELS[status]
    || status
    || "—";
}

/**
 * Status picker options built from the project's columns (custom columns
 * included). If `currentStatus` is not a column it is kept as an extra option
 * so the picker never silently rewrites an unmapped status.
 */
export function buildStatusOptions(columns, currentStatus) {
  const options = resolveColumns(columns).map((column) => ({
    value: column.id,
    label: column.title || BUILT_IN_LABELS[column.id] || column.id,
  }));
  if (currentStatus && !options.some((option) => option.value === currentStatus)) {
    options.push({ value: currentStatus, label: `${BUILT_IN_LABELS[currentStatus] || currentStatus} (unmapped)` });
  }
  return options;
}

/** Column id a task is rendered under: its status, or the unmapped bucket. */
export function getTaskColumnId(task, columnIds) {
  return columnIds.has(task.status) ? task.status : UNMAPPED_COLUMN_ID;
}

/**
 * Groups tasks by column, appending an "Other / Unmapped" column when some
 * tasks carry a status that is not part of the project's workflow (removed
 * or custom statuses) so they never become invisible.
 */
export function groupTasksByColumn(tasks, columns) {
  const boardColumns = resolveColumns(columns);
  const columnIds = new Set(boardColumns.map((column) => column.id));
  const groups = Object.fromEntries(boardColumns.map((column) => [column.id, []]));
  let hasUnmapped = false;
  tasks.forEach((task) => {
    const columnId = getTaskColumnId(task, columnIds);
    if (columnId === UNMAPPED_COLUMN_ID) {
      hasUnmapped = true;
      if (!groups[UNMAPPED_COLUMN_ID]) groups[UNMAPPED_COLUMN_ID] = [];
    }
    groups[columnId].push(task);
  });
  return {
    columns: hasUnmapped ? [...boardColumns, UNMAPPED_COLUMN] : boardColumns,
    groups,
  };
}
