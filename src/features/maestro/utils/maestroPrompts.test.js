import { buildMaestroSuggestions, buildPreviewAnswer, firstName, greetingFor } from "./maestroPrompts";

const data = {
  sprint: { name: "Sprint 86" },
  health: { status: "at-risk", workPct: 64, daysLeft: 5 },
  stats: {
    open: 9,
    done: 4,
    overdueTasks: 2,
    completedThisWeek: 3,
    statusCounts: { blocked: 1 },
    byStatus: { blocked: [{ id: "CY-1", title: "Login bug fix" }] },
  },
  workload: [
    { key: "__unassigned__", name: "Unassigned", open: 9 },
    { key: "bob", name: "bob", open: 4, openPoints: 8 },
    { key: "alice", name: "alice", open: 2, openPoints: 3 },
  ],
  release: {
    projectReleases: [
      { id: "r2", version: "2.1.0", status: "planned", releaseDate: "2026-11-01" },
      { id: "r1", version: "2.0.0", status: "in-progress", releaseDate: "2026-10-20" },
      { id: "r0", version: "1.9.0", status: "released", releaseDate: "2026-09-01" },
    ],
    metricsById: new Map([["r1", { readiness: { score: 72 } }]]),
  },
  testHealth: { passRate: 90 },
};

describe("maestro prompts", () => {
  it("greets by time of day and extracts a first name", () => {
    expect(greetingFor(new Date(2026, 0, 1, 9))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe("Good evening");
    expect(firstName("Canberk Yiğit")).toBe("Canberk");
    expect(firstName("jane.doe")).toBe("Jane");
    expect(firstName("")).toBe("");
  });

  it("builds context-aware suggestions from dashboard data", () => {
    const suggestions = buildMaestroSuggestions({ data, projectName: "Corechestra" });
    expect(suggestions).toHaveLength(6);
    expect(suggestions[0]).toMatchObject({ title: "Summarize Sprint 86 for stakeholders", context: "64% done · 5d left" });
    expect(suggestions[1].context).toBe("1 blocked · 2 overdue");
    expect(suggestions[2].context).toBe("bob has 4 open items");
    expect(suggestions[3]).toMatchObject({ title: "Is 2.0.0 ready to ship?", context: "72% ready · due 2026-10-20" });
  });

  it("builds the preview answer and falls back without a sprint", () => {
    const answer = buildPreviewAnswer({ data, projectName: "Corechestra" });
    expect(answer.question).toBe("How is Sprint 86 going?");
    expect(answer.headline).toBe("Sprint 86 is 64% complete with 5 days left — slightly behind pace.");
    expect(answer.points[0]).toContain("Login bug fix");
    expect(answer.sources).toEqual(["Board", "Releases", "Tests"]);

    const empty = buildPreviewAnswer({ data: { stats: { open: 0 } }, projectName: "Apollo" });
    expect(empty.headline).toBe("Apollo has no active sprint; 0 items are open.");
    expect(empty.points).toEqual(["Nothing is blocked right now."]);

    const overdue = buildPreviewAnswer({ data: { ...data, health: { status: "overdue", workPct: 40, daysLeft: 0 } } });
    expect(overdue.headline).toBe("Sprint 86 is 40% complete — past its end date.");
  });
});
