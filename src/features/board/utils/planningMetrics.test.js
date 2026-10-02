import {
  buildMemberLoad,
  buildPlanningMembers,
  getLoadTone,
  getPlanningReadiness,
  getSprintTiming,
  refineTasks,
} from "./planningMetrics";

describe("planningMetrics", () => {
  const users = [
    { id: "u-1", username: "taro", name: "Taro" },
    { id: "u-2", username: "taro", name: "Taro duplicate" },
    { id: "u-3", username: "gone", name: "Gone", status: "deleted" },
    { id: "u-4", username: "mia", name: "Mia" },
  ];

  it("dedupes project members and skips deleted people", () => {
    const members = buildPlanningMembers(users, { memberUsernames: ["taro", "gone", "mia"] });
    expect(members.map((m) => m.id)).toEqual(["u-1", "u-4"]);
  });

  it("splits sprint load per member and tracks unassigned work", () => {
    const members = buildPlanningMembers(users, null);
    const load = buildMemberLoad(members, [
      { id: "a", storyPoint: 5, assignedTo: "taro" },
      { id: "b", storyPoint: 3, assignedTo: { username: "mia" } },
      { id: "c", storyPoint: 2, assignedTo: "unassigned" },
      { id: "d", storyPoint: 1, assignedTo: "outsider" },
    ], { "u-1": 50 });

    expect(load.rows.map((row) => [row.member.id, row.capacity, row.assigned])).toEqual([
      ["u-1", 5, 5],
      ["u-4", 8, 3],
    ]);
    expect(load.unassignedSP).toBe(2);
    expect(load.otherSP).toBe(1);
  });

  it("classifies load tones", () => {
    expect(getLoadTone(0, 10)).toBe("idle");
    expect(getLoadTone(5, 10)).toBe("ok");
    expect(getLoadTone(9, 10)).toBe("near");
    expect(getLoadTone(11, 10)).toBe("over");
    expect(getLoadTone(1, 0)).toBe("over");
  });

  it("counts working days and the sprint phase", () => {
    const sprint = { startDate: "2026-03-23", endDate: "2026-04-03" };
    expect(getSprintTiming(sprint, new Date(2026, 2, 20))).toMatchObject({ workingDays: 10, phase: "upcoming", label: "Starts in 3 days" });
    expect(getSprintTiming(sprint, new Date(2026, 3, 1))).toMatchObject({ phase: "active", label: "2 days left" });
    expect(getSprintTiming(sprint, new Date(2026, 3, 5))).toMatchObject({ phase: "ended" });
    expect(getSprintTiming({}).hasWindow).toBe(false);
  });

  it("builds the readiness checklist", () => {
    const readiness = getPlanningReadiness({
      sprint: { goal: "" },
      tasks: [{ id: "a", storyPoint: 3, assignedTo: "taro" }, { id: "b" }],
      committedSP: 3,
      capacitySP: 10,
      avgVelocity: 2,
    });
    const byKey = Object.fromEntries(readiness.checks.map((check) => [check.key, check.ok]));
    expect(byKey).toEqual({ goal: false, scope: true, estimated: false, assigned: false, capacity: true, velocity: false });
    expect(readiness).toMatchObject({ passed: 2, total: 6, unestimated: 1, unassigned: 1 });
  });

  it("searches, filters and sorts backlog items", () => {
    const tasks = [
      { id: "CY-1", title: "Low thing", priority: "low", storyPoint: 8 },
      { id: "CY-2", title: "Critical bug", priority: "critical", type: "bug" },
      { id: "CY-3", title: "Medium", priority: "medium", storyPoint: 3 },
    ];
    expect(refineTasks(tasks, { query: "cy-2" }).map((t) => t.id)).toEqual(["CY-2"]);
    expect(refineTasks(tasks, { quickFilter: "unestimated" }).map((t) => t.id)).toEqual(["CY-2"]);
    expect(refineTasks(tasks, { sort: "priority" }).map((t) => t.id)).toEqual(["CY-2", "CY-3", "CY-1"]);
    expect(refineTasks(tasks, { sort: "points" }).map((t) => t.id)).toEqual(["CY-1", "CY-3", "CY-2"]);
  });
});
