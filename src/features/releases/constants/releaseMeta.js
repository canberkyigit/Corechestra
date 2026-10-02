import { FaArrowUp, FaBug, FaExclamationTriangle, FaStar } from "react-icons/fa";

export const RELEASES_READ_ONLY_MESSAGE = "You have read-only access to releases";

export const STATUS_META = {
  released:    { label: "Released",    dot: "bg-green-500",  badge: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30",  versionBg: "bg-green-600", color: "text-green-600 dark:text-green-400" },
  "in-progress": { label: "In Progress", dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",    versionBg: "bg-blue-600", color: "text-blue-600 dark:text-blue-400" },
  planned:     { label: "Planned",     dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-200 dark:border-slate-500/30", versionBg: "bg-slate-600", color: "text-slate-600 dark:text-slate-400" },
};

export const CHANGELOG_TYPE_META = {
  feature:     { label: "Features",         color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",   icon: FaStar,                badgeCls: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", tone: "blue" },
  bugfix:      { label: "Bug Fixes",        color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20",     icon: FaBug,                 badgeCls: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400", tone: "red" },
  improvement: { label: "Improvements",     color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20", icon: FaArrowUp,             badgeCls: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400", tone: "green" },
  breaking:    { label: "Breaking Changes", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20", icon: FaExclamationTriangle, badgeCls: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400", tone: "orange" },
};

/** Release-specific task status chips (slightly different tint than the board pills). */
export const TASK_STATUS_CHIP = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-600/50 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-600 dark:bg-blue-600/40 dark:text-blue-300",
  review:     "bg-purple-100 text-purple-600 dark:bg-purple-600/40 dark:text-purple-300",
  awaiting:   "bg-yellow-100 text-yellow-600 dark:bg-yellow-600/40 dark:text-yellow-300",
  blocked:    "bg-red-100 text-red-600 dark:bg-red-600/40 dark:text-red-300",
  done:       "bg-green-100 text-green-600 dark:bg-green-600/40 dark:text-green-300",
};

export const TASK_STATUS_CHIP_FALLBACK = "bg-slate-100 text-slate-600 dark:bg-slate-600/50 dark:text-slate-300";

export const TIMELINE_TYPE_LABELS = {
  created: "Created",
  changelog: "Release notes",
  started: "Started",
  replanned: "Replanned",
  release: "Released",
  status: "Status change",
  deploy: "Deployment",
  incident: "Incident",
  hotfix: "Hotfix",
  monitoring: "Monitoring",
};

export const EMPTY_RELEASE_FORM = {
  version: "",
  name: "",
  status: "planned",
  releaseDate: "",
  description: "",
  taskIds: [],
  templateId: "",
};

export const SIDEBAR_SECTIONS = [
  { key: "released", label: "Released" },
  { key: "in-progress", label: "In Progress" },
  { key: "planned", label: "Planned" },
];
