import { useCallback } from "react";
import { createDeploymentTimelineEvent, hydrateReleaseDefaults } from "../../../utils/releasePlanning";
import { useAppStore } from "../../../store/useAppStore";

// ─── Test management model helpers ──────────────────────────────────────────
// Canonical ids are `<prefix>-<timestamp>-<suffix>` with prefixes tp/ts/tc/tr.
// Older records may use `plan-/suite-/case-/run-<ts>-<rand>` (legacy TestsPage)
// or `tp-/ts-/tc-/tr-<ts>` (legacy facade). Ids are opaque strings, so every
// existing id keeps working; only newly created records use the unified scheme.

export const TEST_ID_PREFIX = {
  plan: "tp",
  suite: "ts",
  case: "tc",
  run: "tr",
};

export const TEST_CASE_PRIORITIES = ["critical", "high", "medium", "low"];
export const TEST_RESULT_STATUSES = ["untested", "passed", "failed", "skipped"];
export const TEST_RUN_STATUSES = ["in-progress", "completed", "aborted"];

let idSequence = 0;

export function generateTestingId(prefix) {
  idSequence = (idSequence + 1) % 1296;
  const suffix = `${idSequence.toString(36).padStart(2, "0")}${Math.random().toString(36).slice(2, 5)}`;
  return `${prefix}-${Date.now()}-${suffix}`;
}

function normalizeSteps(steps) {
  if (Array.isArray(steps)) {
    return steps.map((step) => (step == null ? "" : String(step).trim())).filter(Boolean);
  }
  if (typeof steps === "string" && steps.trim()) {
    return steps.split(/\n/).map((step) => step.trim()).filter(Boolean);
  }
  return [];
}

function currentStoreProjectId() {
  try {
    return useAppStore.getState().currentProjectId || null;
  } catch {
    return null;
  }
}

function buildUntestedResults(caseIds = []) {
  return caseIds.map((caseId) => ({
    caseId,
    status: "untested",
    notes: "",
    actualResult: "",
    bugTaskId: null,
  }));
}

export function buildTestPlanRecord(data = {}, currentUser = null, now = new Date().toISOString()) {
  return {
    ...data,
    id: generateTestingId(TEST_ID_PREFIX.plan),
    projectId: data.projectId || currentStoreProjectId(),
    name: (data.name || "").trim() || "Untitled plan",
    suiteIds: Array.isArray(data.suiteIds) ? [...new Set(data.suiteIds)] : [],
    status: data.status || "draft",
    statusOverride: Boolean(data.statusOverride),
    owner: data.owner || currentUser || null,
    assignedTester: data.assignedTester || data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function buildTestSuiteRecord(data = {}, currentUser = null, now = new Date().toISOString()) {
  return {
    ...data,
    id: generateTestingId(TEST_ID_PREFIX.suite),
    projectId: data.projectId || currentStoreProjectId(),
    name: (data.name || "").trim() || "Untitled suite",
    description: data.description || "",
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function buildTestCaseRecord(data = {}, currentUser = null, now = new Date().toISOString()) {
  return {
    ...data,
    id: generateTestingId(TEST_ID_PREFIX.case),
    suiteId: data.suiteId || null,
    title: (data.title || "").trim() || "Untitled case",
    priority: TEST_CASE_PRIORITIES.includes(data.priority) ? data.priority : "medium",
    status: TEST_RESULT_STATUSES.includes(data.status) ? data.status : "untested",
    steps: normalizeSteps(data.steps),
    regressionPacks: Array.isArray(data.regressionPacks) ? data.regressionPacks : [],
    linkedTaskId: data.linkedTaskId || null,
    linkedBugTaskId: data.linkedBugTaskId || null,
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function buildTestRunRecord(data = {}, currentUser = null, now = new Date().toISOString()) {
  const caseIds = Array.isArray(data.caseIds) ? data.caseIds : [];
  return {
    ...data,
    id: generateTestingId(TEST_ID_PREFIX.run),
    suiteId: data.suiteId || null,
    status: TEST_RUN_STATUSES.includes(data.status) ? data.status : "in-progress",
    caseIds,
    results: Array.isArray(data.results) ? data.results : buildUntestedResults(caseIds),
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
    completedAt: data.completedAt || null,
  };
}

export function useTestingActions({
  currentUser,
  templateRegistry,
  setReleases,
  setTestPlans,
  setTestSuites,
  setTestCases,
  setTestRuns,
}) {
  const createRelease = useCallback((data) => {
    const selectedTemplate = (templateRegistry?.release || []).find((template) => template.id === data.templateId) || null;
    const newRelease = hydrateReleaseDefaults({
      ...data,
      id: `rel-${Date.now()}`,
      taskIds: data.taskIds || [],
      changelog: data.changelog || [],
    }, selectedTemplate, currentUser);
    setReleases((prev) => [...prev, newRelease]);
  }, [currentUser, setReleases, templateRegistry]);

  const updateRelease = useCallback((updated) => {
    setReleases((prev) => prev.map((release) => (
      release.id === updated.id
        ? {
            ...release,
            ...updated,
            checklist: updated.checklist || release.checklist || [],
            deploymentTimeline: updated.deploymentTimeline || release.deploymentTimeline || [],
            updatedAt: new Date().toISOString(),
          }
        : release
    )));
  }, [setReleases]);

  const deleteRelease = useCallback((id) => {
    setReleases((prev) => prev.filter((release) => release.id !== id));
  }, [setReleases]);

  const addChangelogEntry = useCallback((releaseId, entry) => {
    const newEntry = {
      ...entry,
      id: `cl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: entry.author || currentUser || null,
    };
    setReleases((prev) => prev.map((release) => (
      release.id === releaseId
        ? {
            ...release,
            updatedAt: new Date().toISOString(),
            deploymentTimeline: [
              createDeploymentTimelineEvent("changelog", "Release notes updated", currentUser),
              ...(release.deploymentTimeline || []),
            ],
            changelog: [...(release.changelog || []), newEntry],
          }
        : release
    )));
  }, [currentUser, setReleases]);

  const deleteChangelogEntry = useCallback((releaseId, entryId) => {
    setReleases((prev) => prev.map((release) => (
      release.id === releaseId
        ? {
            ...release,
            updatedAt: new Date().toISOString(),
            changelog: (release.changelog || []).filter((entry) => entry.id !== entryId),
          }
        : release
    )));
  }, [setReleases]);

  // ── Test plans ──────────────────────────────────────────────────────────
  const createTestPlan = useCallback((data = {}) => {
    const record = buildTestPlanRecord(data, currentUser);
    setTestPlans((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestPlans]);

  const updateTestPlan = useCallback((updated) => {
    if (!updated?.id) return;
    setTestPlans((prev) => (prev || []).map((plan) => (
      plan.id === updated.id
        ? { ...plan, ...updated, updatedAt: new Date().toISOString() }
        : plan
    )));
  }, [setTestPlans]);

  const deleteTestPlan = useCallback((id) => {
    setTestPlans((prev) => (prev || []).filter((plan) => plan.id !== id));
    // Keep run history, but detach runs from the removed plan.
    setTestRuns((prev) => {
      const list = prev || [];
      if (!list.some((run) => run.planId === id)) return list;
      return list.map((run) => (run.planId === id ? { ...run, planId: null } : run));
    });
  }, [setTestPlans, setTestRuns]);

  // ── Test suites ─────────────────────────────────────────────────────────
  const createTestSuite = useCallback((data = {}) => {
    const record = buildTestSuiteRecord(data, currentUser);
    setTestSuites((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestSuites]);

  const updateTestSuite = useCallback((updated) => {
    if (!updated?.id) return;
    setTestSuites((prev) => (prev || []).map((suite) => (
      suite.id === updated.id
        ? { ...suite, ...updated, updatedAt: new Date().toISOString() }
        : suite
    )));
  }, [setTestSuites]);

  const deleteTestSuite = useCallback((id) => {
    setTestSuites((prev) => (prev || []).filter((suite) => suite.id !== id));
    setTestCases((prev) => (prev || []).filter((testCase) => testCase.suiteId !== id));
    setTestRuns((prev) => (prev || []).filter((run) => run.suiteId !== id));
    // Cascade: remove the suite from every plan scope.
    setTestPlans((prev) => {
      const list = prev || [];
      if (!list.some((plan) => (plan.suiteIds || []).includes(id))) return list;
      const now = new Date().toISOString();
      return list.map((plan) => (
        (plan.suiteIds || []).includes(id)
          ? { ...plan, suiteIds: plan.suiteIds.filter((suiteId) => suiteId !== id), updatedAt: now }
          : plan
      ));
    });
  }, [setTestCases, setTestPlans, setTestRuns, setTestSuites]);

  // ── Test cases ──────────────────────────────────────────────────────────
  const createTestCase = useCallback((data = {}) => {
    const record = buildTestCaseRecord(data, currentUser);
    setTestCases((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestCases]);

  const updateTestCase = useCallback((updated) => {
    if (!updated?.id) return;
    setTestCases((prev) => (prev || []).map((testCase) => (
      testCase.id === updated.id
        ? { ...testCase, ...updated, updatedAt: new Date().toISOString() }
        : testCase
    )));
  }, [setTestCases]);

  const deleteTestCase = useCallback((id) => {
    setTestCases((prev) => (prev || []).filter((testCase) => testCase.id !== id));
  }, [setTestCases]);

  // ── Test runs ───────────────────────────────────────────────────────────
  const createTestRun = useCallback((data = {}) => {
    const record = buildTestRunRecord(data, currentUser);
    setTestRuns((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestRuns]);

  const createTestRuns = useCallback((items = []) => {
    const now = new Date().toISOString();
    const records = items.map((data) => buildTestRunRecord(data, currentUser, now));
    if (records.length) setTestRuns((prev) => [...(prev || []), ...records]);
    return records;
  }, [currentUser, setTestRuns]);

  const updateTestRun = useCallback((updated) => {
    if (!updated?.id) return;
    setTestRuns((prev) => (prev || []).map((run) => (
      run.id === updated.id
        ? { ...run, ...updated, updatedAt: new Date().toISOString() }
        : run
    )));
  }, [setTestRuns]);

  const deleteTestRun = useCallback((id) => {
    setTestRuns((prev) => (prev || []).filter((run) => run.id !== id));
  }, [setTestRuns]);

  const updateTestRunResult = useCallback((runId, caseId, result) => {
    const now = new Date().toISOString();
    const executionMeta = result?.status && result.status !== "untested"
      ? { executedAt: now, executedBy: currentUser || null }
      : {};
    setTestRuns((prev) => (prev || []).map((run) => {
      if (run.id !== runId) return run;
      const existing = (run.results || []).find((item) => item.caseId === caseId);
      const results = existing
        ? run.results.map((item) => (
            item.caseId === caseId ? { ...item, ...result, ...executionMeta } : item
          ))
        : [...(run.results || []), { caseId, ...result, ...executionMeta }];
      return { ...run, results, updatedAt: now };
    }));
  }, [currentUser, setTestRuns]);

  return {
    createRelease,
    updateRelease,
    deleteRelease,
    addChangelogEntry,
    deleteChangelogEntry,
    createTestPlan,
    updateTestPlan,
    deleteTestPlan,
    createTestSuite,
    updateTestSuite,
    deleteTestSuite,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    createTestRun,
    createTestRuns,
    updateTestRun,
    deleteTestRun,
    updateTestRunResult,
  };
}
