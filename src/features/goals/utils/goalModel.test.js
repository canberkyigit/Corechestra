import {
  buildEpicWorkIndex,
  buildGoalTree,
  deriveGoal,
  goalHealth,
  goalProgress,
  keyResultProgress,
  normalizeGoalInput,
  periodElapsed,
  periodLabel,
  periodRange,
  quarterKey,
  summarizeGoals,
} from "./goalModel";
import { buildSampleGoals } from "./sampleGoals";

const createId = (prefix) => `${prefix}-test`;

describe("goal periods", () => {
  it("derives quarter keys, ranges and labels", () => {
    expect(quarterKey(new Date(2026, 9, 5))).toBe("2026-Q4");
    expect(periodRange("2026-Q4")).toEqual({ start: new Date(2026, 9, 1), end: new Date(2027, 0, 1) });
    expect(periodRange("2026")).toEqual({ start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) });
    expect(periodRange("nope")).toBeNull();
    expect(periodLabel("2026-Q4")).toBe("Q4 2026");
    expect(periodLabel("2026")).toBe("FY 2026");
  });

  it("computes the elapsed share of a period", () => {
    expect(periodElapsed("2026-Q4", new Date(2026, 8, 1))).toBe(0);
    expect(periodElapsed("2026-Q4", new Date(2026, 10, 16))).toBe(50);
    expect(periodElapsed("2026-Q4", new Date(2027, 1, 1))).toBe(100);
  });
});

describe("key result progress", () => {
  it("handles metric (also decreasing), milestone and linked-work key results", () => {
    expect(keyResultProgress({ type: "metric", start: 0, target: 200, current: 50 })).toBe(25);
    expect(keyResultProgress({ type: "metric", start: 12, target: 3, current: 6 })).toBe(67);
    expect(keyResultProgress({ type: "metric", start: 0, target: 10, current: 40 })).toBe(100);
    expect(keyResultProgress({ type: "milestone", done: true })).toBe(100);
    expect(keyResultProgress({ type: "milestone", done: false })).toBe(0);

    const workIndex = buildEpicWorkIndex([
      { epicId: "e1", status: "done" },
      { epicId: "e1", status: "todo" },
      { epicId: "e2", status: "done" },
      { epicId: null, status: "done" },
    ]);
    expect(workIndex).toEqual({ e1: { total: 2, done: 1 }, e2: { total: 1, done: 1 } });
    expect(keyResultProgress({ type: "work", epicIds: ["e1", "e2"] }, workIndex)).toBe(67);
    expect(keyResultProgress({ type: "work", epicIds: ["missing"] }, workIndex)).toBe(0);
  });

  it("averages key results into goal progress", () => {
    const goal = { keyResults: [{ type: "milestone", done: true }, { type: "metric", start: 0, target: 100, current: 0 }] };
    expect(goalProgress(goal)).toBe(50);
    expect(goalProgress({ keyResults: [] })).toBe(0);
  });
});

describe("goal health", () => {
  const now = new Date(2026, 10, 16); // half way through Q4
  const goal = { period: "2026-Q4", keyResults: [{ type: "milestone" }] };

  it("compares progress with elapsed time", () => {
    expect(goalHealth(goal, 45, now)).toBe("on-track");
    expect(goalHealth(goal, 30, now)).toBe("at-risk");
    expect(goalHealth(goal, 10, now)).toBe("off-track");
    expect(goalHealth(goal, 100, now)).toBe("done");
    expect(goalHealth({ ...goal, period: "2027-Q1" }, 0, now)).toBe("not-started");
    expect(goalHealth({ period: "2026-Q4", keyResults: [] }, 0, now)).toBe("no-data");
  });

  it("lets a reported health win until the goal is achieved", () => {
    expect(goalHealth({ ...goal, health: "at-risk" }, 60, now)).toBe("at-risk");
    expect(goalHealth({ ...goal, health: "at-risk" }, 100, now)).toBe("done");
  });

  it("derives goals and summarizes them", () => {
    const derived = [
      deriveGoal({ id: "a", period: "2026-Q4", keyResults: [{ type: "metric", start: 0, target: 10, current: 5 }] }, {}, now),
      deriveGoal({ id: "b", period: "2026-Q4", keyResults: [{ type: "milestone", done: false }] }, {}, now),
    ];
    expect(derived[0]).toMatchObject({ progress: 50, expected: 50, healthKey: "on-track", krProgress: [50] });
    expect(summarizeGoals(derived)).toMatchObject({ total: 2, avgProgress: 25, keyResults: 2, counts: { "on-track": 1, "off-track": 1 } });
  });
});

describe("goal tree and normalization", () => {
  it("nests goals by parentId and survives cycles", () => {
    const tree = buildGoalTree([
      { id: "p", level: "project", title: "P", parentId: "t" },
      { id: "t", level: "team", title: "T", parentId: "c" },
      { id: "c", level: "company", title: "C" },
      { id: "x", level: "team", title: "X", parentId: "y" },
      { id: "y", level: "team", title: "Y", parentId: "x" },
    ]);
    expect(tree.map((node) => node.id)).toContain("c");
    const company = tree.find((node) => node.id === "c");
    expect(company.children[0].id).toBe("t");
    expect(company.children[0].children[0].id).toBe("p");
    const flatIds = [];
    const walk = (nodes) => nodes.forEach((node) => { flatIds.push(node.id); walk(node.children); });
    walk(tree);
    expect(flatIds.sort()).toEqual(["c", "p", "t", "x", "y"]);
  });

  it("normalizes goal input and key results", () => {
    const goal = normalizeGoalInput({
      title: "  Grow  ",
      level: "team",
      teamId: "team-1",
      projectId: "ignored",
      period: "bad",
      health: "weird",
      keyResults: [{ title: "Users", type: "metric", start: "5", target: "50", current: "" }, { type: "work", epicIds: ["e1", "e1", 2] }],
    }, createId);
    expect(goal).toMatchObject({ title: "Grow", level: "team", teamId: "team-1", projectId: null, health: null });
    expect(goal.period).toMatch(/^\d{4}-Q[1-4]$/);
    expect(goal.keyResults[0]).toEqual({ id: "kr-test", title: "Users", type: "metric", start: 5, target: 50, current: 0, unit: "" });
    expect(goal.keyResults[1]).toEqual({ id: "kr-test", title: "Untitled key result", type: "work", epicIds: ["e1", "2"] });
  });

  it("builds an aligned sample OKR tree from workspace data", () => {
    const goals = buildSampleGoals({
      projects: [{ id: "p1", name: "Apollo" }],
      teams: [{ id: "t1", name: "Core", memberNames: ["alice"] }],
      epics: [{ id: "e1", title: "Payments", projectId: "p1" }],
      users: [{ username: "alice", status: "active" }],
      currentUser: "alice",
      now: new Date(2026, 9, 5),
    });
    expect(goals.every((goal) => goal.sample && goal.period === "2026-Q4")).toBe(true);
    const project = goals.find((goal) => goal.level === "project");
    expect(project).toMatchObject({ projectId: "p1", parentId: "goal-sample-team-1" });
    expect(project.keyResults[0]).toMatchObject({ type: "work", epicIds: ["e1"] });
    expect(new Set(goals.flatMap((goal) => goal.keyResults.map((kr) => kr.id))).size).toBe(goals.flatMap((goal) => goal.keyResults).length);
  });
});
