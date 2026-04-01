import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { useAppStore } from "../../store/useAppStore";
import { useProjectTasks } from "./useProjectTasks";

export function useSprintMetrics(projectIdOverride) {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const perProjectSprint = useAppStore((state) => state.perProjectSprint);
  const perProjectCompletedSprints = useAppStore((state) => state.perProjectCompletedSprints);
  const { projectId, projectActiveTasks } = useProjectTasks(projectIdOverride);

  const sprint = perProjectSprint[projectId ?? currentProjectId] ?? null;
  const completedSprints = perProjectCompletedSprints[projectId ?? currentProjectId] ?? [];

  const doneTasks = useMemo(
    () => projectActiveTasks.filter((task) => task.status === "done").length,
    [projectActiveTasks]
  );

  const totalStoryPoints = useMemo(
    () => projectActiveTasks.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0),
    [projectActiveTasks]
  );

  const completedStoryPoints = useMemo(
    () => projectActiveTasks
      .filter((task) => task.status === "done")
      .reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0),
    [projectActiveTasks]
  );

  const sprintPct = useMemo(
    () => (projectActiveTasks.length > 0 ? Math.round((doneTasks / projectActiveTasks.length) * 100) : 0),
    [doneTasks, projectActiveTasks.length]
  );

  const sprintDaysLeft = useMemo(() => (
    sprint?.endDate ? Math.max(0, differenceInDays(parseISO(sprint.endDate), new Date())) : null
  ), [sprint?.endDate]);

  return {
    sprint,
    completedSprints,
    doneTasks,
    totalStoryPoints,
    completedStoryPoints,
    sprintPct,
    sprintDaysLeft,
  };
}
