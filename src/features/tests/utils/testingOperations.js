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

export function buildCoverageRows(cases, allTasks, runs) {
  const latestResultByCaseId = {};
  [...runs]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .forEach((run) => {
      (run.results || []).forEach((result) => {
        latestResultByCaseId[result.caseId] = result;
      });
    });

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

export function buildPlanSummary(plan, runs = [], cases = []) {
  const relatedRuns = runs.filter((run) => run.planId === plan.id);
  const scopeCaseIds = new Set(cases.filter((testCase) => (plan.suiteIds || []).includes(testCase.suiteId)).map((testCase) => testCase.id));
  const resultRows = relatedRuns.flatMap((run) => run.results || []);
  const attempted = resultRows.filter((row) => row.status && row.status !== "untested").length;
  const failed = resultRows.filter((row) => row.status === "failed").length;
  const passed = resultRows.filter((row) => row.status === "passed").length;
  const completedRuns = relatedRuns.filter((run) => run.status === "completed").length;
  const inProgressRuns = relatedRuns.filter((run) => run.status === "in-progress").length;
  return {
    totalRuns: relatedRuns.length,
    completedRuns,
    inProgressRuns,
    attempted,
    failed,
    passed,
    scopedCaseCount: scopeCaseIds.size,
    progressPercent: scopeCaseIds.size > 0 ? Math.round((attempted / scopeCaseIds.size) * 100) : 0,
  };
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
    name: `${run.name} — Rerun Failed`,
  };
}
