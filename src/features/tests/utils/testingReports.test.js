import {
  buildCycleReport, buildReleaseReport, cycleReportCsv, cycleReportMarkdown, releaseReportCsv, releaseReportMarkdown, withCaseRows,
} from "./testingReports";
import { parseCsv } from "./testingCsv";

const caseById = new Map([
  ["c1", { id: "c1", key: "TC-1", title: "Login", priority: "critical" }],
  ["c2", { id: "c2", key: "TC-2", title: "Checkout | pay", priority: "high" }],
  ["c3", { id: "c3", key: "TC-3", title: "Logout", priority: "low" }],
]);
const run = {
  id: "r1",
  name: "RC1",
  status: "completed",
  environment: "staging",
  build: "1.0",
  owner: "alice",
  createdAt: "2026-09-01T10:00:00.000Z",
  completedAt: "2026-09-03T10:00:00.000Z",
  caseIds: ["c1", "c2", "c3"],
  assignments: { c3: "bob" },
  results: [
    { caseId: "c1", status: "passed", executedBy: "alice", durationSec: 60 },
    { caseId: "c2", status: "failed", executedBy: "alice", comment: "500", defects: ["CY-9"], durationSec: 30 },
  ],
};
const users = [{ username: "alice", name: "Alice A" }, { username: "bob", name: "Bob B" }];
const taskById = new Map([["CY-9", { id: "CY-9", title: "Pay fails", status: "todo" }]]);

describe("testingReports", () => {
  it("builds a cycle report by status, tester and priority", () => {
    const report = buildCycleReport(run, { caseById, users, taskById });
    expect(report.summary).toEqual(expect.objectContaining({ total: 3, passed: 1, failed: 1, untested: 1, passRate: 50 }));
    expect(report.totalDuration).toBe(90);
    expect(report.byTester.map((row) => [row.name, row.total])).toEqual([["Alice A", 2], ["Bob B", 1]]);
    expect(report.byPriority.map((row) => row.priority)).toEqual(["critical", "high", "low"]);
    expect(report.failures).toEqual([expect.objectContaining({ key: "TC-2", comment: "500" })]);
    expect(report.failures[0].defects[0]).toEqual(expect.objectContaining({ key: "CY-9", title: "Pay fails" }));
  });

  it("renders Markdown (escaping pipes) and CSV", () => {
    const report = withCaseRows(buildCycleReport(run, { caseById, users, taskById }), caseById);
    const md = cycleReportMarkdown(report, { users });
    expect(md).toContain("# Test cycle report — RC1");
    expect(md).toContain("Pass rate: **50%**");
    expect(md).toContain("Checkout \\| pay");
    expect(md).toContain("CY-9");
    const rows = parseCsv(cycleReportCsv(report, { users }));
    expect(rows[0][0]).toBe("Case");
    expect(rows).toHaveLength(4);
    expect(rows[2]).toEqual(expect.arrayContaining(["TC-2", "Failed", "CY-9", "500"]));
    expect(rows[3][4]).toBe("Bob B");
  });

  it("builds a release report across linked cycles", () => {
    const release = { id: "rel-1", version: "v1.0", name: "One" };
    const report = buildReleaseReport(release, { runs: [{ ...run, planId: "p1" }], plans: [{ id: "p1", releaseId: "rel-1" }], caseById, taskById });
    expect(report.quality.verdict).toBe("at-risk");
    expect(report.cycles).toHaveLength(1);
    expect(report.failing.map((item) => item.key)).toEqual(["TC-2"]);
    expect(report.openDefects.map((defect) => defect.id)).toEqual(["CY-9"]);
    expect(releaseReportMarkdown(report)).toContain("**Verdict:** At risk");
    expect(parseCsv(releaseReportCsv(report))[1][0]).toBe("RC1");
  });
});
