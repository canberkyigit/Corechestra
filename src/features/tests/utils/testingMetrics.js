// Pure metrics for the Test Management module (no React, no store).
import { EXECUTED_STATUSES, FLAKY_WINDOW, RESULT_ORDER } from "../constants/testingConstants";
import { DAY_MS, dayKey, parseDateOnly, startOfDay, toTimestamp } from "./testingFormat";

const emptyCounts = () => ({ passed: 0, failed: 0, blocked: 0, skipped: 0, retest: 0, untested: 0 });

/** Who executes `caseId` in `run`: per-case assignment, else the cycle's default tester. */
export function assigneeOf(run, caseId) {
  return run?.assignments?.[caseId] || run?.assignedTester || null;
}

export function resultTime(result, run) {
  return toTimestamp(result?.executedAt) || toTimestamp(run?.updatedAt) || toTimestamp(run?.createdAt);
}

export function getResultMap(run) {
  const map = new Map();
  (run?.results || []).forEach((result) => {
    if (result?.caseId) map.set(result.caseId, result);
  });
  return map;
}

/**
 * Counts for one cycle over its scoped cases. Untested = scoped cases without
 * a verdict. Executed = passed+failed+blocked+skipped (retest is still open).
 * passRate = passed / (passed + failed + blocked); skipped is excluded.
 */
export function summarizeRun(run) {
  const counts = emptyCounts();
  const resultMap = getResultMap(run);
  const scope = run?.caseIds?.length ? run.caseIds : [...resultMap.keys()];
  scope.forEach((caseId) => {
    const status = resultMap.get(caseId)?.status || "untested";
    counts[counts[status] === undefined ? "untested" : status] += 1;
  });
  const total = scope.length;
  const executed = counts.passed + counts.failed + counts.blocked + counts.skipped;
  const judged = counts.passed + counts.failed + counts.blocked;
  return {
    ...counts,
    total,
    executed,
    open: counts.untested + counts.retest,
    progress: total ? Math.round((executed / total) * 100) : 0,
    passRate: judged ? Math.round((counts.passed / judged) * 100) : null,
  };
}

/**
 * Latest executed verdict per case across runs (newest execution wins; the
 * run's own time breaks ties). Untested rows never hide an earlier verdict.
 */
export function latestResultsByCase(runs = []) {
  const map = new Map();
  runs.forEach((run) => {
    (run.results || []).forEach((result) => {
      if (!result?.caseId || !result.status || result.status === "untested") return;
      const at = resultTime(result, run);
      const current = map.get(result.caseId);
      if (!current || at >= current.at) {
        map.set(result.caseId, {
          status: result.status,
          at,
          executedBy: result.executedBy || null,
          runId: run.id,
          runName: run.name,
          defects: result.defects || [],
          comment: result.comment || "",
        });
      }
    });
  });
  return map;
}

/**
 * Every execution event (current results + capped attempt history), newest
 * last. Shape: { caseId, runId, status, at, by }.
 */
export function collectExecutionEvents(runs = []) {
  const events = [];
  runs.forEach((run) => {
    (run.results || []).forEach((result) => {
      if (!result?.caseId) return;
      (result.attempts || []).forEach((attempt) => {
        const at = toTimestamp(attempt.executedAt);
        if (!at || !attempt.status || attempt.status === "untested") return;
        events.push({ caseId: result.caseId, runId: run.id, status: attempt.status, at, by: attempt.executedBy || null });
      });
      if (result.status && result.status !== "untested") {
        events.push({ caseId: result.caseId, runId: run.id, status: result.status, at: resultTime(result, run), by: result.executedBy || null });
      }
    });
  });
  return events.sort((a, b) => a.at - b.at);
}

/** Executions per day (stacked by status) for the last `days` days ending today. */
export function executionTrend(runs = [], { days = 30, now = new Date(), events = null } = {}) {
  const today = startOfDay(now);
  const buckets = [];
  const byKey = new Map();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    const bucket = { date: dayKey(date), ...emptyCounts(), total: 0 };
    delete bucket.untested;
    buckets.push(bucket);
    byKey.set(bucket.date, bucket);
  }
  (events || collectExecutionEvents(runs)).forEach((event) => {
    const bucket = byKey.get(dayKey(event.at));
    if (!bucket || bucket[event.status] === undefined) return;
    bucket[event.status] += 1;
    bucket.total += 1;
  });
  return buckets;
}

/**
 * Flaky = the passed/failed sequence of the last `window` executions flips at
 * least `minFlips` times (e.g. pass → fail → pass).
 */
export function detectFlakyCases(runs = [], { window = FLAKY_WINDOW, minFlips = 2, events = null } = {}) {
  const sequences = new Map();
  (events || collectExecutionEvents(runs)).forEach((event) => {
    if (event.status !== "passed" && event.status !== "failed") return;
    const list = sequences.get(event.caseId) || [];
    list.push(event.status);
    sequences.set(event.caseId, list);
  });
  const flaky = [];
  sequences.forEach((list, caseId) => {
    const recent = list.slice(-window);
    let flips = 0;
    for (let i = 1; i < recent.length; i += 1) if (recent[i] !== recent[i - 1]) flips += 1;
    if (flips >= minFlips) {
      flaky.push({
        caseId,
        flips,
        sequence: recent,
        lastStatus: recent[recent.length - 1],
        score: Math.round((flips / Math.max(1, recent.length - 1)) * 100),
      });
    }
  });
  return flaky.sort((a, b) => b.score - a.score || b.flips - a.flips);
}

export function topFailingCases(runs = [], { limit = 5, events = null } = {}) {
  const map = new Map();
  (events || collectExecutionEvents(runs)).forEach((event) => {
    if (event.status !== "failed") return;
    const entry = map.get(event.caseId) || { caseId: event.caseId, failures: 0, lastFailedAt: 0 };
    entry.failures += 1;
    entry.lastFailedAt = Math.max(entry.lastFailedAt, event.at);
    map.set(event.caseId, entry);
  });
  return [...map.values()].sort((a, b) => b.failures - a.failures || b.lastFailedAt - a.lastFailedAt).slice(0, limit);
}

/** Latest-result distribution over cases (never run → untested; legacy baseline as fallback). */
export function statusDistribution(cases = [], latestMap = new Map()) {
  const counts = emptyCounts();
  cases.forEach((testCase) => {
    const status = latestMap.get(testCase.id)?.status || testCase.legacyResult || "untested";
    counts[counts[status] === undefined ? "untested" : status] += 1;
  });
  return RESULT_ORDER.map((status) => ({ status, count: counts[status] }));
}

/** Pass rate per root suite from latest results. */
export function passRateBySuite(cases = [], latestMap = new Map(), rootIdOf = (id) => id, suiteById = new Map()) {
  const map = new Map();
  cases.forEach((testCase) => {
    const rootId = rootIdOf(testCase.suiteId);
    const entry = map.get(rootId) || { suiteId: rootId, name: suiteById.get(rootId)?.name || "Suite", ...emptyCounts(), total: 0 };
    const status = latestMap.get(testCase.id)?.status || testCase.legacyResult || "untested";
    entry[entry[status] === undefined ? "untested" : status] += 1;
    entry.total += 1;
    map.set(rootId, entry);
  });
  return [...map.values()].map((entry) => {
    const judged = entry.passed + entry.failed + entry.blocked;
    return { ...entry, passRate: judged ? Math.round((entry.passed / judged) * 100) : null };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Open assignments (untested/retest in open cycles) and recent executions per tester. */
export function testerWorkload(runs = [], { now = new Date(), days = 7, events = null } = {}) {
  const since = toTimestamp(now) - days * DAY_MS;
  const map = new Map();
  const entry = (user) => {
    if (!map.has(user)) map.set(user, { user, open: 0, executed: 0, failed: 0 });
    return map.get(user);
  };
  runs.forEach((run) => {
    if (run.status !== "in-progress") return;
    const resultMap = getResultMap(run);
    (run.caseIds || []).forEach((caseId) => {
      const status = resultMap.get(caseId)?.status || "untested";
      if (status !== "untested" && status !== "retest") return;
      const user = assigneeOf(run, caseId);
      if (user) entry(user).open += 1;
    });
  });
  (events || collectExecutionEvents(runs)).forEach((event) => {
    if (event.at < since || !event.by) return;
    const item = entry(event.by);
    item.executed += 1;
    if (event.status === "failed") item.failed += 1;
  });
  return [...map.values()].sort((a, b) => (b.open + b.executed) - (a.open + a.executed));
}

/**
 * Remaining (not yet executed) cases per day for a cycle, plus an ideal line
 * to its due date. A case counts as executed from its first executed verdict
 * (attempt history included) unless its current status is retest/untested.
 */
export function cycleBurndown(run, { now = new Date() } = {}) {
  const total = run?.caseIds?.length || 0;
  const start = startOfDay(run?.startDate ? parseDateOnly(run.startDate) : run?.createdAt || now);
  const endCandidates = [toTimestamp(now)];
  if (run?.status !== "in-progress" && run?.completedAt) endCandidates.push(toTimestamp(run.completedAt));
  const end = startOfDay(Math.min(...endCandidates));
  const due = run?.dueDate ? startOfDay(parseDateOnly(run.dueDate)) : null;
  const firstDone = new Map();
  const scope = new Set(run?.caseIds || []);
  (run?.results || []).forEach((result) => {
    if (!scope.has(result.caseId)) return;
    if (!EXECUTED_STATUSES.includes(result.status)) return;
    const times = [toTimestamp(result.executedAt), ...(result.attempts || []).filter((attempt) => EXECUTED_STATUSES.includes(attempt.status)).map((attempt) => toTimestamp(attempt.executedAt))].filter(Boolean);
    firstDone.set(result.caseId, times.length ? Math.min(...times) : toTimestamp(run.createdAt));
  });
  const doneTimes = [...firstDone.values()].sort((a, b) => a - b);
  const lastDay = due && due.getTime() > end.getTime() ? due : end;
  const spanDays = Math.max(1, Math.round((lastDay.getTime() - start.getTime()) / DAY_MS));
  const idealSpan = due ? Math.max(1, Math.round((due.getTime() - start.getTime()) / DAY_MS)) : spanDays;
  const points = [];
  for (let i = 0; i <= Math.min(spanDays, 120); i += 1) {
    const dayStart = start.getTime() + i * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const future = dayStart > end.getTime();
    const done = doneTimes.filter((ts) => ts < dayEnd).length;
    points.push({
      date: dayKey(dayStart),
      remaining: future ? null : Math.max(0, total - done),
      ideal: Math.max(0, Math.round((total - (total * i) / idealSpan) * 10) / 10),
    });
  }
  return { total, points, dueDate: due ? dayKey(due) : null };
}

/** Test runs tied to a release directly or through a plan (same rule as Releases). */
export function selectReleaseRuns(releaseId, runs = [], plans = []) {
  const planIds = new Set(plans.filter((plan) => plan.releaseId === releaseId).map((plan) => plan.id));
  return runs.filter((run) => run.releaseId === releaseId || (run.planId && planIds.has(run.planId)));
}

/**
 * Release quality: latest verdict per case across the release's cycles.
 * verdict: "no-data" | "at-risk" (failures/blocks on critical/high or pass < 80)
 *          | "in-progress" (execution < 90%) | "ready".
 */
export function releaseQuality(releaseId, { runs = [], plans = [], caseById = new Map() } = {}) {
  const releaseRuns = selectReleaseRuns(releaseId, runs, plans);
  const scope = new Set();
  releaseRuns.forEach((run) => (run.caseIds || []).forEach((caseId) => scope.add(caseId)));
  const latest = latestResultsByCase(releaseRuns);
  const counts = emptyCounts();
  let criticalFailures = 0;
  scope.forEach((caseId) => {
    const status = latest.get(caseId)?.status || "untested";
    counts[counts[status] === undefined ? "untested" : status] += 1;
    const priority = caseById.get(caseId)?.priority;
    if ((status === "failed" || status === "blocked") && (priority === "critical" || priority === "high")) criticalFailures += 1;
  });
  const total = scope.size;
  const executed = counts.passed + counts.failed + counts.blocked + counts.skipped;
  const judged = counts.passed + counts.failed + counts.blocked;
  const passRate = judged ? Math.round((counts.passed / judged) * 100) : null;
  const progress = total ? Math.round((executed / total) * 100) : 0;
  let verdict = "ready";
  if (!releaseRuns.length || !total) verdict = "no-data";
  else if (criticalFailures > 0 || (passRate !== null && passRate < 80)) verdict = "at-risk";
  else if (progress < 90) verdict = "in-progress";
  return {
    releaseId, runs: releaseRuns, total, executed, progress, passRate, criticalFailures, verdict, ...counts,
  };
}

/** My open work: untested/retest cases assigned to `username` in open cycles. */
export function buildMyQueue(runs = [], username) {
  if (!username) return [];
  return runs
    .filter((run) => run.status === "in-progress")
    .map((run) => {
      const resultMap = getResultMap(run);
      const items = (run.caseIds || [])
        .filter((caseId) => assigneeOf(run, caseId) === username)
        .map((caseId) => ({ caseId, status: resultMap.get(caseId)?.status || "untested" }));
      const open = items.filter((item) => item.status === "untested" || item.status === "retest");
      return { run, items, open, done: items.length - open.length };
    })
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const ad = toTimestamp(parseDateOnly(a.run.dueDate)) || Number.MAX_SAFE_INTEGER;
      const bd = toTimestamp(parseDateOnly(b.run.dueDate)) || Number.MAX_SAFE_INTEGER;
      return ad - bd || b.open.length - a.open.length;
    });
}

/** taskId → { caseIds:Set, runIds:Set, lastLinkedAt } for defects linked from cases/executions. */
export function collectDefectLinks(cases = [], runs = []) {
  const map = new Map();
  const entry = (taskId) => {
    if (!map.has(taskId)) map.set(taskId, { taskId, caseIds: new Set(), runIds: new Set(), lastLinkedAt: 0 });
    return map.get(taskId);
  };
  cases.forEach((testCase) => (testCase.defectIds || []).forEach((taskId) => entry(taskId).caseIds.add(testCase.id)));
  runs.forEach((run) => (run.results || []).forEach((result) => (result.defects || []).forEach((taskId) => {
    const item = entry(taskId);
    item.caseIds.add(result.caseId);
    item.runIds.add(run.id);
    item.lastLinkedAt = Math.max(item.lastLinkedAt, resultTime(result, run));
  })));
  return map;
}

export function automationCoverage(cases = []) {
  const active = cases.filter((testCase) => testCase.status !== "deprecated");
  const automated = active.filter((testCase) => testCase.automation === "automated").length;
  const planned = active.filter((testCase) => testCase.automation === "to-be-automated").length;
  return { total: active.length, automated, planned, percent: active.length ? Math.round((automated / active.length) * 100) : 0 };
}

/** Pass rate of the latest verdict per case (passed / (passed+failed+blocked)). */
export function latestPassRate(latestMap = new Map()) {
  let passed = 0;
  let judged = 0;
  latestMap.forEach((entry) => {
    if (entry.status === "passed") passed += 1;
    if (["passed", "failed", "blocked"].includes(entry.status)) judged += 1;
  });
  return judged ? Math.round((passed / judged) * 100) : null;
}

export function countEventsSince(events = [], since) {
  return events.filter((event) => event.at >= since).length;
}

/** Aggregate over several cycles: union scope, latest verdict per case. */
export function summarizeRuns(runs = []) {
  const scope = new Set();
  runs.forEach((run) => (run.caseIds || []).forEach((caseId) => scope.add(caseId)));
  const latest = latestResultsByCase(runs);
  const counts = emptyCounts();
  scope.forEach((caseId) => {
    const status = latest.get(caseId)?.status || "untested";
    counts[counts[status] === undefined ? "untested" : status] += 1;
  });
  const total = scope.size;
  const executed = counts.passed + counts.failed + counts.blocked + counts.skipped;
  const judged = counts.passed + counts.failed + counts.blocked;
  return {
    ...counts,
    total,
    executed,
    open: counts.untested + counts.retest,
    progress: total ? Math.round((executed / total) * 100) : 0,
    passRate: judged ? Math.round((counts.passed / judged) * 100) : null,
  };
}

/** Effective plan status from its cycles (manual override wins). */
export function derivePlanStatus(plan, planRuns = []) {
  const stored = plan?.status || "draft";
  if (plan?.statusOverride) return stored;
  if (!planRuns.length) return stored;
  if (planRuns.some((run) => run.status === "in-progress")) return "in-progress";
  if (planRuns.some((run) => run.status === "completed")) return "completed";
  if (planRuns.every((run) => run.status === "aborted")) return "aborted";
  return stored;
}
