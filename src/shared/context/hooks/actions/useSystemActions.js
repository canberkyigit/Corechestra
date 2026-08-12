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
  setTemplateRegistry,
  setPermissionMatrix,
  setWorkspaceSettings,
  setSensitiveActionPolicy,
}) {
  const resetAllData = useCallback(async () => {
    const cleared = await clearAllDomains();
    if (!cleared) return false;

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
    setTemplateRegistry(DEFAULT_TEMPLATE_REGISTRY);
    setPermissionMatrix(DEFAULT_PERMISSION_MATRIX);
    setWorkspaceSettings(preferencesInitialState.workspaceSettings);
    setSensitiveActionPolicy(preferencesInitialState.sensitiveActionPolicy);
    return true;
  }, [
    setActiveTasks,
    setArchivedEpics,
    setArchivedProjects,
    setArchivedTasks,
    setCurrentProjectId,
    setCurrentUser,
    setDeletedUserIds,
    setDocPages,
    setEpics,
    setGlobalActivityLog,
    setLabels,
    setNotifications,
    setPerProjectBacklog,
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
    setReleases,
    setTestPlans,
    setPermissionMatrix,
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
