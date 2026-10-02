// Read-side normalization for test management records.
// Store data can come from three generations of writers (legacy TestsPage,
// legacy facade, current facade) with different id prefixes and optional
// fields. Normalizing on read keeps every id untouched while guaranteeing
// the shape the UI relies on.

import {
  TEST_PRIORITY_VALUES,
  TEST_RESULT_STATUS_VALUES,
  TEST_RUN_STATUS_VALUES,
} from "../constants/testingConstants";
import { normalizeTestSteps } from "./testingOperations";

const asArray = (value) => (Array.isArray(value) ? value : []);

export function normalizeTestSuite(suite) {
  return {
    ...suite,
    name: suite.name || "Untitled suite",
    description: suite.description || "",
    projectId: suite.projectId || null,
  };
}

export function normalizeTestCase(testCase) {
  return {
    ...testCase,
    title: testCase.title || testCase.name || "Untitled case",
    priority: TEST_PRIORITY_VALUES.includes(testCase.priority) ? testCase.priority : "medium",
    status: TEST_RESULT_STATUS_VALUES.includes(testCase.status) ? testCase.status : "untested",
    steps: normalizeTestSteps(testCase.steps),
    regressionPacks: asArray(testCase.regressionPacks).filter(Boolean),
    linkedTaskId: testCase.linkedTaskId || null,
    linkedBugTaskId: testCase.linkedBugTaskId || null,
  };
}

export function normalizeTestRun(run) {
  return {
    ...run,
    name: run.name || `Run ${String(run.id || "").slice(-6)}`,
    status: TEST_RUN_STATUS_VALUES.includes(run.status) ? run.status : "in-progress",
    caseIds: asArray(run.caseIds),
    results: asArray(run.results).filter((result) => result && result.caseId),
    createdAt: run.createdAt || run.updatedAt || null,
  };
}

export function normalizeTestPlan(plan) {
  return {
    ...plan,
    name: plan.name || "Untitled plan",
    suiteIds: asArray(plan.suiteIds),
    status: plan.status || "draft",
    statusOverride: Boolean(plan.statusOverride),
  };
}

/**
 * Normalize and scope all testing collections to one project.
 * - Suites: `suite.projectId === currentProjectId`; legacy suites without a
 *   projectId stay visible in the current project (same rule as plans).
 * - Plans: explicit projectId, else inferred from their suites, else current project.
 * - Runs/cases: through their suite.
 */
export function buildProjectTestingData({ testSuites = [], testCases = [], testRuns = [], testPlans = [], currentProjectId }) {
  const allSuites = asArray(testSuites).filter(Boolean).map(normalizeTestSuite);
  const suiteProjectById = new Map(allSuites.map((suite) => [suite.id, suite.projectId]));

  const suites = allSuites.filter((suite) => !suite.projectId || suite.projectId === currentProjectId);
  const suiteIds = new Set(suites.map((suite) => suite.id));

  const cases = asArray(testCases).filter((testCase) => testCase && suiteIds.has(testCase.suiteId)).map(normalizeTestCase);
  const runs = asArray(testRuns).filter((run) => run && suiteIds.has(run.suiteId)).map(normalizeTestRun);

  const plans = asArray(testPlans).filter(Boolean).map(normalizeTestPlan).filter((plan) => {
    if (plan.projectId) return plan.projectId === currentProjectId;
    const inferred = plan.suiteIds.map((id) => suiteProjectById.get(id)).find(Boolean);
    return (inferred || currentProjectId) === currentProjectId;
  });

  return { suites, suiteIds, cases, runs, plans };
}
