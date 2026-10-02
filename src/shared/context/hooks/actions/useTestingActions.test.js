import { act, renderHook } from "@testing-library/react";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";
import { generateTestingId, useTestingActions } from "./useTestingActions";

function renderActions(currentUser = "alice") {
  const state = useAppStore.getState();
  return renderHook(() => useTestingActions({
    currentUser,
    templateRegistry: {},
    setReleases: state.setReleases,
    setTestPlans: state.setTestPlans,
    setTestSuites: state.setTestSuites,
    setTestCases: state.setTestCases,
    setTestRuns: state.setTestRuns,
    setTestSharedSteps: state.setTestSharedSteps,
  }));
}

/** Counts store notifications during `fn` (one per store write). */
function countWrites(fn) {
  let writes = 0;
  const unsubscribe = useAppStore.subscribe(() => { writes += 1; });
  act(fn);
  unsubscribe();
  return writes;
}

describe("useTestingActions", () => {
  beforeEach(() => {
    resetAppStore();
    act(() => useAppStore.setState({ currentProjectId: "proj-1", currentUser: "alice" }));
  });

  it("generates unique ids even within the same millisecond", () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateTestingId("tr")));
    expect(ids.size).toBe(200);
    expect([...ids][0]).toMatch(/^tr-\d+-[0-9a-z]+$/);
  });

  it("creates records with unified defaults, project scope and case sequence", () => {
    const { result } = renderActions();
    let suite;
    let folder;
    let testCase;
    let second;
    let plan;
    act(() => {
      suite = result.current.createTestSuite({ name: "Auth" });
      folder = result.current.createTestSuite({ name: "Login", parentId: suite.id });
      testCase = result.current.createTestCase({ suiteId: folder.id, title: "Login", steps: "a\nb", priority: "critical", linkedTaskId: "CY-1", regressionPacks: ["smoke"] });
      second = result.current.createTestCase({ suiteId: folder.id, title: "Logout" });
      plan = result.current.createTestPlan({ name: "Release", suiteIds: [suite.id, suite.id] });
    });
    const state = useAppStore.getState();
    expect(suite).toEqual(expect.objectContaining({ projectId: "proj-1", owner: "alice", parentId: null }));
    expect(suite.id).toMatch(/^ts-/);
    expect(folder).toEqual(expect.objectContaining({ parentId: suite.id, projectId: "proj-1", order: 0 }));
    expect(state.testCases[0]).toEqual(expect.objectContaining({
      id: testCase.id, projectId: "proj-1", seq: 1, status: "draft", type: "functional", automation: "manual", priority: "critical",
      requirementIds: ["CY-1"], tags: ["smoke"],
    }));
    expect(state.testCases[0].steps.map((step) => step.action)).toEqual(["a", "b"]);
    expect(state.testCases[0].steps[0].id).toEqual(expect.any(String));
    expect(state.testCases[0]).not.toHaveProperty("linkedBugTaskId");
    expect(second.seq).toBe(2);
    expect(state.testPlans[0]).toEqual(expect.objectContaining({
      id: plan.id, projectId: "proj-1", status: "draft", statusOverride: false, suiteIds: [suite.id], assignedTester: "alice",
    }));
  });

  it("creates cycles without seeded rows and records rich executions with capped attempts", () => {
    const { result } = renderActions();
    let runs;
    act(() => {
      runs = result.current.createTestRuns([
        { name: "A", caseIds: ["c1", "c2", "c1"] },
        { suiteId: "s2", name: "B", caseIds: [] },
      ]);
    });
    expect(runs).toHaveLength(2);
    expect(runs[0].id).not.toBe(runs[1].id);
    expect(runs[0]).toEqual(expect.objectContaining({ status: "in-progress", completedAt: null, projectId: "proj-1", caseIds: ["c1", "c2"], results: [], assignments: {} }));

    let stored;
    act(() => {
      stored = result.current.recordTestExecution(runs[0].id, "c1", {
        status: "failed",
        stepResults: [{ stepId: "s1", status: "passed" }, { stepId: "s2", status: "failed", actual: "500" }, { stepId: "s3", status: "untested" }],
        actualResult: " boom ",
        comment: "",
        durationSec: 42.4,
      });
    });
    expect(stored).toEqual(expect.objectContaining({ caseId: "c1", status: "failed", actualResult: "boom", executedBy: "alice", durationSec: 42 }));
    expect(stored.stepResults).toEqual([{ stepId: "s1", status: "passed" }, { stepId: "s2", status: "failed", actual: "500" }]);
    expect(stored).not.toHaveProperty("comment");

    // Re-executions push the previous verdict into the capped attempt history.
    const { result: bob } = renderActions("bob");
    const runId = runs[0].id;
    const statuses = Array.from({ length: 12 }, (_, i) => (i % 2 ? "passed" : "failed"));
    statuses.forEach((status) => {
      act(() => { bob.current.recordTestExecution(runId, "c1", { status }); });
    });
    const run = useAppStore.getState().testRuns.find((item) => item.id === runs[0].id);
    const row = run.results.find((item) => item.caseId === "c1");
    expect(run.results.filter((item) => item.caseId === "c1")).toHaveLength(1);
    expect(row.attempts).toHaveLength(10);
    expect(row.executedBy).toBe("bob");

    // Same tester amending the same verdict right away is an edit, not a new attempt.
    const before = row.attempts.length;
    act(() => { bob.current.recordTestExecution(runs[0].id, "c1", { status: row.status, comment: "typo fix" }); });
    const amended = useAppStore.getState().testRuns.find((item) => item.id === runs[0].id).results.find((item) => item.caseId === "c1");
    expect(amended.attempts).toHaveLength(before);
    expect(amended.comment).toBe("typo fix");

    act(() => result.current.deleteTestRun(runs[1].id));
    expect(useAppStore.getState().testRuns).toHaveLength(1);
  });

  it("keeps the legacy merge-style result update", () => {
    act(() => useAppStore.setState({ testRuns: [{ id: "r1", results: [{ caseId: "c1", status: "untested" }] }] }));
    const { result } = renderActions();
    act(() => result.current.updateTestRunResult("r1", "c1", { status: "failed", notes: "boom" }));
    expect(useAppStore.getState().testRuns[0].results[0]).toEqual(expect.objectContaining({ caseId: "c1", status: "failed", notes: "boom", executedBy: "alice" }));
  });

  it("cascades suite deletion to nested folders, cases, legacy runs, open cycles and plan scopes in ONE write", () => {
    act(() => useAppStore.setState({
      testSuites: [{ id: "suite-1-1", projectId: "proj-1" }, { id: "f1", parentId: "suite-1-1" }, { id: "f2", parentId: "f1" }, { id: "ts-2", projectId: "proj-1" }],
      testCases: [{ id: "case-1", suiteId: "suite-1-1" }, { id: "case-2", suiteId: "f2" }, { id: "tc-2", suiteId: "ts-2" }],
      testRuns: [
        { id: "run-1", suiteId: "suite-1-1" },
        { id: "tr-2", suiteId: "ts-2", planId: "plan-1" },
        { id: "open", status: "in-progress", caseIds: ["case-2", "tc-2"], results: [{ caseId: "case-2", status: "passed" }] },
        { id: "closed", status: "completed", caseIds: ["case-2"], results: [{ caseId: "case-2", status: "passed" }] },
      ],
      testPlans: [{ id: "plan-1", suiteIds: ["suite-1-1", "ts-2"] }, { id: "tp-2", suiteIds: ["ts-2"] }],
    }));
    const { result } = renderActions();
    const writes = countWrites(() => result.current.deleteTestSuite("suite-1-1"));
    expect(writes).toBe(1);
    const state = useAppStore.getState();
    expect(state.testSuites.map((suite) => suite.id)).toEqual(["ts-2"]);
    expect(state.testCases.map((item) => item.id)).toEqual(["tc-2"]);
    expect(state.testRuns.map((item) => item.id)).toEqual(["tr-2", "open", "closed"]);
    expect(state.testRuns.find((run) => run.id === "open").caseIds).toEqual(["tc-2"]);
    expect(state.testRuns.find((run) => run.id === "closed").caseIds).toEqual(["case-2"]);
    expect(state.testPlans.find((plan) => plan.id === "plan-1").suiteIds).toEqual(["ts-2"]);

    act(() => result.current.deleteTestPlan("plan-1"));
    expect(useAppStore.getState().testRuns.find((run) => run.id === "tr-2").planId).toBeNull();
  });

  it("moves folders (cycle-safe) and reorders siblings", () => {
    act(() => useAppStore.setState({
      testSuites: [{ id: "a", order: 0 }, { id: "b", order: 1 }, { id: "c", order: 2 }, { id: "child", parentId: "a", order: 0, projectId: "proj-1" }],
    }));
    const { result } = renderActions();
    let ok;
    act(() => { ok = result.current.moveTestSuite("c", null, 0); });
    expect(ok).toBe(true);
    const byId = Object.fromEntries(useAppStore.getState().testSuites.map((suite) => [suite.id, suite]));
    expect([byId.c.order, byId.a.order, byId.b.order]).toEqual([0, 1, 2]);
    act(() => { ok = result.current.moveTestSuite("a", "child", 0); });
    expect(ok).toBe(false);
    act(() => { result.current.moveTestSuite("b", "a", null); });
    expect(useAppStore.getState().testSuites.find((suite) => suite.id === "b")).toEqual(expect.objectContaining({ parentId: "a", order: 1 }));
  });

  it("bulk-updates, moves, clones and deletes cases with history and single writes", () => {
    act(() => useAppStore.setState({
      testSuites: [{ id: "s1", projectId: "proj-1" }, { id: "s2", projectId: "proj-1" }],
      testCases: [
        { id: "c1", suiteId: "s1", title: "One", priority: "low", seq: 1, order: 0, steps: [{ id: "x", action: "Go" }] },
        { id: "c2", suiteId: "s1", title: "Two", priority: "low", seq: 2, order: 1 },
        { id: "c3", suiteId: "s2", title: "Three", seq: 3, order: 0 },
      ],
      testRuns: [{ id: "r", status: "in-progress", caseIds: ["c1", "c2"], results: [] }],
    }));
    const { result } = renderActions();
    expect(countWrites(() => result.current.bulkUpdateTestCases(["c1", "c2"], { priority: "high" }))).toBe(1);
    let state = useAppStore.getState();
    expect(state.testCases.filter((item) => item.priority === "high")).toHaveLength(2);
    expect(state.testCases[0].history[0]).toEqual(expect.objectContaining({ by: "alice", fields: ["priority"], changes: { priority: { from: "low", to: "high" } } }));

    act(() => result.current.moveTestCases(["c1"], "s2", "c3"));
    state = useAppStore.getState();
    const c1 = state.testCases.find((item) => item.id === "c1");
    expect(c1).toEqual(expect.objectContaining({ suiteId: "s2", order: 0 }));
    expect(state.testCases.find((item) => item.id === "c3").order).toBe(1);
    expect(c1.history.at(-1).fields).toEqual(["suiteId"]);

    let clones;
    act(() => { clones = result.current.cloneTestCases(["c1", "c2"]); });
    expect(clones.map((item) => item.seq)).toEqual([4, 5]);
    expect(clones[0]).toEqual(expect.objectContaining({ title: "One (copy)", suiteId: "s2" }));
    expect(clones[0]).not.toHaveProperty("history");
    expect(clones[0].steps[0].id).not.toBe("x");

    expect(countWrites(() => result.current.deleteTestCases(["c1", "c2"]))).toBe(1);
    state = useAppStore.getState();
    expect(state.testCases.map((item) => item.id)).toEqual(["c3", clones[0].id, clones[1].id]);
    expect(state.testRuns[0].caseIds).toEqual([]);
  });

  it("records history only for real changes and folds legacy single links", () => {
    act(() => useAppStore.setState({ testCases: [{ id: "c1", title: "T", linkedTaskId: "CY-1", regressionPacks: ["smoke"] }] }));
    const { result } = renderActions();
    act(() => result.current.updateTestCase({ id: "c1", title: "T" }));
    expect(useAppStore.getState().testCases[0].history).toBeUndefined();
    act(() => result.current.updateTestCase({ id: "c1", requirementIds: ["CY-1", "CY-2"], tags: ["smoke"] }));
    const updated = useAppStore.getState().testCases[0];
    expect(updated).toEqual(expect.objectContaining({ linkedTaskId: null, regressionPacks: [], requirementIds: ["CY-1", "CY-2"] }));
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].fields).toEqual(["tags", "requirementIds"]);
  });

  it("manages comments and shared steps; deleting a group inlines its steps", () => {
    act(() => useAppStore.setState({ testCases: [{ id: "c1", title: "T", steps: [{ id: "a", action: "Before" }] }] }));
    const { result } = renderActions();
    let comment;
    act(() => { comment = result.current.addTestCaseComment("c1", "  Looks good "); });
    expect(useAppStore.getState().testCases[0].comments).toEqual([expect.objectContaining({ id: comment.id, author: "alice", text: "Looks good" })]);
    act(() => result.current.deleteTestCaseComment("c1", comment.id));
    expect(useAppStore.getState().testCases[0].comments).toEqual([]);

    let group;
    act(() => { group = result.current.createSharedSteps({ name: " Login ", steps: [{ action: "Open" }, { sharedStepsId: "nested" }, "Sign in"] }); });
    expect(group).toEqual(expect.objectContaining({ name: "Login", projectId: "proj-1" }));
    expect(group.steps.map((step) => step.action)).toEqual(["Open", "Sign in"]);
    act(() => result.current.updateSharedSteps({ id: group.id, steps: [{ action: "Open v2" }] }));
    expect(useAppStore.getState().testSharedSteps[0].steps.map((step) => step.action)).toEqual(["Open v2"]);

    act(() => result.current.updateTestCase({ id: "c1", steps: [{ id: "a", action: "Before" }, { id: "ref", sharedStepsId: group.id }] }));
    expect(countWrites(() => result.current.deleteSharedSteps(group.id))).toBe(1);
    const state = useAppStore.getState();
    expect(state.testSharedSteps).toEqual([]);
    expect(state.testCases[0].steps.map((step) => step.action)).toEqual(["Before", "Open v2"]);
    expect(state.testCases[0].steps.some((step) => step.sharedStepsId)).toBe(false);
  });

  it("updates cycle scope and assignments, and clones failed & blocked only", () => {
    act(() => useAppStore.setState({
      testRuns: [{
        id: "r1", name: "RC1", projectId: "proj-1", releaseId: "rel", status: "completed", caseIds: ["c1", "c2", "c3", "c4"],
        assignments: { c2: "bob", c3: "carol" },
        results: [{ caseId: "c1", status: "passed" }, { caseId: "c2", status: "failed" }, { caseId: "c3", status: "blocked" }, { caseId: "c4", status: "untested" }],
      }],
    }));
    const { result } = renderActions();
    let rerun;
    act(() => { rerun = result.current.cloneTestRun("r1", { statuses: ["failed", "blocked"] }); });
    expect(rerun).toEqual(expect.objectContaining({ caseIds: ["c2", "c3"], assignments: { c2: "bob", c3: "carol" }, results: [], status: "in-progress", rerunOf: "r1", releaseId: "rel" }));
    act(() => { expect(result.current.cloneTestRun("r1", { statuses: ["retest"] })).toBeNull(); });

    act(() => result.current.updateTestRunScope(rerun.id, { addCaseIds: ["c9"], removeCaseIds: ["c3"], assignments: { c2: "dave", c9: "erin" } }));
    const updated = useAppStore.getState().testRuns.find((run) => run.id === rerun.id);
    expect(updated.caseIds).toEqual(["c2", "c9"]);
    expect(updated.assignments).toEqual({ c2: "dave", c3: null, c9: "erin" });
  });

  it("links a defect to the execution and the case in ONE write, optionally recording the verdict", () => {
    act(() => useAppStore.setState({
      testCases: [{ id: "c1", title: "T", linkedBugTaskId: "CY-OLD" }],
      testRuns: [{ id: "r1", status: "in-progress", caseIds: ["c1"], results: [] }],
    }));
    const { result } = renderActions();
    const writes = countWrites(() => result.current.linkDefectToExecution("r1", "c1", "CY-9", { status: "failed", actualResult: "500" }));
    expect(writes).toBe(1);
    const state = useAppStore.getState();
    expect(state.testRuns[0].results[0]).toEqual(expect.objectContaining({ status: "failed", actualResult: "500", defects: ["CY-9"], executedBy: "alice" }));
    expect(state.testCases[0]).toEqual(expect.objectContaining({ defectIds: ["CY-OLD", "CY-9"], linkedBugTaskId: null }));
    act(() => result.current.linkDefectToExecution(null, "c1", "CY-10"));
    expect(useAppStore.getState().testCases[0].defectIds).toEqual(["CY-OLD", "CY-9", "CY-10"]);
  });

  it("imports testing data in one write and removes only sample records of a project", () => {
    act(() => useAppStore.setState({
      testSuites: [{ id: "real", projectId: "proj-1" }, { id: "ts-sample-old", projectId: "proj-1", sample: true }, { id: "ts-sample-p2", projectId: "proj-2", sample: true }],
    }));
    const { result } = renderActions();
    const writes = countWrites(() => result.current.importTestingData({
      suites: [{ id: "ts-sample-old", projectId: "proj-1", sample: true, name: "Replaced" }],
      cases: [{ id: "tc-sample-1", projectId: "proj-1", sample: true }],
      runs: [{ id: "tr-sample-1", projectId: "proj-1", sample: true }],
      plans: [{ id: "tp-sample-1", projectId: "proj-1", sample: true }],
      sharedSteps: [{ id: "tss-sample-1", projectId: "proj-1", sample: true }, null],
    }));
    expect(writes).toBe(1);
    let state = useAppStore.getState();
    expect(state.testSuites.map((suite) => suite.id)).toEqual(["real", "ts-sample-p2", "ts-sample-old"]);
    expect(state.testSuites.find((suite) => suite.id === "ts-sample-old").name).toBe("Replaced");
    expect(state.testSharedSteps).toHaveLength(1);

    act(() => result.current.removeSampleTestingData("proj-1"));
    state = useAppStore.getState();
    expect(state.testSuites.map((suite) => suite.id)).toEqual(["real", "ts-sample-p2"]);
    expect([state.testCases, state.testRuns, state.testPlans, state.testSharedSteps].every((list) => list.length === 0)).toBe(true);
  });

  it("merges partial plan updates", () => {
    act(() => useAppStore.setState({ testPlans: [{ id: "plan-1", name: "Keep", status: "in-progress" }] }));
    const { result } = renderActions();
    act(() => result.current.updateTestPlan({ id: "plan-1", status: "draft", statusOverride: true }));
    expect(useAppStore.getState().testPlans[0]).toEqual(expect.objectContaining({ name: "Keep", status: "draft", statusOverride: true }));
  });
});

describe("useTestingActions — releases", () => {
  beforeEach(() => {
    resetAppStore();
    act(() => useAppStore.setState({ currentProjectId: "proj-1", currentUser: "alice" }));
  });

  it("createRelease returns the hydrated record", () => {
    const { result } = renderActions();
    let created;
    act(() => { created = result.current.createRelease({ version: "v1.0.0", projectId: "proj-1" }); });
    expect(created).toEqual(expect.objectContaining({ version: "v1.0.0", projectId: "proj-1", owner: "alice" }));
    expect(useAppStore.getState().releases).toEqual([created]);
  });

  it("imports releases in one update, replacing same ids, and removes only samples", () => {
    act(() => useAppStore.setState({
      releases: [
        { id: "rel-real", projectId: "proj-1", version: "v1" },
        { id: "rel-sample-old", projectId: "proj-1", version: "v0", sample: true },
        { id: "rel-sample-other", projectId: "proj-2", version: "v9", sample: true },
      ],
    }));
    const { result } = renderActions();
    act(() => {
      result.current.importReleases([
        { id: "rel-sample-old", projectId: "proj-1", version: "v0.1", sample: true },
        { id: "rel-sample-new", projectId: "proj-1", version: "v2", sample: true },
      ]);
    });
    expect(useAppStore.getState().releases.map((release) => release.id)).toEqual(["rel-real", "rel-sample-other", "rel-sample-old", "rel-sample-new"]);
    expect(useAppStore.getState().releases.find((release) => release.id === "rel-sample-old").version).toBe("v0.1");

    act(() => result.current.removeSampleReleases("proj-1"));
    expect(useAppStore.getState().releases.map((release) => release.id)).toEqual(["rel-real", "rel-sample-other"]);
    act(() => result.current.removeSampleReleases());
    expect(useAppStore.getState().releases.map((release) => release.id)).toEqual(["rel-real"]);
  });

  it("updates changelog entries and moves tasks between releases", () => {
    act(() => useAppStore.setState({
      releases: [
        { id: "a", version: "v1", taskIds: ["CY-1", "CY-2", "CY-3"], changelog: [{ id: "cl-1", type: "feature", text: "Old" }], deploymentTimeline: [] },
        { id: "b", version: "v2", taskIds: ["CY-3"], deploymentTimeline: [] },
      ],
    }));
    const { result } = renderActions();
    act(() => result.current.updateChangelogEntry("a", "cl-1", { text: "New", type: "bugfix" }));
    expect(useAppStore.getState().releases[0].changelog[0]).toEqual(expect.objectContaining({ id: "cl-1", text: "New", type: "bugfix" }));

    act(() => result.current.moveReleaseTasks("a", "b", ["CY-2", "CY-3"]));
    const [a, b] = useAppStore.getState().releases;
    expect(a.taskIds).toEqual(["CY-1"]);
    expect(b.taskIds).toEqual(["CY-3", "CY-2"]);
    expect(a.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "scope", text: "Moved 2 unfinished items to v2" }));
    expect(b.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "scope", text: "Received 2 items from v1" }));
  });
});
