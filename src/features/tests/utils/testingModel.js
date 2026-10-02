// Read-side normalization for test management records.
//
// Store data comes from several generations of writers (legacy TestsPage,
// legacy facade, current facade, CSV import, samples) with different id
// prefixes and optional fields. Normalizing on read never changes ids and
// guarantees the shape the UI relies on, so existing data always renders:
// - legacy `case.steps: string[]`  → step objects with deterministic ids
// - legacy `case.status` (a result) → lifecycle "ready" + `legacyResult`
// - `linkedTaskId` / `linkedBugTaskId` → `requirementIds` / `defectIds`
// - `regressionPacks` → `tags`
// - run `buildVersion` → `build`, result `notes`/`bugTaskId` → `comment`/`defects`
// - runs without `caseIds` → scope from results, else all cases of their suite
import {
  AUTOMATION_META,
  CASE_STATUS_META,
  CASE_TYPE_LABELS,
  PRIORITY_META,
  RESULT_META,
  TEST_RUN_STATUSES,
} from "../constants/testingConstants";
import { assignDisplaySeqs, formatCaseKey } from "./caseKeys";
import { buildSuiteTree, getDescendantIds } from "./testingTree";
import { toTimestamp } from "./testingFormat";

const asArray = (value) => (Array.isArray(value) ? value : []);
const uniq = (list) => [...new Set(asArray(list).filter((item) => item !== null && item !== undefined && item !== ""))];
const text = (value) => (value === null || value === undefined ? "" : String(value));
const LEGACY_RESULT_STATUSES = ["passed", "failed", "skipped", "blocked"];

export function normalizeTestSuite(suite) {
  return {
    ...suite,
    name: suite.name || "Untitled suite",
    description: suite.description || "",
    projectId: suite.projectId || null,
    parentId: suite.parentId || null,
    order: Number.isFinite(suite.order) ? suite.order : null,
  };
}

export function normalizeStep(step, index, caseId) {
  const fallbackId = `${caseId || "case"}-s${index + 1}`;
  if (step === null || step === undefined) return null;
  if (typeof step === "string" || typeof step === "number") {
    const action = String(step).trim();
    return action ? { id: fallbackId, action, data: "", expected: "" } : null;
  }
  if (step.sharedStepsId) return { id: step.id || fallbackId, sharedStepsId: step.sharedStepsId, action: "", data: "", expected: "" };
  return {
    id: step.id || fallbackId,
    action: text(step.action ?? step.text),
    data: text(step.data),
    expected: text(step.expected ?? step.expectedResult),
  };
}

export function normalizeSteps(steps, caseId) {
  let list = steps;
  if (typeof list === "string") list = list.split(/\n/);
  // Drop blanks before indexing so legacy fallback ids stay stable.
  return asArray(list)
    .filter((step) => step !== null && step !== undefined && !(typeof step === "string" && !step.trim()))
    .map((step, index) => normalizeStep(step, index, caseId))
    .filter(Boolean);
}

export function normalizeTestCase(testCase) {
  const legacyResult = LEGACY_RESULT_STATUSES.includes(testCase.status) ? testCase.status : null;
  const estimate = Number(testCase.estimate);
  return {
    ...testCase,
    title: testCase.title || testCase.name || "Untitled case",
    description: text(testCase.description),
    preconditions: text(testCase.preconditions),
    expectedResult: text(testCase.expectedResult ?? testCase.expected),
    priority: PRIORITY_META[testCase.priority] ? testCase.priority : "medium",
    type: CASE_TYPE_LABELS[testCase.type] ? testCase.type : "functional",
    automation: AUTOMATION_META[testCase.automation] ? testCase.automation : "manual",
    status: CASE_STATUS_META[testCase.status] ? testCase.status : "ready",
    legacyResult,
    owner: testCase.owner || null,
    estimate: Number.isFinite(estimate) && estimate > 0 ? estimate : null,
    tags: uniq([...asArray(testCase.tags), ...asArray(testCase.regressionPacks)].map((tag) => text(tag).trim())),
    steps: normalizeSteps(testCase.steps, testCase.id),
    requirementIds: uniq([...asArray(testCase.requirementIds), testCase.linkedTaskId]),
    defectIds: uniq([...asArray(testCase.defectIds), testCase.linkedBugTaskId]),
    history: asArray(testCase.history),
    comments: asArray(testCase.comments),
    order: Number.isFinite(testCase.order) ? testCase.order : null,
    seq: Number.isFinite(testCase.seq) ? testCase.seq : null,
  };
}

export function normalizeResult(result) {
  const duration = Number(result.durationSec);
  return {
    ...result,
    caseId: result.caseId,
    status: RESULT_META[result.status] ? result.status : "untested",
    stepResults: asArray(result.stepResults).filter((step) => step && step.stepId),
    actualResult: text(result.actualResult),
    comment: text(result.comment ?? result.notes),
    defects: uniq([...asArray(result.defects), result.bugTaskId]),
    evidence: uniq(asArray(result.evidence)),
    executedBy: result.executedBy || null,
    executedAt: result.executedAt || null,
    durationSec: Number.isFinite(duration) ? duration : null,
    attempts: asArray(result.attempts).filter((attempt) => attempt && attempt.status),
  };
}

export function normalizeTestRun(run) {
  // Last row wins for duplicated legacy results.
  const byCase = new Map();
  asArray(run.results).forEach((result) => {
    if (result && result.caseId) byCase.set(result.caseId, normalizeResult(result));
  });
  const results = [...byCase.values()];
  const caseIds = uniq(asArray(run.caseIds).length ? run.caseIds : results.map((result) => result.caseId));
  return {
    ...run,
    name: run.name || `Run ${String(run.id || "").slice(-6)}`,
    status: TEST_RUN_STATUSES.includes(run.status) ? run.status : "in-progress",
    caseIds,
    assignments: run.assignments && typeof run.assignments === "object" ? run.assignments : {},
    results,
    build: text(run.build || run.buildVersion),
    environment: run.environment || "",
    platform: run.platform || "",
    assignedTester: run.assignedTester || null,
    planId: run.planId || null,
    releaseId: run.releaseId || null,
    dueDate: run.dueDate || null,
    createdAt: run.createdAt || run.updatedAt || null,
  };
}

export function normalizeTestPlan(plan) {
  return {
    ...plan,
    name: plan.name || "Untitled plan",
    description: text(plan.description || plan.notes),
    suiteIds: asArray(plan.suiteIds),
    status: plan.status || "draft",
    statusOverride: Boolean(plan.statusOverride),
    releaseId: plan.releaseId || null,
    milestone: text(plan.milestone),
    startDate: plan.startDate || null,
    endDate: plan.endDate || plan.dueDate || null,
    owner: plan.owner || plan.assignedTester || null,
  };
}

export function normalizeSharedSteps(group) {
  return {
    ...group,
    name: group.name || "Untitled step group",
    description: text(group.description),
    steps: normalizeSteps(asArray(group.steps).filter((step) => !step?.sharedStepsId), group.id),
  };
}

/**
 * Normalizes and scopes all testing collections to one project and builds
 * the lookup indexes the UI needs.
 * - Suites: `projectId === currentProjectId`; legacy suites without one stay visible.
 *   Folders inherit visibility from their root suite.
 * - Cases: through their suite.
 * - Runs: explicit `projectId`, else through their suite or plan.
 * - Plans: explicit projectId, else inferred from suites, else current project.
 */
export function buildProjectTestingData({
  testSuites = [], testCases = [], testRuns = [], testPlans = [], testSharedSteps = [], currentProjectId,
}) {
  const allSuites = asArray(testSuites).filter((suite) => suite && suite.id).map(normalizeTestSuite);
  const allById = new Map(allSuites.map((suite) => [suite.id, suite]));
  const rootProject = (suite) => {
    const seen = new Set();
    let current = suite;
    while (current && !seen.has(current.id)) {
      if (current.projectId) return current.projectId;
      seen.add(current.id);
      current = current.parentId ? allById.get(current.parentId) : null;
    }
    return null;
  };
  const suites = allSuites.filter((suite) => {
    const pid = suite.projectId || rootProject(suite);
    return !pid || pid === currentProjectId;
  });
  const suiteIds = new Set(suites.map((suite) => suite.id));
  const tree = buildSuiteTree(suites);
  const suiteById = tree.byId;

  const cases = asArray(testCases)
    .filter((testCase) => testCase && testCase.id && suiteIds.has(testCase.suiteId))
    .map(normalizeTestCase);
  const seqById = assignDisplaySeqs(cases);
  cases.forEach((testCase) => {
    testCase.displaySeq = seqById.get(testCase.id);
    testCase.key = formatCaseKey(testCase.displaySeq);
  });
  const caseById = new Map(cases.map((testCase) => [testCase.id, testCase]));

  const plans = asArray(testPlans).filter((plan) => plan && plan.id).map(normalizeTestPlan).filter((plan) => {
    if (plan.projectId) return plan.projectId === currentProjectId;
    const inferred = plan.suiteIds.map((id) => allById.get(id)?.projectId).find(Boolean);
    return (inferred || currentProjectId) === currentProjectId;
  });
  const planIds = new Set(plans.map((plan) => plan.id));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const casesBySuite = new Map();
  cases.forEach((testCase) => {
    const list = casesBySuite.get(testCase.suiteId) || [];
    list.push(testCase);
    casesBySuite.set(testCase.suiteId, list);
  });

  const runs = asArray(testRuns)
    .filter((run) => {
      if (!run || !run.id) return false;
      if (run.projectId) return run.projectId === currentProjectId;
      if (run.suiteId) return suiteIds.has(run.suiteId);
      if (run.planId) return planIds.has(run.planId);
      return false;
    })
    .map(normalizeTestRun)
    .map((run) => {
      if (run.caseIds.length || !run.suiteId) return run;
      const scope = [];
      getDescendantIds(run.suiteId, tree.childrenById).forEach((id) => (casesBySuite.get(id) || []).forEach((testCase) => scope.push(testCase.id)));
      return { ...run, caseIds: scope };
    })
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
  const runById = new Map(runs.map((run) => [run.id, run]));

  const sharedSteps = asArray(testSharedSteps)
    .filter((group) => group && group.id && (!group.projectId || group.projectId === currentProjectId))
    .map(normalizeSharedSteps)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sharedById = new Map(sharedSteps.map((group) => [group.id, group]));

  return {
    suites,
    suiteIds,
    suiteById,
    tree,
    cases,
    caseById,
    casesBySuite,
    runs,
    runById,
    plans,
    planById,
    sharedSteps,
    sharedById,
  };
}
