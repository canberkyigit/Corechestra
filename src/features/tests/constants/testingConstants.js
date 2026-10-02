// Option lists, labels and style maps for the Test Management module.
//
// NOTE (dark mode): `src/app/styles/dark.css` remaps a few light utilities
// (bg-white, bg-slate-50/100/200, text-slate-400…900, border-slate-100/200/300)
// with the same specificity as Tailwind `dark:` variants and loads later, so it
// wins. Classes below either rely on that remap on purpose (text-slate-500…900,
// border-slate-200) or use tinted/alpha utilities (`bg-white/100`,
// `bg-slate-500/10`) that dark.css does not touch, paired with explicit `dark:`.
import {
  TEST_AUTOMATION_STATES,
  TEST_CASE_LIFECYCLE,
  TEST_CASE_PRIORITIES,
  TEST_CASE_TYPES,
  TEST_RESULT_STATUSES,
  TEST_RUN_STATUSES,
  TEST_STEP_STATUSES,
} from "../../../shared/context/hooks/actions/testingRecords";

export {
  TEST_AUTOMATION_STATES,
  TEST_CASE_LIFECYCLE,
  TEST_CASE_PRIORITIES,
  TEST_CASE_TYPES,
  TEST_RESULT_STATUSES,
  TEST_RUN_STATUSES,
  TEST_STEP_STATUSES,
};

export const TESTS_READ_ONLY_MESSAGE = "You have read-only access to test management";
export const TESTS_EXECUTE_DENIED_MESSAGE = "Your role can't record test results";
export const TESTS_DEFECT_DENIED_MESSAGE = "Your role can't create defects";

export const CASE_KEY_PREFIX = "TC";
export const SAMPLE_SEED_KEY_PREFIX = "corechestra_testing_samples_seeded_";
export const VIRTUALIZE_THRESHOLD = 100;
export const FLAKY_WINDOW = 6;

// ── Navigation ──────────────────────────────────────────────────────────────
export const TESTS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "repository", label: "Repository" },
  { id: "plans", label: "Plans & Cycles" },
  { id: "executions", label: "My Queue" },
  { id: "traceability", label: "Traceability" },
  { id: "defects", label: "Defects" },
  { id: "reports", label: "Reports" },
];
export const TESTS_TAB_IDS = TESTS_TABS.map((tab) => tab.id);

// ── Execution results ───────────────────────────────────────────────────────
// Chart order (stacks): passed, failed, retest, blocked, skipped — validated
// for adjacent CVD separation; segments always carry 2px gaps + legend labels.
export const RESULT_ORDER = ["passed", "failed", "retest", "blocked", "skipped", "untested"];
export const EXECUTED_STATUSES = ["passed", "failed", "blocked", "skipped"];
export const OPEN_RESULT_STATUSES = ["untested", "retest"];

export const RESULT_META = {
  passed: {
    label: "Passed", short: "P", key: "p",
    chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    bar: "bg-emerald-500", fill: "fill-emerald-500", stroke: "stroke-emerald-500", dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    solid: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  failed: {
    label: "Failed", short: "F", key: "f",
    chip: "bg-red-500/10 text-red-700 ring-red-500/25 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25",
    bar: "bg-red-500", fill: "fill-red-500", stroke: "stroke-red-500", dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    solid: "bg-red-600 hover:bg-red-500 text-white",
  },
  retest: {
    label: "Retest", short: "R", key: "r",
    chip: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25",
    bar: "bg-violet-500 dark:bg-violet-400", fill: "fill-violet-500 dark:fill-violet-400", stroke: "stroke-violet-500 dark:stroke-violet-400", dot: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    solid: "bg-violet-600 hover:bg-violet-500 text-white",
  },
  blocked: {
    label: "Blocked", short: "B", key: "b",
    chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
    bar: "bg-amber-500 dark:bg-amber-600", fill: "fill-amber-500 dark:fill-amber-600", stroke: "stroke-amber-500 dark:stroke-amber-600", dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    solid: "bg-amber-500 hover:bg-amber-400 text-white",
  },
  skipped: {
    label: "Skipped", short: "S", key: "s",
    chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
    bar: "bg-slate-400 dark:bg-slate-500", fill: "fill-slate-400 dark:fill-slate-500", stroke: "stroke-slate-400 dark:stroke-slate-500", dot: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    solid: "bg-slate-500 hover:bg-slate-400 text-white",
  },
  untested: {
    label: "Untested", short: "–", key: null,
    chip: "bg-slate-500/[0.06] text-slate-500 ring-slate-500/15 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/10",
    bar: "bg-slate-300/70 dark:bg-white/10", fill: "fill-slate-200 dark:fill-white/10", stroke: "stroke-slate-200 dark:stroke-white/10", dot: "bg-slate-300 dark:bg-slate-600",
    text: "text-slate-500 dark:text-slate-400",
    solid: "bg-slate-200 text-slate-700",
  },
};

export const STEP_RESULT_META = {
  untested: { label: "Not run", short: "–" },
  passed: { label: "Pass", short: "Pass" },
  failed: { label: "Fail", short: "Fail" },
  blocked: { label: "Blocked", short: "Block" },
  skipped: { label: "Skip", short: "Skip" },
  na: { label: "N/A", short: "N/A" },
};
export const STEP_RESULT_ORDER = ["passed", "failed", "blocked", "skipped", "na"];

// ── Cases ───────────────────────────────────────────────────────────────────
export const PRIORITY_META = {
  critical: { label: "Critical", rank: 0, dot: "bg-red-600", text: "text-red-700 dark:text-red-400", chip: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300" },
  high: { label: "High", rank: 1, dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", chip: "bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300" },
  medium: { label: "Medium", rank: 2, dot: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-400", chip: "bg-yellow-500/10 text-yellow-700 ring-yellow-500/25 dark:text-yellow-300" },
  low: { label: "Low", rank: 3, dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-400", chip: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300" },
};
export const PRIORITY_OPTIONS = TEST_CASE_PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label }));

export const CASE_TYPE_LABELS = {
  functional: "Functional",
  regression: "Regression",
  smoke: "Smoke",
  sanity: "Sanity",
  e2e: "End-to-end",
  integration: "Integration",
  api: "API",
  performance: "Performance",
  security: "Security",
  usability: "Usability",
  accessibility: "Accessibility",
};
export const CASE_TYPE_OPTIONS = TEST_CASE_TYPES.map((value) => ({ value, label: CASE_TYPE_LABELS[value] }));

export const AUTOMATION_META = {
  manual: { label: "Manual", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
  automated: { label: "Automated", chip: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/25 dark:text-cyan-300" },
  "to-be-automated": { label: "To automate", chip: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300" },
};
export const AUTOMATION_OPTIONS = TEST_AUTOMATION_STATES.map((value) => ({ value, label: AUTOMATION_META[value].label }));

export const CASE_STATUS_META = {
  draft: { label: "Draft", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300", dot: "bg-slate-400" },
  ready: { label: "Ready", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300", dot: "bg-emerald-500" },
  "needs-update": { label: "Needs update", chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300", dot: "bg-amber-500" },
  deprecated: { label: "Deprecated", chip: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300", dot: "bg-rose-400" },
};
export const CASE_STATUS_OPTIONS = TEST_CASE_LIFECYCLE.map((value) => ({ value, label: CASE_STATUS_META[value].label }));

/** Repository table columns (id, label, default visibility, sortable). */
export const CASE_COLUMNS = [
  { id: "key", label: "ID", locked: true, width: "w-[84px]" },
  { id: "title", label: "Title", locked: true, width: "flex-1 min-w-[220px]" },
  { id: "priority", label: "Priority", width: "w-[96px]" },
  { id: "type", label: "Type", width: "w-[112px]" },
  { id: "automation", label: "Automation", width: "w-[116px]" },
  { id: "status", label: "Status", width: "w-[116px]" },
  { id: "owner", label: "Owner", width: "w-[120px]" },
  { id: "estimate", label: "Estimate", width: "w-[76px]" },
  { id: "tags", label: "Tags", width: "w-[150px]" },
  { id: "lastResult", label: "Last result", width: "w-[104px]" },
  { id: "requirements", label: "Reqs", width: "w-[60px]" },
];
export const DEFAULT_VISIBLE_COLUMNS = ["key", "title", "priority", "automation", "status", "owner", "lastResult", "requirements"];

/** Labels for case history entries. */
export const TRACKED_LABELS = {
  title: "title",
  description: "description",
  preconditions: "preconditions",
  priority: "priority",
  type: "type",
  automation: "automation",
  status: "status",
  owner: "owner",
  estimate: "estimate",
  tags: "tags",
  steps: "steps",
  expectedResult: "expected result",
  requirementIds: "requirements",
  defectIds: "defects",
  suiteId: "folder",
};

export const CASE_SORTS = [
  { id: "order", label: "Manual order" },
  { id: "key", label: "ID" },
  { id: "title", label: "Title" },
  { id: "priority", label: "Priority" },
  { id: "updated", label: "Recently updated" },
  { id: "lastResult", label: "Last result" },
];

// ── Plans & cycles ──────────────────────────────────────────────────────────
export const ENVIRONMENT_OPTIONS = [
  { value: "staging", label: "Staging" },
  { value: "uat", label: "UAT" },
  { value: "production-like", label: "Production-like" },
  { value: "production", label: "Production" },
  { value: "local", label: "Local" },
];
export const PLATFORM_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "chrome", label: "Chrome" },
  { value: "safari", label: "Safari" },
  { value: "firefox", label: "Firefox" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "api", label: "API" },
  { value: "cross-platform", label: "Cross-platform" },
];
export const optionLabel = (options, value) => options.find((option) => option.value === value)?.label || value || "—";

export const RUN_STATUS_META = {
  "in-progress": { label: "Open", chip: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300" },
  completed: { label: "Closed", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300" },
  aborted: { label: "Aborted", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
};

export const PLAN_STATUS_META = {
  draft: { label: "Draft", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
  "in-progress": { label: "Active", chip: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300" },
  completed: { label: "Completed", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300" },
  aborted: { label: "Aborted", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
};

export const REQUIREMENT_TYPES = ["userstory", "feature", "epic"];
export const LINKABLE_REQUIREMENT_TYPES = ["userstory", "feature", "epic", "task", "investigation"];
export const DEFECT_TYPES = ["bug", "defect"];

export const COVERAGE_META = {
  "not-covered": { label: "Not covered", chip: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300", dot: "bg-slate-400" },
  "not-run": { label: "Covered · not run", chip: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300", dot: "bg-sky-500" },
  passing: { label: "Passing", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300", dot: "bg-emerald-500" },
  failing: { label: "Failing", chip: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300", dot: "bg-red-500" },
  partial: { label: "Partial", chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300", dot: "bg-amber-500" },
};

// ── Shared class strings ────────────────────────────────────────────────────
export const CONTROL = "h-9 rounded-lg border border-slate-300/70 bg-white/80 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#1c2030] dark:border-[#2a3044] dark:text-slate-200";
export const CONTROL_SM = "h-8 rounded-md border border-slate-300/70 bg-white/80 px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#1c2030] dark:border-[#2a3044] dark:text-slate-200";
export const FIELD = "w-full rounded-lg border border-slate-300/70 bg-white/100 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#141720] dark:border-[#2a3044] dark:text-slate-100 dark:placeholder:text-slate-500";
export const LABEL = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500";
export const CARD = "rounded-xl border border-slate-200/80 bg-white/100 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e]";
export const BTN_PRIMARY = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#141720]";
export const BTN_SECONDARY = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300/70 bg-white/80 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200 dark:hover:bg-[#232838]";
export const BTN_GHOST = "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:text-white";
export const BTN_SM = "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300/70 bg-white/80 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200 dark:hover:bg-[#232838]";
export const BTN_SM_PRIMARY = "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_DANGER = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:opacity-50";
