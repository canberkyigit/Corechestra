import { useMemo } from "react";
import { useAppStore } from "../../../shared/store/useAppStore";
import { buildEpicWorkIndex, deriveGoal } from "../utils/goalModel";

const EMPTY = [];

/** Every task of every project (sprint + backlog) — "work" key results span projects. */
export function useWorkspaceTasks(activeTasks) {
  const perProjectBacklog = useAppStore((state) => state.perProjectBacklog);
  return useMemo(() => {
    const backlog = Object.values(perProjectBacklog || {}).flatMap((sections) => (sections || []).flatMap((section) => section?.tasks || []));
    return [...(activeTasks || EMPTY), ...backlog];
  }, [activeTasks, perProjectBacklog]);
}

export function useGoalsData({ goals, activeTasks, now }) {
  const tasks = useWorkspaceTasks(activeTasks);
  const workIndex = useMemo(() => buildEpicWorkIndex(tasks), [tasks]);
  const derived = useMemo(
    () => (goals || EMPTY).map((goal) => deriveGoal(goal, workIndex, now)),
    [goals, workIndex, now]
  );
  return { derived, workIndex };
}
