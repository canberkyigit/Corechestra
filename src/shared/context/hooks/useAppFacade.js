import { useAppStateDomains } from "./useAppStateDomains";
import { useAppStore } from "../../store/useAppStore";
import { useActivityActions } from "./actions/useActivityActions";
import { useAutomationActions } from "./actions/useAutomationActions";
import { useBoardActions } from "./actions/useBoardActions";
import { useCustomFieldActions } from "./actions/useCustomFieldActions";
import { useDocsActions } from "./actions/useDocsActions";
import { useNotificationActions } from "./actions/useNotificationActions";
import { useSystemActions } from "./actions/useSystemActions";
import { useTestingActions } from "./actions/useTestingActions";
import { useWorkspaceActions } from "./actions/useWorkspaceActions";
import { useWorkspaceEventBridge } from "./actions/useWorkspaceEventBridge";
import { useAutomationApi } from "./api/useAutomationApi";
import { useBoardApi } from "./api/useBoardApi";
import { useCustomFieldApi } from "./api/useCustomFieldApi";
import { useDocsApi } from "./api/useDocsApi";
import { useTestingApi } from "./api/useTestingApi";
import { useUiApi } from "./api/useUiApi";
import { useWorkspaceApi } from "./api/useWorkspaceApi";

/**
 * Computes the full `useApp()` facade (state getters + actions).
 *
 * This is expensive (~100 hooks) and subscribes to the whole store, so it is
 * meant to run ONCE inside `AppProvider`. Consumers should call `useApp()`,
 * which reads the provider-computed facade through a tracking proxy and only
 * re-renders when a key the component actually read changes.
 */
export function useAppFacade() {
  const dbReady = useAppStore((state) => state.dbReady);
  const state = useAppStateDomains();
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    epics,
    setEpics,
    labels,
    setLabels,
    setPerProjectSprint,
    projectColumns,
    setProjectColumns,
    activeTasks,
    setActiveTasks,
    setPerProjectBacklog,
    setPerProjectRetrospective,
    setPerProjectPokerHistory,
    setPerProjectNotes,
    setPerProjectBoardSettings,
    currentUser,
    setCurrentUser,
    globalActivityLog,
    setGlobalActivityLog,
    notifications,
    setNotifications,
    notificationPreferences,
    setNotificationPreferences,
    setPerProjectBurndownSnapshots,
    teams,
    setTeams,
    users,
    setUsers,
    deletedUserIds,
    setDeletedUserIds,
    customFieldDefs,
    setCustomFieldDefs,
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
    testSharedSteps,
    setTestSharedSteps,
    setPerProjectCompletedSprints,
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
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
    automationRules,
    setAutomationRules,
    automationLog,
    setAutomationLog,
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
  } = state;

  const { logActivity, logAuditEvent } = useActivityActions({
    currentProjectId,
    currentUser,
    setGlobalActivityLog,
    setActiveTasks,
    setPerProjectBacklog,
  });

  const { addNotification, markNotifRead, markAllNotifsRead } = useNotificationActions({
    setNotifications,
    notificationPreferences,
  });

  const workspaceActions = useWorkspaceActions({
    projects,
    workspaceSettings,
    setProjects,
    setProjectColumns,
    setPerProjectSprint,
    setPerProjectBacklog,
    setPerProjectRetrospective,
    setPerProjectPokerHistory,
    setPerProjectNotes,
    setPerProjectBoardSettings,
    setPerProjectCompletedSprints,
    setPerProjectPlannedSprints,
    setTeams,
    setUsers,
    setDeletedUserIds,
    addNotification,
    logAuditEvent,
  });

  const boardActions = useBoardActions({
    currentProjectId,
    currentUser,
    backlogSections,
    setActiveTasks,
    setBacklogSections,
    setPerProjectBacklog,
    setArchivedTasks,
    setArchivedProjects,
    setArchivedEpics,
    setSprint,
    setPerProjectCompletedSprints,
    setPerProjectPlannedSprints,
    setProjects,
    setProjectColumns,
    setEpics,
    setRetrospectiveItems,
    setNotesList,
    setPokerHistory,
    setBoardSettings,
    logActivity,
    addNotification,
  });

  const docsActions = useDocsActions({
    currentUser,
    setSpaces,
    setDocPages,
  });

  const rawTestingActions = useTestingActions({
    currentUser,
    templateRegistry,
    setReleases,
    setTestPlans,
    setTestSuites,
    setTestCases,
    setTestRuns,
    setTestSharedSteps,
  });
  // Announces local release / test-run changes to the Chats project channels.
  const testingActions = useWorkspaceEventBridge(rawTestingActions, { currentUser, currentProjectId });

  const automationActions = useAutomationActions({
    currentUser,
    setAutomationRules,
    setAutomationLog,
    logAuditEvent,
  });

  const customFieldActions = useCustomFieldActions({
    currentUser,
    currentProjectId,
    setCustomFieldDefs,
    setActiveTasks,
    setPerProjectBacklog,
    setArchivedTasks,
    logAuditEvent,
  });

  const { resetAllData } = useSystemActions({
    setProjects,
    setCurrentProjectId,
    setCurrentUser,
    setEpics,
    setLabels,
    setSprint,
    setProjectColumns,
    setPerProjectSprint,
    setActiveTasks,
    setPerProjectBacklog,
    setPerProjectRetrospective,
    setPerProjectPokerHistory,
    setPerProjectNotes,
    setPerProjectBoardSettings,
    setGlobalActivityLog,
    setNotifications,
    setPerProjectBurndownSnapshots,
    setTeams,
    setUsers,
    setDeletedUserIds,
    setCustomFieldDefs,
    setSprintDefaults,
    setSpaces,
    setDocPages,
    setReleases,
    setTestPlans,
    setTestSuites,
    setTestCases,
    setTestRuns,
    setTestSharedSteps,
    setPerProjectCompletedSprints,
    setPerProjectPlannedSprints,
    setArchivedTasks,
    setArchivedProjects,
    setArchivedEpics,
    setDarkMode,
    setSidebarCollapsed,
    setProjectsViewMode,
    setPerProjectBoardFilters,
    setTemplateRegistry,
    setSavedViews,
    setRecentItems,
    setFavoriteItems,
    setPinnedItems,
    setNotificationPreferences,
    setPermissionMatrix,
    setWorkspaceSettings,
    setSensitiveActionPolicy,
    setAutomationRules,
    setAutomationLog,
  });

  const workspaceApi = useWorkspaceApi({
    currentUser,
    setCurrentUser,
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    teams,
    users,
    deletedUserIds,
    teamMembers,
    sprintDefaults,
    workspaceActions,
  });

  const boardApi = useBoardApi({
    epics,
    labels,
    sprint,
    plannedSprints,
    columns,
    projectColumns,
    activeTasks,
    setActiveTasks,
    backlogSections,
    setBacklogSections,
    allTasks,
    idToGlobalIndex,
    retrospectiveItems,
    notesList,
    pokerHistory,
    burndownSnapshots,
    completedSprints,
    archivedTasks,
    archivedProjects,
    archivedEpics,
    boardSettings,
    boardActions,
  });

  const docsApi = useDocsApi({
    spaces,
    docPages,
    docsActions,
  });

  const testingApi = useTestingApi({
    releases,
    testPlans,
    setTestPlans,
    testSuites,
    setTestSuites,
    testCases,
    setTestCases,
    testRuns,
    setTestRuns,
    testSharedSteps,
    setTestSharedSteps,
    testingActions,
  });

  const uiApi = useUiApi({
    resetAllData,
    dbReady,
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsViewMode,
    setProjectsViewMode,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
    templateRegistry,
    setTemplateRegistry,
    savedViews,
    setSavedViews,
    recentItems,
    setRecentItems,
    favoriteItems,
    pinnedItems,
    notificationPreferences,
    setNotificationPreferences,
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
    globalActivityLog,
    logActivity,
    notifications,
    addNotification,
    markNotifRead,
    markAllNotifsRead,
    currentUser,
  });

  const automationApi = useAutomationApi({
    automationRules,
    automationLog,
    automationActions,
  });

  const customFieldApi = useCustomFieldApi({
    customFieldDefs,
    customFieldActions,
  });

  return {
    ...workspaceApi,
    ...boardApi,
    ...uiApi,
    ...docsApi,
    ...testingApi,
    ...automationApi,
    ...customFieldApi,
    logAuditEvent,
  };
}
