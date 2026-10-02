// Pure record builders for the test management domain (`appData/testing`).
//
// Storage budget: the whole `testing` domain is ONE Firestore document
// (1 MiB limit). Records written here are therefore compact:
// - empty optional fields are omitted (normalization on read restores them),
// - executions never copy case text (only ids + verdicts + what the tester typed),
// - per-execution attempt history is capped at EXECUTION_ATTEMPT_LIMIT,
// - per-case change history at CASE_HISTORY_LIMIT and comments at CASE_COMMENT_LIMIT,
// - cycles do not pre-seed "untested" rows: untested = scoped caseIds without a result.
//
// Ids are opaque strings `<prefix>-<timestamp>-<suffix>`; older formats
// (`plan-/suite-/case-/run-…`) keep working everywhere.

export const TEST_ID_PREFIX = {
  plan: "tp",
  suite: "ts",
  case: "tc",
  run: "tr",
  sharedSteps: "tss",
};

export const TEST_CASE_PRIORITIES = ["critical", "high", "medium", "low"];
export const TEST_RESULT_STATUSES = ["untested", "passed", "failed", "blocked", "skipped", "retest"];
export const TEST_STEP_STATUSES = ["untested", "passed", "failed", "blocked", "skipped", "na"];
export const TEST_RUN_STATUSES = ["in-progress", "completed", "aborted"];
export const TEST_CASE_LIFECYCLE = ["draft", "ready", "needs-update", "deprecated"];
export const TEST_CASE_TYPES = [
  "functional", "regression", "smoke", "sanity", "e2e", "integration",
  "api", "performance", "security", "usability", "accessibility",
];
export const TEST_AUTOMATION_STATES = ["manual", "automated", "to-be-automated"];

export const EXECUTION_ATTEMPT_LIMIT = 10;
export const CASE_HISTORY_LIMIT = 30;
export const CASE_COMMENT_LIMIT = 200;

/** Fields whose changes are written to a case's version history. */
export const TRACKED_CASE_FIELDS = [
  "title", "description", "preconditions", "priority", "type", "automation", "status",
  "owner", "estimate", "tags", "steps", "expectedResult", "requirementIds", "defectIds", "suiteId",
];
const SCALAR_HISTORY_FIELDS = new Set(["priority", "type", "automation", "status", "owner", "estimate", "suiteId", "title"]);

let idSequence = 0;

export function generateTestingId(prefix) {
  idSequence = (idSequence + 1) % 1296;
  const suffix = `${idSequence.toString(36).padStart(2, "0")}${Math.random().toString(36).slice(2, 5)}`;
  return `${prefix}-${Date.now()}-${suffix}`;
}

/** Short id for nested records (steps, comments, history entries). */
export function generateShortId(prefix = "s") {
  idSequence = (idSequence + 1) % 1296;
  return `${prefix}${Date.now().toString(36)}${idSequence.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const uniq = (list) => [...new Set(asArray(list).filter((item) => item !== null && item !== undefined && item !== ""))];
const trimText = (value) => (typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim());

/** Removes `undefined`, empty strings and empty arrays (keeps 0/false/null). */
export function compactRecord(record) {
  const out = {};
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    out[key] = value;
  });
  return out;
}

/**
 * Steps accepted as strings (legacy), `{text}` or `{action,data,expected,sharedStepsId}`.
 * Returns compact step objects with stable ids.
 */
export function normalizeStepsForWrite(steps) {
  let list = steps;
  if (typeof list === "string") list = list.split(/\n/);
  return asArray(list)
    .map((step) => {
      if (step === null || step === undefined) return null;
      if (typeof step === "string" || typeof step === "number") {
        const action = String(step).trim();
        return action ? { id: generateShortId("s"), action } : null;
      }
      if (step.sharedStepsId) {
        return { id: step.id || generateShortId("s"), sharedStepsId: step.sharedStepsId };
      }
      const action = trimText(step.action ?? step.text ?? "");
      const data = trimText(step.data ?? "");
      const expected = trimText(step.expected ?? step.expectedResult ?? "");
      if (!action && !data && !expected) return null;
      return compactRecord({ id: step.id || generateShortId("s"), action, data, expected });
    })
    .filter(Boolean);
}

/** Project of a case: explicit, else through its suite. */
export function caseProjectId(testCase, suiteById) {
  return testCase?.projectId || suiteById.get(testCase?.suiteId)?.projectId || null;
}

/** Next project-scoped case sequence number (`TC-<seq>`). */
export function nextCaseSeq(testCases = [], testSuites = [], projectId = null) {
  const suiteById = new Map(asArray(testSuites).map((suite) => [suite.id, suite]));
  let max = 0;
  asArray(testCases).forEach((testCase) => {
    if (!testCase || !Number.isFinite(testCase.seq)) return;
    const pid = caseProjectId(testCase, suiteById);
    if (projectId && pid && pid !== projectId) return;
    if (testCase.seq > max) max = testCase.seq;
  });
  // Legacy cases without a sequence still occupy display numbers.
  const legacyCount = asArray(testCases).filter((testCase) => {
    if (!testCase || Number.isFinite(testCase.seq)) return false;
    const pid = caseProjectId(testCase, suiteById);
    return !projectId || !pid || pid === projectId;
  }).length;
  return max + legacyCount + 1;
}

export function buildTestPlanRecord(data = {}, currentUser = null, now = new Date().toISOString(), projectId = null) {
  return {
    ...data,
    id: data.id || generateTestingId(TEST_ID_PREFIX.plan),
    projectId: data.projectId || projectId || null,
    name: trimText(data.name) || "Untitled plan",
    suiteIds: Array.isArray(data.suiteIds) ? uniq(data.suiteIds) : [],
    status: data.status || "draft",
    statusOverride: Boolean(data.statusOverride),
    owner: data.owner || currentUser || null,
    assignedTester: data.assignedTester || data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function buildTestSuiteRecord(data = {}, currentUser = null, now = new Date().toISOString(), projectId = null) {
  return {
    ...data,
    id: data.id || generateTestingId(TEST_ID_PREFIX.suite),
    projectId: data.projectId || projectId || null,
    parentId: data.parentId || null,
    name: trimText(data.name) || "Untitled suite",
    description: data.description || "",
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function buildTestCaseRecord(data = {}, currentUser = null, now = new Date().toISOString(), extras = {}) {
  const {
    linkedTaskId, linkedBugTaskId, regressionPacks, ...rest
  } = data;
  const requirementIds = uniq([...asArray(data.requirementIds), linkedTaskId]);
  const defectIds = uniq([...asArray(data.defectIds), linkedBugTaskId]);
  const tags = uniq([...asArray(data.tags), ...asArray(regressionPacks)].map((tag) => trimText(tag)));
  const estimate = Number(data.estimate);
  return compactRecord({
    ...rest,
    id: data.id || generateTestingId(TEST_ID_PREFIX.case),
    projectId: data.projectId || extras.projectId || null,
    suiteId: data.suiteId || null,
    seq: Number.isFinite(data.seq) ? data.seq : extras.seq,
    title: trimText(data.title) || "Untitled case",
    priority: TEST_CASE_PRIORITIES.includes(data.priority) ? data.priority : "medium",
    type: TEST_CASE_TYPES.includes(data.type) ? data.type : "functional",
    automation: TEST_AUTOMATION_STATES.includes(data.automation) ? data.automation : "manual",
    status: TEST_CASE_LIFECYCLE.includes(data.status) ? data.status : "draft",
    estimate: Number.isFinite(estimate) && estimate > 0 ? Math.round(estimate) : undefined,
    steps: normalizeStepsForWrite(data.steps),
    tags,
    requirementIds,
    defectIds,
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  });
}

export function buildTestRunRecord(data = {}, currentUser = null, now = new Date().toISOString(), projectId = null) {
  const caseIds = uniq(data.caseIds);
  return {
    ...data,
    id: data.id || generateTestingId(TEST_ID_PREFIX.run),
    projectId: data.projectId || projectId || null,
    suiteId: data.suiteId || null,
    status: TEST_RUN_STATUSES.includes(data.status) ? data.status : "in-progress",
    caseIds,
    assignments: data.assignments && typeof data.assignments === "object" ? data.assignments : {},
    results: Array.isArray(data.results) ? data.results : [],
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
    completedAt: data.completedAt || null,
  };
}

export function buildSharedStepsRecord(data = {}, currentUser = null, now = new Date().toISOString(), projectId = null) {
  return {
    ...data,
    id: data.id || generateTestingId(TEST_ID_PREFIX.sharedSteps),
    projectId: data.projectId || projectId || null,
    name: trimText(data.name) || "Untitled step group",
    description: trimText(data.description),
    // Shared groups cannot nest other shared groups.
    steps: normalizeStepsForWrite(asArray(data.steps).filter((step) => !step?.sharedStepsId)),
    owner: data.owner || currentUser || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

// ─── Case history ───────────────────────────────────────────────────────────

const comparable = (value) => JSON.stringify(value === undefined ? null : value);

function shortValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** Tracked fields that differ between `prev` and `patch` (only keys present in `patch`). */
export function diffCaseFields(prev = {}, patch = {}) {
  return TRACKED_CASE_FIELDS.filter((field) => (
    Object.prototype.hasOwnProperty.call(patch, field) && comparable(prev[field] ?? (Array.isArray(patch[field]) ? [] : null)) !== comparable(patch[field])
  ));
}

export function buildHistoryEntry(prev, patch, fields, { by = null, at = new Date().toISOString(), action = "updated" } = {}) {
  const changes = {};
  fields.forEach((field) => {
    if (!SCALAR_HISTORY_FIELDS.has(field)) return;
    changes[field] = { from: shortValue(prev?.[field]), to: shortValue(patch?.[field]) };
  });
  return compactRecord({
    id: generateShortId("h"),
    at,
    by: by || null,
    action,
    fields,
    changes: Object.keys(changes).length ? changes : undefined,
  });
}

export function appendCaseHistory(history, entry) {
  return [...asArray(history), entry].slice(-CASE_HISTORY_LIMIT);
}

/** Applies a patch to a case and records a history entry when tracked fields change. */
export function applyCasePatch(testCase, patch, { by = null, now = new Date().toISOString(), track = true } = {}) {
  const next = { ...testCase, ...patch, id: testCase.id, updatedAt: now };
  // Legacy single-link fields are folded into the list fields on first edit.
  if (Object.prototype.hasOwnProperty.call(patch, "requirementIds")) next.linkedTaskId = null;
  if (Object.prototype.hasOwnProperty.call(patch, "defectIds")) next.linkedBugTaskId = null;
  if (Object.prototype.hasOwnProperty.call(patch, "tags")) next.regressionPacks = [];
  if (Object.prototype.hasOwnProperty.call(patch, "steps")) next.steps = normalizeStepsForWrite(patch.steps);
  if (!track) return next;
  const fields = diffCaseFields(testCase, next);
  if (!fields.length) return next;
  next.history = appendCaseHistory(testCase.history, buildHistoryEntry(testCase, next, fields, { by, at: now }));
  return next;
}

// ─── Executions ─────────────────────────────────────────────────────────────

function compactStepResults(stepResults) {
  return asArray(stepResults)
    .filter((step) => step && step.stepId && ((step.status && step.status !== "untested") || trimText(step.actual)))
    .map((step) => compactRecord({
      stepId: step.stepId,
      status: TEST_STEP_STATUSES.includes(step.status) && step.status !== "untested" ? step.status : undefined,
      actual: trimText(step.actual),
    }));
}

function attemptOf(result) {
  return compactRecord({
    status: result.status,
    executedBy: result.executedBy || null,
    executedAt: result.executedAt || null,
    durationSec: Number.isFinite(result.durationSec) ? result.durationSec : undefined,
  });
}

/**
 * Builds the stored execution for one case in a cycle. A previous executed
 * verdict is pushed to `attempts` (newest last, capped) so re-executions and
 * retests keep a compact audit trail without duplicating step detail.
 */
export function buildExecutionResult(existing, input = {}, { by = null, now = new Date().toISOString() } = {}) {
  const status = TEST_RESULT_STATUSES.includes(input.status) ? input.status : "untested";
  const previous = existing || null;
  let attempts = asArray(previous?.attempts);
  const previousExecuted = previous && previous.status && previous.status !== "untested" && previous.executedAt;
  // A previous verdict (also when resetting to untested) becomes an attempt,
  // unless it is the same tester amending the same verdict within 10 minutes.
  const amending = previousExecuted
    && previous.status === status
    && (previous.executedBy || null) === (by || null)
    && Math.abs(Date.parse(now) - Date.parse(previous.executedAt)) < 10 * 60 * 1000;
  if (previousExecuted && !amending) attempts = [...attempts, attemptOf(previous)].slice(-EXECUTION_ATTEMPT_LIMIT);
  const duration = Number(input.durationSec);
  return compactRecord({
    caseId: input.caseId || previous?.caseId,
    status,
    stepResults: status === "untested" ? [] : compactStepResults(input.stepResults ?? previous?.stepResults),
    actualResult: status === "untested" ? "" : trimText(input.actualResult ?? previous?.actualResult ?? ""),
    comment: status === "untested" ? "" : trimText(input.comment ?? previous?.comment ?? previous?.notes ?? ""),
    defects: uniq([...asArray(previous?.defects), previous?.bugTaskId, ...asArray(input.defects)]),
    evidence: uniq(asArray(input.evidence ?? previous?.evidence).map(trimText)),
    executedBy: status === "untested" ? undefined : by || null,
    executedAt: status === "untested" ? undefined : now,
    durationSec: status !== "untested" && Number.isFinite(duration) && duration > 0 ? Math.round(duration) : undefined,
    attempts,
  });
}

/** Upserts one execution inside a run's results array (dedupes legacy duplicates). */
export function upsertRunResult(run, caseId, nextResult) {
  const results = asArray(run.results).filter((item) => item && item.caseId !== caseId);
  return [...results, nextResult];
}

export function findRunResult(run, caseId) {
  let found = null;
  asArray(run?.results).forEach((item) => {
    if (item?.caseId === caseId) found = item;
  });
  return found;
}

/** Stable order for siblings: explicit `order`, then name/title, then id. */
export function siblingSort(a, b) {
  const ao = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  const an = String(a.name || a.title || "");
  const bn = String(b.name || b.title || "");
  const byName = an.localeCompare(bn);
  if (byName) return byName;
  return String(a.id).localeCompare(String(b.id));
}

/** Ids of `rootId` and every descendant suite/folder (cycle-safe). */
export function collectSuiteDescendants(testSuites = [], rootId) {
  const childrenByParent = new Map();
  asArray(testSuites).forEach((suite) => {
    if (!suite?.parentId) return;
    const list = childrenByParent.get(suite.parentId) || [];
    list.push(suite.id);
    childrenByParent.set(suite.parentId, list);
  });
  const seen = new Set();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    (childrenByParent.get(id) || []).forEach((childId) => queue.push(childId));
  }
  return seen;
}
