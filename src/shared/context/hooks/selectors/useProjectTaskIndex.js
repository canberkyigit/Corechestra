import { useMemo } from "react";
import { useAppStore } from "../../../store/useAppStore";

export function useProjectTaskIndex(projectIdOverride) {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const activeTasks = useAppStore((state) => state.activeTasks);
  const perProjectBacklog = useAppStore((state) => state.perProjectBacklog);

  const projectId = projectIdOverride ?? currentProjectId;

  return useMemo(() => {
    const normalizedProjectId = projectId || "proj-1";
    const projectActiveTasks = [];
    const activeTaskIndexById = {};

    activeTasks.forEach((task) => {
      if ((task.projectId || "proj-1") !== normalizedProjectId) return;
      activeTaskIndexById[task.id] = projectActiveTasks.length;
      projectActiveTasks.push(task);
    });

    const backlogSections = perProjectBacklog[normalizedProjectId] || [];
    const backlogTasks = [];
    const allProjectTasks = [...projectActiveTasks];
    const idToProjectIndex = { ...activeTaskIndexById };

    backlogSections.forEach((section) => {
      (section.tasks || []).forEach((task) => {
        backlogTasks.push(task);
        idToProjectIndex[task.id] = allProjectTasks.length;
        allProjectTasks.push(task);
      });
    });

    return {
      projectId: normalizedProjectId,
      projectActiveTasks,
      backlogSections,
      backlogTasks,
      allProjectTasks,
      idToProjectIndex,
    };
  }, [activeTasks, perProjectBacklog, projectId]);
}
