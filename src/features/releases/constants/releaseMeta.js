import {
  FaArrowUp,
  FaBan,
  FaBug,
  FaExclamationTriangle,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

export const RELEASES_READ_ONLY_MESSAGE = "You have read-only access to releases";

// ── Release lifecycle ──────────────────────────────────────────────────────
// NOTE: `dark.css` remaps a few light utility classes (bg-white, text-slate-*,
// border-slate-200, …) in dark mode with the same specificity as Tailwind's
// `dark:` variants. Classes below therefore pair light *tinted* utilities
// (which dark.css does not touch) with explicit `dark:` colours.

export const RELEASE_STATUSES = ["planned", "in-progress", "code-freeze", "released", "rolled-back", "cancelled"];
export const ACTIVE_RELEASE_STATUSES = ["planned", "in-progress", "code-freeze"];
export const LIFECYCLE_STEPS = ["planned", "in-progress", "code-freeze", "released"];

export const STATUS_META = {
  planned: {
    label: "Planned",
    dot: "bg-slate-400",
    pill: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/25",
    bar: "bg-slate-400 dark:bg-slate-500",
    hex: "#94a3b8",
  },
  "in-progress": {
    label: "In progress",
    dot: "bg-blue-500",
    pill: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30",
    bar: "bg-blue-500",
    hex: "#3b82f6",
  },
  "code-freeze": {
    label: "Code freeze",
    dot: "bg-cyan-500",
    pill: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/25 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30",
    bar: "bg-cyan-500",
    hex: "#06b6d4",
  },
  released: {
    label: "Released",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    bar: "bg-emerald-500",
    hex: "#10b981",
  },
  "rolled-back": {
    label: "Rolled back",
    dot: "bg-orange-500",
    pill: "bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30",
    bar: "bg-orange-500",
    hex: "#f97316",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-400",
    pill: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
    bar: "bg-rose-300 dark:bg-rose-500/60",
    hex: "#fb7185",
  },
};

// ── Release notes ──────────────────────────────────────────────────────────
export const CHANGELOG_TYPES = ["feature", "improvement", "bugfix", "breaking", "security", "deprecation"];

export const CHANGELOG_TYPE_META = {
  feature:     { label: "Features",         short: "Feature",     icon: FaStar,                chip: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300", accent: "text-blue-600 dark:text-blue-400" },
  improvement: { label: "Improvements",     short: "Improvement", icon: FaArrowUp,             chip: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300", accent: "text-emerald-600 dark:text-emerald-400" },
  bugfix:      { label: "Bug fixes",        short: "Bug fix",     icon: FaBug,                 chip: "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300", accent: "text-red-600 dark:text-red-400" },
  breaking:    { label: "Breaking changes", short: "Breaking",    icon: FaExclamationTriangle, chip: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300", accent: "text-orange-600 dark:text-orange-400" },
  security:    { label: "Security",         short: "Security",    icon: FaShieldAlt,           chip: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300", accent: "text-violet-600 dark:text-violet-400" },
  deprecation: { label: "Deprecations",     short: "Deprecation", icon: FaBan,                 chip: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300", accent: "text-amber-600 dark:text-amber-400" },
};

// ── Environments ───────────────────────────────────────────────────────────
export const ENVIRONMENT_KEYS = ["dev", "staging", "production"];
export const ENVIRONMENT_LABELS = { dev: "Development", staging: "Staging", production: "Production" };
export const ENVIRONMENT_SHORT = { dev: "Dev", staging: "Stg", production: "Prod" };
export const ENV_STATUSES = ["pending", "deploying", "deployed", "failed", "rolled-back"];

export const ENV_STATUS_META = {
  pending:       { label: "Pending",     dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-600 dark:text-slate-400", ring: "ring-slate-300/70 dark:ring-slate-600" },
  deploying:     { label: "Deploying",   dot: "bg-blue-500 animate-pulse",       text: "text-blue-700 dark:text-blue-300",   ring: "ring-blue-400/50" },
  deployed:      { label: "Deployed",    dot: "bg-emerald-500",                  text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-400/50" },
  failed:        { label: "Failed",      dot: "bg-red-500",                      text: "text-red-700 dark:text-red-300",     ring: "ring-red-400/50" },
  "rolled-back": { label: "Rolled back", dot: "bg-orange-500",                   text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-400/50" },
};

// ── Risk ───────────────────────────────────────────────────────────────────
export const RISK_LEVELS = ["low", "medium", "high"];
export const RISK_META = {
  none:   { label: "—",      pill: "bg-slate-500/5 text-slate-500 ring-slate-500/10 dark:text-slate-500" },
  low:    { label: "Low",    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/25" },
  medium: { label: "Medium", pill: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300 dark:ring-amber-400/30" },
  high:   { label: "High",   pill: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300 dark:ring-red-400/30" },
};

// ── Timeline events ────────────────────────────────────────────────────────
export const TIMELINE_TYPE_LABELS = {
  created: "Created",
  changelog: "Release notes",
  started: "Started",
  replanned: "Replanned",
  freeze: "Code freeze",
  release: "Released",
  rollback: "Rolled back",
  cancelled: "Cancelled",
  status: "Status change",
  deploy: "Deployment",
  "deploy-failed": "Deployment failed",
  "env-rollback": "Environment rollback",
  incident: "Incident",
  hotfix: "Hotfix",
  monitoring: "Monitoring",
  scope: "Scope change",
  note: "Note",
};

export const TIMELINE_TONE = {
  created: "bg-slate-400",
  changelog: "bg-violet-500",
  started: "bg-blue-500",
  replanned: "bg-slate-400",
  freeze: "bg-cyan-500",
  release: "bg-emerald-500",
  rollback: "bg-orange-500",
  cancelled: "bg-rose-400",
  status: "bg-slate-400",
  deploy: "bg-emerald-500",
  "deploy-failed": "bg-red-500",
  "env-rollback": "bg-orange-500",
  incident: "bg-red-500",
  hotfix: "bg-amber-500",
  monitoring: "bg-sky-500",
  scope: "bg-indigo-500",
  note: "bg-slate-400",
};

export const MANUAL_TIMELINE_TYPES = ["deploy", "incident", "hotfix", "monitoring", "note"];

// ── Page / view options ────────────────────────────────────────────────────
export const RELEASE_VIEWS = [
  { id: "list", label: "List" },
  { id: "timeline", label: "Timeline" },
  { id: "board", label: "Board" },
];

export const RELEASE_SORTS = [
  { id: "date", label: "Target date" },
  { id: "version", label: "Version" },
  { id: "progress", label: "Progress" },
];

export const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "planned", label: "Planned" },
  { id: "in-progress", label: "In progress" },
  { id: "code-freeze", label: "Code freeze" },
  { id: "released", label: "Released" },
  { id: "closed", label: "Closed" },
];

export const BOARD_COLUMNS = [
  { id: "planned", label: "Planned", statuses: ["planned"] },
  { id: "in-progress", label: "In progress", statuses: ["in-progress"] },
  { id: "code-freeze", label: "Code freeze", statuses: ["code-freeze"] },
  { id: "released", label: "Released", statuses: ["released", "rolled-back"] },
];

export const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work items" },
  { id: "notes", label: "Release notes" },
  { id: "quality", label: "Quality" },
  { id: "deployments", label: "Deployments" },
];

export const VIEW_STORAGE_KEY = "corechestra_releases_view";
export const SAMPLE_SEED_KEY_PREFIX = "corechestra_release_samples_seeded_";

export const EMPTY_RELEASE_FORM = {
  version: "",
  name: "",
  status: "planned",
  startDate: "",
  freezeDate: "",
  releaseDate: "",
  owner: "",
  description: "",
  taskIds: [],
  templateId: "",
};

// Shared input styling for release forms. Inputs get the dark palette from
// dark.css (`.dark input[type=text]`), so only light classes are needed here.
export const FIELD_BASE = "rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:border-[#2a3044] dark:text-slate-100 dark:[color-scheme:dark]";
export const FIELD_CLASS = `w-full ${FIELD_BASE}`;
export const LABEL_CLASS = "block text-xs font-medium text-slate-600 mb-1.5";
