import {
  buildProjectTestingData,
  normalizeResult,
  normalizeSteps,
  normalizeTestCase,
  normalizeTestPlan,
  normalizeTestRun,
} from "./testingModel";

describe("testingModel normalization", () => {
  it("normalizes legacy cases (string steps, result status, single links, regression packs)", () => {
    const testCase = normalizeTestCase({
      id: "case-1",
      name: "Legacy",
      steps: "Open\n\nSubmit",
      status: "failed",
      priority: "urgent",
      linkedTaskId: "CY-1",
      linkedBugTaskId: "CY-9",
      regressionPacks: ["smoke"],
      tags: ["smoke", "auth"],
    });
    expect(testCase).toEqual(expect.objectContaining({
      title: "Legacy",
      priority: "medium",
      status: "ready",
      legacyResult: "failed",
      type: "functional",
      automation: "manual",
      requirementIds: ["CY-1"],
      defectIds: ["CY-9"],
      tags: ["smoke", "auth"],
    }));
    expect(testCase.steps).toEqual([
      { id: "case-1-s1", action: "Open", data: "", expected: "" },
      { id: "case-1-s2", action: "Submit", data: "", expected: "" },
    ]);
  });

  it("keeps rich steps and shared references", () => {
    expect(normalizeSteps([{ id: "a", action: "Do", expected: "Done" }, { id: "b", sharedStepsId: "tss-1" }, null], "c")).toEqual([
      { id: "a", action: "Do", data: "", expected: "Done" },
      { id: "b", sharedStepsId: "tss-1", action: "", data: "", expected: "" },
    ]);
  });

  it("normalizes legacy results and runs", () => {
    expect(normalizeResult({ caseId: "c1", status: "skipped", notes: "n", bugTaskId: "CY-2" })).toEqual(expect.objectContaining({
      comment: "n", defects: ["CY-2"], stepResults: [], attempts: [],
    }));
    const run = normalizeTestRun({
      id: "run-1",
      buildVersion: "1.2",
      status: "weird",
      results: [{ caseId: "c1", status: "failed" }, { caseId: "c1", status: "passed" }, { status: "passed" }],
    });
    expect(run).toEqual(expect.objectContaining({ status: "in-progress", build: "1.2", caseIds: ["c1"] }));
    expect(run.results).toHaveLength(1);
    expect(run.results[0].status).toBe("passed");
  });

  it("maps plan dueDate → endDate and notes → description", () => {
    expect(normalizeTestPlan({ id: "p", dueDate: "2026-10-01", notes: "n" })).toEqual(expect.objectContaining({ endDate: "2026-10-01", description: "n", suiteIds: [] }));
  });
});

describe("buildProjectTestingData", () => {
  const input = {
    currentProjectId: "proj-1",
    testSuites: [
      { id: "s1", projectId: "proj-1", name: "Web" },
      { id: "f1", parentId: "s1", name: "Auth" }, // folder inherits project from its root
      { id: "s2", projectId: "proj-2", name: "Other" },
      { id: "legacy", name: "Legacy" },
    ],
    testCases: [
      { id: "c1", suiteId: "s1", title: "A", seq: 3, createdAt: "2026-01-01" },
      { id: "c2", suiteId: "f1", title: "B", createdAt: "2026-01-02" },
      { id: "c3", suiteId: "s2", title: "C" },
      { id: "c4", suiteId: "legacy", title: "D", createdAt: "2026-01-03" },
    ],
    testRuns: [
      { id: "r-legacy", suiteId: "s1", results: [] },
      { id: "r-new", projectId: "proj-1", caseIds: ["c1"], createdAt: "2026-02-01" },
      { id: "r-other", projectId: "proj-2", caseIds: ["c3"] },
      { id: "r-plan", planId: "p1", caseIds: ["c2"] },
    ],
    testPlans: [{ id: "p1", projectId: "proj-1" }, { id: "p2", projectId: "proj-2" }],
    testSharedSteps: [{ id: "g1", projectId: "proj-1", name: "Login" }, { id: "g2", projectId: "proj-2", name: "X" }, { id: "g3", name: "Shared legacy" }],
  };

  it("scopes suites, folders, cases, runs, plans and shared steps to the project", () => {
    const data = buildProjectTestingData(input);
    expect(data.suites.map((suite) => suite.id)).toEqual(["s1", "f1", "legacy"]);
    expect(data.cases.map((testCase) => testCase.id)).toEqual(["c1", "c2", "c4"]);
    expect(data.runs.map((run) => run.id).sort()).toEqual(["r-legacy", "r-new", "r-plan"]);
    expect(data.plans.map((plan) => plan.id)).toEqual(["p1"]);
    expect(data.sharedSteps.map((group) => group.id)).toEqual(["g1", "g3"]);
    expect(data.tree.childrenById.get("s1").map((suite) => suite.id)).toEqual(["f1"]);
  });

  it("scopes legacy suite runs to all cases of the suite subtree", () => {
    const data = buildProjectTestingData(input);
    expect(data.runById.get("r-legacy").caseIds.sort()).toEqual(["c1", "c2"]);
  });

  it("assigns TC keys: persisted seq kept, legacy cases numbered after it", () => {
    const data = buildProjectTestingData(input);
    expect(data.caseById.get("c1").key).toBe("TC-3");
    expect(data.caseById.get("c2").key).toBe("TC-4");
    expect(data.caseById.get("c4").key).toBe("TC-5");
  });
});
