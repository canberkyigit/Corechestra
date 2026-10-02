import { useCallback } from "react";
import { createDeploymentTimelineEvent, hydrateReleaseDefaults } from "../../../utils/releasePlanning";
import { useAppStore } from "../../../store/useAppStore";
import {
  CASE_COMMENT_LIMIT,
  applyCasePatch,
  buildExecutionResult,
  buildSharedStepsRecord,
  buildTestCaseRecord,
  buildTestPlanRecord,
  buildTestRunRecord,
  buildTestSuiteRecord,
  collectSuiteDescendants,
  findRunResult,
  generateShortId,
  nextCaseSeq,
  normalizeStepsForWrite,
  siblingSort,
  upsertRunResult,
} from "./testingRecords";

// ─── Test management model ──────────────────────────────────────────────────
// Record builders, constants and the storage-budget rules live in
// `./testingRecords` (pure, unit tested). They are re-exported here for
// existing importers.
export {
  TEST_ID_PREFIX,
  TEST_CASE_PRIORITIES,
  TEST_RESULT_STATUSES,
  TEST_RUN_STATUSES,
  TEST_STEP_STATUSES,
  TEST_CASE_LIFECYCLE,
  TEST_CASE_TYPES,
  TEST_AUTOMATION_STATES,
  EXECUTION_ATTEMPT_LIMIT,
  CASE_HISTORY_LIMIT,
  CASE_COMMENT_LIMIT,
  generateTestingId,
  buildTestPlanRecord,
  buildTestSuiteRecord,
  buildTestCaseRecord,
  buildTestRunRecord,
  buildSharedStepsRecord,
  buildExecutionResult,
} from "./testingRecords";

const nowIso = () => new Date().toISOString();

function currentStoreProjectId() {
  try {
    return useAppStore.getState().currentProjectId || null;
  } catch {
    return null;
  }
}

/** Open cycles drop removed cases from scope (executed history of closed cycles stays). */
function stripCasesFromOpenRun(run, removedCaseIds, now) {
  if (!removedCaseIds.size || run.status === "completed" || run.status === "aborted") return run;
  const touches = (run.caseIds || []).some((id) => removedCaseIds.has(id))
    || (run.results || []).some((result) => removedCaseIds.has(result.caseId));
  if (!touches) return run;
  return {
    ...run,
    caseIds: (run.caseIds || []).filter((id) => !removedCaseIds.has(id)),
    results: (run.results || []).filter((result) => !removedCaseIds.has(result.caseId)),
    updatedAt: now,
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
  setTestSharedSteps,
}) {
  const createRelease = useCallback((data) => {
    const selectedTemplate = (templateRegistry?.release || []).find((template) => template.id === data.templateId) || null;
    const newRelease = hydrateReleaseDefaults({
      ...data,
      id: `rel-${Date.now()}`,
      taskIds: data.taskIds || [],
      changelog: data.changelog || [],
    }, selectedTemplate, currentUser);
    setReleases((prev) => [...(prev || []), newRelease]);
    return newRelease;
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
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  const updateChangelogEntry = useCallback((releaseId, entryId, patch = {}) => {
    setReleases((prev) => (prev || []).map((release) => (
      release.id === releaseId
        ? {
            ...release,
            updatedAt: new Date().toISOString(),
            changelog: (release.changelog || []).map((entry) => (
              entry.id === entryId ? { ...entry, ...patch, id: entry.id, updatedAt: new Date().toISOString() } : entry
            )),
          }
        : release
    )));
  }, [setReleases]);

  /**
   * Adds (or replaces by id) a batch of fully-formed release records in ONE
   * store update — used by sample seeding and imports.
   */
  const importReleases = useCallback((list = []) => {
    const records = (Array.isArray(list) ? list : []).filter((release) => release && release.id);
    if (records.length === 0) return [];
    const ids = new Set(records.map((release) => release.id));
    setReleases((prev) => [...(prev || []).filter((release) => !ids.has(release.id)), ...records]);
    return records;
  }, [setReleases]);

  /** Removes `sample: true` releases (optionally only for one project). */
  const removeSampleReleases = useCallback((projectId = null) => {
    setReleases((prev) => (prev || []).filter((release) => !(
      release?.sample && (!projectId || release.projectId === projectId)
    )));
  }, [setReleases]);

  /** Moves task ids from one release to another in a single update. */
  const moveReleaseTasks = useCallback((fromId, toId, taskIds = []) => {
    const moving = new Set((taskIds || []).map(String));
    if (!fromId || !toId || fromId === toId || moving.size === 0) return;
    const now = new Date().toISOString();
    setReleases((prev) => {
      const list = prev || [];
      const target = list.find((release) => release.id === toId);
      const source = list.find((release) => release.id === fromId);
      if (!target || !source) return list;
      const count = moving.size;
      return list.map((release) => {
        if (release.id === fromId) {
          return {
            ...release,
            taskIds: (release.taskIds || []).filter((id) => !moving.has(String(id))),
            deploymentTimeline: [
              createDeploymentTimelineEvent("scope", `Moved ${count} unfinished item${count !== 1 ? "s" : ""} to ${target.version || "another release"}`, currentUser),
              ...(release.deploymentTimeline || []),
            ],
            updatedAt: now,
          };
        }
        if (release.id === toId) {
          const existing = new Set((release.taskIds || []).map(String));
          const added = (taskIds || []).filter((id) => !existing.has(String(id)));
          return {
            ...release,
            taskIds: [...(release.taskIds || []), ...added],
            deploymentTimeline: [
              createDeploymentTimelineEvent("scope", `Received ${count} item${count !== 1 ? "s" : ""} from ${source.version || "another release"}`, currentUser),
              ...(release.deploymentTimeline || []),
            ],
            updatedAt: now,
          };
        }
        return release;
      });
    });
  }, [currentUser, setReleases]);

  // ── Shared helpers ──────────────────────────────────────────────────────
  // Multi-collection operations write ONE store update (atomic + one save per
  // domain) via useAppStore.setState; single-collection ones use the setters.
  const writeTesting = useCallback((updater) => {
    useAppStore.setState((state) => updater({
      testPlans: state.testPlans || [],
      testSuites: state.testSuites || [],
      testCases: state.testCases || [],
      testRuns: state.testRuns || [],
      testSharedSteps: state.testSharedSteps || [],
    }) || {});
  }, []);


  // ── Test plans ──────────────────────────────────────────────────────────
  const createTestPlan = useCallback((data = {}) => {
    const record = buildTestPlanRecord(data, currentUser, nowIso(), currentStoreProjectId());
    setTestPlans((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestPlans]);

  const updateTestPlan = useCallback((updated) => {
    if (!updated?.id) return;
    setTestPlans((prev) => (prev || []).map((plan) => (
      plan.id === updated.id
        ? { ...plan, ...updated, updatedAt: nowIso() }
        : plan
    )));
  }, [setTestPlans]);

  const deleteTestPlan = useCallback((id) => {
    writeTesting(({ testPlans, testRuns }) => ({
      testPlans: testPlans.filter((plan) => plan.id !== id),
      // Keep run history, but detach runs from the removed plan.
      testRuns: testRuns.some((run) => run.planId === id)
        ? testRuns.map((run) => (run.planId === id ? { ...run, planId: null } : run))
        : testRuns,
    }));
  }, [writeTesting]);

  // ── Test suites & folders ───────────────────────────────────────────────
  // A suite with `parentId` is a folder/section inside another suite.
  const createTestSuite = useCallback((data = {}) => {
    const { testSuites } = useAppStore.getState();
    const siblings = (testSuites || []).filter((suite) => (suite.parentId || null) === (data.parentId || null));
    const maxOrder = siblings.reduce((max, suite) => (Number.isFinite(suite.order) ? Math.max(max, suite.order) : max), -1);
    const parent = data.parentId ? (testSuites || []).find((suite) => suite.id === data.parentId) : null;
    const record = buildTestSuiteRecord({
      order: maxOrder + 1,
      ...data,
      projectId: data.projectId || parent?.projectId || undefined,
    }, currentUser, nowIso(), currentStoreProjectId());
    setTestSuites((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestSuites]);

  const updateTestSuite = useCallback((updated) => {
    if (!updated?.id) return;
    setTestSuites((prev) => (prev || []).map((suite) => (
      suite.id === updated.id
        ? { ...suite, ...updated, updatedAt: nowIso() }
        : suite
    )));
  }, [setTestSuites]);

  /** Moves a suite/folder under `parentId` (null = root) at sibling `index`. Cycle-safe. */
  const moveTestSuite = useCallback((id, parentId = null, index = null) => {
    let moved = false;
    writeTesting(({ testSuites }) => {
      const node = testSuites.find((suite) => suite.id === id);
      if (!node) return null;
      const target = parentId || null;
      if (target && collectSuiteDescendants(testSuites, id).has(target)) return null;
      const siblings = testSuites
        .filter((suite) => suite.id !== id && (suite.parentId || null) === target)
        .sort(siblingSort);
      const at = index === null || index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length));
      siblings.splice(at, 0, node);
      const orderById = new Map(siblings.map((suite, i) => [suite.id, i]));
      const now = nowIso();
      const parent = target ? testSuites.find((suite) => suite.id === target) : null;
      moved = true;
      return {
        testSuites: testSuites.map((suite) => {
          if (!orderById.has(suite.id)) return suite;
          const next = { ...suite, order: orderById.get(suite.id) };
          if (suite.id === id) {
            next.parentId = target;
            next.updatedAt = now;
            if (parent?.projectId) next.projectId = parent.projectId;
          }
          return next;
        }),
      };
    });
    return moved;
  }, [writeTesting]);

  /**
   * Deletes a suite/folder with all nested folders and their cases in one
   * update. Legacy suite-bound runs of the removed suites are deleted (as
   * before); open cycles drop the removed cases; closed cycles keep history.
   */
  const deleteTestSuite = useCallback((id) => {
    writeTesting(({ testSuites, testCases, testRuns, testPlans }) => {
      const removedSuites = collectSuiteDescendants(testSuites, id);
      const removedCases = new Set(testCases.filter((testCase) => removedSuites.has(testCase.suiteId)).map((testCase) => testCase.id));
      const now = nowIso();
      return {
        testSuites: testSuites.filter((suite) => !removedSuites.has(suite.id)),
        testCases: testCases.filter((testCase) => !removedCases.has(testCase.id)),
        testRuns: testRuns
          .filter((run) => !(run.suiteId && removedSuites.has(run.suiteId)))
          .map((run) => stripCasesFromOpenRun(run, removedCases, now)),
        testPlans: testPlans.some((plan) => (plan.suiteIds || []).some((suiteId) => removedSuites.has(suiteId)))
          ? testPlans.map((plan) => (
            (plan.suiteIds || []).some((suiteId) => removedSuites.has(suiteId))
              ? { ...plan, suiteIds: plan.suiteIds.filter((suiteId) => !removedSuites.has(suiteId)), updatedAt: now }
              : plan
          ))
          : testPlans,
      };
    });
  }, [writeTesting]);

  // ── Test cases ──────────────────────────────────────────────────────────
  const createTestCase = useCallback((data = {}) => {
    const { testCases, testSuites } = useAppStore.getState();
    const suite = (testSuites || []).find((item) => item.id === data.suiteId);
    const projectId = data.projectId || suite?.projectId || currentStoreProjectId();
    const siblings = (testCases || []).filter((testCase) => testCase.suiteId === data.suiteId);
    const maxOrder = siblings.reduce((max, testCase) => (Number.isFinite(testCase.order) ? Math.max(max, testCase.order) : max), -1);
    const record = buildTestCaseRecord({ order: maxOrder + 1, ...data }, currentUser, nowIso(), {
      projectId,
      seq: nextCaseSeq(testCases, testSuites, projectId),
    });
    setTestCases((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestCases]);

  /** Partial update; tracked field changes are appended to the case history. */
  const updateTestCase = useCallback((updated, { track = true } = {}) => {
    if (!updated?.id) return;
    const now = nowIso();
    setTestCases((prev) => (prev || []).map((testCase) => (
      testCase.id === updated.id ? applyCasePatch(testCase, updated, { by: currentUser, now, track }) : testCase
    )));
  }, [currentUser, setTestCases]);

  /** Same patch for many cases in one update (bulk edit). */
  const bulkUpdateTestCases = useCallback((ids = [], patch = {}) => {
    const targets = new Set(ids || []);
    if (!targets.size) return;
    const now = nowIso();
    setTestCases((prev) => (prev || []).map((testCase) => (
      targets.has(testCase.id) ? applyCasePatch(testCase, patch, { by: currentUser, now }) : testCase
    )));
  }, [currentUser, setTestCases]);

  /** Moves cases into `suiteId` before `beforeId` (null = end), renumbering the target folder. */
  const moveTestCases = useCallback((ids = [], suiteId, beforeId = null) => {
    const moving = (ids || []).filter(Boolean);
    if (!moving.length || !suiteId) return;
    const movingSet = new Set(moving);
    writeTesting(({ testCases, testSuites }) => {
      const suite = testSuites.find((item) => item.id === suiteId);
      if (!suite) return null;
      const now = nowIso();
      const movingCases = moving.map((id) => testCases.find((testCase) => testCase.id === id)).filter(Boolean);
      const rest = testCases.filter((testCase) => testCase.suiteId === suiteId && !movingSet.has(testCase.id)).sort(siblingSort);
      const at = beforeId ? rest.findIndex((testCase) => testCase.id === beforeId) : -1;
      rest.splice(at === -1 ? rest.length : at, 0, ...movingCases);
      const orderById = new Map(rest.map((testCase, index) => [testCase.id, index]));
      return {
        testCases: testCases.map((testCase) => {
          if (!orderById.has(testCase.id)) return testCase;
          if (movingSet.has(testCase.id) && testCase.suiteId !== suiteId) {
            return {
              ...applyCasePatch(testCase, { suiteId }, { by: currentUser, now }),
              order: orderById.get(testCase.id),
              projectId: suite.projectId || testCase.projectId || null,
            };
          }
          return testCase.order === orderById.get(testCase.id) ? testCase : { ...testCase, order: orderById.get(testCase.id) };
        }),
      };
    });
  }, [currentUser, writeTesting]);

  /** Clones cases (new ids + sequence numbers, no history/comments). Returns the clones. */
  const cloneTestCases = useCallback((ids = [], { suiteId = null, titleSuffix = " (copy)" } = {}) => {
    const created = [];
    writeTesting(({ testCases, testSuites }) => {
      const now = nowIso();
      const sources = (ids || []).map((id) => testCases.find((testCase) => testCase.id === id)).filter(Boolean);
      if (!sources.length) return null;
      const projectId = sources[0].projectId || testSuites.find((suite) => suite.id === sources[0].suiteId)?.projectId || currentStoreProjectId();
      let seq = nextCaseSeq(testCases, testSuites, projectId);
      sources.forEach((source) => {
        const {
          id, seq: oldSeq, history, comments, createdAt, updatedAt, sample, ...copy
        } = source;
        created.push(buildTestCaseRecord({
          ...copy,
          suiteId: suiteId || source.suiteId,
          title: `${source.title || "Untitled case"}${titleSuffix}`,
          steps: (source.steps || []).map((step) => (typeof step === "string" ? step : { ...step, id: undefined })),
          defectIds: [],
          status: source.status === "deprecated" ? "draft" : source.status,
        }, currentUser, now, { projectId, seq }));
        seq += 1;
      });
      return { testCases: [...testCases, ...created] };
    });
    return created;
  }, [currentUser, writeTesting]);

  /** Deletes cases; open cycles drop them from scope, closed cycles keep history. */
  const deleteTestCases = useCallback((ids = []) => {
    const removed = new Set(ids || []);
    if (!removed.size) return;
    writeTesting(({ testCases, testRuns }) => {
      const now = nowIso();
      return {
        testCases: testCases.filter((testCase) => !removed.has(testCase.id)),
        testRuns: testRuns.map((run) => stripCasesFromOpenRun(run, removed, now)),
      };
    });
  }, [writeTesting]);

  const deleteTestCase = useCallback((id) => {
    deleteTestCases([id]);
  }, [deleteTestCases]);

  const addTestCaseComment = useCallback((caseId, text) => {
    const body = String(text || "").trim();
    if (!caseId || !body) return null;
    const comment = { id: generateShortId("c"), author: currentUser || null, text: body, createdAt: nowIso() };
    setTestCases((prev) => (prev || []).map((testCase) => (
      testCase.id === caseId
        ? { ...testCase, comments: [...(testCase.comments || []), comment].slice(-CASE_COMMENT_LIMIT) }
        : testCase
    )));
    return comment;
  }, [currentUser, setTestCases]);

  const deleteTestCaseComment = useCallback((caseId, commentId) => {
    setTestCases((prev) => (prev || []).map((testCase) => (
      testCase.id === caseId
        ? { ...testCase, comments: (testCase.comments || []).filter((comment) => comment.id !== commentId) }
        : testCase
    )));
  }, [setTestCases]);

  // ── Shared steps ────────────────────────────────────────────────────────
  const createSharedSteps = useCallback((data = {}) => {
    const record = buildSharedStepsRecord(data, currentUser, nowIso(), currentStoreProjectId());
    setTestSharedSteps((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestSharedSteps]);

  const updateSharedSteps = useCallback((updated) => {
    if (!updated?.id) return;
    setTestSharedSteps((prev) => (prev || []).map((group) => {
      if (group.id !== updated.id) return group;
      const next = { ...group, ...updated, updatedAt: nowIso() };
      if (updated.steps) next.steps = normalizeStepsForWrite(updated.steps.filter((step) => !step?.sharedStepsId));
      return next;
    }));
  }, [setTestSharedSteps]);

  /** Deletes a shared group; cases referencing it get its steps inlined (one update). */
  const deleteSharedSteps = useCallback((id) => {
    writeTesting(({ testSharedSteps, testCases }) => {
      const group = testSharedSteps.find((item) => item.id === id);
      if (!group) return null;
      const now = nowIso();
      return {
        testSharedSteps: testSharedSteps.filter((item) => item.id !== id),
        testCases: testCases.map((testCase) => {
          if (!(testCase.steps || []).some((step) => step?.sharedStepsId === id)) return testCase;
          const steps = [];
          testCase.steps.forEach((step) => {
            if (step?.sharedStepsId === id) {
              (group.steps || []).forEach((inner) => steps.push({ ...inner, id: generateShortId("s") }));
            } else {
              steps.push(step);
            }
          });
          return { ...testCase, steps, updatedAt: now };
        }),
      };
    });
  }, [writeTesting]);

  // ── Test runs / cycles ──────────────────────────────────────────────────
  const createTestRun = useCallback((data = {}) => {
    const record = buildTestRunRecord(data, currentUser, nowIso(), currentStoreProjectId());
    setTestRuns((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestRuns]);

  const createTestRuns = useCallback((items = []) => {
    const now = nowIso();
    const projectId = currentStoreProjectId();
    const records = items.map((data) => buildTestRunRecord(data, currentUser, now, projectId));
    if (records.length) setTestRuns((prev) => [...(prev || []), ...records]);
    return records;
  }, [currentUser, setTestRuns]);

  const updateTestRun = useCallback((updated) => {
    if (!updated?.id) return;
    setTestRuns((prev) => (prev || []).map((run) => (
      run.id === updated.id
        ? { ...run, ...updated, updatedAt: nowIso() }
        : run
    )));
  }, [setTestRuns]);

  const deleteTestRun = useCallback((id) => {
    setTestRuns((prev) => (prev || []).filter((run) => run.id !== id));
  }, [setTestRuns]);

  /** Adds/removes scoped cases and merges tester assignments `{ caseId: username|null }`. */
  const updateTestRunScope = useCallback((runId, { addCaseIds = [], removeCaseIds = [], assignments = null } = {}) => {
    const removing = new Set(removeCaseIds || []);
    setTestRuns((prev) => (prev || []).map((run) => {
      if (run.id !== runId) return run;
      const caseIds = [...new Set([...(run.caseIds || []), ...(addCaseIds || [])])].filter((id) => !removing.has(id));
      const nextAssignments = { ...(run.assignments || {}) };
      Object.entries(assignments || {}).forEach(([caseId, user]) => {
        if (user) nextAssignments[caseId] = user;
        else nextAssignments[caseId] = null;
      });
      removing.forEach((caseId) => { nextAssignments[caseId] = null; });
      return {
        ...run,
        caseIds,
        assignments: nextAssignments,
        // Only untested rows of removed cases go; executed history stays.
        results: (run.results || []).filter((result) => !(removing.has(result.caseId) && (!result.status || result.status === "untested"))),
        updatedAt: nowIso(),
      };
    }));
  }, [setTestRuns]);

  /**
   * Records an execution (verdict + step results + notes) for one case in a
   * cycle. The previous verdict moves into the capped attempt history.
   */
  const recordTestExecution = useCallback((runId, caseId, input = {}) => {
    let stored = null;
    const now = nowIso();
    setTestRuns((prev) => (prev || []).map((run) => {
      if (run.id !== runId) return run;
      stored = buildExecutionResult(findRunResult(run, caseId), { ...input, caseId }, { by: currentUser, now });
      return { ...run, results: upsertRunResult(run, caseId, stored), updatedAt: now };
    }));
    return stored;
  }, [currentUser, setTestRuns]);

  /** Legacy merge-style result update (kept for older callers). */
  const updateTestRunResult = useCallback((runId, caseId, result) => {
    const now = nowIso();
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

  /**
   * Clones a cycle. `statuses` limits the scope to cases whose latest verdict
   * in the source matches (e.g. ["failed","blocked"] = "rerun failed & blocked").
   */
  const cloneTestRun = useCallback((runId, { statuses = null, name = null, overrides = {} } = {}) => {
    const source = (useAppStore.getState().testRuns || []).find((run) => run.id === runId);
    if (!source) return null;
    const latest = new Map((source.results || []).map((result) => [result.caseId, result.status || "untested"]));
    const scope = (source.caseIds?.length ? source.caseIds : (source.results || []).map((result) => result.caseId))
      .filter((caseId) => !statuses || statuses.includes(latest.get(caseId) || "untested"));
    if (!scope.length) return null;
    const assignments = {};
    scope.forEach((caseId) => {
      const user = source.assignments?.[caseId];
      if (user) assignments[caseId] = user;
    });
    const {
      id, results, createdAt, updatedAt, completedAt, abortedAt, sample, ...rest
    } = source;
    const record = buildTestRunRecord({
      ...rest,
      ...overrides,
      name: name || `${source.name || "Cycle"} — ${statuses ? "Rerun" : "Copy"}`,
      caseIds: scope,
      assignments,
      results: [],
      status: "in-progress",
      completedAt: null,
      rerunOf: source.id,
    }, currentUser, nowIso(), source.projectId || currentStoreProjectId());
    setTestRuns((prev) => [...(prev || []), record]);
    return record;
  }, [currentUser, setTestRuns]);

  /**
   * Links a defect task to an execution and to its case in ONE update.
   * `executionPatch` (optional) upserts the execution at the same time, e.g.
   * the failed verdict being recorded while the defect is created.
   */
  const linkDefectToExecution = useCallback((runId, caseId, taskId, executionPatch = null) => {
    if (!caseId || !taskId) return;
    writeTesting(({ testRuns, testCases }) => {
      const now = nowIso();
      return {
        testRuns: runId ? testRuns.map((run) => {
          if (run.id !== runId) return run;
          const existing = findRunResult(run, caseId);
          let next;
          if (executionPatch) {
            next = buildExecutionResult(existing, { ...executionPatch, caseId, defects: [...(executionPatch.defects || []), taskId] }, { by: currentUser, now });
          } else {
            next = existing
              ? { ...existing, defects: [...new Set([...(existing.defects || []), existing.bugTaskId, taskId].filter(Boolean))] }
              : { caseId, status: "untested", defects: [taskId] };
          }
          return { ...run, results: upsertRunResult(run, caseId, next), updatedAt: now };
        }) : testRuns,
        testCases: testCases.map((testCase) => (
          testCase.id === caseId
            ? { ...testCase, defectIds: [...new Set([...(testCase.defectIds || []), testCase.linkedBugTaskId, taskId].filter(Boolean))], linkedBugTaskId: null, updatedAt: now }
            : testCase
        )),
      };
    });
  }, [currentUser, writeTesting]);

  // ── Import & samples ────────────────────────────────────────────────────
  /**
   * Upserts fully-formed testing records (by id) across all collections in
   * ONE store update — used by CSV import and sample seeding.
   */
  const importTestingData = useCallback(({ suites = [], cases = [], runs = [], plans = [], sharedSteps = [] } = {}) => {
    const upsert = (list, records) => {
      const valid = (records || []).filter((record) => record && record.id);
      if (!valid.length) return list;
      const ids = new Set(valid.map((record) => record.id));
      return [...list.filter((record) => !ids.has(record.id)), ...valid];
    };
    writeTesting((state) => ({
      testSuites: upsert(state.testSuites, suites),
      testCases: upsert(state.testCases, cases),
      testRuns: upsert(state.testRuns, runs),
      testPlans: upsert(state.testPlans, plans),
      testSharedSteps: upsert(state.testSharedSteps, sharedSteps),
    }));
    return {
      suites: suites.length, cases: cases.length, runs: runs.length, plans: plans.length, sharedSteps: sharedSteps.length,
    };
  }, [writeTesting]);

  /** Removes `sample: true` testing records (optionally only for one project). */
  const removeSampleTestingData = useCallback((projectId = null) => {
    const keep = (record) => !(record?.sample && (!projectId || record.projectId === projectId));
    writeTesting((state) => ({
      testSuites: state.testSuites.filter(keep),
      testCases: state.testCases.filter(keep),
      testRuns: state.testRuns.filter(keep),
      testPlans: state.testPlans.filter(keep),
      testSharedSteps: state.testSharedSteps.filter(keep),
    }));
  }, [writeTesting]);

  return {
    createRelease,
    updateRelease,
    deleteRelease,
    addChangelogEntry,
    deleteChangelogEntry,
    updateChangelogEntry,
    importReleases,
    removeSampleReleases,
    moveReleaseTasks,
    createTestPlan,
    updateTestPlan,
    deleteTestPlan,
    createTestSuite,
    updateTestSuite,
    moveTestSuite,
    deleteTestSuite,
    createTestCase,
    updateTestCase,
    bulkUpdateTestCases,
    moveTestCases,
    cloneTestCases,
    deleteTestCase,
    deleteTestCases,
    addTestCaseComment,
    deleteTestCaseComment,
    createSharedSteps,
    updateSharedSteps,
    deleteSharedSteps,
    createTestRun,
    createTestRuns,
    updateTestRun,
    deleteTestRun,
    updateTestRunScope,
    recordTestExecution,
    updateTestRunResult,
    cloneTestRun,
    linkDefectToExecution,
    importTestingData,
    removeSampleTestingData,
  };
}
