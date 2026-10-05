// Pure OKR model: periods, key-result progress and goal health. Everything
// takes `now` as a parameter so it can be unit tested deterministically.

export const GOAL_LEVELS = ["company", "team", "project"];

export const GOAL_LEVEL_META = {
  company: { label: "Company", badge: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30" },
  team:    { label: "Team",    badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30" },
  project: { label: "Project", badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30" },
};

export const KR_TYPES = ["metric", "milestone", "work"];

export const KR_TYPE_META = {
  metric:    { label: "Metric",      hint: "Move a number from a start value to a target" },
  milestone: { label: "Milestone",   hint: "Done or not done" },
  work:      { label: "Linked work", hint: "Progress of tasks in the linked epics" },
};

/** Health palette shared by Goals and Portfolio. */
export const HEALTH_META = {
  "on-track":    { label: "On track",    hex: "#10b981", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" },
  "at-risk":     { label: "At risk",     hex: "#f59e0b", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" },
  "off-track":   { label: "Off track",   hex: "#ef4444", dot: "bg-red-500",     pill: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30" },
  done:          { label: "Achieved",    hex: "#2563eb", dot: "bg-blue-600",    pill: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30" },
  "not-started": { label: "Not started", hex: "#94a3b8", dot: "bg-slate-400",   pill: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30" },
  "no-data":     { label: "No data",     hex: "#94a3b8", dot: "bg-slate-300",   pill: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30" },
};

export const MANUAL_HEALTH_OPTIONS = ["on-track", "at-risk", "off-track"];

const MAX_CHECK_INS = 30;

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ── Periods ────────────────────────────────────────────────────────────────

/** "2026-Q4" for the quarter containing `date`. */
export function quarterKey(date = new Date()) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

/** Start (inclusive) and end (exclusive) of a "YYYY-Qn" or "YYYY" period. */
export function periodRange(period) {
  const match = /^(\d{4})(?:-Q([1-4]))?$/.exec(String(period || ""));
  if (!match) return null;
  const year = Number(match[1]);
  if (!match[2]) return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  const quarter = Number(match[2]);
  return { start: new Date(year, (quarter - 1) * 3, 1), end: new Date(year, quarter * 3, 1) };
}

export function periodLabel(period) {
  const match = /^(\d{4})(?:-Q([1-4]))?$/.exec(String(period || ""));
  if (!match) return period || "No period";
  return match[2] ? `Q${match[2]} ${match[1]}` : `FY ${match[1]}`;
}

/** Previous, current and next two quarters plus the current year. */
export function periodOptions(now = new Date()) {
  const options = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    options.push(quarterKey(new Date(now.getFullYear(), now.getMonth() + offset * 3, 1)));
  }
  options.push(String(now.getFullYear()));
  return [...new Set(options)];
}

/** Share (0-100) of the period that has elapsed at `now`. */
export function periodElapsed(period, now = new Date()) {
  const range = periodRange(period);
  if (!range) return null;
  const total = range.end.getTime() - range.start.getTime();
  return clampPercent(((now.getTime() - range.start.getTime()) / total) * 100);
}

export function daysLeftInPeriod(period, now = new Date()) {
  const range = periodRange(period);
  if (!range) return null;
  return Math.max(0, Math.ceil((range.end.getTime() - now.getTime()) / 86400000));
}

// ── Key results ────────────────────────────────────────────────────────────

/**
 * Task counts per epic over every task the caller passes (sprint + backlog),
 * used by "work" key results: `{ [epicId]: { total, done } }`.
 */
export function buildEpicWorkIndex(tasks = []) {
  const index = {};
  (tasks || []).forEach((task) => {
    if (!task || task.epicId == null || task.epicId === "") return;
    const key = String(task.epicId);
    const entry = index[key] || { total: 0, done: 0 };
    entry.total += 1;
    if (task.status === "done") entry.done += 1;
    index[key] = entry;
  });
  return index;
}

export function keyResultProgress(kr, workIndex = {}) {
  if (!kr) return 0;
  if (kr.type === "milestone") return kr.done ? 100 : 0;
  if (kr.type === "work") {
    let total = 0;
    let done = 0;
    (kr.epicIds || []).forEach((epicId) => {
      const entry = workIndex[String(epicId)];
      if (!entry) return;
      total += entry.total;
      done += entry.done;
    });
    return total ? clampPercent((done / total) * 100) : 0;
  }
  const start = toNumber(kr.start);
  const target = toNumber(kr.target, 100);
  const current = toNumber(kr.current, start);
  if (target === start) return current === target ? 100 : 0;
  return clampPercent(((current - start) / (target - start)) * 100);
}

/** Human readable "current / target" for a key result. */
export function keyResultValueLabel(kr, workIndex = {}) {
  if (!kr) return "";
  if (kr.type === "milestone") return kr.done ? "Done" : "Not done";
  if (kr.type === "work") {
    let total = 0;
    let done = 0;
    (kr.epicIds || []).forEach((epicId) => {
      const entry = workIndex[String(epicId)];
      if (entry) { total += entry.total; done += entry.done; }
    });
    return total ? `${done} / ${total} tasks` : "No linked tasks";
  }
  const unit = kr.unit ? (kr.unit === "%" ? "%" : ` ${kr.unit}`) : "";
  return `${formatNumber(kr.current ?? kr.start)}${unit} / ${formatNumber(kr.target)}${unit}`;
}

function formatNumber(value) {
  const n = toNumber(value);
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ── Goals ──────────────────────────────────────────────────────────────────

export function goalProgress(goal, workIndex = {}) {
  const krs = goal?.keyResults || [];
  if (!krs.length) return 0;
  return clampPercent(krs.reduce((sum, kr) => sum + keyResultProgress(kr, workIndex), 0) / krs.length);
}

/**
 * Health of a goal. A manual health from the latest check-in wins (unless the
 * goal is achieved); otherwise progress is compared with the elapsed share of
 * the period: ≤10 points behind is on track, ≤25 at risk, beyond off track.
 */
export function goalHealth(goal, progress, now = new Date()) {
  if (progress >= 100) return "done";
  const range = periodRange(goal?.period);
  if (range && now < range.start) return "not-started";
  if (goal?.health && HEALTH_META[goal.health]) return goal.health;
  if (!(goal?.keyResults || []).length) return "no-data";
  const expected = periodElapsed(goal?.period, now);
  if (expected === null) return progress > 0 ? "on-track" : "no-data";
  const gap = expected - progress;
  if (gap <= 10) return "on-track";
  if (gap <= 25) return "at-risk";
  return "off-track";
}

/** Goal plus its derived values, as every Goals view renders it. */
export function deriveGoal(goal, workIndex = {}, now = new Date()) {
  const progress = goalProgress(goal, workIndex);
  return {
    ...goal,
    progress,
    expected: periodElapsed(goal.period, now),
    healthKey: goalHealth(goal, progress, now),
    krProgress: (goal.keyResults || []).map((kr) => keyResultProgress(kr, workIndex)),
    lastCheckIn: (goal.checkIns || [])[0] || null,
  };
}

/** Company → team → project tree (children sorted by title). Orphans become roots. */
export function buildGoalTree(goals = []) {
  const byId = new Map(goals.map((goal) => [goal.id, { ...goal, children: [] }]));
  const roots = [];
  byId.forEach((node) => {
    const parent = node.parentId && node.parentId !== node.id ? byId.get(node.parentId) : null;
    if (parent && !createsCycle(byId, node.id, parent.id)) parent.children.push(node);
    else roots.push(node);
  });
  const levelRank = { company: 0, team: 1, project: 2 };
  const sort = (list) => {
    list.sort((a, b) => (levelRank[a.level] ?? 3) - (levelRank[b.level] ?? 3) || String(a.title).localeCompare(String(b.title)));
    list.forEach((node) => sort(node.children));
    return list;
  };
  return sort(roots);
}

function createsCycle(byId, childId, parentId) {
  const seen = new Set([childId]);
  let current = byId.get(parentId);
  while (current) {
    if (seen.has(current.id)) return true;
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return false;
}

/** KPI strip numbers over already derived goals. */
export function summarizeGoals(derivedGoals = []) {
  const counts = { "on-track": 0, "at-risk": 0, "off-track": 0, done: 0, "not-started": 0, "no-data": 0 };
  let progressSum = 0;
  let keyResults = 0;
  derivedGoals.forEach((goal) => {
    counts[goal.healthKey] = (counts[goal.healthKey] || 0) + 1;
    progressSum += goal.progress;
    keyResults += (goal.keyResults || []).length;
  });
  return {
    total: derivedGoals.length,
    avgProgress: derivedGoals.length ? Math.round(progressSum / derivedGoals.length) : 0,
    keyResults,
    counts,
  };
}

export function matchesGoalQuery(goal, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [goal.title, goal.description, goal.ownerId, ...(goal.keyResults || []).map((kr) => kr.title)]
    .some((value) => String(value || "").toLowerCase().includes(q));
}

// ── Normalization (used by the store actions) ──────────────────────────────

export function normalizeKeyResult(kr, createId) {
  const type = KR_TYPES.includes(kr?.type) ? kr.type : "metric";
  const base = { id: kr?.id || createId("kr"), title: String(kr?.title || "").trim() || "Untitled key result", type };
  if (type === "milestone") return { ...base, done: Boolean(kr.done) };
  if (type === "work") return { ...base, epicIds: [...new Set((kr.epicIds || []).filter(Boolean).map(String))] };
  const start = toNumber(kr?.start, 0);
  return {
    ...base,
    start,
    target: toNumber(kr?.target, 100),
    current: toNumber(kr?.current, start),
    unit: String(kr?.unit || "").trim(),
  };
}

export function normalizeGoalInput(data, createId) {
  const level = GOAL_LEVELS.includes(data?.level) ? data.level : "company";
  return {
    title: String(data?.title || "").trim() || "Untitled goal",
    description: String(data?.description || ""),
    level,
    teamId: level === "team" ? data?.teamId || null : null,
    projectId: level === "project" ? data?.projectId || null : null,
    ownerId: data?.ownerId || null,
    parentId: data?.parentId || null,
    period: periodRange(data?.period) ? data.period : quarterKey(),
    health: MANUAL_HEALTH_OPTIONS.includes(data?.health) ? data.health : null,
    keyResults: (data?.keyResults || []).map((kr) => normalizeKeyResult(kr, createId)),
  };
}

export function capCheckIns(checkIns) {
  return (checkIns || []).slice(0, MAX_CHECK_INS);
}
