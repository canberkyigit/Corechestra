import React from "react";
import {
  FaBug,
  FaCheckSquare,
  FaExclamationCircle,
  FaFlag,
  FaLayerGroup,
  FaPlay,
  FaPlusSquare,
  FaRegDotCircle,
  FaRocket,
  FaSearch,
  FaUser,
} from "react-icons/fa";

export const TASK_TYPE_OPTIONS = [
  { value: "task", label: "Task", icon: FaCheckSquare, color: "text-green-500", badgeColor: "bg-green-100 text-green-700" },
  { value: "bug", label: "Bug", icon: FaBug, color: "text-red-500", badgeColor: "bg-red-100 text-red-700" },
  { value: "feature", label: "Feature", icon: FaPlusSquare, color: "text-cyan-500", badgeColor: "bg-cyan-100 text-cyan-700" },
  { value: "defect", label: "Defect", icon: FaExclamationCircle, color: "text-orange-500", badgeColor: "bg-orange-100 text-orange-700" },
  { value: "userstory", label: "User Story", icon: FaUser, color: "text-blue-500", badgeColor: "bg-blue-100 text-blue-700" },
  { value: "investigation", label: "Investigation", icon: FaSearch, color: "text-purple-500", badgeColor: "bg-purple-100 text-purple-700" },
  { value: "epic", label: "Epic", icon: FaRocket, color: "text-violet-500", badgeColor: "bg-violet-100 text-violet-700" },
  { value: "test", label: "Test", icon: FaSearch, color: "text-teal-500", badgeColor: "bg-teal-100 text-teal-700" },
  { value: "testset", label: "Test Set", icon: FaFlag, color: "text-indigo-500", badgeColor: "bg-indigo-100 text-indigo-700" },
  { value: "testexecution", label: "Test Execution", icon: FaPlay, color: "text-lime-600", badgeColor: "bg-lime-100 text-lime-700" },
  { value: "precondition", label: "Precondition", icon: FaRegDotCircle, color: "text-sky-500", badgeColor: "bg-sky-100 text-sky-700" },
];

export const BOARD_FILTER_TYPE_OPTIONS = [
  { value: "", label: "All", icon: FaLayerGroup, color: "text-slate-500" },
  ...TASK_TYPE_OPTIONS,
];

export const TASK_STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "awaiting", label: "Awaiting Customer" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export const TASK_SUBTASK_STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  { value: "inprogress", label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "review", label: "Review", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "done", label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-green-500" },
];

export const TASK_TYPE_MAP = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((option) => [
    option.value,
    {
      label: option.label,
      color: option.badgeColor,
      icon: React.createElement(option.icon),
    },
  ])
);

// ── Derived / presentation maps ────────────────────────────────────────────
// Every feature should read type/status/priority presentation from here instead
// of keeping its own copy. Tailwind needs literal class names, so the class maps
// are spelled out rather than generated.

/** `{ [type]: { icon: ReactIconComponent, color: "text-*" } }` */
export const TASK_TYPE_ICON_META = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((option) => [option.value, { icon: option.icon, color: option.color }])
);

/** `{ [type]: label }` */
export const TASK_TYPE_LABELS = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

/** Hex colour per task type (mirrors the `color` classes above). */
export const TASK_TYPE_HEX = {
  task:          "#22c55e",
  bug:           "#ef4444",
  feature:       "#06b6d4",
  defect:        "#f97316",
  userstory:     "#3b82f6",
  investigation: "#a855f7",
  epic:          "#8b5cf6",
  test:          "#14b8a6",
  testset:       "#6366f1",
  testexecution: "#65a30d",
  precondition:  "#0ea5e9",
  // legacy aliases
  story:         "#3b82f6",
  subtask:       "#06b6d4",
};

/** Light + dark pill classes per task type. */
export const TASK_TYPE_BADGE_STYLES = {
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  userstory: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  investigation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  epic: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  feature: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  task: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  defect: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  test: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  testset: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  testexecution: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  precondition: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

/** Icon-chip classes (icon colour + tinted background) per task type. */
export const TASK_TYPE_CHIP_STYLES = {
  bug:           "text-red-500    bg-red-50    dark:bg-red-900/30",
  defect:        "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
  userstory:     "text-blue-500   bg-blue-50   dark:bg-blue-900/30",
  investigation: "text-purple-500 bg-purple-50 dark:bg-purple-900/30",
  task:          "text-green-500  bg-green-50  dark:bg-green-900/30",
  feature:       "text-cyan-500   bg-cyan-50   dark:bg-cyan-900/30",
  epic:          "text-violet-500 bg-violet-50 dark:bg-violet-900/30",
  test:          "text-teal-500   bg-teal-50   dark:bg-teal-900/30",
  testset:       "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30",
  testexecution: "text-lime-600   bg-lime-50   dark:bg-lime-900/30",
  precondition:  "text-sky-500    bg-sky-50    dark:bg-sky-900/30",
};

/** Compact status labels ("Awaiting" instead of "Awaiting Customer"). */
export const TASK_STATUS_SHORT_LABELS = {
  todo: "To Do",
  inprogress: "In Progress",
  review: "Review",
  awaiting: "Awaiting",
  blocked: "Blocked",
  done: "Done",
};

/** Light + dark status pill classes. */
export const TASK_STATUS_BADGE_STYLES = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  awaiting:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blocked:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  done:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

/** Hex colour per priority (inline styles / charts). */
export const TASK_PRIORITY_HEX = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

/** Solid dot classes per priority. */
export const TASK_PRIORITY_DOT_STYLES = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};
