import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useProjectTaskIndex } from "./selectors/useProjectTaskIndex";
import { useSprintMetrics } from "./useSprintMetrics";

export function useBoardState({
  projectId: projectIdOverride,
  filterValue = "",
  memberValue = "",
  search = "",
}) {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const projects = useAppStore((state) => state.projects);
  const users = useAppStore((state) => state.users);
  const projectId = projectIdOverride ?? currentProjectId;

  const { projectActiveTasks } = useProjectTaskIndex(projectId);
  const { sprint, doneTasks, sprintPct, sprintDaysLeft } = useSprintMetrics(projectId);

  const teamMembers = useMemo(() => {
    const seen = new Set();
    const deduped = users.filter((user) => {
      if (user.status !== "active") return false;
      const key = user.username || user.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [
      { value: "", label: "All Members" },
      { value: "unassigned", label: "Unassigned" },
      ...deduped.map((user) => ({ value: user.username, label: user.name, color: user.color })),
    ];
  }, [users]);

  const projectMembers = useMemo(() => {
    const currentProject = projects.find((project) => project.id === projectId);
    const explicitMembers = new Set(currentProject?.memberUsernames || []);
    const assignedUsernames = new Set(
      projectActiveTasks.map((task) => task.assignedTo).filter((value) => value && value !== "unassigned")
    );

    return teamMembers.filter((member) => (
      !member.value
      || member.value === "unassigned"
      || assignedUsernames.has(member.value)
      || explicitMembers.has(member.value)
    ));
  }, [projectActiveTasks, projectId, projects, teamMembers]);

  const filteredTasks = useMemo(() => {
    let result = projectActiveTasks;

    if (filterValue) {
      result = result.filter((task) => task.type === filterValue);
    }

    if (memberValue) {
      result = result.filter((task) => task.assignedTo === memberValue);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((task) => (
        task.title.toLowerCase().includes(query)
        || (task.description || "").toLowerCase().includes(query)
      ));
    }

    return result;
  }, [filterValue, memberValue, projectActiveTasks, search]);

  return {
    projectActiveTasks,
    projectMembers,
    filteredTasks,
    sprint,
    doneTasks,
    sprintPct,
    sprintDaysLeft,
  };
}
