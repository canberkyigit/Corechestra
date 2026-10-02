import { normalizeRelease } from "./releaseModel";
import {
  availableTransitions,
  buildEnvironmentPatch,
  buildStatusChangePatch,
  buildTransitionPatch,
  nextBuildId,
  transitionPath,
} from "./releaseLifecycle";

const NOW = new Date(2026, 9, 2, 12, 0, 0);

describe("releaseLifecycle", () => {
  it("lists transitions per status", () => {
    expect(availableTransitions("planned")).toEqual(expect.arrayContaining(["start", "cancel"]));
    expect(availableTransitions("in-progress")).toEqual(expect.arrayContaining(["freeze", "release", "replan", "cancel"]));
    expect(availableTransitions("released")).toEqual(["rollback"]);
    expect(availableTransitions("cancelled")).toEqual(["replan"]);
  });

  it("builds a start patch with start date and a canonical timeline event", () => {
    const release = normalizeRelease({ id: "r", version: "v1.0.0", status: "planned", deploymentTimeline: [{ id: "old" }] });
    const patch = buildTransitionPatch(release, "start", "alice", NOW);
    expect(patch.status).toBe("in-progress");
    expect(patch.startDate).toBe("2026-10-02");
    expect(patch.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "started", eventType: "started", actor: "alice", author: "alice" }));
    expect(patch.deploymentTimeline[1].id).toBe("old");
    expect(buildTransitionPatch(release, "release", "alice", NOW)).toBeNull();
  });

  it("releasing deploys production and stamps dates", () => {
    const release = normalizeRelease({ id: "r", version: "v1.0.0", status: "code-freeze" });
    const patch = buildTransitionPatch(release, "release", "alice", NOW);
    expect(patch).toEqual(expect.objectContaining({ status: "released", releaseDate: "2026-10-02", releasedAt: NOW.toISOString() }));
    expect(patch.environments.find((env) => env.key === "production")).toEqual(expect.objectContaining({ status: "deployed", version: "v1.0.0", deployedBy: "alice" }));
  });

  it("rollback marks production rolled back", () => {
    const release = normalizeRelease({ id: "r", version: "v1.0.0", status: "released", releaseDate: "2026-09-01" });
    const patch = buildTransitionPatch(release, "rollback", "bob", NOW);
    expect(patch.status).toBe("rolled-back");
    expect(patch.environments.find((env) => env.key === "production").status).toBe("rolled-back");
    expect(patch.deploymentTimeline[0].type).toBe("rollback");
  });

  it("finds multi-step paths for board moves", () => {
    expect(transitionPath("planned", "code-freeze")).toEqual(["start", "freeze"]);
    expect(transitionPath("planned", "released")).toEqual(["start", "release"]);
    expect(transitionPath("released", "planned")).toBeNull();
    const release = normalizeRelease({ id: "r", version: "v1", status: "planned" });
    const patch = buildStatusChangePatch(release, "code-freeze", "alice", NOW);
    expect(patch.status).toBe("code-freeze");
    expect(patch.startDate).toBe("2026-10-02");
    expect(patch.freezeDate).toBe("2026-10-02");
    expect(patch.deploymentTimeline.map((event) => event.type).slice(0, 2)).toEqual(["freeze", "started"]);
    expect(buildStatusChangePatch(normalizeRelease({ id: "x", status: "released" }), "planned")).toBeNull();
  });

  it("builds environment deploy/fail/rollback patches", () => {
    const release = normalizeRelease({ id: "r", version: "v2.0.0", status: "in-progress", deploymentTimeline: [{ type: "deploy" }] });
    expect(nextBuildId(release)).toBe("2.0.0+2");
    const deploy = buildEnvironmentPatch(release, "staging", "deploy", { actor: "alice", build: "2.0.0+2", now: NOW });
    expect(deploy.environments.find((env) => env.key === "staging")).toEqual(expect.objectContaining({ status: "deployed", version: "v2.0.0", build: "2.0.0+2" }));
    expect(deploy.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "deploy", environment: "staging", text: "Deployed v2.0.0 (2.0.0+2) to Staging" }));
    const fail = buildEnvironmentPatch(release, "production", "fail", { actor: "alice", now: NOW });
    expect(fail.environments.find((env) => env.key === "production").status).toBe("failed");
    expect(fail.deploymentTimeline[0].type).toBe("deploy-failed");
    expect(buildEnvironmentPatch(release, "dev", "explode")).toBeNull();
  });
});
