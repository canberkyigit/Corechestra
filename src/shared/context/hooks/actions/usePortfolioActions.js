import { useCallback } from "react";
import { MANUAL_HEALTH_OPTIONS } from "../../../../features/portfolio/utils/healthMeta";

const MAX_STATUS_UPDATES_PER_PROJECT = 20;

function createStatusUpdateId() {
  return `psu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Project status updates shown on the Dashboard's Portfolio tab (`appData/portfolio`). */
export function usePortfolioActions({
  currentUser,
  setProjectStatusUpdates,
  logAuditEvent,
}) {
  /** Newest first; keeps the latest 20 per project. */
  const postProjectStatusUpdate = useCallback(({ projectId, health, summary } = {}) => {
    if (!projectId || !MANUAL_HEALTH_OPTIONS.includes(health)) return null;
    const update = {
      id: createStatusUpdateId(),
      projectId,
      health,
      summary: String(summary || "").trim(),
      createdBy: currentUser || null,
      createdAt: new Date().toISOString(),
    };
    setProjectStatusUpdates((prev) => {
      const forProject = (prev || []).filter((item) => item.projectId === projectId).slice(0, MAX_STATUS_UPDATES_PER_PROJECT - 1);
      const others = (prev || []).filter((item) => item.projectId !== projectId);
      return [update, ...forProject, ...others];
    });
    logAuditEvent?.("posted project status update", { entityType: "project", projectId, health });
    return update;
  }, [currentUser, logAuditEvent, setProjectStatusUpdates]);

  const deleteProjectStatusUpdate = useCallback((updateId) => {
    setProjectStatusUpdates((prev) => (prev || []).filter((item) => item.id !== updateId));
  }, [setProjectStatusUpdates]);

  return {
    postProjectStatusUpdate,
    deleteProjectStatusUpdate,
  };
}
