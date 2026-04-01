import { useMemo } from "react";
import { DEFAULT_BOARD_SETTINGS, DEFAULT_COLUMNS } from "../AppSeeds";
import { useProjectScopedState } from "./useProjectScopedState";
import { useProjectTaskIndex } from "./selectors/useProjectTaskIndex";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_RETROSPECTIVE = {
  wentWell: [],
  wentWrong: [],
  canImprove: [],
  actionItems: [],
};

const EMPTY_LIST = [];
export function useAppStateDomains() {
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    epics,
    setEpics,
    labels,
    setLabels,
    perProjectSprint,
    setPerProjectSprint,
    projectColumns,
    setProjectColumns,
    activeTasks,
    setActiveTasks,
    perProjectBacklog,
    setPerProjectBacklog,
    perProjectRetrospective,
    setPerProjectRetrospective,
    perProjectPokerHistory,
    setPerProjectPokerHistory,
    perProjectNotes,
    setPerProjectNotes,
    perProjectBoardSettings,
    setPerProjectBoardSettings,
    currentUser,
    setCurrentUser,
    globalActivityLog,
    setGlobalActivityLog,
    notifications,
    setNotifications,
    perProjectBurndownSnapshots,
    setPerProjectBurndownSnapshots,
    teams,
    setTeams,
    users,
    setUsers,
    deletedUserIds,
    setDeletedUserIds,
    sprintDefaults,
    setSprintDefaults,
    spaces,
    setSpaces,
    docPages,
    setDocPages,
    releases,
    setReleases,
    testPlans,
    setTestPlans,
    testSuites,
    setTestSuites,
    testCases,
    setTestCases,
    testRuns,
    setTestRuns,
    perProjectCompletedSprints,
    setPerProjectCompletedSprints,
    perProjectPlannedSprints,
    setPerProjectPlannedSprints,
    archivedTasks,
    setArchivedTasks,
    archivedProjects,
    setArchivedProjects,
    archivedEpics,
    setArchivedEpics,
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsViewMode,
    setProjectsViewMode,
    densityMode,
    setDensityMode,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
    templateRegistry,
    setTemplateRegistry,
    savedViews,
    setSavedViews,
    recentItems,
    setRecentItems,
    favoriteItems,
    setFavoriteItems,
    pinnedItems,
    setPinnedItems,
    notificationPreferences,
    setNotificationPreferences,
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
  } = useAppStore();

  const [sprint, setSprint] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectSprint,
    setStateMap: setPerProjectSprint,
    fallback: null,
  });

  const [backlogSections, setBacklogSections] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectBacklog,
    setStateMap: setPerProjectBacklog,
    fallback: EMPTY_LIST,
  });

  const [retrospectiveItems, setRetrospectiveItems] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectRetrospective,
    setStateMap: setPerProjectRetrospective,
    fallback: DEFAULT_RETROSPECTIVE,
  });

  const [pokerHistory, setPokerHistory] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectPokerHistory,
    setStateMap: setPerProjectPokerHistory,
    fallback: EMPTY_LIST,
  });

  const [notesList, setNotesList] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectNotes,
    setStateMap: setPerProjectNotes,
    fallback: EMPTY_LIST,
  });

  const [boardSettings, setBoardSettings] = useProjectScopedState({
    currentProjectId,
    stateMap: perProjectBoardSettings,
    setStateMap: setPerProjectBoardSettings,
    fallback: DEFAULT_BOARD_SETTINGS,
  });

  const columns = useMemo(
    () => projectColumns[currentProjectId] || DEFAULT_COLUMNS,
    [currentProjectId, projectColumns]
  );

  const burndownSnapshots = perProjectBurndownSnapshots[currentProjectId] ?? EMPTY_LIST;
  const completedSprints = perProjectCompletedSprints[currentProjectId] ?? EMPTY_LIST;
  const plannedSprints = perProjectPlannedSprints[currentProjectId] ?? EMPTY_LIST;

  const { allProjectTasks, idToProjectIndex } = useProjectTaskIndex(currentProjectId);

  const allTasks = useMemo(() => allProjectTasks, [allProjectTasks]);

  const idToGlobalIndex = useMemo(() => {
    return idToProjectIndex;
  }, [idToProjectIndex]);

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

  return {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    epics,
    setEpics,
    labels,
    setLabels,
    perProjectSprint,
    setPerProjectSprint,
    projectColumns,
    setProjectColumns,
    activeTasks,
    setActiveTasks,
    perProjectBacklog,
    setPerProjectBacklog,
    perProjectRetrospective,
    setPerProjectRetrospective,
    perProjectPokerHistory,
    setPerProjectPokerHistory,
    perProjectNotes,
    setPerProjectNotes,
    perProjectBoardSettings,
    setPerProjectBoardSettings,
    currentUser,
    setCurrentUser,
    globalActivityLog,
    setGlobalActivityLog,
    notifications,
    setNotifications,
    perProjectBurndownSnapshots,
    setPerProjectBurndownSnapshots,
    teams,
    setTeams,
    users,
    setUsers,
    deletedUserIds,
    setDeletedUserIds,
    sprintDefaults,
    setSprintDefaults,
    spaces,
    setSpaces,
    docPages,
    setDocPages,
    releases,
    setReleases,
    testPlans,
    setTestPlans,
    testSuites,
    setTestSuites,
    testCases,
    setTestCases,
    testRuns,
    setTestRuns,
    perProjectCompletedSprints,
    setPerProjectCompletedSprints,
    perProjectPlannedSprints,
    setPerProjectPlannedSprints,
    archivedTasks,
    setArchivedTasks,
    archivedProjects,
    setArchivedProjects,
    archivedEpics,
    setArchivedEpics,
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsViewMode,
    setProjectsViewMode,
    densityMode,
    setDensityMode,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
    templateRegistry,
    setTemplateRegistry,
    savedViews,
    setSavedViews,
    recentItems,
    setRecentItems,
    favoriteItems,
    setFavoriteItems,
    pinnedItems,
    setPinnedItems,
    notificationPreferences,
    setNotificationPreferences,
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
    columns,
    sprint,
    setSprint,
    backlogSections,
    setBacklogSections,
    retrospectiveItems,
    setRetrospectiveItems,
    pokerHistory,
    setPokerHistory,
    notesList,
    setNotesList,
    boardSettings,
    setBoardSettings,
    burndownSnapshots,
    completedSprints,
    plannedSprints,
    allTasks,
    idToGlobalIndex,
    teamMembers,
  };
}
