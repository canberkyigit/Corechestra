import {
  createDeploymentTimelineEvent,
  hydrateReleaseDefaults,
  normalizeDeploymentTimeline,
  normalizeDeploymentTimelineEvent,
} from "./releasePlanning";

describe("releasePlanning timeline events", () => {
  it("creates events with canonical keys plus legacy aliases", () => {
    const event = createDeploymentTimelineEvent("started", "Release started", "alice");
    expect(event).toMatchObject({
      type: "started",
      eventType: "started",
      text: "Release started",
      actor: "alice",
      author: "alice",
    });
    expect(event.timestamp).toBe(event.createdAt);
    expect(event.id).toMatch(/^deploy-/);
  });

  it("normalizes every stored shape into { type, text, actor, timestamp }", () => {
    const helper = { id: "a", type: "created", text: "Release created", actor: "bob", timestamp: "2026-04-01T10:00:00.000Z" };
    const manual = { id: "b", eventType: "deploy", text: "Deployed", author: "carol", createdAt: "2026-04-02T10:00:00.000Z" };
    const merged = { id: "c", type: "started", eventType: "started", actor: "dave", author: "dave", timestamp: "2026-04-03T10:00:00.000Z", createdAt: "2026-04-03T10:00:00.000Z", text: "Started" };
    const legacy = { id: "d", eventType: "incident", label: "Pager", createdBy: "erin", createdAt: "2026-04-04T10:00:00.000Z" };

    expect(normalizeDeploymentTimeline([helper, manual, merged, legacy, null]).map(({ id, type, text, actor, timestamp }) => ({ id, type, text, actor, timestamp }))).toEqual([
      { id: "a", type: "created", text: "Release created", actor: "bob", timestamp: "2026-04-01T10:00:00.000Z" },
      { id: "b", type: "deploy", text: "Deployed", actor: "carol", timestamp: "2026-04-02T10:00:00.000Z" },
      { id: "c", type: "started", text: "Started", actor: "dave", timestamp: "2026-04-03T10:00:00.000Z" },
      { id: "d", type: "incident", text: "Pager", actor: "erin", timestamp: "2026-04-04T10:00:00.000Z" },
    ]);
    expect(normalizeDeploymentTimelineEvent(undefined)).toBeNull();
  });

  it("hydrates new releases with a normalized 'created' event", () => {
    const release = hydrateReleaseDefaults({ id: "rel-1", version: "1.0.0" }, null, "alice");
    expect(release.deploymentTimeline[0]).toMatchObject({ type: "created", eventType: "created", actor: "alice", author: "alice" });
  });
});
