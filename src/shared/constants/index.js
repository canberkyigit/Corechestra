import {
  TASK_COLUMNS_DATA,
  TASK_PRIORITY_STYLES,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_STYLES,
  TASK_TYPE_MAP,
} from "./taskMeta";

export const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
  { value: "defect", label: "Defect" },
  { value: "test", label: "Test" },
  { value: "testset", label: "Test Set" },
  { value: "testexecution", label: "Test Execution" },
  { value: "precondition", label: "Precondition" },
];

export const COLUMNS_DATA = TASK_COLUMNS_DATA;
export const STATUS_STYLES = TASK_STATUS_STYLES;
export const TYPE_MAP = TASK_TYPE_MAP;
export const PRIORITY_OPTIONS = TASK_PRIORITY_VALUES;
export const PRIORITY_STYLES = TASK_PRIORITY_STYLES;
