import { useCallback } from "react";
import { createAutomationId } from "../../../automation/automationMeta";

function normalizeRuleInput(data) {
  return {
    name: String(data?.name || "").trim() || "Untitled rule",
    description: data?.description || "",
    projectId: data?.projectId ?? null,
    enabled: data?.enabled !== false,
    trigger: data?.trigger || { type: "task_created", config: {} },
    conditions: (data?.conditions || []).map((condition) => ({ ...condition, id: condition.id || createAutomationId("cond") })),
    actions: (data?.actions || []).map((action) => ({ ...action, id: action.id || createAutomationId("act") })),
    ...(data?.templateId ? { templateId: data.templateId } : {}),
  };
}

export function useAutomationActions({
  currentUser,
  setAutomationRules,
  setAutomationLog,
  logAuditEvent,
}) {
  const createAutomationRule = useCallback((data) => {
    const now = new Date().toISOString();
    const rule = {
      ...normalizeRuleInput(data),
      id: createAutomationId("auto"),
      createdBy: currentUser || null,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      lastRunAt: null,
      lastStatus: null,
      firedKeys: [],
    };
    setAutomationRules((prev) => [...(prev || []), rule]);
    logAuditEvent?.("created automation rule", { entityType: "automation", ruleId: rule.id, name: rule.name, projectId: rule.projectId });
    return rule;
  }, [currentUser, logAuditEvent, setAutomationRules]);

  const updateAutomationRule = useCallback((ruleId, data) => {
    setAutomationRules((prev) => (prev || []).map((rule) => {
      if (rule.id !== ruleId) return rule;
      const next = { ...rule, ...normalizeRuleInput({ ...rule, ...data }), updatedAt: new Date().toISOString() };
      // A changed trigger invalidates scheduled dedupe keys.
      if (JSON.stringify(rule.trigger) !== JSON.stringify(next.trigger)) next.firedKeys = [];
      return next;
    }));
    logAuditEvent?.("updated automation rule", { entityType: "automation", ruleId });
  }, [logAuditEvent, setAutomationRules]);

  const toggleAutomationRule = useCallback((ruleId, enabled) => {
    setAutomationRules((prev) => (prev || []).map((rule) => (
      rule.id === ruleId
        ? { ...rule, enabled: enabled ?? !rule.enabled, updatedAt: new Date().toISOString() }
        : rule
    )));
  }, [setAutomationRules]);

  const duplicateAutomationRule = useCallback((ruleId, overrides = {}) => {
    let copy = null;
    setAutomationRules((prev) => {
      const source = (prev || []).find((rule) => rule.id === ruleId);
      if (!source) return prev;
      const now = new Date().toISOString();
      copy = {
        ...normalizeRuleInput({
          ...source,
          conditions: (source.conditions || []).map(({ id, ...condition }) => condition),
          actions: (source.actions || []).map(({ id, ...action }) => action),
          ...overrides,
        }),
        name: overrides.name || `${source.name} (copy)`,
        enabled: false,
        id: createAutomationId("auto"),
        createdBy: currentUser || null,
        createdAt: now,
        updatedAt: now,
        runCount: 0,
        lastRunAt: null,
        lastStatus: null,
        firedKeys: [],
      };
      return [...prev, copy];
    });
    return copy;
  }, [currentUser, setAutomationRules]);

  const deleteAutomationRule = useCallback((ruleId) => {
    setAutomationRules((prev) => (prev || []).filter((rule) => rule.id !== ruleId));
    logAuditEvent?.("deleted automation rule", { entityType: "automation", ruleId, severity: "warning" });
  }, [logAuditEvent, setAutomationRules]);

  /** Clears the run log, or only the entries of one project. */
  const clearAutomationLog = useCallback((projectId) => {
    setAutomationLog((prev) => (projectId ? (prev || []).filter((entry) => entry.projectId !== projectId) : []));
  }, [setAutomationLog]);

  return {
    createAutomationRule,
    updateAutomationRule,
    toggleAutomationRule,
    duplicateAutomationRule,
    deleteAutomationRule,
    clearAutomationLog,
  };
}
