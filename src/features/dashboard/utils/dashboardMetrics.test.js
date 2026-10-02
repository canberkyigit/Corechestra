import {
  buildBurndownModel,
  buildDashboardCsv,
  computeDashboardStats,
  computeSprintHealth,
  computeVelocity,
  computeWorkload,
  csvCell,
  toPoints,
} from "./dashboardMetrics";

const pointTasks = [
  { id: 1, storyPoint: "5", status: "done" },
  { id: 2, storyPoint: 3, status: "todo" },
  { id: 3, storyPoint: "", status: "todo" },
];

describe("computeDashboardStats", () => {
  const now = new Date(2026, 3, 10, 12);
  const tasks = [
    { id: "CY-1", title: "Mine", status: "inprogress", assignedTo: "Alice", projectId: "p1", storyPoint: 3, statusChangedAt: "2026-04-01T09:00:00Z" },
    { id: "CY-2", title: "Done", status: "done", assignedTo: "alice", projectId: "p1", storyPoint: 5, epicId: "e1", statusChangedAt: "2026-04-08T09:00:00Z" },
    { id: "CY-3", title: "Other project", status: "todo", projectId: "p2" },
    { id: "CY-4", title: "Overdue", status: "blocked", dueDate: "2026-04-09", projectId: "p1", epicId: "e1" },
    { id: "CY-5", title: "Due today", status: "todo", dueDate: "2026-04-10", projectId: "p1", priority: "critical" },
  ];

  it("aggregates only the current project and derives attention signals", () => {
    const stats = computeDashboardStats({ activeTasks: tasks, currentProjectId: "p1", currentUser: "ALICE", now });
    expect(stats.total).toBe(4);
    expect(stats.statusCounts).toMatchObject({ inprogress: 1, done: 1, blocked: 1, todo: 1 });
    expect(stats.totalPoints).toBe(8);
    expect(stats.donePoints).toBe(5);
    expect(stats.pointsPct).toBe(63);
    expect(stats.myTasks.map((t) => t.id)).toEqual(["CY-1"]);
    // Due today is not overdue; yesterday is.
    expect(stats.overdue.map((t) => t.id)).toEqual(["CY-4"]);
    expect(stats.unassignedUrgent.map((t) => t.id)).toEqual(["CY-5"]);
    expect(stats.stale.map((t) => t.id)).toEqual(["CY-1"]);
    expect(stats.completedThisWeek).toBe(1);
    expect(stats.epicProgress.e1).toEqual({ total: 2, done: 1, points: 5, donePoints: 5 });
  });
});

describe("computeSprintHealth", () => {
  const stats = { total: 10, done: 2, completionPct: 20, totalPoints: 40, donePoints: 20, pointsPct: 50 };

  it("compares elapsed time with completed points", () => {
    const sprint = { startDate: "2026-04-01", endDate: "2026-04-11" };
    expect(computeSprintHealth({ sprint, stats, now: new Date(2026, 3, 6) })).toMatchObject({
      status: "on-track", timePct: 50, workPct: 50, daysLeft: 5, unit: "pts",
    });
    expect(computeSprintHealth({ sprint, stats, now: new Date(2026, 3, 9) })).toMatchObject({ status: "off-track", timePct: 80 });
    expect(computeSprintHealth({ sprint, stats, now: new Date(2026, 3, 8) })).toMatchObject({ status: "at-risk" });
    expect(computeSprintHealth({ sprint, stats, now: new Date(2026, 3, 20) })).toMatchObject({ status: "overdue", daysLeft: 0 });
    expect(computeSprintHealth({ sprint, stats, now: new Date(2026, 2, 20) })).toMatchObject({ status: "not-started" });
  });

  it("falls back to task counts without estimates and handles missing dates", () => {
    const unestimated = { ...stats, totalPoints: 0, donePoints: 0, pointsPct: 0 };
    expect(computeSprintHealth({ sprint: { endDate: "bogus" }, stats: unestimated })).toMatchObject({
      status: "no-dates", unit: "tasks", workPct: 20, scopeTotal: 10,
    });
    expect(computeSprintHealth({ sprint: null, stats })).toEqual({ status: "no-sprint" });
  });
});

describe("computeVelocity", () => {
  it("orders history oldest first, averages it and appends the current sprint", () => {
    const completed = [
      { id: "s3", name: "S3", completedPoints: 30, totalPoints: 32 },
      { id: "s2", name: "S2", completedPoints: 20, totalPoints: 25 },
      { id: "s1", name: "S1", completedPoints: 10, totalPoints: 20 },
    ];
    const v = computeVelocity({ completedSprints: completed, currentDonePoints: 7, currentCommitted: 30 });
    expect(v.bars.map((b) => b.name)).toEqual(["S1", "S2", "S3", "Current"]);
    expect(v.average).toBe(20);
    expect(v.trend).toBe(50);
    expect(v.bars[3]).toMatchObject({ current: true, done: 7, committed: 30 });
  });

  it("has no average before the first completed sprint", () => {
    expect(computeVelocity({ completedSprints: [] })).toMatchObject({ average: null, trend: null, sprintCount: 0 });
  });
});

describe("computeWorkload", () => {
  it("groups case-insensitively, resolves names and puts unassigned last", () => {
    const rows = computeWorkload({
      tasks: [
        { status: "todo" },
        { status: "blocked", assignedTo: "bob", storyPoint: 2 },
        { status: "done", assignedTo: "Bob", storyPoint: 3 },
        { status: "todo", assignedTo: "amy" },
        { status: "inprogress", assignedTo: "amy" },
      ],
      users: [{ username: "bob", name: "Bob Stone", color: "#123456" }],
    });
    expect(rows.map((r) => r.key)).toEqual(["amy", "bob", "__unassigned__"]);
    expect(rows[1]).toMatchObject({ name: "Bob Stone", open: 1, done: 1, blocked: 1, openPoints: 2, pct: 50 });
    expect(rows[2].name).toBe("Unassigned");
  });
});

describe("export + points helpers", () => {
  it("sums string story points numerically", () => {
    expect(pointTasks.reduce((sum, task) => sum + toPoints(task), 0)).toBe(8);
  });

  it("escapes CSV cells containing commas, quotes or newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("Doe, Jane")).toBe('"Doe, Jane"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
  });

  it("builds a CSV with task keys and epic names", () => {
    const csv = buildDashboardCsv({
      tasks: [{ id: "CY-7", title: "Fix, login", status: "review", priority: "high", epicId: "e1", storyPoint: "3" }],
      epics: [{ id: "e1", title: "Auth" }],
    });
    expect(csv.split("\n")[1]).toBe('CY-7,"Fix, login",task,Review,High,Unassigned,3,,Auth');
  });
});

describe("buildBurndownModel", () => {
  it("reports insufficient data instead of simulating a burndown", () => {
    const model = buildBurndownModel({
      tasks: pointTasks,
      sprint: { startDate: "2026-04-01", endDate: "2026-04-10" },
      snapshots: [{ date: "2026-04-02", remaining: 8, total: 8 }],
    });
    expect(model).toMatchObject({ status: "insufficient", snapshotCount: 1, remaining: 3, totalPoints: 8 });
  });

  it("uses the real sprint length and only snapshots inside the sprint window", () => {
    const model = buildBurndownModel({
      tasks: pointTasks,
      sprint: { startDate: "2026-04-01", endDate: "2026-04-21" },
      snapshots: [
        { date: "2026-03-20", remaining: 40, total: 40 },
        { date: "2026-04-01", remaining: 8, total: 8 },
        { date: "2026-04-05", remaining: 5, total: 8 },
        { date: "2026-04-25", remaining: 1, total: 8 },
      ],
    });
    expect(model.status).toBe("ready");
    expect(model.sprintDays).toBe(20);
    expect(model.xRange).toBe(20);
    expect(model.points).toEqual([
      { x: 0, y: 8, date: "2026-04-01" },
      { x: 4, y: 5, date: "2026-04-05" },
    ]);
    expect(model.idealStart).toBe(8);
  });

  it("falls back to the latest snapshots when the sprint has no valid dates", () => {
    const snapshots = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      remaining: 20 - i,
      total: 20,
    }));
    const model = buildBurndownModel({ tasks: pointTasks, sprint: { startDate: "", endDate: "bogus" }, snapshots });
    expect(model.status).toBe("ready");
    expect(model.hasSprintDates).toBe(false);
    expect(model.points).toHaveLength(14);
    expect(model.points[0]).toMatchObject({ x: 0, date: "2026-05-07" });
  });
});
