import { useCallback } from "react";
import { taskKey } from "../../../shared/utils/helpers";
import { buildBugFromFailure, buildRerunFailedInput, buildRunInput } from "../utils/testingOperations";

const plural = (count, word) => `${count} ${word}${count !== 1 ? "s" : ""}`;

/**
 * Page-level test management workflows. All writes go through the useApp()
 * testing facade actions (useTestingActions); this hook only adds scoping,
 * confirmations, navigation and toasts.
 */
export function useTestingWorkflows({
  actions,
  workspace,
  currentProjectId,
  currentUser,
  labels,
  selectedSuiteId,
  addToast,
  requestConfirm,
  setSelectedSuiteId,
  setActiveTab,
}) {
  const {
    createTask,
    createTestPlan, updateTestPlan, deleteTestPlan,
    createTestSuite, updateTestSuite, deleteTestSuite,
    createTestCase, updateTestCase, deleteTestCase,
    createTestRun, createTestRuns, updateTestRun, deleteTestRun, updateTestRunResult,
  } = actions;
  const { suites, cases, runs, plans } = workspace;

  const casesOfSuite = useCallback((suiteId) => cases.filter((testCase) => testCase.suiteId === suiteId), [cases]);

  // ── Suites ────────────────────────────────────────────────────────────────
  const createSuite = useCallback((data) => {
    const record = createTestSuite({ ...data, projectId: currentProjectId });
    if (record?.id) setSelectedSuiteId(record.id);
    setActiveTab("cases");
    addToast(`Suite "${data.name}" created.`, "success");
  }, [addToast, createTestSuite, currentProjectId, setActiveTab, setSelectedSuiteId]);

  const updateSuite = useCallback((patch) => {
    const suite = suites.find((item) => item.id === patch.id);
    if (!suite) return;
    // Legacy suites without a project are adopted by the project they are edited in.
    updateTestSuite({ ...patch, ...(suite.projectId ? {} : { projectId: currentProjectId }) });
    addToast("Suite updated.", "success");
  }, [addToast, currentProjectId, suites, updateTestSuite]);

  const deleteSuite = useCallback((suite) => {
    const caseCount = cases.filter((testCase) => testCase.suiteId === suite.id).length;
    const runCount = runs.filter((run) => run.suiteId === suite.id).length;
    const planCount = plans.filter((plan) => (plan.suiteIds || []).includes(suite.id)).length;
    requestConfirm({
      title: `Delete suite "${suite.name}"?`,
      message: [
        `${plural(caseCount, "test case")} and ${plural(runCount, "run")} will be deleted.`,
        planCount ? `It will also be removed from ${plural(planCount, "test plan")}.` : null,
        "This cannot be undone.",
      ].filter(Boolean).join("\n"),
      confirmLabel: "Delete Suite",
      onConfirm: () => {
        deleteTestSuite(suite.id);
        setSelectedSuiteId((prev) => (prev === suite.id ? (suites.find((item) => item.id !== suite.id)?.id || null) : prev));
        addToast("Test suite deleted.", "info");
      },
    });
  }, [addToast, cases, deleteTestSuite, plans, requestConfirm, runs, setSelectedSuiteId, suites]);

  // ── Cases ─────────────────────────────────────────────────────────────────
  const createCase = useCallback((data) => {
    if (!selectedSuiteId) return;
    createTestCase({ ...data, suiteId: selectedSuiteId });
    addToast("Test case created.", "success");
  }, [addToast, createTestCase, selectedSuiteId]);

  const updateCase = useCallback((data) => {
    updateTestCase(data);
    addToast("Test case updated.", "success");
  }, [addToast, updateTestCase]);

  const deleteCase = useCallback((testCase) => {
    requestConfirm({
      title: `Delete test case "${testCase.title}"?`,
      message: "Past run results stay in run history. This cannot be undone.",
      confirmLabel: "Delete Case",
      onConfirm: () => {
        deleteTestCase(testCase.id);
        addToast("Test case deleted.", "info");
      },
    });
  }, [addToast, deleteTestCase, requestConfirm]);

  // ── Plans ─────────────────────────────────────────────────────────────────
  const createPlan = useCallback((data) => {
    createTestPlan({ ...data, projectId: currentProjectId, status: "draft", statusOverride: false });
    setActiveTab("plans");
    addToast(`Plan "${data.name}" created.`, "success");
  }, [addToast, createTestPlan, currentProjectId, setActiveTab]);

  const updatePlan = useCallback((data) => {
    updateTestPlan(data);
    addToast("Test plan updated.", "success");
  }, [addToast, updateTestPlan]);

  const deletePlan = useCallback((plan) => {
    requestConfirm({
      title: `Delete test plan "${plan.name}"?`,
      message: "Runs started from this plan are kept but detached from it.",
      confirmLabel: "Delete Plan",
      onConfirm: () => {
        deleteTestPlan(plan.id);
        addToast("Test plan deleted.", "info");
      },
    });
  }, [addToast, deleteTestPlan, requestConfirm]);

  const startPlan = useCallback((plan) => {
    const suiteById = new Map(suites.map((suite) => [suite.id, suite]));
    const scopedSuiteIds = (plan.suiteIds || []).filter((suiteId) => suiteById.has(suiteId));
    const inputs = scopedSuiteIds
      .map((suiteId) => buildRunInput(suiteId, {
        name: `${plan.name} — ${suiteById.get(suiteId)?.name || "Suite Run"}`,
        regressionPack: plan.regressionPack || null,
        releaseId: plan.releaseId || null,
        environment: plan.environment || "staging",
        buildVersion: plan.buildVersion || "",
        platform: plan.platform || "web",
        assignedTester: plan.assignedTester || currentUser || null,
        planId: plan.id,
        owner: currentUser || null,
      }, casesOfSuite(suiteId)))
      .filter((input) => input.caseIds.length > 0);

    if (!inputs.length) {
      addToast("No test cases in this plan's scope. Add cases or adjust the regression pack.", "warning");
      return;
    }
    if (typeof createTestRuns === "function") createTestRuns(inputs);
    else inputs.forEach((input) => createTestRun(input));
    const now = new Date().toISOString();
    updateTestPlan({ id: plan.id, status: "in-progress", statusOverride: false, startedAt: plan.startedAt || now, lastStartedAt: now });
    setActiveTab("queue");
    const skipped = scopedSuiteIds.length - inputs.length;
    addToast(
      `Started ${plural(inputs.length, "run")} for ${plan.name}.${skipped ? ` ${plural(skipped, "suite")} skipped (no cases in scope).` : ""}`,
      "success"
    );
  }, [addToast, casesOfSuite, createTestRun, createTestRuns, currentUser, setActiveTab, suites, updateTestPlan]);

  const moveToDraft = useCallback((plan) => {
    // Manual override: derived status must not immediately flip it back.
    updateTestPlan({ id: plan.id, status: "draft", statusOverride: true });
    addToast(`"${plan.name}" moved to draft.`, "info");
  }, [addToast, updateTestPlan]);

  const viewPlanRuns = useCallback((plan) => {
    const planRuns = runs.filter((run) => run.planId === plan.id);
    const target = planRuns.find((run) => run.status === "in-progress") || planRuns[0];
    if (!target) return;
    setSelectedSuiteId(target.suiteId);
    setActiveTab("runs");
  }, [runs, setActiveTab, setSelectedSuiteId]);

  // ── Runs ──────────────────────────────────────────────────────────────────
  const createRun = useCallback((data) => {
    if (!selectedSuiteId) return;
    createTestRun(buildRunInput(selectedSuiteId, data, casesOfSuite(selectedSuiteId)));
    addToast(`Run "${data.name}" started.`, "success");
  }, [addToast, casesOfSuite, createTestRun, selectedSuiteId]);

  const completeRun = useCallback((run, summary) => {
    const complete = () => {
      updateTestRun({ id: run.id, status: "completed", completedAt: new Date().toISOString() });
      addToast("Run marked as completed.", "success");
    };
    const untested = summary?.untested || 0;
    if (untested > 0) {
      requestConfirm({
        title: "Complete run with untested cases?",
        message: `${plural(untested, "case")} in "${run.name}" have no verdict yet and will stay untested.`,
        confirmLabel: "Complete Run",
        tone: "primary",
        onConfirm: complete,
      });
      return;
    }
    complete();
  }, [addToast, requestConfirm, updateTestRun]);

  const abortRun = useCallback((run) => {
    requestConfirm({
      title: `Abort run "${run.name}"?`,
      message: "Recorded results are kept, but the run can no longer be executed.",
      confirmLabel: "Abort Run",
      onConfirm: () => {
        updateTestRun({ id: run.id, status: "aborted", abortedAt: new Date().toISOString() });
        addToast("Run aborted.", "warning");
      },
    });
  }, [addToast, requestConfirm, updateTestRun]);

  const deleteRun = useCallback((run) => {
    if (typeof deleteTestRun !== "function") return;
    requestConfirm({
      title: `Delete run "${run.name}"?`,
      message: "Its results are removed from analytics, coverage and plan progress. This cannot be undone.",
      confirmLabel: "Delete Run",
      onConfirm: () => {
        deleteTestRun(run.id);
        addToast("Test run deleted.", "info");
      },
    });
  }, [addToast, deleteTestRun, requestConfirm]);

  const rerunFailed = useCallback((run) => {
    const rerunInput = buildRerunFailedInput(run);
    const input = buildRunInput(run.suiteId, rerunInput, casesOfSuite(run.suiteId));
    if (!input.caseIds.length) {
      addToast("No failed cases to rerun.", "info");
      return;
    }
    createTestRun({ ...input, owner: currentUser || null });
    addToast(`Created rerun for ${plural(input.caseIds.length, "failed case")}.`, "success");
  }, [addToast, casesOfSuite, createTestRun, currentUser]);

  const createBug = useCallback((testCase, run, context = {}) => {
    const newBug = createTask(buildBugFromFailure(testCase, run, context, { labels }), "active");
    if (!newBug?.id) {
      addToast("Bug created, but linking back to test case failed.", "warning");
      return;
    }
    updateTestCase({ id: testCase.id, linkedBugTaskId: newBug.id });
    updateTestRunResult(run.id, testCase.id, { bugTaskId: newBug.id });
    addToast(`Linked bug ${taskKey(newBug.id)} created from failed test.`, "success");
  }, [addToast, createTask, labels, updateTestCase, updateTestRunResult]);

  return {
    createSuite,
    updateSuite,
    deleteSuite,
    createCase,
    updateCase,
    deleteCase,
    createPlan,
    updatePlan,
    deletePlan,
    startPlan,
    moveToDraft,
    viewPlanRuns,
    createRun,
    completeRun,
    abortRun,
    deleteRun,
    rerunFailed,
    createBug,
    updateResult: updateTestRunResult,
  };
}
