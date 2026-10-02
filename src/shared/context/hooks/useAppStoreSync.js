import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flushPendingWrites, loadAllDomains, saveDomain, setStorageActor, subscribeToAll } from "../../services/storage";
import {
  USER_PREFS_FIELDS,
  endUserPrefsSession,
  flushUserPrefs,
  getUserPrefsSnapshot,
  loadUserPrefs,
  saveUserPrefs,
  subscribeToUserPrefs,
} from "../../services/userPrefsStorage";
import { buildInitialAppStoreState, useAppStore } from "../../store/useAppStore";
import { isInProject } from "../../utils/helpers";
import { runAsRemote } from "../../automation/automationRunner";

const SHOULD_LOG_SYNC_DIAGNOSTICS = process.env.NODE_ENV !== "production";

function pickUserPrefs(state) {
  return USER_PREFS_FIELDS.reduce((prefs, field) => {
    prefs[field] = state[field];
    return prefs;
  }, {});
}

// Slice defaults for every personal field (what a fresh session starts with).
export function buildDefaultUserPrefs() {
  return pickUserPrefs(buildInitialAppStoreState());
}

/**
 * Hydrates the store, keeps it in sync and persists it.
 * Workspace data → `appData/{domain}` (storage.js); personal fields
 * (`USER_PREFS_FIELDS`) → `userPrefs/{uid}` (userPrefsStorage.js) once `uid`
 * is known. `dbReady` turns true only after both are in the store.
 */
export function useAppStoreSync(uid = null) {
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
    testSharedSteps,
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
    automationRules,
    automationLog,
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
    testSharedSteps: setTestSharedSteps,
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
    automationRules: setAutomationRules,
    automationLog: setAutomationLog,
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
    setTestSharedSteps,
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
    setAutomationRules,
    setAutomationLog,
  ]);

  const { data: remoteData, isError: loadFailed } = useQuery({
    queryKey: ["corechestra-app-data"],
    queryFn: loadAllDomains,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  // { uid, migrated } once loadUserPrefs(uid) settled; prefsUid = whose prefs are in the store.
  const [loadedPrefs, setLoadedPrefs] = useState(null);
  const [prefsUid, setPrefsUid] = useState(null);
  const prefsUidRef = useRef(null);
  const prefsHydrated = !uid || prefsUid === uid;

  useEffect(() => {
    if (remoteData === undefined) return;
    if (remoteData) {
      // Hydration is not a local change: automation rules must not fire on it.
      runAsRemote(() => {
        Object.entries(remoteData).forEach(([field, value]) => {
          if (value !== undefined) fieldSetters[field]?.(value);
        });
      });
    }
    setWorkspaceHydrated(true);
  }, [remoteData, fieldSetters]);

  useEffect(() => {
    if (!loadFailed) return;
    if (SHOULD_LOG_SYNC_DIAGNOSTICS) {
      console.warn("[AppContext] Initial load failed — starting with empty state");
    }
    setWorkspaceHydrated(true);
  }, [loadFailed]);

  useEffect(() => {
    setDbReady(workspaceHydrated && prefsHydrated);
  }, [workspaceHydrated, prefsHydrated, setDbReady]);

  // Unmount = logout (AuthGate swaps in the login page): the next session
  // must wait for its own hydration again.
  useEffect(() => () => setDbReady(false), [setDbReady]);

  useEffect(() => {
    // Remote edits already ran their automations on the client that made them.
    const unsubscribe = subscribeToAll((field, value) => {
      runAsRemote(() => fieldSetters[field]?.(value));
    });
    return unsubscribe;
  }, [fieldSetters]);

  // Personal prefs session for the signed-in user.
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    loadUserPrefs(uid).then((result) => {
      if (!cancelled) setLoadedPrefs({ uid, migrated: Boolean(result?.migrated) });
    });
    const unsubscribe = subscribeToUserPrefs(uid, (field, value) => {
      // Before hydration the hydration effect picks the snapshot up instead.
      if (prefsUidRef.current !== uid) return;
      runAsRemote(() => fieldSetters[field]?.(value));
    });
    const flush = () => { flushUserPrefs(); };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      endUserPrefsSession(uid);
      prefsUidRef.current = null;
      setPrefsUid(null);
      setLoadedPrefs(null);
      // Logout / user switch: never leave this user's prefs for the next one.
      runAsRemote(() => useAppStore.setState(buildDefaultUserPrefs()));
    };
  }, [uid, fieldSetters]);

  useEffect(() => {
    if (!uid || !workspaceHydrated || loadedPrefs?.uid !== uid || prefsUid === uid) return;
    // Existing doc: missing fields fall back to defaults. Freshly migrated doc:
    // keep what the store already holds (defaults, or values from the
    // pre-domain legacy formats) so the first save carries them over.
    const base = loadedPrefs.migrated ? pickUserPrefs(useAppStore.getState()) : buildDefaultUserPrefs();
    const prefs = getUserPrefsSnapshot(uid) || {};
    runAsRemote(() => useAppStore.setState({ ...base, ...prefs }));
    prefsUidRef.current = uid;
    setPrefsUid(uid);
  }, [uid, workspaceHydrated, loadedPrefs, prefsUid]);

  useEffect(() => {
    // Debounced writes would be lost if the tab closed within the debounce
    // window. "hidden" is the event that reliably fires on mobile/Safari.
    const flush = () => { flushPendingWrites(); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;
    const today = new Date().toISOString().slice(0, 10);
    setPerProjectBurndownSnapshots((prev) => {
      const existing = prev[currentProjectId] || [];
      if (existing.some((snapshot) => snapshot.date === today)) return prev;
      const projectTasks = activeTasks.filter((task) => isInProject(task, currentProjectId));
      const total = projectTasks.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const remaining = projectTasks
        .filter((task) => task.status !== "done")
        .reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const updated = [...existing, { date: today, remaining, total }].slice(-60);
      return { ...prev, [currentProjectId]: updated };
    });
  }, [activeTasks, currentProjectId, setPerProjectBurndownSnapshots]);

  // userPrefs is the source of truth; the localStorage copy only lets
  // src/index.js apply the class before React renders (no flash).
  useEffect(() => {
    if (!dbReady || !prefsHydrated) return;
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("corechestra_dark", darkMode ? "1" : "0");
    } catch (_) {}
  }, [darkMode, dbReady, prefsHydrated]);

  useEffect(() => {
    setStorageActor(currentUser || "");
  }, [currentUser]);

  // ── Personal fields → userPrefs/{uid} ──
  const canSavePrefs = dbReady && Boolean(uid) && prefsUid === uid;

  useEffect(() => {
    if (!canSavePrefs) return;
    saveUserPrefs(uid, { currentUser, currentProjectId });
  }, [currentUser, currentProjectId, canSavePrefs, uid]);

  useEffect(() => {
    if (!canSavePrefs) return;
    saveUserPrefs(uid, { darkMode, sidebarCollapsed, projectsViewMode });
  }, [darkMode, sidebarCollapsed, projectsViewMode, canSavePrefs, uid]);

  useEffect(() => {
    if (!canSavePrefs) return;
    saveUserPrefs(uid, {
      perProjectBoardFilters,
      savedViews,
      recentItems,
      favoriteItems,
      pinnedItems,
      notificationPreferences,
    });
  }, [perProjectBoardFilters, savedViews, recentItems, favoriteItems, pinnedItems, notificationPreferences, canSavePrefs, uid]);

  // ── Workspace-wide settings → appData/config ──
  useEffect(() => {
    if (!dbReady) return;
    saveDomain("config", { sprintDefaults });
  }, [sprintDefaults, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("config", {
      templateRegistry,
      permissionMatrix,
      workspaceSettings,
      sensitiveActionPolicy,
    });
  }, [templateRegistry, permissionMatrix, workspaceSettings, sensitiveActionPolicy, dbReady]);

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
    saveDomain("testing", { testSharedSteps });
  }, [testSharedSteps, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("archive", { archivedTasks });
  }, [archivedTasks, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("archive", { archivedProjects, archivedEpics });
  }, [archivedProjects, archivedEpics, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("automation", { automationRules });
  }, [automationRules, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("automation", { automationLog });
  }, [automationLog, dbReady]);
}
