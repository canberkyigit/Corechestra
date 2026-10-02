// Pure lifecycle transitions. Each returns the *patch* to merge into a release
// (including the prepended timeline event) or null when not allowed.
import { createDeploymentTimelineEvent } from "../../../shared/utils/releasePlanning";
import { STATUS_META } from "../constants/releaseMeta";
import { toDateKey } from "./releaseUtils";

export const TRANSITIONS = {
  start:   { to: "in-progress", from: ["planned"], event: "started", label: "Start" },
  replan:  { to: "planned", from: ["in-progress", "code-freeze", "cancelled", "rolled-back"], event: "replanned", label: "Move to planned" },
  freeze:  { to: "code-freeze", from: ["in-progress"], event: "freeze", label: "Code freeze" },
  unfreeze:{ to: "in-progress", from: ["code-freeze"], event: "started", label: "Lift freeze" },
  release: { to: "released", from: ["in-progress", "code-freeze"], event: "release", label: "Release" },
  rollback:{ to: "rolled-back", from: ["released"], event: "rollback", label: "Roll back" },
  cancel:  { to: "cancelled", from: ["planned", "in-progress", "code-freeze"], event: "cancelled", label: "Cancel" },
};

export function availableTransitions(status) {
  return Object.entries(TRANSITIONS)
    .filter(([, def]) => def.from.includes(status))
    .map(([key]) => key);
}

/** Picks the transition key that moves `from` → `to` (used by board drag & drop). */
export function transitionForStatus(from, to) {
  if (from === to) return null;
  const direct = Object.entries(TRANSITIONS).find(([, def]) => def.to === to && def.from.includes(from));
  return direct ? direct[0] : null;
}

function eventText(key, release) {
  const label = release.version || release.name || "Release";
  switch (key) {
    case "start": return `${label} development started`;
    case "replan": return `${label} moved back to planned`;
    case "freeze": return `Code freeze for ${label} — only release blockers may merge`;
    case "unfreeze": return `Code freeze for ${label} lifted`;
    case "release": return `${label} released to production`;
    case "rollback": return `${label} rolled back in production`;
    case "cancel": return `${label} cancelled`;
    default: return `Status changed to ${STATUS_META[TRANSITIONS[key]?.to]?.label || key}`;
  }
}

function patchEnvironment(environments, key, patch) {
  return (environments || []).map((env) => (env.key === key ? { ...env, ...patch } : env));
}

/**
 * Builds the patch for a lifecycle transition.
 * @returns {object|null} fields to merge (status, dates, environments, deploymentTimeline)
 */
export function buildTransitionPatch(release, key, actor = null, now = new Date()) {
  const def = TRANSITIONS[key];
  if (!release || !def || !def.from.includes(release.status)) return null;
  const nowIso = now.toISOString();
  const today = toDateKey(now);
  const patch = { status: def.to };

  if (key === "start" && !release.startDate) patch.startDate = today;
  if (key === "freeze" && !release.freezeDate) patch.freezeDate = today;
  if (key === "release") {
    patch.releasedAt = nowIso;
    if (!release.releaseDate) patch.releaseDate = today;
    const prod = (release.environments || []).find((env) => env.key === "production");
    if (prod && prod.status !== "deployed") {
      patch.environments = patchEnvironment(release.environments, "production", {
        status: "deployed",
        version: release.version,
        deployedAt: nowIso,
        deployedBy: actor || null,
      });
    }
  }
  if (key === "rollback") {
    patch.environments = patchEnvironment(release.environments, "production", {
      status: "rolled-back",
      deployedAt: nowIso,
      deployedBy: actor || null,
    });
  }
  if (key === "replan" && (release.status === "rolled-back" || release.status === "cancelled")) {
    patch.releasedAt = null;
  }

  patch.deploymentTimeline = [
    createDeploymentTimelineEvent(def.event, eventText(key, release), actor, { timestamp: nowIso }),
    ...(release.deploymentTimeline || []),
  ];
  return patch;
}

/** Shortest chain of transition keys from `from` to `to` (BFS, ≤ 3 steps). */
export function transitionPath(from, to) {
  if (from === to) return [];
  // Shipped / closed releases only move through one explicit transition.
  if (!["planned", "in-progress", "code-freeze"].includes(from)) {
    const direct = transitionForStatus(from, to);
    return direct ? [direct] : null;
  }
  const queue = [{ status: from, path: [] }];
  const seen = new Set([from]);
  while (queue.length) {
    const { status, path } = queue.shift();
    if (path.length >= 3) continue;
    for (const key of availableTransitions(status)) {
      if ((key === "cancel" || key === "rollback") && TRANSITIONS[key].to !== to) continue;
      const next = TRANSITIONS[key].to;
      if (next === to) return [...path, key];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push({ status: next, path: [...path, key] });
      }
    }
  }
  return null;
}

/** Applies a chain of transitions (board drag & drop). Returns merged patch or null. */
export function buildStatusChangePatch(release, toStatus, actor = null, now = new Date()) {
  const path = transitionPath(release?.status, toStatus);
  if (!path || path.length === 0) return null;
  let current = release;
  let merged = {};
  for (const key of path) {
    const patch = buildTransitionPatch(current, key, actor, now);
    if (!patch) return null;
    merged = { ...merged, ...patch };
    current = { ...current, ...patch };
  }
  return merged;
}

const ENV_ACTION_EVENTS = {
  deploy: { status: "deployed", event: "deploy", verb: "Deployed" },
  start: { status: "deploying", event: "deploy", verb: "Deploying" },
  fail: { status: "failed", event: "deploy-failed", verb: "Deployment failed for" },
  rollback: { status: "rolled-back", event: "env-rollback", verb: "Rolled back" },
};

/** Environment deploy / fail / rollback patch (environments + timeline event). */
export function buildEnvironmentPatch(release, envKey, action, { actor = null, build = "", now = new Date() } = {}) {
  const def = ENV_ACTION_EVENTS[action];
  if (!release || !def) return null;
  const nowIso = now.toISOString();
  const envPatch = { status: def.status, deployedAt: nowIso, deployedBy: actor || null };
  if (action === "deploy" || action === "start") {
    envPatch.version = release.version;
    envPatch.build = build || "";
  }
  const label = { dev: "Development", staging: "Staging", production: "Production" }[envKey] || envKey;
  const text = action === "fail"
    ? `${def.verb} ${release.version} on ${label}`
    : `${def.verb} ${release.version}${build && action !== "rollback" ? ` (${build})` : ""} ${action === "rollback" ? "on" : "to"} ${label}`;
  return {
    environments: patchEnvironment(release.environments, envKey, envPatch),
    deploymentTimeline: [
      createDeploymentTimelineEvent(def.event, text, actor, { timestamp: nowIso, environment: envKey }),
      ...(release.deploymentTimeline || []),
    ],
  };
}

/** Next build id for an environment: `<version>+<n>` based on timeline deploy count. */
export function nextBuildId(release) {
  const count = (release?.deploymentTimeline || []).filter((event) => (event.type || event.eventType) === "deploy").length;
  const base = String(release?.version || "build").replace(/^v/i, "");
  return `${base}+${count + 1}`;
}
