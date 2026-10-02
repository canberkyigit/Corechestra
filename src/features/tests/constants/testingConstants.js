// Shared option lists and style maps for the Test Management module.
// Priority values align with the rest of the app (critical/high/medium/low).
import { TASK_PRIORITY_OPTIONS } from "../../../shared/constants/taskMeta";

export const TEST_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS.map(({ value, label }) => ({ value, label }));
export const TEST_PRIORITY_VALUES = TEST_PRIORITY_OPTIONS.map((option) => option.value);

export const TEST_RESULT_STATUS_OPTIONS = [
  { value: "untested", label: "Untested" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];
export const TEST_RESULT_STATUS_VALUES = TEST_RESULT_STATUS_OPTIONS.map((option) => option.value);

export const TEST_RUN_STATUS_VALUES = ["in-progress", "completed", "aborted"];

export const ENVIRONMENT_OPTIONS = [
  { value: "staging", label: "Staging" },
  { value: "uat", label: "UAT" },
  { value: "production-like", label: "Production-like" },
  { value: "local", label: "Local" },
];

export const PLATFORM_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "api", label: "API" },
  { value: "cross-platform", label: "Cross-platform" },
];

export const PRIORITY_BORDER = {
  critical: "border-l-red-600",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
};
export const PRIORITY_TEXT = {
  critical: "text-red-700 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-green-600 dark:text-green-400",
};
export const PRIORITY_BG = {
  critical: "bg-red-100 dark:bg-red-500/15",
  high: "bg-orange-100 dark:bg-orange-500/10",
  medium: "bg-yellow-100 dark:bg-yellow-500/10",
  low: "bg-green-100 dark:bg-green-500/10",
};

export const STATUS_CONFIG = {
  passed:   { label: "Passed",   color: "text-green-600 dark:text-green-400",   bg: "bg-green-100 dark:bg-green-500/15",   border: "border-green-500/30" },
  failed:   { label: "Failed",   color: "text-red-600 dark:text-red-400",       bg: "bg-red-100 dark:bg-red-500/15",       border: "border-red-500/30" },
  untested: { label: "Untested", color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-500/15",   border: "border-slate-500/30" },
  skipped:  { label: "Skipped",  color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-500/15", border: "border-yellow-500/30" },
};

export const RUN_STATUS_CONFIG = {
  "in-progress": { label: "In Progress", color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-500/15",   border: "border-blue-500/30" },
  completed:     { label: "Completed",   color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-500/15", border: "border-green-500/30" },
  aborted:       { label: "Aborted",     color: "text-red-600 dark:text-red-400",     bg: "bg-red-100 dark:bg-red-500/15",     border: "border-red-500/30" },
};

export const PLAN_STATUS_TONE = {
  completed: "text-green-600 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-500/30 dark:bg-green-500/10",
  "in-progress": "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10",
  aborted: "text-red-600 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-500/30 dark:bg-red-500/10",
  draft: "text-slate-600 border-slate-200 bg-slate-50 dark:text-slate-300 dark:border-slate-500/30 dark:bg-slate-500/10",
};

export const PLAN_STATUS_LABEL = {
  draft: "Draft",
  "in-progress": "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

// Reusable Tailwind class strings (light + dark).
export const INPUT_CLASS = "w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-600";
export const FILTER_SELECT_CLASS = "px-2.5 py-1.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none";
export const CHIP_CLASS = "text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]";
export const SECONDARY_BUTTON_CLASS = "px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors";
export const PRIMARY_BUTTON_CLASS = "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const COUNT_BADGE_CLASS = "ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 dark:bg-[#232838] dark:text-slate-400 text-xs rounded-full";
