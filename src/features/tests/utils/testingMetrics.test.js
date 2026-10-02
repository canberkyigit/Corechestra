import {
  assigneeOf, automationCoverage, buildMyQueue, collectDefectLinks, collectExecutionEvents, cycleBurndown, derivePlanStatus,
  detectFlakyCases, executionTrend, latestPassRate, latestResultsByCase, passRateBySuite, releaseQuality, statusDistribution,
  summarizeRun, summarizeRuns, testerWorkload, topFailingCases,
} from "./testingMetrics";

const NOW = new Date("2026-10-02T12:00:00");
const iso = (daysAgo, hour = 10) => {
  const date = new Date(NOW);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const runA = {
  id: "A",
  name: "RC1",
  status: "completed",
  createdAt: iso(10),
  caseIds: ["c1", "c2", "c3", "c4"],
  assignments: { c1: "alice", c2: "bob" },
  assignedTester: "carol",
  results: [
    { caseId: "c1", status: "passed", executedAt: iso(9), executedBy: "alice" },
    { caseId: "c2", status: "failed", executedAt: iso(9), executedBy: "bob", defects: ["CY-1"] },
    { caseId: "c3", status: "blocked", executedAt: iso(8), executedBy: "carol" },
  ],
};
const runB = {
  id: "B",
  name: "RC2",
  status: "in-progress",
  createdAt: iso(3),
  startDate: iso(3).slice(0, 10),
  dueDate: iso(-3).slice(0, 10),
  caseIds: ["c1", "c2", "c5"],
  assignments: { c2: "alice", c5: "alice" },
  assignedTester: "bob",
  results: [
    { caseId: "c1", status: "failed", executedAt: iso(2), executedBy: "bob", attempts: [{ status: "passed", executedAt: iso(3), executedBy: "bob" }] },
    { caseId: "c2", status: "retest", executedAt: iso(1), executedBy: "alice" },
  ],
};

describe("testingMetrics", () => {
  it("summarizes a cycle over its scope", () => {
    expect(summarizeRun(runA)).toEqual(expect.objectContaining({
      total: 4, passed: 1, failed: 1, blocked: 1, untested: 1, executed: 3, open: 1, progress: 75, passRate: 33,
    }));
    expect(summarizeRun(runB)).toEqual(expect.objectContaining({ total: 3, failed: 1, retest: 1, untested: 1, open: 2, executed: 1 }));
  });

  it("resolves assignees with per-case override and cycle default", () => {
    expect(assigneeOf(runA, "c1")).toBe("alice");
    expect(assigneeOf(runA, "c4")).toBe("carol");
  });

  it("uses the newest execution per case and ignores untested rows", () => {
    const latest = latestResultsByCase([runA, runB, { id: "C", results: [{ caseId: "c3", status: "untested" }] }]);
    expect(latest.get("c1").status).toBe("failed");
    expect(latest.get("c2").status).toBe("retest");
    expect(latest.get("c3").status).toBe("blocked");
    expect(latestPassRate(latest)).toBe(0);
  });

  it("collects execution events including attempt history", () => {
    const events = collectExecutionEvents([runB]);
    expect(events.map((event) => event.status)).toEqual(["passed", "failed", "retest"]);
  });

  it("builds a daily trend for the window", () => {
    const trend = executionTrend([runA, runB], { days: 30, now: NOW });
    expect(trend).toHaveLength(30);
    expect(trend.reduce((sum, day) => sum + day.total, 0)).toBe(6);
    expect(trend[trend.length - 1].date).toBe("2026-10-02");
  });

  it("detects flaky cases from pass/fail flips", () => {
    const flakyRun = {
      id: "F",
      results: [{
        caseId: "x",
        status: "failed",
        executedAt: iso(1),
        attempts: [
          { status: "passed", executedAt: iso(4) },
          { status: "failed", executedAt: iso(3) },
          { status: "passed", executedAt: iso(2) },
        ],
      }, { caseId: "y", status: "passed", executedAt: iso(1), attempts: [{ status: "passed", executedAt: iso(2) }] }],
    };
    const flaky = detectFlakyCases([flakyRun]);
    expect(flaky.map((item) => item.caseId)).toEqual(["x"]);
    expect(flaky[0]).toEqual(expect.objectContaining({ flips: 3, lastStatus: "failed", score: 100 }));
  });

  it("ranks failing cases and tester workload", () => {
    expect(topFailingCases([runA, runB])).toEqual([
      expect.objectContaining({ caseId: "c1", failures: 1 }),
      expect.objectContaining({ caseId: "c2", failures: 1 }),
    ]);
    const workload = testerWorkload([runA, runB], { now: NOW, days: 30 });
    const alice = workload.find((item) => item.user === "alice");
    expect(alice).toEqual(expect.objectContaining({ open: 2, executed: 2 }));
  });

  it("computes status distribution, suite pass rates and automation coverage", () => {
    const cases = [
      { id: "c1", suiteId: "f1", automation: "automated", status: "ready" },
      { id: "c2", suiteId: "s1", automation: "manual", status: "ready", legacyResult: "passed" },
      { id: "c9", suiteId: "s2", automation: "to-be-automated", status: "deprecated" },
    ];
    const latest = new Map([["c1", { status: "failed" }]]);
    expect(statusDistribution(cases, latest).find((item) => item.status === "failed").count).toBe(1);
    expect(statusDistribution(cases, latest).find((item) => item.status === "passed").count).toBe(1);
    const suites = passRateBySuite(cases, latest, (id) => (id === "f1" ? "s1" : id), new Map([["s1", { name: "Web" }], ["s2", { name: "API" }]]));
    expect(suites.find((suite) => suite.suiteId === "s1")).toEqual(expect.objectContaining({ total: 2, passed: 1, failed: 1, passRate: 50 }));
    expect(automationCoverage(cases)).toEqual({ total: 2, automated: 1, planned: 0, percent: 50 });
  });

  it("builds a burndown with an ideal line to the due date", () => {
    const burndown = cycleBurndown(runB, { now: NOW });
    expect(burndown.total).toBe(3);
    expect(burndown.points[0].ideal).toBe(3);
    expect(burndown.points[burndown.points.length - 1].ideal).toBe(0);
    const today = burndown.points.find((point) => point.date === "2026-10-02");
    expect(today.remaining).toBe(2); // c1 executed (failed); c2 is retest; c5 untested
    expect(burndown.points[burndown.points.length - 1].remaining).toBeNull();
  });

  it("computes release quality via run.releaseId or plan.releaseId", () => {
    const caseById = new Map([["c2", { priority: "critical" }]]);
    const quality = releaseQuality("rel-1", { runs: [{ ...runA, planId: "p1" }, { ...runB, releaseId: "rel-2" }], plans: [{ id: "p1", releaseId: "rel-1" }], caseById });
    expect(quality).toEqual(expect.objectContaining({ total: 4, failed: 1, criticalFailures: 1, verdict: "at-risk" }));
    expect(releaseQuality("rel-x", { runs: [runA], plans: [] }).verdict).toBe("no-data");
  });

  it("builds my queue from open cycles only", () => {
    const queue = buildMyQueue([runA, runB], "alice");
    expect(queue).toHaveLength(1);
    expect(queue[0].run.id).toBe("B");
    expect(queue[0].open.map((item) => item.caseId)).toEqual(["c2", "c5"]);
  });

  it("collects defect links from cases and executions", () => {
    const links = collectDefectLinks([{ id: "c9", defectIds: ["CY-2"] }], [runA]);
    expect([...links.get("CY-1").caseIds]).toEqual(["c2"]);
    expect([...links.get("CY-1").runIds]).toEqual(["A"]);
    expect([...links.get("CY-2").caseIds]).toEqual(["c9"]);
  });

  it("aggregates multiple cycles and derives plan status", () => {
    expect(summarizeRuns([runA, runB])).toEqual(expect.objectContaining({ total: 5, failed: 1, retest: 1, blocked: 1 }));
    expect(derivePlanStatus({ status: "draft" }, [runA, runB])).toBe("in-progress");
    expect(derivePlanStatus({ status: "draft" }, [runA])).toBe("completed");
    expect(derivePlanStatus({ status: "draft", statusOverride: true }, [runB])).toBe("draft");
    expect(derivePlanStatus({ status: "draft" }, [{ status: "aborted" }])).toBe("aborted");
  });
});
