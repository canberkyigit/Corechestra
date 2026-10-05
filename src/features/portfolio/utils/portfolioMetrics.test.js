import { buildPortfolio, computeProjectHealth, computeSprintPace, scoreToHealth, sortPortfolio, summarizePortfolio } from "./portfolioMetrics";

const now = new Date(2026, 9, 10, 12);
const project = { id: "p1", name: "Apollo" };

describe("portfolio health", () => {
  it("maps scores to health buckets", () => {
    expect(scoreToHealth(90)).toBe("on-track");
    expect(scoreToHealth(60)).toBe("at-risk");
    expect(scoreToHealth(20)).toBe("off-track");
  });

  it("computes sprint pace by points with elapsed time", () => {
    const pace = computeSprintPace(
      { startDate: "2026-10-05", endDate: "2026-10-15" },
      [{ status: "done", storyPoint: 3 }, { status: "todo", storyPoint: 9 }],
      now
    );
    expect(pace).toMatchObject({ total: 2, done: 1, progress: 25, elapsed: 50, daysLeft: 5 });
  });

  it("penalizes problems and explains them as signals", () => {
    const row = computeProjectHealth({
      project,
      sprint: { name: "S1", status: "active", startDate: "2026-10-01", endDate: "2026-10-11" },
      sprintTasks: [
        { id: "1", status: "blocked", priority: "high", type: "bug", dueDate: "2026-10-01" },
        { id: "2", status: "todo" },
        { id: "3", status: "todo" },
        { id: "4", status: "done" },
      ],
      backlogTasks: [{ id: "5", status: "todo" }],
      passRate: 55,
      now,
    });
    const keys = row.signals.map((signal) => signal.key);
    expect(keys).toEqual(expect.arrayContaining(["pace", "overdue", "blocked", "defects", "quality"]));
    expect(row.score).toBe(100 - 25 - 5 - 6 - 7 - 20);
    expect(row.calculatedHealth).toBe("off-track");
    expect(row.counts).toMatchObject({ total: 5, open: 4, overdue: 1, blocked: 1, openDefects: 1, urgentDefects: 1, backlog: 1 });
  });

  it("returns no-data for empty projects and prefers a fresh reported status", () => {
    expect(computeProjectHealth({ project, now }).calculatedHealth).toBe("no-data");

    const fresh = computeProjectHealth({
      project,
      sprintTasks: [{ id: "1", status: "todo" }],
      statusUpdates: [
        { id: "u1", projectId: "p1", health: "at-risk", createdAt: "2026-10-08T09:00:00.000Z" },
        { id: "u0", projectId: "p1", health: "off-track", createdAt: "2026-09-01T09:00:00.000Z" },
        { id: "other", projectId: "p2", health: "off-track", createdAt: "2026-10-09T09:00:00.000Z" },
      ],
      now,
    });
    expect(fresh).toMatchObject({ health: "at-risk", healthSource: "reported", calculatedHealth: "on-track" });
    expect(fresh.latestUpdate.id).toBe("u1");

    const stale = computeProjectHealth({
      project,
      sprintTasks: [{ id: "1", status: "todo" }],
      statusUpdates: [{ id: "u0", projectId: "p1", health: "off-track", createdAt: "2026-09-01T09:00:00.000Z" }],
      now,
    });
    expect(stale).toMatchObject({ health: "on-track", healthSource: "calculated" });
  });

  it("builds rows for every project from raw store data", () => {
    const rows = buildPortfolio({
      projects: [project, { id: "p2", name: "Borealis" }],
      currentProjectId: "p1",
      activeTasks: [
        { id: "a", status: "todo" }, // legacy, belongs to the current project
        { id: "b", status: "blocked", projectId: "p2", epicId: "e1" },
      ],
      perProjectBacklog: { p2: [{ id: 1, tasks: [{ id: "c", status: "done", projectId: "p2", epicId: "e1" }] }] },
      perProjectSprint: { p2: { name: "B1", status: "active" } },
      releases: [{ id: "r1", version: "2.0.0", status: "planned", projectId: "p2", releaseDate: "2026-10-20", taskIds: ["b"] }],
      goals: [{ id: "g1", projectId: "p2", period: "2026-Q4", keyResults: [{ type: "work", epicIds: ["e1"] }] }],
      now,
    });
    expect(rows.map((row) => row.counts.total)).toEqual([1, 2]);
    const borealis = rows[1];
    expect(borealis.nextRelease).toMatchObject({ version: "2.0.0", daysLeft: 10 });
    expect(borealis.goals[0].progress).toBe(50);
    expect(borealis.sprint).toMatchObject({ name: "B1", active: true });

    const summary = summarizePortfolio(rows, now);
    expect(summary).toMatchObject({ total: 2, open: 2, releasesSoon: 1 });
    expect(sortPortfolio(rows, "name").map((row) => row.project.name)).toEqual(["Apollo", "Borealis"]);
    expect(sortPortfolio(rows, "health")[0].project.name).toBe("Borealis");
  });
});
