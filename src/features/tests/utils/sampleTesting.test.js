import { buildSampleTesting } from "./sampleTesting";
import { buildProjectTestingData } from "./testingModel";
import { buildMyQueue, detectFlakyCases } from "./testingMetrics";

const NOW = new Date("2026-10-02T12:00:00");
const tasks = [
  { id: "CY-1", type: "userstory", title: "Story", projectId: "proj-1" },
  { id: "CY-2", type: "feature", title: "Feature", projectId: "proj-1" },
  { id: "CY-3", type: "bug", title: "Bug", projectId: "proj-1" },
  { id: "CY-4", type: "task", title: "Task", projectId: "proj-1" },
];
const users = [
  { username: "alice", name: "Alice", role: "admin" },
  { username: "bob", name: "Bob", role: "member" },
  { username: "vera", name: "Vera", role: "viewer" },
];
const releases = [
  { id: "rel-planned", projectId: "proj-1", status: "planned", version: "v3" },
  { id: "rel-freeze", projectId: "proj-1", status: "code-freeze", version: "v2.6.0" },
  { id: "rel-other", projectId: "proj-2", status: "code-freeze", version: "v9" },
];

describe("buildSampleTesting", () => {
  const sample = buildSampleTesting({ projectId: "proj-1", tasks, users, releases, currentUser: "alice", now: NOW });

  it("produces a realistic, flagged, project-scoped dataset", () => {
    expect(sample.suites.length).toBe(11);
    expect(sample.suites.filter((suite) => !suite.parentId).map((suite) => suite.name)).toEqual(["Web App", "API", "Mobile"]);
    expect(sample.cases.length).toBeGreaterThanOrEqual(45);
    expect(sample.cases.length).toBeLessThanOrEqual(60);
    expect(sample.sharedSteps.map((group) => group.name)).toEqual(expect.arrayContaining(["Login as admin", "Create project", "Reset test data"]));
    expect(sample.plans).toHaveLength(2);
    expect(sample.runs.length).toBeGreaterThanOrEqual(4);
    expect(sample.runs.length).toBeLessThanOrEqual(6);
    const all = [...sample.suites, ...sample.cases, ...sample.sharedSteps, ...sample.plans, ...sample.runs];
    all.forEach((record) => {
      expect(record.sample).toBe(true);
      expect(record.projectId).toBe("proj-1");
      expect(record.id).toContain("-sample-");
    });
    expect(new Set(all.map((record) => record.id)).size).toBe(all.length);
    expect(new Set(sample.cases.map((testCase) => testCase.seq)).size).toBe(sample.cases.length);
  });

  it("links the release plan to the code-freeze release of the project", () => {
    expect(sample.plans[0].releaseId).toBe("rel-freeze");
    expect(sample.runs.filter((run) => run.planId === sample.plans[0].id).every((run) => run.releaseId === "rel-freeze")).toBe(true);
    const standalone = buildSampleTesting({ projectId: "proj-1", tasks, users, releases: [], currentUser: "alice", now: NOW });
    expect(standalone.plans[0].releaseId).toBeNull();
  });

  it("only links real tasks: requirements to stories/features/tasks, defects to bugs", () => {
    const taskIds = new Set(tasks.map((task) => task.id));
    const linkedReqs = sample.cases.flatMap((testCase) => testCase.requirementIds || []);
    expect(linkedReqs.length).toBeGreaterThan(20);
    linkedReqs.forEach((id) => expect(["CY-1", "CY-2", "CY-4"]).toContain(id));
    const defects = sample.runs.flatMap((run) => run.results.flatMap((result) => result.defects || []));
    expect(defects.length).toBeGreaterThan(0);
    defects.forEach((id) => expect(id).toBe("CY-3"));
    [...linkedReqs, ...defects].forEach((id) => expect(taskIds.has(id)).toBe(true));
    const noBugs = buildSampleTesting({ projectId: "proj-1", tasks: tasks.filter((task) => task.type !== "bug"), users, currentUser: "alice", now: NOW });
    expect(noBugs.runs.flatMap((run) => run.results.flatMap((result) => result.defects || []))).toEqual([]);
  });

  it("assigns real non-viewer testers and gives the current user open work", () => {
    const assignees = new Set(sample.runs.flatMap((run) => Object.values(run.assignments)));
    expect(assignees.has("vera")).toBe(false);
    const data = buildProjectTestingData({ testSuites: sample.suites, testCases: sample.cases, testRuns: sample.runs, testPlans: sample.plans, testSharedSteps: sample.sharedSteps, currentProjectId: "proj-1" });
    expect(data.cases).toHaveLength(sample.cases.length);
    expect(buildMyQueue(data.runs, "alice").reduce((sum, group) => sum + group.open.length, 0)).toBeGreaterThan(0);
    expect(detectFlakyCases(data.runs).length).toBeGreaterThanOrEqual(2);
    expect(data.runs.some((run) => run.results.some((result) => result.status === "failed" && result.stepResults?.some((step) => step.status === "failed" && step.actual)))).toBe(true);
  });

  it("is deterministic and never dates executions in the future", () => {
    const again = buildSampleTesting({ projectId: "proj-1", tasks, users, releases, currentUser: "alice", now: NOW });
    expect(again).toEqual(sample);
    const latest = Math.max(...sample.runs.flatMap((run) => run.results.map((result) => Date.parse(result.executedAt))));
    expect(latest).toBeLessThanOrEqual(NOW.getTime());
    const earliest = Math.min(...sample.runs.map((run) => Date.parse(run.createdAt)));
    expect((NOW.getTime() - earliest) / 86400000).toBeGreaterThan(28);
  });

  it("falls back to plausible testers without people records", () => {
    const fallback = buildSampleTesting({ projectId: "p", tasks: [], users: [], now: NOW });
    expect(Object.values(fallback.runs[2].assignments)[0]).toEqual(expect.any(String));
    expect(fallback.cases.every((testCase) => !testCase.requirementIds)).toBe(true);
  });
});
