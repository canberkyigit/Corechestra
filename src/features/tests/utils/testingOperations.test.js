import {
  buildBugFromFailure,
  buildCoverageRows,
  buildInitialRunResults,
  buildLatestExecutedResultMap,
  buildPlanSummary,
  buildRerunFailedInput,
  buildRunInput,
  buildSuiteAnalytics,
  canStartPlan,
  derivePlanStatus,
  findNextUntestedIndex,
  formatTestDate,
  getRunScopedCases,
  sortRunsByCreatedDesc,
  summarizeRun,
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

describe("testingOperations hardening", () => {
  const suiteCases = [
    { id: "c1", suiteId: "s1", regressionPacks: ["smoke"] },
    { id: "c2", suiteId: "s1", regressionPacks: [] },
    { id: "c3", suiteId: "s1", regressionPacks: ["smoke"] },
  ];

  it("summarizes a run over its scoped cases only", () => {
    const run = {
      caseIds: ["c1", "c3"],
      results: [
        { caseId: "c1", status: "passed" },
        { caseId: "c3", status: "untested" },
        { caseId: "c2", status: "failed" }, // out-of-scope legacy row
      ],
    };
    const scoped = getRunScopedCases(run, suiteCases);
    expect(scoped.map((item) => item.id)).toEqual(["c1", "c3"]);
    expect(summarizeRun(run, scoped)).toEqual(expect.objectContaining({
      total: 2, executed: 1, passed: 1, failed: 0, untested: 1, progressPercent: 50,
    }));
  });

  it("counts pre-seeded untested rows as untested", () => {
    const run = { caseIds: ["c1", "c2"], results: buildInitialRunResults(suiteCases.slice(0, 2)) };
    expect(summarizeRun(run, suiteCases.slice(0, 2)).untested).toBe(2);
  });

  it("finds the next untested case and wraps around", () => {
    const run = { results: [{ caseId: "c1", status: "passed" }, { caseId: "c3", status: "failed" }] };
    expect(findNextUntestedIndex(suiteCases, run, -1)).toBe(1);
    expect(findNextUntestedIndex(suiteCases, run, 1)).toBe(1);
    expect(findNextUntestedIndex(suiteCases, { results: suiteCases.map((c) => ({ caseId: c.id, status: "passed" })) }, 0)).toBe(3);
  });

  it("keeps the latest executed verdict even when newer runs seeded untested", () => {
    const map = buildLatestExecutedResultMap([
      { id: "r2", createdAt: "2026-05-02T00:00:00Z", results: [{ caseId: "c1", status: "untested" }] },
      { id: "r1", createdAt: "2026-05-01T00:00:00Z", results: [{ caseId: "c1", status: "failed" }] },
      { id: "r3", results: [{ caseId: "c2", status: "passed" }] }, // missing createdAt must not crash
    ]);
    expect(map.c1.status).toBe("failed");
    expect(map.c2.status).toBe("passed");
  });

  it("sorts runs safely when createdAt is missing", () => {
    const runs = [{ id: "a", createdAt: "2026-05-02T00:00:00Z" }, { id: "b" }, { id: "c", createdAt: "2026-05-03T00:00:00Z" }];
    expect(sortRunsByCreatedDesc(runs).map((run) => run.id)).toEqual(["c", "a", "b"]);
  });

  it("caps plan progress at 100% after reruns and respects the plan pack", () => {
    const plan = { id: "p1", suiteIds: ["s1"], regressionPack: "smoke" };
    const runs = [
      { id: "r1", planId: "p1", status: "completed", createdAt: "2026-05-01T00:00:00Z", results: [{ caseId: "c1", status: "failed" }, { caseId: "c3", status: "passed" }] },
      { id: "r2", planId: "p1", status: "completed", createdAt: "2026-05-02T00:00:00Z", results: [{ caseId: "c1", status: "passed" }] },
    ];
    const summary = buildPlanSummary(plan, runs, suiteCases);
    expect(summary.scopedCaseCount).toBe(2);
    expect(summary.progressPercent).toBe(100);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBe(2);
  });

  it("derives plan status with manual override and aborted handling", () => {
    expect(derivePlanStatus({ status: "draft" }, [])).toBe("draft");
    expect(derivePlanStatus({ status: "draft" }, [{ status: "in-progress" }])).toBe("in-progress");
    expect(derivePlanStatus({ status: "draft", statusOverride: true }, [{ status: "in-progress" }])).toBe("draft");
    expect(derivePlanStatus({ status: "in-progress" }, [{ status: "aborted" }, { status: "aborted" }])).toBe("aborted");
    expect(derivePlanStatus({ status: "in-progress" }, [{ status: "aborted" }, { status: "completed" }])).toBe("completed");
  });

  it("uses date order (not insertion order) for suite analytics", () => {
    const runs = [
      { id: "new", name: "New", status: "completed", createdAt: "2026-05-03T00:00:00Z", completedAt: "2026-05-03T01:00:00Z", caseIds: ["c1"], results: [{ caseId: "c1", status: "passed" }] },
      { id: "old", name: "Old", status: "completed", createdAt: "2026-05-01T00:00:00Z", completedAt: "2026-05-01T01:00:00Z", caseIds: ["c1"], results: [{ caseId: "c1", status: "failed" }] },
    ];
    const analytics = buildSuiteAnalytics(suiteCases, runs);
    expect(analytics.lastRun.id).toBe("new");
    expect(analytics.passRate).toBe(100);
    expect(analytics.trend.map((item) => item.run.id)).toEqual(["old", "new"]);
    expect(analytics.failureList[0]).toEqual(expect.objectContaining({ id: "c1", failCount: 1 }));
  });

  it("builds run input with explicit scope and tracks rerun source", () => {
    const input = buildRunInput("s1", { name: "Smoke", regressionPack: "smoke" }, suiteCases);
    expect(input).toEqual(expect.objectContaining({ suiteId: "s1", status: "in-progress", caseIds: ["c1", "c3"] }));
    expect(input.results).toHaveLength(2);
    expect(buildRerunFailedInput({ id: "r9", name: "R", results: [] }).rerunOf).toBe("r9");
  });

  it("builds a canonical bug payload from a failure", () => {
    const bug = buildBugFromFailure(
      { id: "c1", title: "Login", priority: "critical", expectedResult: "Dashboard" },
      { name: "Run A", environment: "uat" },
      { actualResult: "500" },
      { labels: [{ id: "lbl-qa", name: "QA" }] },
    );
    expect(bug).toEqual(expect.objectContaining({ type: "bug", priority: "critical", assignedTo: "unassigned", labels: ["lbl-qa"] }));
    expect(bug).not.toHaveProperty("assignee");
    expect(bug.description).toContain("Actual: 500");
    expect(bug.linkedItems[0]).toEqual(expect.objectContaining({ targetType: "test-case", targetId: "c1" }));
    expect(buildBugFromFailure({ id: "c1", title: "x" }, { name: "r" }).labels).toEqual([]);
  });

  it("formats invalid dates with a fallback", () => {
    expect(formatTestDate(undefined)).toBe("—");
    expect(formatTestDate("not-a-date")).toBe("—");
    expect(canStartPlan("draft")).toBe(true);
    expect(canStartPlan("in-progress")).toBe(false);
  });
});
