import { buildTraceability, coverageStatus, sortTraceRows } from "./testingCoverage";

describe("testingCoverage", () => {
  it("derives coverage status", () => {
    const zero = { passed: 0, failed: 0, blocked: 0, skipped: 0, retest: 0, untested: 0 };
    expect(coverageStatus(zero, 0)).toBe("not-covered");
    expect(coverageStatus({ ...zero, untested: 2 }, 2)).toBe("not-run");
    expect(coverageStatus({ ...zero, passed: 2 }, 2)).toBe("passing");
    expect(coverageStatus({ ...zero, passed: 1, blocked: 1 }, 2)).toBe("failing");
    expect(coverageStatus({ ...zero, passed: 1, untested: 1 }, 2)).toBe("partial");
    expect(coverageStatus({ ...zero, retest: 1 }, 1)).toBe("partial");
  });

  it("builds rows for requirement types and any linked task", () => {
    const tasks = [
      { id: "CY-1", type: "userstory", title: "Story" },
      { id: "CY-2", type: "feature", title: "Feature" },
      { id: "CY-3", type: "task", title: "Linked task" },
      { id: "CY-4", type: "task", title: "Unlinked task" },
    ];
    const cases = [
      { id: "c1", requirementIds: ["CY-1"] },
      { id: "c2", requirementIds: ["CY-1", "CY-3"] },
      { id: "c3", requirementIds: ["CY-404"] },
    ];
    const latest = new Map([["c1", { status: "passed" }], ["c2", { status: "failed" }]]);
    const { rows, summary, orphanCaseIds } = buildTraceability({ cases, tasks, latestMap: latest });
    expect(rows.map((row) => row.task.id)).toEqual(["CY-1", "CY-2", "CY-3"]);
    expect(rows.find((row) => row.task.id === "CY-1")).toEqual(expect.objectContaining({ caseCount: 2, coverage: "failing" }));
    expect(rows.find((row) => row.task.id === "CY-2").coverage).toBe("not-covered");
    expect(summary).toEqual(expect.objectContaining({ total: 3, covered: 2, failing: 2, notCovered: 1, coveragePercent: 67 }));
    expect(orphanCaseIds).toEqual(["c3"]);
    expect(sortTraceRows(rows, "risk").map((row) => row.coverage)).toEqual(["failing", "failing", "not-covered"]);
    expect(sortTraceRows(rows, "cases")[0].task.id).toBe("CY-1");
  });
});
