import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  loadAllDomains,
  saveDomain,
  saveUserPreferences,
  setStorageActor,
  subscribeToAll,
  subscribeToUserPreferences,
} from "../../services/storage";
import { useAppStore } from "../../store/useAppStore";
import { useAuth } from "../AuthContext";

const SHOULD_LOG_SYNC_DIAGNOSTICS = process.env.NODE_ENV !== "production";

export function useAppStoreSync() {
  const { user: authUser, role } = useAuth();
  const {
    projects,
    currentProjectId,
    currentUser,
    epics,
    labels,
    perProjectSprint,
    projectColumns,
    activeTasks,
    perProjectBacklog,
    perProjectRetrospective,
    perProjectPokerHistory,
    perProjectNotes,
    perProjectBoardSettings,
    globalActivityLog,
    notifications,
    perProjectBurndownSnapshots,
    teams,
    users,
    deletedUserIds,
    sprintDefaults,
    spaces,
    docPages,
    releases,
    testPlans,
    testSuites,
    testCases,
    testRuns,
    perProjectCompletedSprints,
    perProjectPlannedSprints,
    archivedTasks,
    archivedProjects,
    archivedEpics,
    darkMode,
    sidebarCollapsed,
    projectsViewMode,
    perProjectBoardFilters,
    templateRegistry,
    savedViews,
    recentItems,
    favoriteItems,
    pinnedItems,
    notificationPreferences,
    permissionMatrix,
    workspaceSettings,
    sensitiveActionPolicy,
    dbReady,
    setProjects,
    setCurrentProjectId,
    setCurrentUser,
    setEpics,
    setLabels,
    setPerProjectSprint,
    setProjectColumns,
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
    setDbReady,
  } = useAppStore();

  const fieldSetters = useMemo(() => ({
    projects: setProjects,
    currentProjectId: setCurrentProjectId,
    currentUser: setCurrentUser,
    epics: setEpics,
    labels: setLabels,
    perProjectSprint: setPerProjectSprint,
    projectColumns: setProjectColumns,
    activeTasks: setActiveTasks,
    perProjectBacklog: setPerProjectBacklog,
    perProjectRetrospective: setPerProjectRetrospective,
    perProjectPokerHistory: setPerProjectPokerHistory,
    perProjectNotes: setPerProjectNotes,
    perProjectBoardSettings: setPerProjectBoardSettings,
    globalActivityLog: setGlobalActivityLog,
    notifications: setNotifications,
    teams: setTeams,
    users: setUsers,
    deletedUserIds: setDeletedUserIds,
    sprintDefaults: setSprintDefaults,
    perProjectBurndownSnapshots: setPerProjectBurndownSnapshots,
    spaces: setSpaces,
    docPages: setDocPages,
    releases: setReleases,
    testPlans: setTestPlans,
    testSuites: setTestSuites,
    testCases: setTestCases,
    testRuns: setTestRuns,
    perProjectCompletedSprints: setPerProjectCompletedSprints,
    perProjectPlannedSprints: setPerProjectPlannedSprints,
    darkMode: setDarkMode,
    sidebarCollapsed: setSidebarCollapsed,
    projectsViewMode: setProjectsViewMode,
    perProjectBoardFilters: setPerProjectBoardFilters,
    templateRegistry: setTemplateRegistry,
    savedViews: setSavedViews,
    recentItems: setRecentItems,
    favoriteItems: setFavoriteItems,
    pinnedItems: setPinnedItems,
    notificationPreferences: setNotificationPreferences,
    permissionMatrix: setPermissionMatrix,
    workspaceSettings: setWorkspaceSettings,
    sensitiveActionPolicy: setSensitiveActionPolicy,
    archivedTasks: setArchivedTasks,
    archivedProjects: setArchivedProjects,
    archivedEpics: setArchivedEpics,
  }), [
    setProjects,
    setCurrentProjectId,
    setCurrentUser,
    setEpics,
    setLabels,
    setPerProjectSprint,
    setProjectColumns,
    setActiveTasks,
    setPerProjectBacklog,
    setPerProjectRetrospective,
    setPerProjectPokerHistory,
    setPerProjectNotes,
    setPerProjectBoardSettings,
    setGlobalActivityLog,
    setNotifications,
    setTeams,
    setUsers,
    setDeletedUserIds,
    setSprintDefaults,
    setPerProjectBurndownSnapshots,
    setSpaces,
    setDocPages,
    setReleases,
    setTestPlans,
    setTestSuites,
    setTestCases,
    setTestRuns,
    setPerProjectCompletedSprints,
    setPerProjectPlannedSprints,
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
    setArchivedTasks,
    setArchivedProjects,
    setArchivedEpics,
  ]);

  const { data: remoteData, isError: loadFailed } = useQuery({
    queryKey: ["corechestra-app-data", authUser?.uid],
    queryFn: () => loadAllDomains(authUser?.uid),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (remoteData === undefined) return;
    if (remoteData) {
      Object.entries(remoteData).forEach(([field, value]) => {
        if (value !== undefined) fieldSetters[field]?.(value);
      });
    }
    setDbReady(true);
  }, [remoteData, fieldSetters, setDbReady]);

  useEffect(() => {
    if (!loadFailed) return;
    if (SHOULD_LOG_SYNC_DIAGNOSTICS) {
      console.warn("[AppContext] Initial load failed — starting with empty state");
    }
    setDbReady(true);
  }, [loadFailed, setDbReady]);

  useEffect(() => {
    const unsubscribe = subscribeToAll((field, value) => {
      fieldSetters[field]?.(value);
    });
    return unsubscribe;
  }, [fieldSetters]);

  useEffect(() => {
    return subscribeToUserPreferences(authUser?.uid, (field, value) => {
      fieldSetters[field]?.(value);
    });
  }, [authUser?.uid, fieldSetters]);

  useEffect(() => {
    if (!currentProjectId) return;
    const today = new Date().toISOString().slice(0, 10);
    setPerProjectBurndownSnapshots((prev) => {
      const existing = prev[currentProjectId] || [];
      if (existing.some((snapshot) => snapshot.date === today)) return prev;
      const projectTasks = activeTasks.filter((task) => (
        (task.projectId || "proj-1") === currentProjectId
      ));
      const total = projectTasks.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const remaining = projectTasks
        .filter((task) => task.status !== "done")
        .reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const updated = [...existing, { date: today, remaining, total }].slice(-60);
      return { ...prev, [currentProjectId]: updated };
    });
  }, [activeTasks, currentProjectId, setPerProjectBurndownSnapshots]);

  useEffect(() => {
    if (!dbReady) return;
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("corechestra_dark", darkMode ? "1" : "0");
    } catch (_) {}
  }, [darkMode, dbReady]);

  useEffect(() => {
    setStorageActor(currentUser || authUser?.email || "", role);
  }, [authUser?.email, currentUser, role]);

  useEffect(() => {
    if (!dbReady || role !== "admin") return;
    saveDomain("config", { sprintDefaults });
  }, [sprintDefaults, dbReady, role]);

  useEffect(() => {
    if (!dbReady || role !== "admin") return;
    saveDomain("config", {
      templateRegistry,
      permissionMatrix,
      workspaceSettings,
      sensitiveActionPolicy,
    });
  }, [templateRegistry, permissionMatrix, workspaceSettings, sensitiveActionPolicy, dbReady, role]);

  useEffect(() => {
    if (!dbReady || !authUser?.uid) return;
    saveUserPreferences(authUser.uid, {
      currentProjectId,
      darkMode,
      sidebarCollapsed,
      projectsViewMode,
      perProjectBoardFilters,
      savedViews,
      recentItems,
      favoriteItems,
      pinnedItems,
      notificationPreferences,
    });
  }, [
    authUser?.uid,
    currentProjectId,
    darkMode,
    dbReady,
    favoriteItems,
    notificationPreferences,
    perProjectBoardFilters,
    pinnedItems,
    projectsViewMode,
    recentItems,
    savedViews,
    sidebarCollapsed,
  ]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("entities", { projects });
  }, [projects, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("entities", { teams });
  }, [teams, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("entities", { users, deletedUserIds });
  }, [users, deletedUserIds, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("entities", { epics, labels });
  }, [epics, labels, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("tasks", { activeTasks });
  }, [activeTasks, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("tasks", { perProjectBacklog });
  }, [perProjectBacklog, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("sprints", { perProjectSprint });
  }, [perProjectSprint, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("sprints", { projectColumns, perProjectBoardSettings });
  }, [projectColumns, perProjectBoardSettings, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("sprints", { perProjectBurndownSnapshots });
  }, [perProjectBurndownSnapshots, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("sprints", {
      perProjectCompletedSprints,
      perProjectPlannedSprints,
    });
  }, [perProjectCompletedSprints, perProjectPlannedSprints, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("activity", { globalActivityLog });
  }, [globalActivityLog, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("activity", { notifications });
  }, [notifications, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("workspace", { perProjectRetrospective });
  }, [perProjectRetrospective, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("workspace", { perProjectPokerHistory });
  }, [perProjectPokerHistory, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("workspace", { perProjectNotes });
  }, [perProjectNotes, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("docs", { spaces });
  }, [spaces, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("docs", { docPages });
  }, [docPages, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("releases", { releases });
  }, [releases, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("testing", { testSuites });
  }, [testSuites, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("testing", { testPlans });
  }, [testPlans, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("testing", { testCases });
  }, [testCases, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("testing", { testRuns });
  }, [testRuns, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("archive", { archivedTasks });
  }, [archivedTasks, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("archive", { archivedProjects, archivedEpics });
  }, [archivedProjects, archivedEpics, dbReady]);
}
