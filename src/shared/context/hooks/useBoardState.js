import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useProjectTaskIndex } from "./selectors/useProjectTaskIndex";
import { useSprintMetrics } from "./useSprintMetrics";
import { customFieldSearchText, getProjectCustomFieldDefs, matchesCustomFieldFilter } from "../../utils/customFields";

export function useBoardState({
  projectId: projectIdOverride,
  filterValue = "",
  memberValue = "",
  search = "",
  customFieldFilter = null,
}) {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const projects = useAppStore((state) => state.projects);
  const users = useAppStore((state) => state.users);
  const customFieldDefs = useAppStore((state) => state.customFieldDefs);
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

    const fieldDefs = getProjectCustomFieldDefs(customFieldDefs, projectId);
    if (customFieldFilter?.fieldId && customFieldFilter.value) {
      result = result.filter((task) => matchesCustomFieldFilter(task, customFieldFilter, fieldDefs));
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      // Custom field values are searchable too (e.g. a customer name field).
      result = result.filter((task) => (
        (task.title || "").toLowerCase().includes(query)
        || (task.description || "").toLowerCase().includes(query)
        || (fieldDefs.length > 0 && customFieldSearchText(task, fieldDefs, { users }).includes(query))
      ));
    }

    return result;
  }, [customFieldDefs, customFieldFilter, filterValue, memberValue, projectActiveTasks, projectId, search, users]);

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
