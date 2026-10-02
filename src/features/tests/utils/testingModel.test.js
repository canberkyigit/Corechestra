import { buildProjectTestingData, normalizeTestCase, normalizeTestRun } from "./testingModel";

describe("testingModel", () => {
  it("normalizes legacy cases and runs without touching ids", () => {
    expect(normalizeTestCase({ id: "case-1-22", steps: "a\nb", priority: "urgent" })).toEqual(expect.objectContaining({
      id: "case-1-22",
      title: "Untitled case",
      steps: ["a", "b"],
      priority: "medium",
      status: "untested",
      regressionPacks: [],
      linkedTaskId: null,
    }));
    expect(normalizeTestRun({ id: "tr-1", results: [null, { caseId: "c1" }], status: "weird", updatedAt: "2026-01-01" })).toEqual(expect.objectContaining({
      id: "tr-1",
      status: "in-progress",
      caseIds: [],
      results: [{ caseId: "c1" }],
      createdAt: "2026-01-01",
    }));
  });

  it("scopes mixed-id data to the current project and infers legacy plan projects", () => {
    const data = buildProjectTestingData({
      currentProjectId: "proj-1",
      testSuites: [
        { id: "suite-1-1", projectId: "proj-1", name: "Legacy page suite" },
        { id: "ts-2", projectId: "proj-1", name: "Facade suite" },
        { id: "ts-3", projectId: "proj-2", name: "Other project" },
        { id: "ts-4", name: "No project" },
      ],
      testCases: [
        { id: "case-1", suiteId: "suite-1-1" },
        { id: "tc-2", suiteId: "ts-2" },
        { id: "tc-3", suiteId: "ts-3" },
      ],
      testRuns: [
        { id: "run-1", suiteId: "suite-1-1" },
        { id: "tr-3", suiteId: "ts-3" },
      ],
      testPlans: [
        { id: "plan-1", projectId: "proj-1", suiteIds: ["suite-1-1"] },
        { id: "tp-2", suiteIds: ["ts-3"] }, // legacy, inferred proj-2
        { id: "tp-3", suiteIds: [] }, // legacy, falls back to current project
      ],
    });
    expect(data.suites.map((suite) => suite.id)).toEqual(["suite-1-1", "ts-2", "ts-4"]);
    expect(data.cases.map((item) => item.id)).toEqual(["case-1", "tc-2"]);
    expect(data.runs.map((item) => item.id)).toEqual(["run-1"]);
    expect(data.plans.map((item) => item.id)).toEqual(["plan-1", "tp-3"]);
  });
});
