import { act, renderHook } from "@testing-library/react";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";
import { generateTestingId, useTestingActions } from "./useTestingActions";

function renderActions() {
  const state = useAppStore.getState();
  return renderHook(() => useTestingActions({
    currentUser: "alice",
    templateRegistry: {},
    setReleases: state.setReleases,
    setTestPlans: state.setTestPlans,
    setTestSuites: state.setTestSuites,
    setTestCases: state.setTestCases,
    setTestRuns: state.setTestRuns,
  }));
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

  it("creates records with unified defaults and returns them", () => {
    const { result } = renderActions();
    let suite;
    let testCase;
    let plan;
    act(() => {
      suite = result.current.createTestSuite({ name: "Auth" });
      testCase = result.current.createTestCase({ suiteId: suite.id, title: "Login", steps: "a\nb", priority: "critical" });
      plan = result.current.createTestPlan({ name: "Release", suiteIds: [suite.id, suite.id] });
    });
    const state = useAppStore.getState();
    expect(suite).toEqual(expect.objectContaining({ projectId: "proj-1", owner: "alice" }));
    expect(suite.id).toMatch(/^ts-/);
    expect(state.testSuites[0]).toEqual(suite);
    expect(state.testCases[0]).toEqual(expect.objectContaining({
      id: testCase.id, status: "untested", priority: "critical", steps: ["a", "b"], regressionPacks: [], linkedBugTaskId: null,
    }));
    expect(state.testPlans[0]).toEqual(expect.objectContaining({
      id: plan.id, projectId: "proj-1", status: "draft", statusOverride: false, suiteIds: [suite.id], assignedTester: "alice",
    }));
  });

  it("creates runs in batch with seeded results and records executions", () => {
    const { result } = renderActions();
    let runs;
    act(() => {
      runs = result.current.createTestRuns([
        { suiteId: "s1", name: "A", caseIds: ["c1", "c2"] },
        { suiteId: "s2", name: "B", caseIds: [] },
      ]);
    });
    expect(runs).toHaveLength(2);
    expect(runs[0].id).not.toBe(runs[1].id);
    expect(runs[0]).toEqual(expect.objectContaining({ status: "in-progress", completedAt: null }));
    expect(runs[0].results.map((row) => row.status)).toEqual(["untested", "untested"]);

    act(() => result.current.updateTestRunResult(runs[0].id, "c1", { status: "failed", notes: "boom" }));
    const updated = useAppStore.getState().testRuns.find((run) => run.id === runs[0].id);
    expect(updated.results[0]).toEqual(expect.objectContaining({ caseId: "c1", status: "failed", notes: "boom", executedBy: "alice" }));
    expect(updated.results[0].executedAt).toEqual(expect.any(String));

    act(() => result.current.deleteTestRun(runs[1].id));
    expect(useAppStore.getState().testRuns).toHaveLength(1);
  });

  it("cascades suite deletion to cases, runs and plan scopes (both id formats)", () => {
    act(() => useAppStore.setState({
      testSuites: [{ id: "suite-1-1", projectId: "proj-1" }, { id: "ts-2", projectId: "proj-1" }],
      testCases: [{ id: "case-1", suiteId: "suite-1-1" }, { id: "tc-2", suiteId: "ts-2" }],
      testRuns: [{ id: "run-1", suiteId: "suite-1-1" }, { id: "tr-2", suiteId: "ts-2", planId: "plan-1" }],
      testPlans: [{ id: "plan-1", suiteIds: ["suite-1-1", "ts-2"] }, { id: "tp-2", suiteIds: ["ts-2"] }],
    }));
    const { result } = renderActions();
    act(() => result.current.deleteTestSuite("suite-1-1"));
    const state = useAppStore.getState();
    expect(state.testSuites.map((suite) => suite.id)).toEqual(["ts-2"]);
    expect(state.testCases.map((item) => item.id)).toEqual(["tc-2"]);
    expect(state.testRuns.map((item) => item.id)).toEqual(["tr-2"]);
    expect(state.testPlans.find((plan) => plan.id === "plan-1").suiteIds).toEqual(["ts-2"]);
    expect(state.testPlans.find((plan) => plan.id === "tp-2").suiteIds).toEqual(["ts-2"]);

    act(() => result.current.deleteTestPlan("plan-1"));
    expect(useAppStore.getState().testRuns.find((run) => run.id === "tr-2").planId).toBeNull();
  });

  it("merges partial updates", () => {
    act(() => useAppStore.setState({ testPlans: [{ id: "plan-1", name: "Keep", status: "in-progress" }] }));
    const { result } = renderActions();
    act(() => result.current.updateTestPlan({ id: "plan-1", status: "draft", statusOverride: true }));
    expect(useAppStore.getState().testPlans[0]).toEqual(expect.objectContaining({ name: "Keep", status: "draft", statusOverride: true }));
  });
});
