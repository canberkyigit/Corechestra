// Pure aggregates behind the project dashboard (formerly split between the
// Dashboard and Reports pages). Everything here is side-effect free and
// takes `now` as a parameter so it can be unit tested deterministically.
import { differenceInCalendarDays, isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { isInProject, taskKey } from "../../../shared/utils/helpers";
import { computeQuality } from "../../releases/utils/releaseMetrics";

export const STATUS_KEYS = ["todo", "inprogress", "review", "awaiting", "blocked", "done"];
export const PRIORITY_KEYS = ["critical", "high", "medium", "low"];

/** Status palette used by every dashboard chart (hex for SVG, class for dots). */
export const STATUS_META = {
  todo:       { label: "To Do",       hex: "#94a3b8", dot: "bg-slate-400" },
  inprogress: { label: "In Progress", hex: "#3b82f6", dot: "bg-blue-500" },
  review:     { label: "Review",      hex: "#8b5cf6", dot: "bg-violet-500" },
  awaiting:   { label: "Awaiting",    hex: "#f59e0b", dot: "bg-amber-500" },
  blocked:    { label: "Blocked",     hex: "#ef4444", dot: "bg-red-500" },
  done:       { label: "Done",        hex: "#10b981", dot: "bg-emerald-500" },
};

export const PRIORITY_META = {
  critical: { label: "Critical", hex: "#dc2626", dot: "bg-red-600" },
  high:     { label: "High",     hex: "#f97316", dot: "bg-orange-500" },
  medium:   { label: "Medium",   hex: "#eab308", dot: "bg-yellow-500" },
  low:      { label: "Low",      hex: "#22c55e", dot: "bg-green-500" },
};

const DAY_MS = 86400000;
/** In-progress / review work untouched for this many days counts as stale. */
export const STALE_DAYS = 5;

/** Story points as a number (stored values may be strings or empty). */
export function toPoints(task) {
  return Number(task?.storyPoint) || 0;
}

export function parseValidDate(value) {
  if (!value) return null;
  try {
    const date = parseISO(String(value));
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function isOverdue(task, today) {
  if (task.status === "done") return false;
  const due = parseValidDate(task.dueDate);
  return Boolean(due && isBefore(startOfDay(due), today));
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const byPriority = (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);

/**
 * All dashboard aggregates in a single pass over the project's sprint tasks.
 * Backlog tasks are only counted (`backlogCount`), never mixed into sprint stats.
 */
export function computeDashboardStats({
  activeTasks = [],
  epics = [],
  backlogSections = [],
  globalActivityLog = [],
  currentProjectId,
  currentUser,
  now = new Date(),
}) {
  const me = String(currentUser || "").toLowerCase();
  const today = startOfDay(now);
  const staleBefore = now.getTime() - STALE_DAYS * DAY_MS;
  const weekAgo = now.getTime() - 7 * DAY_MS;

  const projectTasks = [];
  const byStatus = Object.fromEntries(STATUS_KEYS.map((key) => [key, []]));
  const priorityCounts = Object.fromEntries(PRIORITY_KEYS.map((key) => [key, 0]));
  const myTasks = [];
  const overdue = [];
  const unassignedUrgent = [];
  const stale = [];
  const epicProgress = {};
  let totalPoints = 0;
  let donePoints = 0;
  let completedThisWeek = 0;

  (activeTasks || []).forEach((task) => {
    if (!task || !isInProject(task, currentProjectId)) return;
    projectTasks.push(task);
    if (byStatus[task.status]) byStatus[task.status].push(task);
    if (priorityCounts[task.priority] !== undefined) priorityCounts[task.priority] += 1;

    const points = toPoints(task);
    const isDone = task.status === "done";
    totalPoints += points;
    if (isDone) {
      donePoints += points;
      const changedAt = parseValidDate(task.statusChangedAt);
      if (changedAt && changedAt.getTime() >= weekAgo) completedThisWeek += 1;
    } else {
      if (isOverdue(task, today)) overdue.push(task);
      if (me && String(task.assignedTo || "").toLowerCase() === me) myTasks.push(task);
      if (!task.assignedTo && (task.priority === "critical" || task.priority === "high")) unassignedUrgent.push(task);
      if (task.status === "inprogress" || task.status === "review") {
        const changedAt = parseValidDate(task.statusChangedAt);
        if (changedAt && changedAt.getTime() < staleBefore) stale.push(task);
      }
    }
    if (task.epicId) {
      const entry = epicProgress[task.epicId] || { total: 0, done: 0, points: 0, donePoints: 0 };
      entry.total += 1;
      entry.points += points;
      if (isDone) {
        entry.done += 1;
        entry.donePoints += points;
      }
      epicProgress[task.epicId] = entry;
    }
  });

  const total = projectTasks.length;
  const done = byStatus.done.length;

  return {
    projectTasks,
    byStatus,
    statusCounts: Object.fromEntries(STATUS_KEYS.map((key) => [key, byStatus[key].length])),
    priorityCounts,
    total,
    done,
    open: total - done,
    completionPct: percent(done, total),
    totalPoints,
    donePoints,
    pointsPct: percent(donePoints, totalPoints),
    completedThisWeek,
    overdueTasks: overdue.length,
    overdue: overdue.sort(byPriority),
    unassignedUrgent: unassignedUrgent.sort(byPriority),
    stale: stale.sort(byPriority),
    myTasks: myTasks.sort(byPriority),
    epicProgress,
    projectEpics: (epics || []).filter((epic) => isInProject(epic, currentProjectId)),
    backlogCount: (backlogSections || []).reduce((sum, section) => sum + (section.tasks || []).length, 0),
    recentActivity: (globalActivityLog || [])
      .filter((entry) => !entry.projectId || entry.projectId === currentProjectId)
      .slice(0, 20),
  };
}

/**
 * Sprint health: compares elapsed time with completed work (points when the
 * sprint is estimated, otherwise task count).
 * status: no-sprint | no-dates | not-started | on-track | at-risk | off-track | completed | overdue
 */
export function computeSprintHealth({ sprint, stats, now = new Date() }) {
  if (!sprint) return { status: "no-sprint" };
  const usePoints = stats.totalPoints > 0;
  const workPct = usePoints ? stats.pointsPct : stats.completionPct;
  const base = {
    usePoints,
    workPct,
    scopeTotal: usePoints ? stats.totalPoints : stats.total,
    scopeDone: usePoints ? stats.donePoints : stats.done,
    unit: usePoints ? "pts" : "tasks",
  };

  const start = parseValidDate(sprint.startDate);
  const end = parseValidDate(sprint.endDate);
  if (!start || !end || isBefore(end, start)) {
    return { ...base, status: "no-dates", start, end, daysLeft: end ? Math.max(0, differenceInCalendarDays(end, now)) : null };
  }

  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const elapsed = Math.min(totalDays, Math.max(0, differenceInCalendarDays(startOfDay(now), start)));
  const timePct = percent(elapsed, totalDays);
  const daysLeft = Math.max(0, differenceInCalendarDays(end, startOfDay(now)));
  const result = { ...base, start, end, totalDays, elapsedDays: elapsed, timePct, daysLeft };

  if (isBefore(startOfDay(now), start)) return { ...result, status: "not-started" };
  if (isAfter(startOfDay(now), end)) return { ...result, status: workPct >= 100 ? "completed" : "overdue" };
  if (base.scopeTotal > 0 && workPct >= 100) return { ...result, status: "completed" };

  const gap = timePct - workPct;
  const status = gap <= 10 ? "on-track" : gap <= 25 ? "at-risk" : "off-track";
  return { ...result, status, gap };
}

const FALLBACK_SNAPSHOT_WINDOW = 14;

/**
 * Burndown model from real daily snapshots only (no simulation).
 * - Sprint length comes from the sprint's start/end dates when valid.
 * - Snapshots are limited to the sprint window when dates are known.
 * - Fewer than 2 snapshots → `{ status: "insufficient" }`.
 */
export function buildBurndownModel({ tasks = [], sprint = null, snapshots = [] }) {
  const totalPoints = tasks.reduce((sum, t) => sum + toPoints(t), 0);
  const remaining = tasks.filter((t) => t.status !== "done").reduce((sum, t) => sum + toPoints(t), 0);

  const start = parseValidDate(sprint?.startDate);
  const end = parseValidDate(sprint?.endDate);
  const hasSprintDates = Boolean(start && end && !isBefore(end, start));
  const sprintDays = hasSprintDates ? Math.max(1, differenceInCalendarDays(end, start)) : null;

  const valid = (snapshots || [])
    .filter((snap) => snap && parseValidDate(snap.date) && Number.isFinite(Number(snap.remaining)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const inWindow = hasSprintDates
    ? valid.filter((snap) => {
        const d = parseValidDate(snap.date);
        return !isBefore(d, start) && !isAfter(d, end);
      })
    : valid.slice(-FALLBACK_SNAPSHOT_WINDOW);

  if (inWindow.length < 2) {
    return {
      status: "insufficient",
      snapshotCount: inWindow.length,
      totalPoints,
      remaining,
      sprintDays,
      hasSprintDates,
    };
  }

  const points = inWindow.map((snap, index) => ({
    x: hasSprintDates ? differenceInCalendarDays(parseValidDate(snap.date), start) : index,
    y: Number(snap.remaining) || 0,
    date: snap.date,
  }));
  const xRange = hasSprintDates ? sprintDays : Math.max(1, points.length - 1);
  const firstTotal = Number(inWindow[0].total);
  const idealStart = Number.isFinite(firstTotal) && firstTotal > 0 ? firstTotal : Math.max(totalPoints, points[0].y);

  return {
    status: "ready",
    points,
    xRange,
    idealStart,
    totalPoints,
    remaining,
    sprintDays,
    hasSprintDates,
    startDate: hasSprintDates ? start : null,
    snapshotCount: inWindow.length,
  };
}

/**
 * Velocity: last `limit` completed sprints (oldest → newest) plus the current
 * sprint's completed points. `completedSprints` is stored newest-first.
 */
export function computeVelocity({ completedSprints = [], currentDonePoints = 0, currentCommitted = 0, sprintName = "", limit = 6 }) {
  const history = [...(completedSprints || [])].reverse().slice(-limit).map((s) => ({
    id: s.id,
    name: s.name || "Sprint",
    done: Number(s.completedPoints) || 0,
    committed: Number(s.totalPoints) || 0,
    completionRate: Number(s.completionRate) || 0,
    current: false,
  }));
  const average = history.length
    ? Math.round(history.reduce((sum, s) => sum + s.done, 0) / history.length)
    : null;
  let trend = null;
  if (history.length >= 2) {
    const last = history[history.length - 1].done;
    const prev = history[history.length - 2].done;
    trend = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
  }
  const bars = [
    ...history,
    { id: "current", name: sprintName || "Current", done: currentDonePoints, committed: currentCommitted, current: true },
  ];
  return { bars, average, trend, sprintCount: history.length };
}

/** Per-assignee load over the sprint tasks, sorted by open work. */
export function computeWorkload({ tasks = [], users = [] }) {
  const byUsername = new Map((users || []).map((user) => [String(user.username || "").toLowerCase(), user]));
  const map = new Map();
  tasks.forEach((task) => {
    const raw = task.assignedTo || "";
    const key = raw ? String(raw).toLowerCase() : "__unassigned__";
    if (!map.has(key)) {
      const user = raw ? byUsername.get(key) : null;
      map.set(key, {
        key,
        username: raw || null,
        name: user?.name || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unassigned"),
        color: user?.color || null,
        role: user?.role || user?.title || null,
        total: 0,
        done: 0,
        open: 0,
        blocked: 0,
        points: 0,
        openPoints: 0,
        byStatus: Object.fromEntries(STATUS_KEYS.map((s) => [s, 0])),
      });
    }
    const row = map.get(key);
    const points = toPoints(task);
    row.total += 1;
    row.points += points;
    if (row.byStatus[task.status] !== undefined) row.byStatus[task.status] += 1;
    if (task.status === "done") row.done += 1;
    else {
      row.open += 1;
      row.openPoints += points;
    }
    if (task.status === "blocked") row.blocked += 1;
  });
  return [...map.values()]
    .map((row) => ({ ...row, pct: percent(row.done, row.total) }))
    .sort((a, b) => {
      if (a.key === "__unassigned__") return 1;
      if (b.key === "__unassigned__") return -1;
      return b.open - a.open || b.total - a.total;
    });
}

/** Test quality for the project's test cycles (runs newest-first). */
export function computeTestHealth(runs = []) {
  const quality = computeQuality(runs);
  return {
    ...quality,
    openCycles: runs.filter((run) => run.status === "in-progress").length,
    totalCycles: runs.length,
  };
}

export function buildDashboardCsv({ tasks = [], epics = [] }) {
  const epicTitle = new Map((epics || []).map((epic) => [epic.id, epic.title]));
  const headers = ["Key", "Title", "Type", "Status", "Priority", "Assignee", "Story Points", "Due Date", "Epic"];
  const rows = tasks.map((t) => [
    t.id ? taskKey(t.id) : "",
    t.title || "",
    t.type || "task",
    STATUS_META[t.status]?.label || t.status || "",
    PRIORITY_META[t.priority]?.label || t.priority || "",
    t.assignedTo || "Unassigned",
    toPoints(t),
    t.dueDate || "",
    epicTitle.get(t.epicId) || "",
  ].map(csvCell).join(","));
  return [headers.join(","), ...rows].join("\n");
}
