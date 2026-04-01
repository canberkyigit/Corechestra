import {
  buildCoverageRows,
  buildInitialRunResults,
  buildPlanSummary,
  buildRerunFailedInput,
  getRunScopedCases,
} from "./testingOperations";

describe("testingOperations", () => {
  const cases = [
    {
      id: "tc-1",
      suiteId: "suite-a",
      title: "Login works",
      requirement: "User can log in",
      linkedTaskId: "task-1",
      linkedBugTaskId: "bug-9",
      regressionPacks: ["smoke"],
      status: "untested",
    },
    {
      id: "tc-2",
      suiteId: "suite-a",
      title: "Forgot password",
      requirement: "User can reset password",
      regressionPacks: ["regression"],
      status: "untested",
    },
  ];

  it("builds initial run results with actual-result support", () => {
    expect(buildInitialRunResults(cases)).toEqual([
      expect.objectContaining({
        caseId: "tc-1",
        status: "untested",
        actualResult: "",
        bugTaskId: "bug-9",
      }),
      expect.objectContaining({
        caseId: "tc-2",
        status: "untested",
        actualResult: "",
        bugTaskId: null,
      }),
    ]);
  });

  it("scopes run cases by regression pack or explicit case ids", () => {
    expect(getRunScopedCases({ regressionPack: "smoke" }, cases).map((item) => item.id)).toEqual(["tc-1"]);
    expect(getRunScopedCases({ caseIds: ["tc-2"] }, cases).map((item) => item.id)).toEqual(["tc-2"]);
  });

  it("builds coverage rows from cases and latest run results", () => {
    const runs = [
      {
        id: "run-1",
        createdAt: "2026-04-02T10:00:00.000Z",
        results: [
          { caseId: "tc-1", status: "failed" },
          { caseId: "tc-2", status: "passed" },
        ],
      },
    ];
    const rows = buildCoverageRows(cases, [{ id: "task-1", title: "Login requirement" }], runs);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          linkedTaskId: "task-1",
          failedCount: 1,
          coverageStatus: "at-risk",
        }),
        expect.objectContaining({
          requirement: "User can reset password",
          passedCount: 1,
          coverageStatus: "covered",
        }),
      ]),
    );
  });

  it("builds plan summary and failed-only rerun payload", () => {
    const plan = { id: "plan-1", suiteIds: ["suite-a"] };
    const runs = [
      {
        id: "run-1",
        suiteId: "suite-a",
        planId: "plan-1",
        status: "completed",
        results: [
          { caseId: "tc-1", status: "failed" },
          { caseId: "tc-2", status: "passed" },
        ],
      },
    ];
    expect(buildPlanSummary(plan, runs, cases)).toEqual(expect.objectContaining({
      totalRuns: 1,
      failed: 1,
      progressPercent: 100,
    }));
    expect(buildRerunFailedInput({
      id: "run-1",
      suiteId: "suite-a",
      name: "Auth run",
      results: runs[0].results,
      environment: "staging",
      platform: "web",
    })).toEqual(expect.objectContaining({
      suiteId: "suite-a",
      caseIds: ["tc-1"],
      name: "Auth run — Rerun Failed",
      environment: "staging",
      platform: "web",
    }));
  });
});
