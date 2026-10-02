// Realistic sample releases for a project (mock data for demos / empty
// workspaces). Pure and deterministic for a given `now`, so it is testable.
//
// Rules:
// - Every record has `sample: true` and an id prefixed with `rel-sample-`.
// - Only REAL task ids from `tasks` are linked; with no tasks, `taskIds` stay
//   empty and the release notes carry the content.
// - Environment states and timelines are consistent with each status.
import { createDeploymentTimelineEvent } from "../../../shared/utils/releasePlanning";
import { toDateKey } from "./releaseUtils";
import { changelogTypeForTask } from "./releaseNotes";

export const SAMPLE_ID_PREFIX = "rel-sample-";

const FALLBACK_ACTORS = ["elif.kaya", "james.porter", "sofia.rossi", "mert.aydin", "nora.lindqvist"];
const DAY = 86400000;

const OPEN_PRIORITY = { blocked: 0, review: 1, inprogress: 2, awaiting: 3, todo: 4 };
const isBug = (task) => task.type === "bug" || task.type === "defect";

function slug(value) {
  return String(value || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

function take(queue, count, predicate) {
  const picked = [];
  for (let i = 0; i < queue.length && picked.length < count;) {
    if (!predicate || predicate(queue[i])) {
      picked.push(queue[i]);
      queue.splice(i, 1);
    } else {
      i += 1;
    }
  }
  return picked;
}

function checklist(prefix, completedCount) {
  return [
    "QA regression sign-off",
    "Release notes reviewed",
    "Security review completed",
    "Product owner sign-off",
    "Rollback plan verified on staging",
    "Monitoring dashboards and alerts ready",
  ].map((title, index) => ({
    id: `${prefix}-chk-${index + 1}`,
    title,
    completed: index < completedCount,
  }));
}

export function buildSampleReleases({ projectId = null, tasks = [], users = [], currentUser = null, now = new Date() } = {}) {
  const base = now instanceof Date ? now : new Date(now);
  const day = (offset) => toDateKey(new Date(base.getTime() + offset * DAY));
  const at = (offset, hour = 10, minute = 0) => {
    const d = new Date(base.getTime() + offset * DAY);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const realActors = (users || []).map((user) => user?.username || user?.name).filter(Boolean);
  const actors = realActors.length ? [...new Set(realActors)] : FALLBACK_ACTORS;
  const actor = (index) => actors[index % actors.length];
  const me = currentUser || actor(0);

  const pid = slug(projectId);
  const idFor = (key) => `${SAMPLE_ID_PREFIX}${pid}-${key}`;

  // ── Distribute real tasks (each task belongs to at most one release) ─────
  const projectTasks = (tasks || []).filter((task) => task && task.id !== undefined && task.id !== null && task.type !== "epic");
  const doneQueue = projectTasks.filter((task) => task.status === "done");
  const openQueue = projectTasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => (OPEN_PRIORITY[a.status] ?? 5) - (OPEN_PRIORITY[b.status] ?? 5));
  const doneCount = doneQueue.length;
  const openCount = openQueue.length;

  const tasks230 = take(doneQueue, Math.min(10, Math.ceil(doneCount * 0.25)));
  const tasks231 = take(doneQueue, Math.min(2, doneQueue.length), isBug);
  if (tasks231.length === 0) tasks231.push(...take(doneQueue, Math.min(1, doneQueue.length)));
  const tasks240 = take(doneQueue, Math.min(10, Math.ceil(doneCount * 0.25)));
  const tasks250Done = take(doneQueue, Math.min(8, Math.ceil(doneCount * 0.2)));
  const tasks250Open = take(openQueue, Math.min(6, Math.max(2, Math.ceil(openCount * 0.3))), (task) => task.status !== "todo");
  if (tasks250Open.length < 2) tasks250Open.push(...take(openQueue, 2 - tasks250Open.length));
  const tasks260 = [...take(doneQueue, Math.min(3, doneQueue.length)), ...take(openQueue, Math.min(10, Math.ceil(openCount * 0.4)))];
  const tasks300 = take(openQueue, Math.min(8, openQueue.length));

  const ids = (list) => list.map((task) => task.id);
  const notesFromTasks = (list, prefix, createdAt) => list
    .filter((task) => task.status === "done" && task.title)
    .map((task, index) => ({
      id: `${prefix}-task-${index + 1}`,
      type: changelogTypeForTask(task),
      text: String(task.title).trim(),
      taskId: task.id,
      author: me,
      createdAt,
    }));

  let eventSeq = 0;
  const ev = (key, type, text, who, timestamp, patch = {}) => {
    eventSeq += 1;
    return createDeploymentTimelineEvent(type, text, who, { id: `${idFor(key)}-ev-${eventSeq}`, timestamp, ...patch });
  };
  const notes = (key, createdAt, list) => list.map(([type, text], index) => ({
    id: `${idFor(key)}-cl-${index + 1}`,
    type,
    text,
    author: me,
    createdAt,
  }));
  const env = (key, status, version, build, deployedAt, deployedBy) => ({
    key, status, version: version || "", build: build || "", deployedAt: deployedAt || null, deployedBy: deployedBy || null,
  });

  const rollbackPlan = "Re-deploy the previous production build from the release pipeline (one-click). Database migrations are backward compatible for one version; feature flags `checkout_v2` and `new_nav` can be switched off independently.";
  const monitoringChecks = "Watch error rate (< 0.5%), p95 API latency (< 400 ms), checkout conversion and login success rate for 60 minutes after rollout. On-call keeps the incident channel open during the release window.";
  const common = (key) => ({
    id: idFor(key),
    projectId: projectId || null,
    templateId: null,
    linkedDocIds: [],
    rollbackPlan,
    monitoringChecks,
    sample: true,
  });

  // ── v2.3.0 — released ~3 months ago ──────────────────────────────────────
  const r230 = {
    ...common("230"),
    version: "v2.3.0",
    name: "Aurora",
    status: "released",
    owner: actor(0),
    description: "Workspace-wide saved filters, faster board rendering and the first iteration of SSO.",
    startDate: day(-122),
    freezeDate: day(-102),
    releaseDate: day(-95),
    releasedAt: at(-95, 14, 30),
    taskIds: ids(tasks230),
    checklist: checklist(idFor("230"), 6),
    environments: [
      env("dev", "deployed", "v2.3.0", "2.3.0+14", at(-104, 11), actor(1)),
      env("staging", "deployed", "v2.3.0", "2.3.0+17", at(-98, 16), actor(2)),
      env("production", "deployed", "v2.3.0", "2.3.0+17", at(-95, 14, 30), actor(0)),
    ],
    risks: [],
    changelog: [
      ...notes("230", at(-96), [
        ["feature", "Saved filters can be shared across the whole workspace"],
        ["feature", "Single sign-on with Okta and Azure AD (beta)"],
        ["improvement", "Board renders 3x faster for sprints with 200+ tasks"],
        ["improvement", "Keyboard shortcuts cheat sheet (press ? anywhere)"],
        ["bugfix", "Fixed due dates shifting by one day in negative UTC offsets"],
        ["security", "Session tokens are now rotated on every privilege change"],
      ]),
      ...notesFromTasks(tasks230, idFor("230"), at(-96)),
    ],
    deploymentTimeline: [
      ev("230", "monitoring", "Post-release monitoring window closed — all KPIs nominal", actor(3), at(-95, 16)),
      ev("230", "release", "v2.3.0 released to production", actor(0), at(-95, 14, 30)),
      ev("230", "deploy", "Deployed v2.3.0 (2.3.0+17) to Production", actor(0), at(-95, 14, 20), { environment: "production" }),
      ev("230", "deploy", "Deployed v2.3.0 (2.3.0+17) to Staging", actor(2), at(-98, 16), { environment: "staging" }),
      ev("230", "freeze", "Code freeze for v2.3.0 — only release blockers may merge", actor(0), at(-102, 9)),
      ev("230", "started", "v2.3.0 development started", actor(0), at(-122, 9)),
      ev("230", "created", "Release created", actor(0), at(-125, 15)),
    ],
    createdAt: at(-125, 15),
    updatedAt: at(-95, 16),
  };

  // ── v2.3.1 — hotfix ──────────────────────────────────────────────────────
  const r231 = {
    ...common("231"),
    version: "v2.3.1",
    name: "Aurora hotfix",
    status: "released",
    owner: actor(1),
    description: "Hotfix for SSO redirect loops and a CSV export regression reported after v2.3.0.",
    startDate: day(-93),
    freezeDate: "",
    releaseDate: day(-90),
    releasedAt: at(-90, 11, 15),
    taskIds: ids(tasks231),
    checklist: checklist(idFor("231"), 6),
    environments: [
      env("dev", "deployed", "v2.3.1", "2.3.1+2", at(-92, 15), actor(1)),
      env("staging", "deployed", "v2.3.1", "2.3.1+3", at(-91, 10), actor(1)),
      env("production", "deployed", "v2.3.1", "2.3.1+3", at(-90, 11, 15), actor(1)),
    ],
    risks: [],
    changelog: [
      ...notes("231", at(-90), [
        ["bugfix", "SSO users no longer get stuck in a redirect loop after idle timeout"],
        ["bugfix", "CSV export includes custom fields again"],
        ["security", "Patched a dependency with a known prototype-pollution advisory"],
      ]),
      ...notesFromTasks(tasks231, idFor("231"), at(-90)),
    ],
    deploymentTimeline: [
      ev("231", "release", "v2.3.1 released to production", actor(1), at(-90, 11, 15)),
      ev("231", "deploy", "Deployed v2.3.1 (2.3.1+3) to Production", actor(1), at(-90, 11, 5), { environment: "production" }),
      ev("231", "hotfix", "Hotfix branch cut from v2.3.0 for SSO redirect loop", actor(1), at(-93, 9, 30)),
      ev("231", "incident", "INC-482: spike in failed SSO logins after idle timeout", actor(3), at(-93, 8, 40)),
      ev("231", "created", "Release created", actor(1), at(-93, 9)),
    ],
    createdAt: at(-93, 9),
    updatedAt: at(-90, 12),
  };

  // ── v2.4.0 — released, production rolled back once then fixed ────────────
  const r240 = {
    ...common("240"),
    version: "v2.4.0",
    name: "Beacon",
    status: "released",
    owner: actor(2),
    description: "New release-management screen, notification digest and reporting improvements.",
    startDate: day(-80),
    freezeDate: day(-52),
    releaseDate: day(-45),
    releasedAt: at(-44, 10, 40),
    taskIds: ids(tasks240),
    checklist: checklist(idFor("240"), 6),
    environments: [
      env("dev", "deployed", "v2.4.0", "2.4.0+21", at(-54, 13), actor(1)),
      env("staging", "deployed", "v2.4.0", "2.4.0+24", at(-45, 9), actor(2)),
      env("production", "deployed", "v2.4.0", "2.4.0+24", at(-44, 10, 40), actor(2)),
    ],
    risks: [],
    changelog: [
      ...notes("240", at(-45), [
        ["feature", "Daily and weekly notification digests"],
        ["feature", "Cumulative flow diagram in Reports"],
        ["improvement", "Sprint review page shows carry-over work"],
        ["bugfix", "Burndown chart no longer double-counts reopened tasks"],
        ["bugfix", "Fixed connection-pool exhaustion under heavy report usage (caused the first rollout rollback)"],
        ["deprecation", "Legacy v1 webhooks are deprecated and will be removed in v3.0.0"],
      ]),
      ...notesFromTasks(tasks240, idFor("240"), at(-45)),
    ],
    deploymentTimeline: [
      ev("240", "monitoring", "Error rate back to baseline (0.2%) — release closed", actor(3), at(-44, 13)),
      ev("240", "release", "v2.4.0 released to production", actor(2), at(-44, 10, 40)),
      ev("240", "deploy", "Deployed v2.4.0 (2.4.0+24) to Production", actor(2), at(-44, 10, 30), { environment: "production" }),
      ev("240", "deploy", "Deployed v2.4.0 (2.4.0+24) to Staging", actor(2), at(-45, 9), { environment: "staging" }),
      ev("240", "hotfix", "Fix for DB connection pool exhaustion merged (2.4.0+24)", actor(1), at(-45, 18, 20)),
      ev("240", "env-rollback", "Rolled back v2.4.0 on Production — restored v2.3.1", actor(2), at(-45, 15, 5), { environment: "production" }),
      ev("240", "incident", "INC-517: 5xx error rate at 4.8% after rollout, reports timing out", actor(3), at(-45, 14, 50)),
      ev("240", "deploy", "Deployed v2.4.0 (2.4.0+22) to Production", actor(2), at(-45, 14, 30), { environment: "production" }),
      ev("240", "freeze", "Code freeze for v2.4.0 — only release blockers may merge", actor(2), at(-52, 9)),
      ev("240", "started", "v2.4.0 development started", actor(2), at(-80, 9)),
      ev("240", "created", "Release created", actor(2), at(-84, 11)),
    ],
    createdAt: at(-84, 11),
    updatedAt: at(-44, 13),
  };

  // ── v2.5.0 — code freeze, due in 4 days, unfinished scope + blocker ─────
  const r250 = {
    ...common("250"),
    version: "v2.5.0",
    name: "Compass",
    status: "code-freeze",
    owner: me,
    description: "Checkout v2, workflow rules on the board and audit-log export. Release candidate is on staging.",
    startDate: day(-30),
    freezeDate: day(-3),
    releaseDate: day(4),
    releasedAt: null,
    taskIds: ids([...tasks250Done, ...tasks250Open]),
    checklist: checklist(idFor("250"), 3),
    environments: [
      env("dev", "deployed", "v2.5.0", "2.5.0+31", at(-1, 17), actor(1)),
      env("staging", "deployed", "v2.5.0-rc.2", "2.5.0+29", at(-2, 11), actor(2)),
      env("production", "pending"),
    ],
    risks: [
      { id: `${idFor("250")}-risk-1`, severity: "high", text: "Payment provider sandbox outage is blocking the checkout regression run", createdAt: at(-1, 10) },
      { id: `${idFor("250")}-risk-2`, severity: "medium", text: "Two reviewers on leave during release week — approvals may slip", createdAt: at(-3, 15) },
    ],
    changelog: [
      ...notes("250", at(-2), [
        ["feature", "Checkout v2 with saved payment methods"],
        ["feature", "Workflow rules: restrict which status transitions are allowed per project"],
        ["improvement", "Audit log can be exported as CSV"],
        ["bugfix", "Fixed drag-and-drop dropping cards into the wrong column on Safari"],
      ]),
      ...notesFromTasks(tasks250Done, idFor("250"), at(-2)),
    ],
    deploymentTimeline: [
      ev("250", "deploy", "Deployed v2.5.0 (2.5.0+31) to Development", actor(1), at(-1, 17), { environment: "dev" }),
      ev("250", "incident", "Checkout regression suite blocked — payment sandbox returning 503", actor(3), at(-1, 10)),
      ev("250", "deploy", "Deployed v2.5.0-rc.2 (2.5.0+29) to Staging", actor(2), at(-2, 11), { environment: "staging" }),
      ev("250", "freeze", "Code freeze for v2.5.0 — only release blockers may merge", me, at(-3, 9)),
      ev("250", "changelog", "Release notes updated", me, at(-4, 16)),
      ev("250", "started", "v2.5.0 development started", me, at(-30, 9)),
      ev("250", "created", "Release created", me, at(-33, 14)),
    ],
    createdAt: at(-33, 14),
    updatedAt: at(-1, 17),
  };

  // ── v2.5.1 — cancelled patch (fixes folded into v2.5.0) ─────────────────
  const r251 = {
    ...common("251"),
    version: "v2.5.1",
    name: "Compass patch",
    status: "cancelled",
    owner: actor(1),
    description: "Planned patch for notification digest fixes. Cancelled — the fixes were pulled into v2.5.0 before code freeze.",
    startDate: "",
    freezeDate: "",
    releaseDate: day(11),
    releasedAt: null,
    taskIds: [],
    checklist: checklist(idFor("251"), 0),
    environments: [env("dev", "pending"), env("staging", "pending"), env("production", "pending")],
    risks: [],
    changelog: notes("251", at(-8), [["bugfix", "Digest emails respect the user's time zone"]]),
    deploymentTimeline: [
      ev("251", "cancelled", "v2.5.1 cancelled — scope merged into v2.5.0", actor(1), at(-5, 12)),
      ev("251", "created", "Release created", actor(1), at(-9, 10)),
    ],
    createdAt: at(-9, 10),
    updatedAt: at(-5, 12),
  };

  // ── v2.6.0 — in progress ─────────────────────────────────────────────────
  const r260 = {
    ...common("260"),
    version: "v2.6.0",
    name: "Delta",
    status: "in-progress",
    owner: actor(3),
    description: "Onboarding v2, roadmap dependencies and a redesigned notification center.",
    startDate: day(-6),
    freezeDate: day(24),
    releaseDate: day(31),
    releasedAt: null,
    taskIds: ids(tasks260),
    checklist: checklist(idFor("260"), 1),
    environments: [
      env("dev", "deployed", "v2.6.0", "2.6.0+4", at(-1, 22), actor(1)),
      env("staging", "pending"),
      env("production", "pending"),
    ],
    risks: [
      { id: `${idFor("260")}-risk-1`, severity: "low", text: "Onboarding v2 designs still in review with product", createdAt: at(-4, 11) },
    ],
    changelog: [
      ...notes("260", at(-2), [
        ["feature", "Guided onboarding checklist for new workspaces"],
        ["feature", "Roadmap: visualise dependencies between epics"],
        ["improvement", "Notification center groups updates by task"],
      ]),
      ...notesFromTasks(tasks260, idFor("260"), at(-2)),
    ],
    deploymentTimeline: [
      ev("260", "deploy", "Deployed v2.6.0 (2.6.0+4) to Development", actor(1), at(-1, 22), { environment: "dev" }),
      ev("260", "started", "v2.6.0 development started", actor(3), at(-6, 9)),
      ev("260", "created", "Release created", actor(3), at(-12, 16)),
    ],
    createdAt: at(-12, 16),
    updatedAt: at(-1, 22),
  };

  // ── v3.0.0 — planned major with breaking changes ─────────────────────────
  const r300 = {
    ...common("300"),
    version: "v3.0.0",
    name: "Horizon",
    status: "planned",
    owner: actor(0),
    description: "Major release: public API v2, multi-workspace accounts and removal of legacy webhooks.",
    startDate: day(35),
    freezeDate: day(78),
    releaseDate: day(88),
    releasedAt: null,
    taskIds: ids(tasks300),
    checklist: checklist(idFor("300"), 0),
    environments: [env("dev", "pending"), env("staging", "pending"), env("production", "pending")],
    risks: [
      { id: `${idFor("300")}-risk-1`, severity: "medium", text: "Breaking API change requires 30-day customer notice before rollout", createdAt: at(-7, 10) },
    ],
    changelog: notes("300", at(-7), [
      ["breaking", "REST API v1 endpoints removed — migrate to API v2"],
      ["breaking", "Webhook payloads use the v2 event envelope"],
      ["feature", "One account can belong to multiple workspaces"],
      ["security", "Personal access tokens support scopes and expiry"],
      ["deprecation", "Legacy Markdown editor will be removed in v3.1"],
    ]),
    deploymentTimeline: [
      ev("300", "created", "Release created", actor(0), at(-14, 10)),
    ],
    createdAt: at(-14, 10),
    updatedAt: at(-7, 10),
  };

  return [r230, r231, r240, r250, r251, r260, r300];
}

export function isSampleRelease(release) {
  return Boolean(release?.sample) || String(release?.id || "").startsWith(SAMPLE_ID_PREFIX);
}
