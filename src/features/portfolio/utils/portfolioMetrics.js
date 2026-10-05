// Pure, cross-project health model behind the Portfolio page. No React, no
// store access; `now` is a parameter so everything is deterministic in tests.
import { differenceInCalendarDays, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { isInProject } from "../../../shared/utils/helpers";
import { normalizeReleases, isActiveStatus } from "../../releases/utils/releaseModel";
import { buildTaskMap, computeQuality, computeReleaseMetrics } from "../../releases/utils/releaseMetrics";
import { buildProjectTestingData } from "../../tests/utils/testingModel";

const DEFECT_TYPES = new Set(["bug", "defect"]);
/** A reported status older than this falls back to the calculated health. */
export const STATUS_UPDATE_FRESH_DAYS = 14;

function parseDay(value) {
  if (!value) return null;
  try {
    const date = parseISO(String(value));
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

const points = (task) => Number(task?.storyPoint) || 0;

export function scoreToHealth(score) {
  if (score >= 75) return "on-track";
  if (score >= 50) return "at-risk";
  return "off-track";
}

/** Sprint progress (by points when estimated, else by count) vs elapsed time. */
export function computeSprintPace(sprint, sprintTasks, now = new Date()) {
  const total = sprintTasks.length;
  const done = sprintTasks.filter((task) => task.status === "done").length;
  const totalPoints = sprintTasks.reduce((sum, task) => sum + points(task), 0);
  const donePoints = sprintTasks.filter((task) => task.status === "done").reduce((sum, task) => sum + points(task), 0);
  const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : (total ? Math.round((done / total) * 100) : 0);

  const start = parseDay(sprint?.startDate);
  const end = parseDay(sprint?.endDate);
  let elapsed = null;
  let daysLeft = null;
  if (start && end && end > start) {
    const span = differenceInCalendarDays(end, start) || 1;
    const passed = differenceInCalendarDays(startOfDay(now), start);
    elapsed = Math.max(0, Math.min(100, Math.round((passed / span) * 100)));
    daysLeft = Math.max(0, differenceInCalendarDays(end, startOfDay(now)));
  }
  return { total, done, totalPoints, donePoints, progress, elapsed, daysLeft };
}

/**
 * Health of one project from its signals. Starts at 100 and subtracts a capped
 * penalty per problem; every signal is returned so the UI can explain the score.
 */
export function computeProjectHealth({
  project,
  sprint = null,
  sprintTasks = [],
  backlogTasks = [],
  releases = [],
  releaseMetrics = new Map(),
  passRate = null,
  statusUpdates = [],
  now = new Date(),
}) {
  const today = startOfDay(now);
  const allTasks = [...sprintTasks, ...backlogTasks];
  const openTasks = allTasks.filter((task) => task.status !== "done");
  const overdue = openTasks.filter((task) => {
    const due = parseDay(task.dueDate);
    return Boolean(due && isBefore(startOfDay(due), today));
  });
  const blocked = sprintTasks.filter((task) => task.status === "blocked");
  const openDefects = openTasks.filter((task) => DEFECT_TYPES.has(task.type));
  const urgentDefects = openDefects.filter((task) => task.priority === "critical" || task.priority === "high");
  const pace = computeSprintPace(sprint, sprintTasks, now);
  const sprintActive = Boolean(sprint && sprint.status !== "completed" && sprintTasks.length);

  const upcoming = releases
    .filter((release) => isActiveStatus(release.status))
    .map((release) => ({ release, date: parseDay(release.releaseDate) }))
    .sort((a, b) => (a.date ? a.date.getTime() : Infinity) - (b.date ? b.date.getTime() : Infinity));
  const next = upcoming[0] || null;
  const nextMetrics = next ? releaseMetrics.get(next.release.id) : null;
  const nextRelease = next ? {
    id: next.release.id,
    version: next.release.version,
    name: next.release.name,
    date: next.release.releaseDate || "",
    daysLeft: next.date ? differenceInCalendarDays(next.date, today) : null,
    readiness: nextMetrics?.readiness?.score ?? null,
    riskLevel: nextMetrics?.riskLevel || "none",
  } : null;

  const signals = [];
  let score = 100;
  const penalize = (key, amount, label, detail) => {
    score -= amount;
    signals.push({ key, tone: amount >= 15 ? "bad" : "warn", impact: -amount, label, detail });
  };
  const praise = (key, label, detail) => signals.push({ key, tone: "good", impact: 0, label, detail });

  if (sprintActive && pace.elapsed !== null) {
    const gap = pace.elapsed - pace.progress;
    if (gap > 30) penalize("pace", 25, "Sprint is well behind schedule", `${pace.progress}% done with ${pace.elapsed}% of the sprint elapsed`);
    else if (gap > 15) penalize("pace", 12, "Sprint is slightly behind", `${pace.progress}% done with ${pace.elapsed}% of the sprint elapsed`);
    else praise("pace", "Sprint pace is healthy", `${pace.progress}% done with ${pace.elapsed}% elapsed`);
  }
  if (overdue.length) penalize("overdue", Math.min(25, overdue.length * 5), `${overdue.length} overdue work item${overdue.length === 1 ? "" : "s"}`, "Past their due date and not done");
  else if (openTasks.length) praise("overdue", "Nothing overdue", "Every open item is within its due date");
  if (blocked.length) penalize("blocked", Math.min(20, blocked.length * 6), `${blocked.length} blocked in the sprint`, "Waiting on something outside the team");
  if (urgentDefects.length) penalize("defects", Math.min(20, urgentDefects.length * 7), `${urgentDefects.length} high-priority bug${urgentDefects.length === 1 ? "" : "s"} open`, "Critical or high priority defects");
  if (nextRelease && nextRelease.daysLeft !== null && nextRelease.daysLeft <= 14 && nextRelease.readiness !== null && nextRelease.readiness < 60) {
    penalize("release", 15, `${nextRelease.version} is not ready`, `${nextRelease.readiness}% ready, due in ${Math.max(0, nextRelease.daysLeft)} days`);
  } else if (nextRelease?.riskLevel === "high") {
    penalize("release", 10, `${nextRelease.version} has high risks`, "Open the release to review its risks");
  } else if (nextRelease) {
    praise("release", `${nextRelease.version} on course`, nextRelease.readiness !== null ? `${nextRelease.readiness}% ready` : "No readiness data yet");
  }
  if (passRate !== null && passRate !== undefined) {
    if (passRate < 60) penalize("quality", 20, `Test pass rate ${passRate}%`, "Latest result per test case");
    else if (passRate < 80) penalize("quality", 10, `Test pass rate ${passRate}%`, "Latest result per test case");
    else praise("quality", `Tests passing at ${passRate}%`, "Latest result per test case");
  }
  score = Math.max(0, Math.min(100, score));

  const hasData = allTasks.length > 0 || releases.length > 0;
  const calculatedHealth = hasData ? scoreToHealth(score) : "no-data";

  const latestUpdate = (statusUpdates || [])
    .filter((update) => update.projectId === project?.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  const updateAgeDays = latestUpdate ? differenceInCalendarDays(today, startOfDay(new Date(latestUpdate.createdAt))) : null;
  const reportedFresh = Boolean(latestUpdate && updateAgeDays !== null && updateAgeDays <= STATUS_UPDATE_FRESH_DAYS);

  return {
    project,
    score: hasData ? score : null,
    calculatedHealth,
    health: reportedFresh ? latestUpdate.health : calculatedHealth,
    healthSource: reportedFresh ? "reported" : "calculated",
    latestUpdate,
    updateAgeDays,
    signals,
    sprint: sprint ? { name: sprint.name, status: sprint.status, startDate: sprint.startDate, endDate: sprint.endDate, active: sprintActive } : null,
    pace,
    counts: {
      total: allTasks.length,
      open: openTasks.length,
      done: allTasks.length - openTasks.length,
      backlog: backlogTasks.length,
      overdue: overdue.length,
      blocked: blocked.length,
      openDefects: openDefects.length,
      urgentDefects: urgentDefects.length,
    },
    overdueTasks: overdue,
    blockedTasks: blocked,
    nextRelease,
    activeReleases: upcoming.length,
    passRate,
    members: [...new Set([
      ...(project?.memberUsernames || []),
      ...allTasks.map((task) => task.assignedTo).filter((name) => name && name !== "unassigned"),
    ])],
  };
}

/** Health rows for every project, from raw store data. */
export function buildPortfolio({
  projects = [],
  currentProjectId,
  activeTasks = [],
  perProjectBacklog = {},
  perProjectSprint = {},
  releases = [],
  testSuites = [],
  testCases = [],
  testRuns = [],
  testPlans = [],
  testSharedSteps = [],
  projectStatusUpdates = [],
  now = new Date(),
}) {
  const backlogByProject = {};
  const allTasks = [...(activeTasks || [])];
  (projects || []).forEach((project) => {
    const tasks = (perProjectBacklog?.[project.id] || []).flatMap((section) => section?.tasks || []);
    backlogByProject[project.id] = tasks;
    allTasks.push(...tasks);
  });
  const taskMap = buildTaskMap(allTasks);
  const normalizedReleases = normalizeReleases(releases || []);

  return (projects || []).map((project) => {
    // Legacy records without projectId belong to the current project only.
    const inProject = (entity) => isInProject(entity, project.id, currentProjectId);
    const sprintTasks = (activeTasks || []).filter((task) => task && inProject(task));
    const projectReleases = normalizedReleases.filter((release) => (release.projectId || currentProjectId) === project.id);
    const releaseMetrics = new Map(projectReleases.map((release) => [
      release.id, computeReleaseMetrics(release, { taskMap, testRuns, testPlans, now }),
    ]));
    const { runs } = buildProjectTestingData({ testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId: project.id });
    const passRate = runs.length ? computeQuality(runs).passRate : null;

    return computeProjectHealth({
      project,
      sprint: perProjectSprint?.[project.id] || null,
      sprintTasks,
      backlogTasks: backlogByProject[project.id] || [],
      releases: projectReleases,
      releaseMetrics,
      passRate,
      statusUpdates: projectStatusUpdates,
      now,
    });
  });
}

const HEALTH_RANK = { "off-track": 0, "at-risk": 1, "on-track": 2, "no-data": 3 };

export function sortPortfolio(rows, sortKey = "health") {
  const list = [...rows];
  const byName = (a, b) => String(a.project?.name || "").localeCompare(String(b.project?.name || ""));
  switch (sortKey) {
    case "name": return list.sort(byName);
    case "progress": return list.sort((a, b) => b.pace.progress - a.pace.progress || byName(a, b));
    case "overdue": return list.sort((a, b) => b.counts.overdue - a.counts.overdue || byName(a, b));
    case "release": return list.sort((a, b) => (a.nextRelease?.daysLeft ?? Infinity) - (b.nextRelease?.daysLeft ?? Infinity) || byName(a, b));
    default: return list.sort((a, b) => (HEALTH_RANK[a.health] ?? 4) - (HEALTH_RANK[b.health] ?? 4) || (a.score ?? 101) - (b.score ?? 101) || byName(a, b));
  }
}

export function summarizePortfolio(rows, now = new Date()) {
  const counts = { "on-track": 0, "at-risk": 0, "off-track": 0, "no-data": 0 };
  let open = 0;
  let overdue = 0;
  let releasesSoon = 0;
  let scoreSum = 0;
  let scored = 0;
  rows.forEach((row) => {
    counts[row.health] = (counts[row.health] || 0) + 1;
    open += row.counts.open;
    overdue += row.counts.overdue;
    if (row.nextRelease?.daysLeft !== null && row.nextRelease?.daysLeft !== undefined && row.nextRelease.daysLeft >= 0 && row.nextRelease.daysLeft <= 30) releasesSoon += 1;
    if (row.score !== null) { scoreSum += row.score; scored += 1; }
  });
  return {
    total: rows.length,
    counts,
    open,
    overdue,
    releasesSoon,
    avgScore: scored ? Math.round(scoreSum / scored) : null,
  };
}
