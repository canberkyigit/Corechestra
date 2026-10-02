import { normalizeRelease } from "./releaseModel";
import {
  computeRunStats,
  buildTaskMap,
  computeChecklistProgress,
  computeKpis,
  computeQuality,
  computeReadiness,
  computeReleaseMetrics,
  computeRiskLevel,
  computeWorkProgress,
  countByStatusFilter,
  deriveRisks,
  matchesReleaseQuery,
  matchesStatusFilter,
  selectReleaseRuns,
  sortReleases,
} from "./releaseMetrics";

const NOW = new Date(2026, 9, 2, 12, 0, 0); // Oct 2, 2026 local

const TASKS = [
  { id: "CY-1", type: "feature", status: "done", storyPoint: 3 },
  { id: "CY-2", type: "bug", status: "blocked", storyPoint: 2 },
  { id: "CY-3", type: "task", status: "inprogress", storyPoint: 5 },
  { id: "CY-4", type: "defect", status: "done" },
];

describe("releaseMetrics", () => {
  it("computes work progress with story points and breakdowns", () => {
    const work = computeWorkProgress(TASKS);
    expect(work).toEqual(expect.objectContaining({
      total: 4, done: 2, open: 2, percent: 50, points: 10, pointsDone: 3, blocked: 1, openBugs: 1,
    }));
    expect(work.byStatus).toEqual({ done: 2, blocked: 1, inprogress: 1 });
    expect(work.byType.bug).toBe(1);
    expect(computeWorkProgress([]).percent).toBe(0);
  });

  it("computes checklist progress", () => {
    expect(computeChecklistProgress([{ completed: true }, { completed: false }, { completed: true }])).toEqual({ total: 3, done: 2, percent: 67 });
  });

  it("selects runs linked directly or through a plan, newest first", () => {
    const runs = selectReleaseRuns(
      { id: "rel-1" },
      [
        { id: "a", releaseId: "rel-1", createdAt: "2026-01-01" },
        { id: "b", planId: "plan-1", createdAt: "2026-02-01" },
        { id: "c", releaseId: "rel-2" },
      ],
      [{ id: "plan-1", releaseId: "rel-1" }]
    );
    expect(runs.map((run) => run.id)).toEqual(["b", "a"]);
  });

  it("uses the latest result per case for quality", () => {
    const quality = computeQuality([
      { id: "new", results: [{ caseId: "c1", status: "passed" }, { caseId: "c2", status: "failed" }, { caseId: "c3", status: "untested" }] },
      { id: "old", results: [{ caseId: "c1", status: "failed" }, { caseId: "c3", status: "passed" }] },
    ]);
    expect(quality).toEqual(expect.objectContaining({ passed: 2, failed: 1, passRate: 67, runCount: 2 }));
    expect(quality.failedCases).toEqual([expect.objectContaining({ caseId: "c2", runId: "new" })]);
    expect(computeQuality([]).passRate).toBeNull();
  });

  it("weights readiness and skips components without data", () => {
    const work = computeWorkProgress(TASKS);
    const readiness = computeReadiness({ checklist: { total: 2, done: 1, percent: 50 }, work, quality: { passRate: 100 } });
    // (50*30 + 50*40 + 100*20 + 50*10) / 100 = 60
    expect(readiness.score).toBe(60);
    expect(readiness.parts.map((part) => part.key)).toEqual(["checklist", "work", "quality", "blockers"]);
    expect(computeReadiness({ checklist: { total: 0 }, work: computeWorkProgress([]), quality: { passRate: null } }).score).toBe(0);
    expect(computeReadiness({ checklist: { total: 4, done: 4, percent: 100 }, work: computeWorkProgress([]), quality: { passRate: null } }).score).toBe(100);
  });

  it("derives risks for active releases only", () => {
    const work = computeWorkProgress(TASKS);
    const release = normalizeRelease({ id: "r", version: "v1", status: "code-freeze", releaseDate: "2026-10-04", environments: [{ key: "staging", status: "failed" }] });
    const risks = deriveRisks({ release, work, checklist: { total: 4, done: 1, percent: 25 }, quality: { failed: 2, passRate: 60 }, now: NOW });
    const ids = risks.map((risk) => risk.id);
    expect(ids).toEqual(expect.arrayContaining(["auto-blocked", "auto-tests", "auto-checklist", "auto-scope-after-freeze", "auto-env-failed"]));
    expect(risks.find((risk) => risk.id === "auto-checklist").severity).toBe("high");
    expect(computeRiskLevel(risks, "code-freeze")).toBe("high");

    const overdue = deriveRisks({ release: normalizeRelease({ id: "o", status: "planned", releaseDate: "2026-09-20" }), work: computeWorkProgress([]), checklist: { total: 0 }, quality: { failed: 0 }, now: NOW });
    expect(overdue[0]).toEqual(expect.objectContaining({ id: "auto-overdue", severity: "high", text: "Target date passed 12 days ago" }));

    const shipped = deriveRisks({ release: normalizeRelease({ id: "s", status: "released", releaseDate: "2026-01-01" }), work, checklist: { total: 0 }, quality: { failed: 3 }, now: NOW });
    expect(shipped).toEqual([]);
    expect(computeRiskLevel([], "released")).toBe("none");
    expect(computeRiskLevel([], "planned")).toBe("low");
    expect(computeRiskLevel([{ severity: "medium" }], "planned")).toBe("medium");
  });

  it("computes full metrics including manual risks", () => {
    const release = normalizeRelease({ id: "r", version: "v1", status: "in-progress", releaseDate: "2026-12-01", taskIds: ["CY-1", "CY-9"], risks: [{ id: "m", text: "Vendor", severity: "high" }] });
    const metrics = computeReleaseMetrics(release, { taskMap: buildTaskMap(TASKS), testRuns: [], testPlans: [], now: NOW });
    expect(metrics.linkedTasks).toHaveLength(1);
    expect(metrics.unresolvedTaskCount).toBe(1);
    expect(metrics.riskLevel).toBe("high");
    expect(metrics.risks).toEqual([expect.objectContaining({ id: "m" })]);
  });

  it("computes KPIs across project releases", () => {
    const releases = [
      normalizeRelease({ id: "a", version: "v1", status: "released", releaseDate: "2026-09-01" }),
      normalizeRelease({ id: "b", version: "v2", status: "code-freeze", releaseDate: "2026-10-06" }),
      normalizeRelease({ id: "c", version: "v3", status: "planned", releaseDate: "2026-12-01" }),
      normalizeRelease({ id: "d", version: "v0", status: "released", releaseDate: "2026-03-01" }),
    ];
    const metricsById = new Map([
      ["a", { readiness: { score: 100 }, riskLevel: "none", work: { blocked: 0 } }],
      ["b", { readiness: { score: 40 }, riskLevel: "high", work: { blocked: 2 } }],
      ["c", { readiness: { score: 20 }, riskLevel: "low", work: { blocked: 1 } }],
      ["d", { readiness: { score: 100 }, riskLevel: "none", work: { blocked: 0 } }],
    ]);
    const kpis = computeKpis(releases, metricsById, NOW);
    expect(kpis.next.id).toBe("b");
    expect(kpis.nextDays).toBe(4);
    expect(kpis).toEqual(expect.objectContaining({ inProgress: 1, releasedRecently: 1, avgReadiness: 30, atRisk: 1, openBlockers: 3, activeCount: 2 }));
  });

  it("filters, searches, counts and sorts", () => {
    const list = [
      normalizeRelease({ id: "a", version: "v1.10.0", name: "Ten", status: "released", releaseDate: "2026-01-01" }),
      normalizeRelease({ id: "b", version: "v1.9.0", name: "Nine", status: "cancelled", releaseDate: "2026-03-01" }),
      normalizeRelease({ id: "c", version: "v2.0.0", name: "Two", status: "planned", description: "Big bang" }),
    ];
    expect(list.filter((release) => matchesStatusFilter(release, "active")).map((r) => r.id)).toEqual(["c"]);
    expect(list.filter((release) => matchesStatusFilter(release, "closed")).map((r) => r.id)).toEqual(["b"]);
    expect(list.filter((release) => matchesReleaseQuery(release, "bang")).map((r) => r.id)).toEqual(["c"]);
    expect(countByStatusFilter(list)).toEqual(expect.objectContaining({ all: 3, active: 1, closed: 1, released: 1 }));
    const metrics = new Map([["a", { work: { percent: 100 } }], ["b", { work: { percent: 10 } }], ["c", { work: { percent: 50 } }]]);
    expect(sortReleases(list, "version", metrics).map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortReleases(list, "progress", metrics).map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortReleases(list, "date", metrics).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
});

describe("computeRunStats", () => {
  it("derives untested from scoped caseIds for cycles without seeded rows", () => {
    const stats = computeRunStats({
      caseIds: ["a", "b", "c", "d"],
      results: [
        { caseId: "a", status: "passed" },
        { caseId: "b", status: "blocked" },
        { caseId: "c", status: "retest" },
        { caseId: "zz", status: "failed" },
      ],
    });
    expect(stats).toMatchObject({ total: 4, passed: 1, blocked: 1, retest: 1, failed: 0, untested: 1 });
  });

  it("keeps legacy seeded untested rows when a run has no caseIds", () => {
    const stats = computeRunStats({ results: [{ caseId: "a", status: "untested" }, { caseId: "b", status: "failed" }] });
    expect(stats).toMatchObject({ total: 2, failed: 1, untested: 1, passRate: 0 });
  });
});
