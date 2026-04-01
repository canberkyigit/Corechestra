import { useCallback } from "react";
import { clearAllDomains } from "../../../services/storage";
import { DEFAULT_SPRINT_DEFAULTS } from "../../AppSeeds";
import { useAppStore } from "../../../store/useAppStore";
import { DEFAULT_TEMPLATE_REGISTRY } from "../../../constants/defaultTemplates";
import { DEFAULT_PERMISSION_MATRIX } from "../../../constants/permissions";
import { preferencesInitialState } from "../../../store/slices/preferencesSlice";

export function useSystemActions({
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
  setSprintDefaults,
  setSpaces,
  setDocPages,
  setReleases,
  setTestPlans,
  setTestSuites,
  setTestCases,
  setTestRuns,
  setPerProjectCompletedSprints,
  setPerProjectPlannedSprints,
  setArchivedTasks,
  setArchivedProjects,
  setArchivedEpics,
  setDarkMode,
  setSidebarCollapsed,
  setProjectsViewMode,
  setDensityMode,
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
}) {
  const resetAllData = useCallback(() => {
    clearAllDomains();
    setProjects([]);
    setCurrentProjectId("");
    setCurrentUser("");
    setEpics([]);
    setLabels([]);
    setSprint(null);
    setProjectColumns({});
    setPerProjectSprint({});
    setActiveTasks([]);
    setPerProjectBacklog({});
    setPerProjectRetrospective({});
    setPerProjectPokerHistory({});
    setPerProjectNotes({});
    setPerProjectBoardSettings({});
    setGlobalActivityLog([]);
    setNotifications([]);
    setPerProjectBurndownSnapshots({});
    setTeams([]);
    setUsers([]);
    setDeletedUserIds([]);
    setSprintDefaults(DEFAULT_SPRINT_DEFAULTS);
    setSpaces([]);
    setDocPages([]);
    setReleases([]);
    setTestPlans([]);
    setTestSuites([]);
    setTestCases([]);
    setTestRuns([]);
    setPerProjectCompletedSprints({});
    setPerProjectPlannedSprints({});
    setArchivedTasks([]);
    setArchivedProjects([]);
    setArchivedEpics([]);
    useAppStore.getState().setDbReady(false);
    setDarkMode(false);
    setSidebarCollapsed(false);
    setProjectsViewMode("grid");
    setDensityMode("comfortable");
    setPerProjectBoardFilters({});
    setTemplateRegistry(DEFAULT_TEMPLATE_REGISTRY);
    setSavedViews({ board: [], docs: [], releases: [], tests: [] });
    setRecentItems([]);
    setFavoriteItems([]);
    setPinnedItems([]);
    setNotificationPreferences({
      inApp: {
        assignments: true,
        mentions: true,
        comments: true,
        workflow: true,
        releases: true,
        reminders: true,
        system: true,
      },
      email: {
        assignments: false,
        mentions: false,
        comments: false,
        workflow: false,
        releases: false,
        reminders: false,
        system: false,
      },
      digest: "daily",
    });
    setPermissionMatrix(DEFAULT_PERMISSION_MATRIX);
    setWorkspaceSettings(preferencesInitialState.workspaceSettings);
    setSensitiveActionPolicy(preferencesInitialState.sensitiveActionPolicy);
  }, [
    setActiveTasks,
    setArchivedEpics,
    setArchivedProjects,
    setArchivedTasks,
    setCurrentProjectId,
    setCurrentUser,
    setDarkMode,
    setDeletedUserIds,
    setDensityMode,
    setDocPages,
    setEpics,
    setGlobalActivityLog,
    setLabels,
    setNotifications,
    setPerProjectBacklog,
    setPerProjectBoardFilters,
    setPerProjectBoardSettings,
    setPerProjectBurndownSnapshots,
    setPerProjectCompletedSprints,
    setPerProjectNotes,
    setPerProjectPlannedSprints,
    setPerProjectPokerHistory,
    setPerProjectRetrospective,
    setPerProjectSprint,
    setProjectColumns,
    setProjects,
    setProjectsViewMode,
    setRecentItems,
    setReleases,
    setTestPlans,
    setFavoriteItems,
    setPinnedItems,
    setPermissionMatrix,
    setNotificationPreferences,
    setSavedViews,
    setSidebarCollapsed,
    setSpaces,
    setSprint,
    setSprintDefaults,
    setTemplateRegistry,
    setTeams,
    setTestCases,
    setTestRuns,
    setTestSuites,
    setUsers,
    setWorkspaceSettings,
    setSensitiveActionPolicy,
  ]);

  return {
    resetAllData,
  };
}
