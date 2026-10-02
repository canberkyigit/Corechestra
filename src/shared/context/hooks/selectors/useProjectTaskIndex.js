import { useMemo } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { isInProject } from "../../../utils/helpers";

export function useProjectTaskIndex(projectIdOverride) {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const activeTasks = useAppStore((state) => state.activeTasks);
  const perProjectBacklog = useAppStore((state) => state.perProjectBacklog);

  const projectId = projectIdOverride ?? currentProjectId;

  return useMemo(() => {
    const normalizedProjectId = projectId || "";
    const projectActiveTasks = [];
    const activeTaskIndexById = {};

    activeTasks.forEach((task) => {
      // Legacy tasks without projectId belong to the current project.
      if (!isInProject(task, normalizedProjectId, currentProjectId)) return;
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
  }, [activeTasks, currentProjectId, perProjectBacklog, projectId]);
}
