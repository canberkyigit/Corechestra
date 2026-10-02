// Read-side normalization for release records.
//
// Releases are persisted as-is in the `releases` domain. Records come from
// several generations of writers (legacy page, facade `createRelease`, sample
// seeding), so every view reads them through `normalizeRelease` which only
// fills defaults and never drops unknown fields. New optional fields:
//   startDate, freezeDate, releasedAt, environments[], risks[], sample.
import {
  CHANGELOG_TYPES,
  ENV_STATUSES,
  ENVIRONMENT_KEYS,
  RELEASE_STATUSES,
} from "../constants/releaseMeta";
import { normalizeDeploymentTimeline } from "../../../shared/utils/releasePlanning";

const asArray = (value) => (Array.isArray(value) ? value : []);

const STATUS_ALIASES = {
  inprogress: "in-progress",
  in_progress: "in-progress",
  "in progress": "in-progress",
  freeze: "code-freeze",
  codefreeze: "code-freeze",
  "code freeze": "code-freeze",
  rolledback: "rolled-back",
  rollback: "rolled-back",
  canceled: "cancelled",
  done: "released",
};

export function normalizeReleaseStatus(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (RELEASE_STATUSES.includes(raw)) return raw;
  return STATUS_ALIASES[raw] || "planned";
}

export function isActiveStatus(status) {
  return status === "planned" || status === "in-progress" || status === "code-freeze";
}

export function isShippedStatus(status) {
  return status === "released" || status === "rolled-back";
}

/** Default environment state consistent with the release status (legacy data). */
function defaultEnvironment(key, release, status) {
  const shipped = isShippedStatus(status);
  const deployedAt = release.releasedAt || (release.releaseDate ? `${release.releaseDate}T12:00:00.000Z` : null);
  if (shipped) {
    const rolledBack = status === "rolled-back" && key === "production";
    return {
      key,
      status: rolledBack ? "rolled-back" : "deployed",
      version: release.version || "",
      build: "",
      deployedAt,
      deployedBy: release.owner || null,
    };
  }
  return { key, status: "pending", version: "", build: "", deployedAt: null, deployedBy: null };
}

export function normalizeEnvironments(environments, release = {}, status = "planned") {
  const byKey = new Map(asArray(environments).filter((env) => env && env.key).map((env) => [env.key, env]));
  const hasStored = byKey.size > 0;
  return ENVIRONMENT_KEYS.map((key) => {
    const stored = byKey.get(key);
    if (!stored) return hasStored
      ? { key, status: "pending", version: "", build: "", deployedAt: null, deployedBy: null }
      : defaultEnvironment(key, release, status);
    return {
      key,
      status: ENV_STATUSES.includes(stored.status) ? stored.status : "pending",
      version: stored.version || "",
      build: stored.build || "",
      deployedAt: stored.deployedAt || null,
      deployedBy: stored.deployedBy || null,
    };
  });
}

export function normalizeChangelogEntry(entry, index = 0) {
  if (!entry || typeof entry !== "object") return null;
  const type = CHANGELOG_TYPES.includes(entry.type) ? entry.type : (entry.type === "fix" ? "bugfix" : "improvement");
  return {
    ...entry,
    id: entry.id || `cl-legacy-${index}`,
    type,
    text: String(entry.text || entry.title || "").trim(),
    taskId: entry.taskId || null,
  };
}

export function normalizeRisk(risk, index = 0) {
  if (!risk) return null;
  if (typeof risk === "string") return { id: `risk-legacy-${index}`, text: risk, severity: "medium", createdAt: null };
  return {
    ...risk,
    id: risk.id || `risk-legacy-${index}`,
    text: String(risk.text || "").trim(),
    severity: ["low", "medium", "high"].includes(risk.severity) ? risk.severity : "medium",
    createdAt: risk.createdAt || null,
  };
}

export function normalizeRelease(release) {
  if (!release || typeof release !== "object") return null;
  const status = normalizeReleaseStatus(release.status);
  return {
    ...release,
    id: release.id,
    version: String(release.version || "").trim() || "untitled",
    name: release.name || "",
    description: release.description || "",
    status,
    projectId: release.projectId || null,
    owner: release.owner || null,
    startDate: release.startDate || "",
    freezeDate: release.freezeDate || "",
    releaseDate: release.releaseDate || "",
    releasedAt: release.releasedAt || (status === "released" && release.releaseDate ? `${release.releaseDate}T12:00:00.000Z` : null),
    taskIds: [...new Set(asArray(release.taskIds).filter((id) => id !== null && id !== undefined && id !== ""))],
    changelog: asArray(release.changelog).map(normalizeChangelogEntry).filter((entry) => entry && entry.text),
    checklist: asArray(release.checklist).filter(Boolean).map((item, index) => ({
      ...item,
      id: item.id || `check-${index}`,
      title: item.title || item.label || "Checklist item",
      completed: Boolean(item.completed),
    })),
    environments: normalizeEnvironments(release.environments, release, status),
    risks: asArray(release.risks).map(normalizeRisk).filter((risk) => risk && risk.text),
    rollbackPlan: release.rollbackPlan || "",
    monitoringChecks: release.monitoringChecks || "",
    deploymentTimeline: asArray(release.deploymentTimeline),
    sample: Boolean(release.sample),
    createdAt: release.createdAt || null,
    updatedAt: release.updatedAt || release.createdAt || null,
  };
}

export function normalizeReleases(releases) {
  return asArray(releases).map(normalizeRelease).filter((release) => release && release.id);
}

/** Timeline newest-first regardless of insertion order. */
export function sortedTimeline(release) {
  return normalizeDeploymentTimeline(release?.deploymentTimeline)
    .slice()
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
}

// ── Semver helpers ─────────────────────────────────────────────────────────

const SEMVER_RE = /^(v?)(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/i;

export function parseVersion(version) {
  const match = String(version || "").trim().match(SEMVER_RE);
  if (!match) return null;
  return {
    prefix: match[1] || "",
    major: Number(match[2]),
    minor: Number(match[3] || 0),
    patch: Number(match[4] || 0),
    suffix: match[5] || "",
  };
}

/** Compares two version strings numerically; non-semver strings sort last, alphabetically. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa && pb) {
    return (pa.major - pb.major) || (pa.minor - pb.minor) || (pa.patch - pb.patch)
      || (pa.suffix ? -1 : 0) - (pb.suffix ? -1 : 0);
  }
  if (pa) return -1;
  if (pb) return 1;
  return String(a || "").localeCompare(String(b || ""));
}

/** `bumpVersion("v2.5.0", "minor") → "v2.6.0"`; keeps the `v` prefix, drops pre-release suffixes. */
export function bumpVersion(version, kind = "patch") {
  const parsed = parseVersion(version);
  if (!parsed) return `${String(version || "").trim() || "v0.0.0"}-next`;
  let { major, minor, patch } = parsed;
  if (kind === "major") { major += 1; minor = 0; patch = 0; }
  else if (kind === "minor") { minor += 1; patch = 0; }
  else { patch += 1; }
  return `${parsed.prefix}${major}.${minor}.${patch}`;
}

/** Bumps until the version is not already taken in `existingVersions`. */
export function nextAvailableVersion(version, kind, existingVersions = []) {
  const taken = new Set(existingVersions.map((v) => String(v).trim().toLowerCase()));
  let candidate = bumpVersion(version, kind);
  let guard = 0;
  while (taken.has(candidate.toLowerCase()) && guard < 50) {
    candidate = bumpVersion(candidate, "patch");
    guard += 1;
  }
  return candidate;
}
