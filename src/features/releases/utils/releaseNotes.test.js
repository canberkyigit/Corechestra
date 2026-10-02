import { changelogTypeForTask, generateNotesFromTasks, groupChangelog, releaseNotesFileName, releaseNotesMarkdown } from "./releaseNotes";
import { releasesToCsv } from "./releaseExport";

describe("releaseNotes", () => {
  it("maps task types to changelog types", () => {
    expect(changelogTypeForTask({ type: "bug" })).toBe("bugfix");
    expect(changelogTypeForTask({ type: "defect" })).toBe("bugfix");
    expect(changelogTypeForTask({ type: "feature" })).toBe("feature");
    expect(changelogTypeForTask({ type: "userstory" })).toBe("feature");
    expect(changelogTypeForTask({ type: "investigation" })).toBe("improvement");
    expect(changelogTypeForTask({})).toBe("improvement");
  });

  it("generates entries only for done, uncovered tasks", () => {
    const tasks = [
      { id: "CY-1", title: "Login page", type: "feature", status: "done" },
      { id: "CY-2", title: "Crash fix", type: "bug", status: "done" },
      { id: "CY-3", title: "WIP", type: "task", status: "inprogress" },
      { id: "CY-4", title: "Already noted", type: "task", status: "done" },
      { id: "CY-5", title: "  login PAGE ", type: "task", status: "done" },
      { id: "CY-6", title: "Docs refresh", type: "task", status: "done" },
    ];
    const existing = [{ text: "Something", taskId: "CY-4" }];
    const generated = generateNotesFromTasks(tasks, existing, { author: "alice", now: new Date("2026-10-02T00:00:00Z") });
    expect(generated.map((entry) => [entry.taskId, entry.type])).toEqual([
      ["CY-1", "feature"],
      ["CY-2", "bugfix"],
      ["CY-6", "improvement"],
    ]);
    expect(generated[0]).toEqual(expect.objectContaining({ author: "alice", generated: true, createdAt: "2026-10-02T00:00:00.000Z" }));
    // Running again over the result is a no-op (dedupe).
    expect(generateNotesFromTasks(tasks, [...existing, ...generated])).toEqual([]);
  });

  it("groups by type in canonical order and renders Markdown", () => {
    const release = {
      version: "v2.5.0",
      name: "Compass",
      status: "released",
      releasedAt: "2026-10-01T10:00:00Z",
      description: "Checkout v2.",
      changelog: [
        { id: "1", type: "bugfix", text: "Fixed crash", taskId: "CY-9" },
        { id: "2", type: "feature", text: "Saved cards" },
        { id: "3", type: "breaking", text: "API v1 removed" },
      ],
    };
    expect(groupChangelog(release.changelog).map((group) => group.type)).toEqual(["feature", "bugfix", "breaking"]);
    const md = releaseNotesMarkdown(release);
    expect(md).toContain("# v2.5.0 — Compass");
    expect(md).toContain("_Released Oct 1, 2026_");
    expect(md).toContain("## Features\n\n- Saved cards");
    expect(md).toContain("- Fixed crash (CY-9)");
    expect(md.indexOf("## Bug fixes")).toBeLessThan(md.indexOf("## Breaking changes"));
    expect(releaseNotesMarkdown({ version: "v1", changelog: [] })).toContain("_No release notes yet._");
    expect(releaseNotesFileName({ version: "v2.5.0 rc/1" })).toBe("release-notes-v2.5.0-rc-1.md");
  });

  it("exports CSV with escaping", () => {
    const releases = [{ id: "r", version: "v1", name: 'Big "bang", part 1', status: "in-progress", owner: "alice", releaseDate: "2026-10-06", environments: [{ key: "production", status: "pending" }] }];
    const metrics = new Map([["r", { work: { done: 1, total: 2, pointsDone: 3, points: 5 }, readiness: { score: 42 }, riskLevel: "medium" }]]);
    const csv = releasesToCsv(releases, metrics, [{ id: "u1", username: "alice", name: "Alice Admin" }]);
    const [header, row] = csv.split("\n");
    expect(header.startsWith("Version,Name,Status,Owner")).toBe(true);
    expect(row).toBe('v1,"Big ""bang"", part 1",In progress,Alice Admin,,,2026-10-06,,1,2,3,5,42,medium,pending');
  });
});
