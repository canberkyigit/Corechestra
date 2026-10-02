// Pure, memo-friendly metrics for releases. No React, no store access.
import { ACTIVE_RELEASE_STATUSES } from "../constants/releaseMeta";
import { compareVersions, isActiveStatus } from "./releaseModel";
import { daysUntil, parseDate } from "./releaseUtils";

const BUG_TYPES = new Set(["bug", "defect"]);

export function buildTaskMap(tasks) {
  const map = new Map();
  (tasks || []).forEach((task) => {
    if (task && task.id !== undefined && task.id !== null) map.set(String(task.id), task);
  });
  return map;
}

export function resolveLinkedTasks(release, taskMap) {
  return (release?.taskIds || []).map((id) => taskMap.get(String(id))).filter(Boolean);
}

const storyPoints = (task) => {
  const value = Number(task?.storyPoint ?? task?.storyPoints ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** Work progress for linked tasks: counts, story points, per status/type breakdown. */
export function computeWorkProgress(linkedTasks) {
  const tasks = linkedTasks || [];
  const byStatus = {};
  const byType = {};
  let done = 0;
  let points = 0;
  let pointsDone = 0;
  let blocked = 0;
  let openBugs = 0;
  tasks.forEach((task) => {
    const status = task.status || "todo";
    const type = task.type || "task";
    byStatus[status] = (byStatus[status] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
    const sp = storyPoints(task);
    points += sp;
    if (status === "done") {
      done += 1;
      pointsDone += sp;
    }
    if (status === "blocked") blocked += 1;
    if (BUG_TYPES.has(type) && status !== "done") openBugs += 1;
  });
  const total = tasks.length;
  return {
    total,
    done,
    open: total - done,
    points,
    pointsDone,
    blocked,
    openBugs,
    percent: total ? Math.round((done / total) * 100) : 0,
    byStatus,
    byType,
  };
}

export function computeChecklistProgress(checklist) {
  const items = checklist || [];
  const done = items.filter((item) => item.completed).length;
  return { total: items.length, done, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Test runs tied to a release directly (`run.releaseId`) or through their plan. */
export function selectReleaseRuns(release, testRuns = [], testPlans = []) {
  if (!release) return [];
  const planIds = new Set((testPlans || []).filter((plan) => plan?.releaseId === release.id).map((plan) => plan.id));
  return (testRuns || [])
    .filter((run) => run && (run.releaseId === release.id || (run.planId && planIds.has(run.planId))))
    .slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

/**
 * Per-run counts. New-style cycles don't pre-seed "untested" rows, so the
 * scope is `run.caseIds` when present (untested = scoped cases without a
 * verdict); legacy runs fall back to their seeded `results` rows.
 */
export function computeRunStats(run) {
  const counts = { passed: 0, failed: 0, blocked: 0, retest: 0, skipped: 0, untested: 0 };
  const results = run?.results || [];
  const scope = Array.isArray(run?.caseIds) && run.caseIds.length > 0 ? new Set(run.caseIds) : null;
  const judged = new Set();
  results.forEach((result) => {
    if (scope && result?.caseId && !scope.has(result.caseId)) return;
    const status = result?.status;
    if (status && status !== "untested" && counts[status] !== undefined) {
      counts[status] += 1;
      if (result.caseId) judged.add(result.caseId);
    } else if (!scope) {
      counts.untested += 1;
    }
  });
  if (scope) counts.untested = [...scope].filter((caseId) => !judged.has(caseId)).length;
  const total = scope ? scope.size : results.length;
  const executed = counts.passed + counts.failed;
  return { ...counts, total, passRate: executed ? Math.round((counts.passed / executed) * 100) : null };
}

/**
 * Quality summary. Uses the latest result per test case (newest run wins) so
 * re-runs that fixed a failure count as passed.
 */
export function computeQuality(runs = []) {
  const latestByCase = new Map();
  runs.forEach((run) => {
    (run.results || []).forEach((result) => {
      if (!result?.caseId || latestByCase.has(result.caseId)) return;
      if (result.status === "untested") return;
      latestByCase.set(result.caseId, { ...result, runId: run.id, runName: run.name });
    });
  });
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failedCases = [];
  latestByCase.forEach((result) => {
    if (result.status === "passed") passed += 1;
    else if (result.status === "failed") {
      failed += 1;
      failedCases.push(result);
    } else if (result.status === "skipped") skipped += 1;
  });
  const executed = passed + failed;
  return {
    runCount: runs.length,
    passed,
    failed,
    skipped,
    executed,
    passRate: executed ? Math.round((passed / executed) * 100) : null,
    failedCases,
  };
}

/**
 * Readiness 0-100: weighted mean of the components that have data.
 * checklist 30 · work done 40 · quality 20 · blockers 10.
 */
export function computeReadiness({ checklist, work, quality }) {
  const parts = [];
  if (checklist.total > 0) parts.push({ key: "checklist", label: "Checklist", value: checklist.percent, weight: 30 });
  if (work.total > 0) parts.push({ key: "work", label: "Work done", value: work.percent, weight: 40 });
  if (quality.passRate !== null && quality.passRate !== undefined) parts.push({ key: "quality", label: "Test pass rate", value: quality.passRate, weight: 20 });
  if (work.total > 0) {
    const blockerScore = work.blocked === 0 ? 100 : work.blocked === 1 ? 50 : 0;
    parts.push({ key: "blockers", label: "No blockers", value: blockerScore, weight: 10 });
  }
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  const score = totalWeight
    ? Math.round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight)
    : 0;
  return { score, parts };
}

/** Auto-derived risks for active releases; manual notes are appended by the caller. */
export function deriveRisks({ release, work, checklist, quality, now = new Date() }) {
  if (!release || !isActiveStatus(release.status)) return [];
  const risks = [];
  const due = daysUntil(release.releaseDate, now);
  const frozen = release.status === "code-freeze";

  if (due !== null && due < 0) {
    risks.push({ id: "auto-overdue", severity: "high", text: `Target date passed ${Math.abs(due)} day${Math.abs(due) !== 1 ? "s" : ""} ago`, auto: true });
  }
  if (!release.releaseDate) {
    risks.push({ id: "auto-no-date", severity: "low", text: "No target date set", auto: true });
  }
  if (work.blocked > 0) {
    const severe = frozen || (due !== null && due <= 7);
    risks.push({ id: "auto-blocked", severity: severe ? "high" : "medium", text: `${work.blocked} blocked work item${work.blocked !== 1 ? "s" : ""}`, auto: true });
  }
  if (quality.failed > 0) {
    risks.push({
      id: "auto-tests",
      severity: quality.passRate !== null && quality.passRate < 80 ? "high" : "medium",
      text: `${quality.failed} failing test case${quality.failed !== 1 ? "s" : ""} (pass rate ${quality.passRate ?? 0}%)`,
      auto: true,
    });
  }
  if (checklist.total > 0 && checklist.percent < 100 && due !== null && due <= 7) {
    risks.push({
      id: "auto-checklist",
      severity: due <= 2 ? "high" : "medium",
      text: `Readiness checklist ${checklist.percent}% complete with ${Math.max(due, 0)} day${Math.max(due, 0) !== 1 ? "s" : ""} left`,
      auto: true,
    });
  }
  if (frozen && work.open > 0) {
    risks.push({
      id: "auto-scope-after-freeze",
      severity: due !== null && due <= 3 ? "high" : "medium",
      text: `${work.open} unfinished item${work.open !== 1 ? "s" : ""} after code freeze`,
      auto: true,
    });
  }
  const failedEnv = (release.environments || []).find((env) => env.status === "failed");
  if (failedEnv) {
    risks.push({ id: "auto-env-failed", severity: "high", text: `Deployment to ${failedEnv.key} failed`, auto: true });
  }
  return risks;
}

const SEVERITY_RANK = { low: 1, medium: 2, high: 3 };

export function computeRiskLevel(risks, status) {
  if (!isActiveStatus(status)) return "none";
  const max = (risks || []).reduce((rank, risk) => Math.max(rank, SEVERITY_RANK[risk.severity] || 0), 0);
  if (max >= 3) return "high";
  if (max === 2) return "medium";
  return "low";
}

/** All metrics for one (normalized) release. */
export function computeReleaseMetrics(release, { taskMap, testRuns, testPlans, now = new Date() }) {
  const linkedTasks = resolveLinkedTasks(release, taskMap);
  const work = computeWorkProgress(linkedTasks);
  const checklist = computeChecklistProgress(release.checklist);
  const runs = selectReleaseRuns(release, testRuns, testPlans);
  const quality = computeQuality(runs);
  const readiness = computeReadiness({ checklist, work, quality });
  const manualRisks = isActiveStatus(release.status) ? (release.risks || []) : [];
  const autoRisks = deriveRisks({ release, work, checklist, quality, now });
  const risks = [...autoRisks, ...manualRisks];
  return {
    linkedTasks,
    unresolvedTaskCount: Math.max(0, (release.taskIds || []).length - linkedTasks.length),
    work,
    checklist,
    runs,
    quality,
    readiness,
    autoRisks,
    risks,
    riskLevel: computeRiskLevel(risks, release.status),
  };
}

function shippedAt(release) {
  return parseDate(release.releasedAt) || parseDate(release.releaseDate);
}

/** Header KPI strip values over the visible project releases. */
export function computeKpis(releases, metricsById, now = new Date()) {
  const active = releases.filter((release) => ACTIVE_RELEASE_STATUSES.includes(release.status));
  const upcoming = active
    .filter((release) => release.releaseDate)
    .slice()
    .sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate)));
  const next = upcoming.find((release) => (daysUntil(release.releaseDate, now) ?? -1) >= 0) || upcoming[0] || null;
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const releasedRecently = releases.filter((release) => {
    if (release.status !== "released") return false;
    const at = shippedAt(release);
    return at && at >= ninetyDaysAgo && at <= now;
  }).length;
  const readinessValues = active.map((release) => metricsById.get(release.id)?.readiness.score ?? 0);
  return {
    next,
    nextDays: next ? daysUntil(next.releaseDate, now) : null,
    inProgress: releases.filter((release) => release.status === "in-progress" || release.status === "code-freeze").length,
    releasedRecently,
    avgReadiness: readinessValues.length ? Math.round(readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length) : null,
    atRisk: active.filter((release) => metricsById.get(release.id)?.riskLevel === "high").length,
    openBlockers: active.reduce((sum, release) => sum + (metricsById.get(release.id)?.work.blocked || 0), 0),
    activeCount: active.length,
  };
}

// ── Filtering & sorting ────────────────────────────────────────────────────

export function matchesStatusFilter(release, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "active") return isActiveStatus(release.status);
  if (filter === "closed") return release.status === "cancelled" || release.status === "rolled-back";
  return release.status === filter;
}

export function matchesReleaseQuery(release, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [release.version, release.name, release.description]
    .some((value) => String(value || "").toLowerCase().includes(q));
}

export function sortReleases(releases, sortKey, metricsById) {
  const list = releases.slice();
  if (sortKey === "version") {
    return list.sort((a, b) => compareVersions(b.version, a.version));
  }
  if (sortKey === "progress") {
    return list.sort((a, b) => (metricsById.get(b.id)?.work.percent ?? 0) - (metricsById.get(a.id)?.work.percent ?? 0)
      || compareVersions(b.version, a.version));
  }
  // Target date: furthest-out first (unscheduled = future, on top), shipped
  // history at the bottom; ties by version desc.
  return list.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return compareVersions(b.version, a.version);
    if (!a.releaseDate) return -1;
    if (!b.releaseDate) return 1;
    return String(b.releaseDate).localeCompare(String(a.releaseDate)) || compareVersions(b.version, a.version);
  });
}

export function countByStatusFilter(releases) {
  const counts = { all: releases.length, active: 0, closed: 0 };
  releases.forEach((release) => {
    counts[release.status] = (counts[release.status] || 0) + 1;
    if (isActiveStatus(release.status)) counts.active += 1;
    if (release.status === "cancelled" || release.status === "rolled-back") counts.closed += 1;
  });
  return counts;
}
