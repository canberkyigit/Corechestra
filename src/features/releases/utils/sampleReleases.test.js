import { buildSampleReleases, isSampleRelease, SAMPLE_ID_PREFIX } from "./sampleReleases";
import { normalizeRelease } from "./releaseModel";

const NOW = new Date(2026, 9, 2, 12, 0, 0);

function makeTasks() {
  const statuses = ["done", "done", "done", "inprogress", "blocked", "todo", "review", "done", "todo", "done", "done", "todo"];
  return statuses.map((status, index) => ({
    id: `CY-${100 + index}`,
    title: `Task ${index}`,
    status,
    type: index % 3 === 0 ? "bug" : index % 3 === 1 ? "feature" : "task",
  }));
}

describe("buildSampleReleases", () => {
  it("builds 7 realistic sample releases for the project", () => {
    const releases = buildSampleReleases({ projectId: "proj-1", tasks: makeTasks(), users: [{ username: "alice" }, { username: "bob" }], currentUser: "alice", now: NOW });
    expect(releases).toHaveLength(7);
    releases.forEach((release) => {
      expect(release.id.startsWith(SAMPLE_ID_PREFIX)).toBe(true);
      expect(release.sample).toBe(true);
      expect(release.projectId).toBe("proj-1");
      expect(isSampleRelease(release)).toBe(true);
    });
    expect(new Set(releases.map((release) => release.id)).size).toBe(7);
    expect(releases.map((release) => [release.version, release.status])).toEqual([
      ["v2.3.0", "released"],
      ["v2.3.1", "released"],
      ["v2.4.0", "released"],
      ["v2.5.0", "code-freeze"],
      ["v2.5.1", "cancelled"],
      ["v2.6.0", "in-progress"],
      ["v3.0.0", "planned"],
    ]);
  });

  it("links only real task ids and never the same task twice", () => {
    const tasks = makeTasks();
    const known = new Set(tasks.map((task) => task.id));
    const releases = buildSampleReleases({ projectId: "p", tasks, now: NOW });
    const linked = releases.flatMap((release) => release.taskIds);
    linked.forEach((id) => expect(known.has(id)).toBe(true));
    expect(new Set(linked).size).toBe(linked.length);
    // Released releases only carry done work; code-freeze has unfinished work.
    const byVersion = Object.fromEntries(releases.map((release) => [release.version, release]));
    const status = (id) => tasks.find((task) => task.id === id).status;
    ["v2.3.0", "v2.3.1", "v2.4.0"].forEach((version) => byVersion[version].taskIds.forEach((id) => expect(status(id)).toBe("done")));
    expect(byVersion["v2.5.0"].taskIds.some((id) => status(id) !== "done")).toBe(true);
  });

  it("keeps taskIds empty without tasks and uses fallback actors", () => {
    const releases = buildSampleReleases({ projectId: "p", tasks: [], users: [], now: NOW });
    releases.forEach((release) => expect(release.taskIds).toEqual([]));
    expect(releases[0].owner).toBe("elif.kaya");
    expect(releases[0].changelog.length).toBeGreaterThan(3);
  });

  it("has dates around now and environments consistent with status", () => {
    const releases = buildSampleReleases({ projectId: "p", tasks: [], now: NOW }).map(normalizeRelease);
    const byVersion = Object.fromEntries(releases.map((release) => [release.version, release]));
    expect(byVersion["v2.5.0"].releaseDate).toBe("2026-10-06");
    expect(byVersion["v2.3.0"].releaseDate < "2026-07-01").toBe(true);
    expect(byVersion["v3.0.0"].releaseDate > "2026-12-01").toBe(true);
    ["v2.3.0", "v2.3.1", "v2.4.0"].forEach((version) => {
      expect(byVersion[version].environments.every((env) => env.status === "deployed")).toBe(true);
      expect(byVersion[version].checklist.every((item) => item.completed)).toBe(true);
    });
    expect(byVersion["v2.5.0"].environments.find((env) => env.key === "production").status).toBe("pending");
    expect(byVersion["v3.0.0"].environments.every((env) => env.status === "pending")).toBe(true);
    expect(byVersion["v2.4.0"].deploymentTimeline.some((event) => event.type === "env-rollback")).toBe(true);
    expect(byVersion["v2.5.0"].risks.some((risk) => risk.severity === "high")).toBe(true);
    expect(byVersion["v3.0.0"].changelog.some((entry) => entry.type === "breaking")).toBe(true);
  });

  it("is deterministic for the same input", () => {
    const a = buildSampleReleases({ projectId: "p", tasks: makeTasks(), now: NOW });
    const b = buildSampleReleases({ projectId: "p", tasks: makeTasks(), now: NOW });
    expect(a).toEqual(b);
  });
});
