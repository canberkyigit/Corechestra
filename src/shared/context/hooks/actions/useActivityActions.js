import { useCallback } from "react";

export function useActivityActions({
  currentProjectId,
  currentUser,
  setGlobalActivityLog,
  setActiveTasks,
  setPerProjectBacklog,
}) {
  const createEntry = useCallback((taskId, action, details = {}) => ({
    id: Date.now() + Math.random(),
    taskId: taskId || null,
    action,
    details,
    scope: taskId ? "task" : details.scope || "workspace",
    user: currentUser || "Unknown",
    timestamp: new Date().toISOString(),
    projectId: details.projectId || currentProjectId || null,
  }), [currentProjectId, currentUser]);

  const logActivity = useCallback((taskId, action, details = {}) => {
    const entry = createEntry(taskId, action, details);
    setGlobalActivityLog((prev) => [entry, ...prev].slice(0, 200));
    if (!taskId) return entry;

    const updateTaskLog = (tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, activityLog: [entry, ...(task.activityLog || [])].slice(0, 50) }
          : task
      );
    setActiveTasks((prev) => updateTaskLog(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [projectId, sections] of Object.entries(prev)) {
        next[projectId] = sections.map((section) => ({
          ...section,
          tasks: updateTaskLog(section.tasks),
        }));
      }
      return next;
    });
    return entry;
  }, [createEntry, setActiveTasks, setGlobalActivityLog, setPerProjectBacklog]);

  const logAuditEvent = useCallback((action, details = {}) => {
    const entry = {
      ...createEntry(null, action, { ...details, scope: details.scope || "security" }),
      entityType: details.entityType || "workspace",
      severity: details.severity || "info",
    };
    setGlobalActivityLog((prev) => [entry, ...prev].slice(0, 200));
    return entry;
  }, [createEntry, setGlobalActivityLog]);

  return {
    logActivity,
    logAuditEvent,
  };
}
