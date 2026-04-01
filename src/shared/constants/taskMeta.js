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

export const TASK_PRIORITY_VALUES = TASK_PRIORITY_OPTIONS.map((option) => option.value);

export const TASK_COLUMNS_DATA = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

export const TASK_STATUS_STYLES = {
  done: "bg-green-100 text-green-700 border-green-200",
  inprogress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
  awaiting: "bg-purple-100 text-purple-700 border-purple-200",
  todo: "bg-gray-100 text-gray-600 border-gray-200",
};

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

export const TASK_PRIORITY_STYLES = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};
