function withId(prefix, title) {
  return {
    id: `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    completed: false,
  };
}

export function createDefaultReleaseChecklist(template) {
  const fromTemplate = template?.checklist;
  if (Array.isArray(fromTemplate) && fromTemplate.length > 0) {
    return fromTemplate.map((item, index) => ({
      id: item.id || `check-${index}`,
      title: item.title || item.label || "Checklist item",
      completed: Boolean(item.completed),
    }));
  }

  return [
    withId("check", "QA / regression sign-off"),
    withId("check", "Docs and release notes updated"),
    withId("check", "Approvals collected"),
    withId("check", "Rollback plan documented"),
    withId("check", "Monitoring checklist reviewed"),
  ];
}

/**
 * Canonical deployment-timeline event. `type`/`actor`/`timestamp` are the
 * canonical keys; `eventType`/`author`/`createdAt` are written as aliases so
 * older readers (and stored data) keep working. Read events through
 * `normalizeDeploymentTimelineEvent`.
 */
export function createDeploymentTimelineEvent(type, text, actor = null, patch = {}) {
  const timestamp = new Date().toISOString();
  const event = {
    id: `deploy-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type,
    eventType: type,
    text,
    actor: actor || null,
    author: actor || null,
    timestamp,
    createdAt: timestamp,
    ...patch,
  };
  // Keep aliases consistent when the patch overrides one side.
  if (patch.eventType && !patch.type) event.type = patch.eventType;
  if (patch.type && !patch.eventType) event.eventType = patch.type;
  if (patch.author && !patch.actor) event.actor = patch.author;
  if (patch.actor && !patch.author) event.author = patch.actor;
  if (patch.createdAt && !patch.timestamp) event.timestamp = patch.createdAt;
  if (patch.timestamp && !patch.createdAt) event.createdAt = patch.timestamp;
  return event;
}

/**
 * Reads any stored timeline event shape — helper events `{type, actor,
 * timestamp}`, legacy manual events `{eventType, author, createdAt}` and the
 * merged lifecycle events — into `{ id, type, text, actor, timestamp }`.
 */
export function normalizeDeploymentTimelineEvent(event) {
  if (!event || typeof event !== "object") return null;
  return {
    ...event,
    id: event.id,
    type: event.eventType || event.type || "event",
    text: event.text || event.label || "",
    actor: event.actor || event.author || event.createdBy || null,
    timestamp: event.timestamp || event.createdAt || null,
  };
}

export function normalizeDeploymentTimeline(events) {
  return (Array.isArray(events) ? events : [])
    .map(normalizeDeploymentTimelineEvent)
    .filter(Boolean);
}

export function hydrateReleaseDefaults(data, template = null, currentUser = null) {
  const now = new Date().toISOString();
  return {
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
    owner: data.owner || currentUser || null,
    templateId: data.templateId || template?.id || null,
    checklist: data.checklist || createDefaultReleaseChecklist(template),
    rollbackPlan: data.rollbackPlan ?? template?.rollbackPlan ?? "",
    monitoringChecks: data.monitoringChecks ?? template?.monitoringChecks ?? "",
    deploymentTimeline: data.deploymentTimeline || [
      createDeploymentTimelineEvent("created", "Release created", currentUser),
    ],
    linkedDocIds: data.linkedDocIds || [],
  };
}
