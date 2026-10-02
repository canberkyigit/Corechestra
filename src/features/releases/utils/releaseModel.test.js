import {
  bumpVersion,
  compareVersions,
  nextAvailableVersion,
  normalizeRelease,
  normalizeReleaseStatus,
  normalizeReleases,
  sortedTimeline,
} from "./releaseModel";

describe("releaseModel", () => {
  it("normalizes legacy releases without new fields", () => {
    const legacy = {
      id: "rel-1",
      version: "1.2.0",
      status: "released",
      releaseDate: "2026-04-01",
      taskIds: ["CY-1", "CY-1", null],
      changelog: [{ id: "a", type: "fix", text: "Fixed" }, { id: "b", type: "feature", text: "" }],
      checklist: [{ title: "QA", completed: 1 }],
      extra: "kept",
    };
    const release = normalizeRelease(legacy);
    expect(release).toEqual(expect.objectContaining({
      status: "released",
      taskIds: ["CY-1"],
      startDate: "",
      freezeDate: "",
      risks: [],
      sample: false,
      extra: "kept",
      releasedAt: "2026-04-01T12:00:00.000Z",
    }));
    expect(release.changelog).toEqual([expect.objectContaining({ id: "a", type: "bugfix", text: "Fixed" })]);
    expect(release.checklist[0]).toEqual(expect.objectContaining({ id: "check-0", completed: true }));
    // Legacy released → all environments deployed with the version.
    expect(release.environments.map((env) => env.status)).toEqual(["deployed", "deployed", "deployed"]);
    expect(release.environments[2].version).toBe("1.2.0");
  });

  it("keeps stored environments and fills missing keys as pending", () => {
    const release = normalizeRelease({ id: "r", version: "v1", status: "in-progress", environments: [{ key: "dev", status: "deployed", version: "v1" }, { key: "staging", status: "weird" }] });
    expect(release.environments).toEqual([
      expect.objectContaining({ key: "dev", status: "deployed", version: "v1" }),
      expect.objectContaining({ key: "staging", status: "pending" }),
      expect.objectContaining({ key: "production", status: "pending" }),
    ]);
  });

  it("maps status aliases and unknown values", () => {
    expect(normalizeReleaseStatus("In Progress")).toBe("in-progress");
    expect(normalizeReleaseStatus("canceled")).toBe("cancelled");
    expect(normalizeReleaseStatus("code freeze")).toBe("code-freeze");
    expect(normalizeReleaseStatus(undefined)).toBe("planned");
    expect(normalizeReleaseStatus("nonsense")).toBe("planned");
  });

  it("drops invalid records and string risks become medium risks", () => {
    const list = normalizeReleases([null, { version: "no-id" }, { id: "x", risks: ["Vendor delay"] }]);
    expect(list).toHaveLength(1);
    expect(list[0].version).toBe("untitled");
    expect(list[0].risks[0]).toEqual(expect.objectContaining({ text: "Vendor delay", severity: "medium" }));
  });

  it("sorts timeline events newest first across both event shapes", () => {
    const events = sortedTimeline({
      deploymentTimeline: [
        { id: "1", type: "created", actor: "a", timestamp: "2026-01-01T00:00:00Z" },
        { id: "2", eventType: "deploy", author: "b", createdAt: "2026-03-01T00:00:00Z" },
      ],
    });
    expect(events.map((event) => event.id)).toEqual(["2", "1"]);
    expect(events[0]).toEqual(expect.objectContaining({ type: "deploy", actor: "b" }));
  });

  it("bumps semantic versions and keeps the v prefix", () => {
    expect(bumpVersion("v2.5.0", "patch")).toBe("v2.5.1");
    expect(bumpVersion("v2.5.3", "minor")).toBe("v2.6.0");
    expect(bumpVersion("2.5.3", "major")).toBe("3.0.0");
    expect(bumpVersion("v3.0.0-rc.1", "patch")).toBe("v3.0.1");
    expect(bumpVersion("v2", "minor")).toBe("v2.1.0");
    expect(bumpVersion("Winter", "patch")).toBe("Winter-next");
  });

  it("finds the next free version", () => {
    expect(nextAvailableVersion("v2.5.0", "patch", ["v2.5.1", "V2.5.2"])).toBe("v2.5.3");
    expect(nextAvailableVersion("v2.5.0", "minor", [])).toBe("v2.6.0");
  });

  it("compares versions numerically", () => {
    const sorted = ["v2.10.0", "v2.9.1", "v2.9.0", "v3.0.0-rc.1", "v3.0.0", "alpha"].sort(compareVersions);
    expect(sorted).toEqual(["v2.9.0", "v2.9.1", "v2.10.0", "v3.0.0-rc.1", "v3.0.0", "alpha"]);
  });
});
