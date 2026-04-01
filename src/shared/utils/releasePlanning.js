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

export function createDeploymentTimelineEvent(type, text, actor = null, patch = {}) {
  return {
    id: `deploy-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type,
    text,
    actor,
    timestamp: new Date().toISOString(),
    ...patch,
  };
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
