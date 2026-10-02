// Pure helpers for the Test Management module. No React, no store access.

/** Legacy or imported data may store steps as a string, object, or non-array. */
export function normalizeTestSteps(steps) {
  if (Array.isArray(steps)) {
    return steps.map((step) => (step == null ? "" : String(step).trim())).filter(Boolean);
  }
  if (typeof steps === "string" && steps.trim()) {
    return steps.split(/\n/).map((step) => step.trim()).filter(Boolean);
  }
  return [];
}

// ─── Dates & sorting ────────────────────────────────────────────────────────

export function toTimestamp(value) {
  if (!value) return 0;
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Best-known start time of a run. Missing values sort first instead of crashing. */
export function getRunCreatedTime(run) {
  return toTimestamp(run?.createdAt) || toTimestamp(run?.updatedAt) || 0;
}

/** Best-known finish time of a run (completion, else creation). */
export function getRunFinishedTime(run) {
  return toTimestamp(run?.completedAt) || toTimestamp(run?.abortedAt) || getRunCreatedTime(run);
}

export function sortRunsByCreatedAsc(runs = []) {
  return [...runs].sort((a, b) => getRunCreatedTime(a) - getRunCreatedTime(b));
}

export function sortRunsByCreatedDesc(runs = []) {
  return [...runs].sort((a, b) => getRunCreatedTime(b) - getRunCreatedTime(a));
}

/** Format an ISO timestamp or a YYYY-MM-DD date safely. Returns fallback for invalid input. */
export function formatTestDate(value, options, fallback = "—") {
  if (!value) return fallback;
  const isDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isDateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return options ? date.toLocaleDateString("en-US", options) : date.toLocaleDateString();
}

// ─── Run scope & results ────────────────────────────────────────────────────

export function buildInitialRunResults(cases) {
  return cases.map((testCase) => ({
    caseId: testCase.id,
    status: "untested",
    notes: "",
    actualResult: "",
    bugTaskId: testCase.linkedBugTaskId || null,
  }));
}

export function getRunScopedCases(runInput, suiteCases) {
  if (!runInput) return suiteCases;
  if (Array.isArray(runInput.caseIds) && runInput.caseIds.length > 0) {
    const allowed = new Set(runInput.caseIds);
    return suiteCases.filter((testCase) => allowed.has(testCase.id));
  }
  if (runInput.regressionPack) {
    return suiteCases.filter((testCase) => (testCase.regressionPacks || []).includes(runInput.regressionPack));
  }
  return suiteCases;
}

/** Index run results by caseId (last write wins for duplicated legacy rows). */
export function getRunResultMap(run) {
  const map = {};
  (run?.results || []).forEach((result) => {
    if (result?.caseId) map[result.caseId] = result;
  });
  return map;
}

/**
 * Counts for one run restricted to its scoped cases.
 * Untested = scoped cases without an executed verdict, so pre-seeded
 * "untested" rows and out-of-scope rows never skew the numbers.
 */
export function summarizeRun(run, scopedCases = []) {
  const resultMap = getRunResultMap(run);
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  scopedCases.forEach((testCase) => {
    const status = resultMap[testCase.id]?.status;
    if (status === "passed") passed += 1;
    else if (status === "failed") failed += 1;
    else if (status === "skipped") skipped += 1;
  });
  const total = scopedCases.length;
  const executed = passed + failed + skipped;
  return {
    total,
    executed,
    passed,
    failed,
    skipped,
    untested: Math.max(0, total - executed),
    progressPercent: total > 0 ? Math.min(100, Math.round((executed / total) * 100)) : 0,
    passRate: executed > 0 ? Math.round((passed / executed) * 100) : null,
  };
}

/** Index of the next case without a verdict after `fromIdx` (wraps). Returns cases.length when none remain. */
export function findNextUntestedIndex(cases, run, fromIdx = -1) {
  if (!cases.length) return 0;
  const resultMap = getRunResultMap(run);
  const isOpen = (testCase) => {
    const status = resultMap[testCase.id]?.status;
    return !status || status === "untested";
  };
  for (let offset = 1; offset <= cases.length; offset += 1) {
    const idx = (fromIdx + offset + cases.length) % cases.length;
    if (isOpen(cases[idx])) return idx;
  }
  return cases.length;
}

/**
 * Latest *executed* result per case across runs (ordered by run start time).
 * Seeded "untested" rows from newer runs do not hide an earlier verdict.
 */
export function buildLatestExecutedResultMap(runs = []) {
  const map = {};
  sortRunsByCreatedAsc(runs).forEach((run) => {
    (run.results || []).forEach((result) => {
      if (!result?.caseId || !result.status || result.status === "untested") return;
      map[result.caseId] = result;
    });
  });
  return map;
}

export function buildCoverageRows(cases, allTasks, runs) {
  const latestResultByCaseId = buildLatestExecutedResultMap(runs);

  const map = new Map();
  cases.forEach((testCase) => {
    const key = testCase.linkedTaskId || `requirement:${(testCase.requirement || "").trim().toLowerCase()}`;
    if (!key || key === "requirement:") return;

    const task = testCase.linkedTaskId ? allTasks.find((item) => item.id === testCase.linkedTaskId) : null;
    const existing = map.get(key) || {
      key,
      linkedTaskId: testCase.linkedTaskId || null,
      title: task?.title || testCase.requirement || "Unlabeled requirement",
      requirement: testCase.requirement || "",
      caseCount: 0,
      passedCount: 0,
      failedCount: 0,
      untestedCount: 0,
      linkedBugIds: new Set(),
    };

    const latest = latestResultByCaseId[testCase.id];
    const status = latest?.status || testCase.status || "untested";
    existing.caseCount += 1;
    if (status === "passed") existing.passedCount += 1;
    else if (status === "failed") existing.failedCount += 1;
    else existing.untestedCount += 1;
    if (testCase.linkedBugTaskId) existing.linkedBugIds.add(testCase.linkedBugTaskId);
    map.set(key, existing);
  });

  return [...map.values()].map((row) => ({
    ...row,
    linkedBugIds: [...row.linkedBugIds],
    coverageStatus:
      row.caseCount === 0 ? "missing" :
      row.failedCount > 0 ? "at-risk" :
      row.passedCount === row.caseCount ? "covered" :
      "partial",
  }));
}

// ─── Plans ──────────────────────────────────────────────────────────────────

/** Cases a plan covers: cases of its suites, narrowed by its regression pack. */
export function getPlanScopedCases(plan, cases = []) {
  const suiteIds = new Set(plan?.suiteIds || []);
  const suiteCases = cases.filter((testCase) => suiteIds.has(testCase.suiteId));
  return plan?.regressionPack ? getRunScopedCases({ regressionPack: plan.regressionPack }, suiteCases) : suiteCases;
}

/**
 * Plan progress is per scoped case: a case counts as attempted once any plan
 * run has an executed verdict for it, and its latest verdict decides
 * passed/failed. Reruns therefore never push progress above 100%.
 */
export function buildPlanSummary(plan, runs = [], cases = []) {
  const relatedRuns = runs.filter((run) => run.planId === plan.id);
  const scopedCases = getPlanScopedCases(plan, cases);
  const latest = buildLatestExecutedResultMap(relatedRuns);
  let attempted = 0;
  let passed = 0;
  let failed = 0;
  scopedCases.forEach((testCase) => {
    const status = latest[testCase.id]?.status;
    if (!status) return;
    attempted += 1;
    if (status === "passed") passed += 1;
    else if (status === "failed") failed += 1;
  });
  const completedRuns = relatedRuns.filter((run) => run.status === "completed").length;
  const inProgressRuns = relatedRuns.filter((run) => run.status === "in-progress").length;
  const abortedRuns = relatedRuns.filter((run) => run.status === "aborted").length;
  const scopedCaseCount = scopedCases.length;
  return {
    totalRuns: relatedRuns.length,
    completedRuns,
    inProgressRuns,
    abortedRuns,
    attempted,
    failed,
    passed,
    scopedCaseCount,
    progressPercent: scopedCaseCount > 0 ? Math.min(100, Math.round((attempted / scopedCaseCount) * 100)) : 0,
  };
}

/**
 * Effective plan status.
 * - A manual override (e.g. "Move to Draft") wins until the plan is started again.
 * - Without runs the stored status is kept.
 * - Any active run → in-progress; at least one completed run → completed;
 *   only aborted runs → aborted (never "completed").
 */
export function derivePlanStatus(plan, relatedRuns = []) {
  const stored = plan?.status || "draft";
  if (plan?.statusOverride) return stored;
  if (!relatedRuns.length) return stored;
  if (relatedRuns.some((run) => run.status === "in-progress")) return "in-progress";
  if (relatedRuns.some((run) => run.status === "completed")) return "completed";
  if (relatedRuns.every((run) => run.status === "aborted")) return "aborted";
  return stored;
}

export function canStartPlan(effectiveStatus) {
  return effectiveStatus === "draft" || effectiveStatus === "aborted";
}

export function buildRerunFailedInput(run) {
  const failedCaseIds = (run.results || [])
    .filter((result) => result.status === "failed")
    .map((result) => result.caseId);

  return {
    suiteId: run.suiteId,
    caseIds: failedCaseIds,
    regressionPack: null,
    releaseId: run.releaseId || null,
    planId: run.planId || null,
    environment: run.environment || "",
    buildVersion: run.buildVersion || "",
    platform: run.platform || "",
    assignedTester: run.assignedTester || null,
    rerunOf: run.id || null,
    name: `${run.name} — Rerun Failed`,
  };
}

/** Run input (without id/timestamps) with explicit scoped caseIds and seeded results. */
export function buildRunInput(suiteId, data, suiteCases) {
  const scopedCases = getRunScopedCases(data, suiteCases);
  return {
    ...data,
    suiteId,
    status: "in-progress",
    completedAt: null,
    caseIds: scopedCases.map((testCase) => testCase.id),
    results: buildInitialRunResults(scopedCases),
  };
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export function buildSuiteAnalytics(cases = [], runs = []) {
  const completedRuns = [...runs]
    .filter((run) => run.status === "completed")
    .sort((a, b) => getRunFinishedTime(a) - getRunFinishedTime(b));
  const summaries = completedRuns.map((run) => ({
    run,
    summary: summarizeRun(run, getRunScopedCases(run, cases)),
  }));
  const last = summaries[summaries.length - 1] || null;
  const avgCasesPerRun = summaries.length
    ? Math.round(summaries.reduce((sum, item) => sum + item.summary.total, 0) / summaries.length)
    : 0;

  const failureMap = {};
  runs.forEach((run) => {
    const when = run.completedAt || run.createdAt || null;
    (run.results || []).forEach((result) => {
      if (result.status !== "failed") return;
      const entry = failureMap[result.caseId] || { count: 0, lastDate: null };
      entry.count += 1;
      if (when && (!entry.lastDate || toTimestamp(when) > toTimestamp(entry.lastDate))) entry.lastDate = when;
      failureMap[result.caseId] = entry;
    });
  });
  const failureList = cases
    .filter((testCase) => failureMap[testCase.id])
    .map((testCase) => ({ ...testCase, failCount: failureMap[testCase.id].count, lastFailDate: failureMap[testCase.id].lastDate }))
    .sort((a, b) => b.failCount - a.failCount);

  return {
    completedCount: completedRuns.length,
    lastRun: last?.run || null,
    passRate: last?.summary.passRate ?? 0,
    avgCasesPerRun,
    trend: summaries.slice(-5),
    failureList,
  };
}

// ─── Bugs ───────────────────────────────────────────────────────────────────

export function buildBugFromFailure(testCase, run, context = {}, { labels = [] } = {}) {
  const description = [
    `Failed during test run "${run.name}".`,
    run.environment ? `Environment: ${run.environment}` : null,
    run.platform ? `Platform: ${run.platform}` : null,
    run.buildVersion ? `Build: ${run.buildVersion}` : null,
    testCase.expectedResult ? `Expected: ${testCase.expectedResult}` : null,
    context.actualResult ? `Actual: ${context.actualResult}` : null,
    context.notes ? `Notes: ${context.notes}` : null,
  ].filter(Boolean).join("\n");
  const qaLabel = (labels || []).find((label) => String(label?.name || "").trim().toLowerCase() === "qa");
  return {
    title: `Test failure: ${testCase.title}`,
    description,
    type: "bug",
    priority: testCase.priority || "medium",
    storyPoint: 0,
    dueDate: "",
    assignedTo: "unassigned",
    labels: qaLabel?.id ? [qaLabel.id] : [],
    linkedItems: [{
      id: `${Date.now()}`,
      targetType: "test-case",
      targetId: testCase.id,
      relationship: "relates to",
      createdAt: new Date().toISOString(),
    }],
  };
}
