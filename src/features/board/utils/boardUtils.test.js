import { buildStatusOptions, groupTasksByColumn, UNMAPPED_COLUMN_ID } from "./boardColumns";
import {
  buildSwimlanes,
  encodeDroppableId,
  getDropAnchors,
  getLanePatch,
  parseDroppableId,
  toFullListIndex,
} from "./boardDnd";
import { buildBurndownSeries, buildVelocityHistory, getAverageVelocity, getSprintTotals } from "./sprintMetrics";
import { getUserColor } from "./userColors";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "custom_1", title: "QA" },
  { id: "done", title: "Done" },
];

describe("boardColumns", () => {
  it("groups tasks with unknown statuses into an Other / Unmapped column", () => {
    const { columns, groups } = groupTasksByColumn([
      { id: 1, status: "todo" },
      { id: 2, status: "removed_status" },
      { id: 3, status: "custom_1" },
    ], COLUMNS);

    expect(columns.map((column) => column.id)).toEqual(["todo", "custom_1", "done", UNMAPPED_COLUMN_ID]);
    expect(groups[UNMAPPED_COLUMN_ID].map((task) => task.id)).toEqual([2]);
    expect(groups.custom_1.map((task) => task.id)).toEqual([3]);
  });

  it("omits the unmapped column when every status is known", () => {
    expect(groupTasksByColumn([{ id: 1, status: "done" }], COLUMNS).columns).toHaveLength(3);
  });

  it("builds status options from custom columns and keeps an unmapped current status", () => {
    expect(buildStatusOptions(COLUMNS).map((option) => option.label)).toEqual(["To Do", "QA", "Done"]);
    expect(buildStatusOptions(COLUMNS, "legacy").at(-1)).toEqual({ value: "legacy", label: "legacy (unmapped)" });
  });
});

describe("boardDnd", () => {
  it("round-trips swimlane droppable ids", () => {
    const id = encodeDroppableId("todo", "bob");
    expect(id).not.toBe("todo");
    expect(parseDroppableId(id)).toEqual({ columnId: "todo", laneKey: "bob" });
    expect(parseDroppableId("todo")).toEqual({ columnId: "todo", laneKey: null });
  });

  it("maps rendered drop indices to neighbouring ids", () => {
    expect(getDropAnchors(["a", "b", "c"], "a", 1)).toEqual({ beforeTaskId: "c", afterTaskId: null });
    expect(getDropAnchors(["a", "b"], "x", 2)).toEqual({ beforeTaskId: null, afterTaskId: "b" });
    expect(getDropAnchors([], "x", 0)).toEqual({ beforeTaskId: null, afterTaskId: null });
  });

  it("converts a filtered drop index into a full-list index", () => {
    // Full list A B C D, filter shows only B and D; drop D before B.
    expect(toFullListIndex(["A", "B", "C", "D"], ["B", "D"], "D", 0)).toBe(1);
    // Drop B after D.
    expect(toFullListIndex(["A", "B", "C", "D"], ["B", "D"], "B", 1)).toBe(3);
  });

  it("builds swimlanes and lane patches per mode", () => {
    const tasks = [
      { id: 1, assignedTo: "bob", priority: "low", epicId: "e1" },
      { id: 2, assignedTo: "unassigned", priority: "critical" },
    ];
    expect(buildSwimlanes(tasks, "assignee", { teamMembers: [{ value: "bob", label: "Bob" }] }).map((lane) => lane.label))
      .toEqual(["Bob", "Unassigned"]);
    expect(buildSwimlanes(tasks, "priority").map((lane) => lane.key)).toEqual(["critical", "low"]);
    expect(buildSwimlanes(tasks, "epic", { epics: [{ id: "e1", title: "Auth" }] }).map((lane) => lane.label))
      .toEqual(["Auth", "No epic"]);
    expect(getLanePatch("assignee", "bob")).toEqual({ assignedTo: "bob" });
    expect(getLanePatch("epic", "none")).toEqual({ epicId: null });
    expect(getLanePatch("priority", "high")).toEqual({ priority: "high" });
  });
});

describe("sprintMetrics", () => {
  it("sums story points numerically (legacy strings included)", () => {
    expect(getSprintTotals([
      { status: "done", storyPoint: "3" },
      { status: "todo", storyPoint: 5 },
      { status: "todo", storyPoint: "" },
    ])).toEqual({ total: 8, done: 3, remaining: 5 });
  });

  it("derives velocity from completed sprint snapshots", () => {
    const completed = [
      { id: "cs-3", name: "Sprint 3", totalPoints: 20, completedPoints: 18 },
      { id: "cs-2", name: "Sprint 2", totalPoints: 15, completedPoints: 12 },
      { id: "cs-1", name: "Sprint 1", totalPoints: 10, completedPoints: 6 },
    ];
    expect(buildVelocityHistory(completed, 2).map((entry) => entry.name)).toEqual(["Sprint 2", "Sprint 3"]);
    expect(getAverageVelocity(completed, 3)).toBe(12);
    expect(getAverageVelocity([], 3)).toBeNull();
  });

  it("builds a burndown from persisted snapshots inside the sprint window", () => {
    const series = buildBurndownSeries({
      snapshots: [
        { date: "2026-03-01", total: 10, remaining: 10 },
        { date: "2026-03-02", total: 10, remaining: 7 },
        { date: "2026-02-20", total: 99, remaining: 99 },
      ],
      sprint: { startDate: "2026-03-01", endDate: "2026-03-05" },
      totals: { total: 10, done: 6, remaining: 4 },
      today: new Date("2026-03-03T12:00:00"),
    });

    expect(series.points.map((point) => point.date)).toEqual([
      "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05",
    ]);
    expect(series.points.map((point) => point.actual)).toEqual([10, 7, 4, null, null]);
    expect(series.points[0].ideal).toBe(10);
    expect(series.points[4].ideal).toBe(0);
  });
});

describe("userColors", () => {
  it("prefers the configured user color and falls back to a stable hash", () => {
    const users = [{ id: "u1", username: "bob", color: "#123456" }];
    expect(getUserColor("bob", users)).toBe("#123456");
    expect(getUserColor("zoe", users)).toBe(getUserColor("zoe", users));
    expect(getUserColor("unassigned", users)).toBe("#94a3b8");
  });
});
