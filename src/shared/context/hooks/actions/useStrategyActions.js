import { useCallback } from "react";
import {
  capCheckIns,
  MANUAL_HEALTH_OPTIONS,
  normalizeGoalInput,
  normalizeKeyResult,
} from "../../../../features/goals/utils/goalModel";

const MAX_STATUS_UPDATES_PER_PROJECT = 20;

export function createStrategyId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Goals (OKRs) and portfolio status updates (`appData/strategy`). */
export function useStrategyActions({
  currentUser,
  setGoals,
  setProjectStatusUpdates,
  logAuditEvent,
}) {
  const createGoal = useCallback((data) => {
    const now = new Date().toISOString();
    const goal = {
      ...normalizeGoalInput(data, createStrategyId),
      id: createStrategyId("goal"),
      checkIns: [],
      createdBy: currentUser || null,
      createdAt: now,
      updatedAt: now,
      ...(data?.sample ? { sample: true } : {}),
    };
    setGoals((prev) => [...(prev || []), goal]);
    logAuditEvent?.("created goal", { entityType: "goal", goalId: goal.id, title: goal.title });
    return goal;
  }, [currentUser, logAuditEvent, setGoals]);

  const updateGoal = useCallback((goalId, data) => {
    setGoals((prev) => (prev || []).map((goal) => {
      if (goal.id !== goalId) return goal;
      const next = normalizeGoalInput({ ...goal, ...data }, createStrategyId);
      // A goal can never align under itself.
      if (next.parentId === goalId) next.parentId = null;
      return { ...goal, ...next, updatedAt: new Date().toISOString() };
    }));
    logAuditEvent?.("updated goal", { entityType: "goal", goalId });
  }, [logAuditEvent, setGoals]);

  /** Deletes a goal; its children are re-parented to the deleted goal's parent. */
  const deleteGoal = useCallback((goalId) => {
    setGoals((prev) => {
      const list = prev || [];
      const target = list.find((goal) => goal.id === goalId);
      return list
        .filter((goal) => goal.id !== goalId)
        .map((goal) => (goal.parentId === goalId ? { ...goal, parentId: target?.parentId || null } : goal));
    });
    logAuditEvent?.("deleted goal", { entityType: "goal", goalId, severity: "warning" });
  }, [logAuditEvent, setGoals]);

  const updateKeyResult = useCallback((goalId, keyResultId, patch) => {
    setGoals((prev) => (prev || []).map((goal) => {
      if (goal.id !== goalId) return goal;
      return {
        ...goal,
        keyResults: (goal.keyResults || []).map((kr) => (
          kr.id === keyResultId ? normalizeKeyResult({ ...kr, ...patch, id: kr.id }, createStrategyId) : kr
        )),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setGoals]);

  /** Newest first. A health on the check-in becomes the goal's manual health. */
  const addGoalCheckIn = useCallback((goalId, { health, note, progress } = {}) => {
    const checkIn = {
      id: createStrategyId("chk"),
      at: new Date().toISOString(),
      by: currentUser || null,
      health: MANUAL_HEALTH_OPTIONS.includes(health) ? health : null,
      note: String(note || "").trim(),
      progress: Number.isFinite(progress) ? progress : null,
    };
    setGoals((prev) => (prev || []).map((goal) => (
      goal.id === goalId
        ? { ...goal, health: checkIn.health ?? goal.health ?? null, checkIns: capCheckIns([checkIn, ...(goal.checkIns || [])]), updatedAt: checkIn.at }
        : goal
    )));
    return checkIn;
  }, [currentUser, setGoals]);

  /** Adds pre-built sample goals (`buildSampleGoals`) in one write. */
  const importGoals = useCallback((goals) => {
    const list = (goals || []).filter((goal) => goal && goal.id);
    if (!list.length) return;
    setGoals((prev) => {
      const ids = new Set((prev || []).map((goal) => goal.id));
      const added = list.filter((goal) => !ids.has(goal.id) && ids.add(goal.id));
      return [...(prev || []), ...added];
    });
  }, [setGoals]);

  const removeSampleGoals = useCallback(() => {
    setGoals((prev) => {
      const remaining = (prev || []).filter((goal) => !goal.sample);
      const remainingIds = new Set(remaining.map((goal) => goal.id));
      return remaining.map((goal) => (goal.parentId && !remainingIds.has(goal.parentId) ? { ...goal, parentId: null } : goal));
    });
  }, [setGoals]);

  const postProjectStatusUpdate = useCallback(({ projectId, health, summary } = {}) => {
    if (!projectId || !MANUAL_HEALTH_OPTIONS.includes(health)) return null;
    const update = {
      id: createStrategyId("psu"),
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
    createGoal,
    updateGoal,
    deleteGoal,
    updateKeyResult,
    addGoalCheckIn,
    importGoals,
    removeSampleGoals,
    postProjectStatusUpdate,
    deleteProjectStatusUpdate,
  };
}
