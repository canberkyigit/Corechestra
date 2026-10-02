import { buildBurndownModel, csvCell, toPoints } from "./ReportsPage";

jest.mock("../../../shared/context/AppContext", () => ({ useApp: jest.fn() }));

const tasks = [
  { id: 1, storyPoint: "5", status: "done" },
  { id: 2, storyPoint: 3, status: "todo" },
  { id: 3, storyPoint: "", status: "todo" },
];

describe("Reports helpers", () => {
  it("sums string story points numerically", () => {
    expect(tasks.reduce((sum, task) => sum + toPoints(task), 0)).toBe(8);
  });

  it("escapes CSV cells containing commas, quotes or newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("Doe, Jane")).toBe('"Doe, Jane"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
  });

  it("reports insufficient data instead of simulating a burndown", () => {
    const model = buildBurndownModel({
      tasks,
      sprint: { startDate: "2026-04-01", endDate: "2026-04-10" },
      snapshots: [{ date: "2026-04-02", remaining: 8, total: 8 }],
    });
    expect(model).toMatchObject({ status: "insufficient", snapshotCount: 1, remaining: 3, totalPoints: 8 });
  });

  it("uses the real sprint length and only snapshots inside the sprint window", () => {
    const model = buildBurndownModel({
      tasks,
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
    const model = buildBurndownModel({ tasks, sprint: { startDate: "", endDate: "bogus" }, snapshots });
    expect(model.status).toBe("ready");
    expect(model.hasSprintDates).toBe(false);
    expect(model.points).toHaveLength(14);
    expect(model.points[0]).toMatchObject({ x: 0, date: "2026-05-07" });
  });
});
