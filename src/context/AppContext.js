import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadAllDomains, saveDomain, clearAllDomains, subscribeToAll } from "../services/storage";
import { generateId } from "../utils/helpers";
import { DEFAULT_SPRINT_DEFAULTS, DEFAULT_BOARD_SETTINGS, DEFAULT_COLUMNS } from "./AppSeeds";

// ─── Context ──────────────────────────────────────────────────────────────────
const _cachedDark = (() => { try { return localStorage.getItem("corechestra_dark") === "1"; } catch { return false; } })();
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Loading state ──────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);

  // ── State (empty defaults, hydrated from Firestore on mount) ───────────────
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [epics, setEpics] = useState([]);
  const [labels, setLabels] = useState([]);
  const [perProjectSprint, setPerProjectSprint] = useState({});
  const [projectColumns, setProjectColumns] = useState({});
  const [activeTasks, setActiveTasks] = useState([]);
  const [perProjectBacklog, setPerProjectBacklog] = useState({});
  const [perProjectRetrospective, setPerProjectRetrospective] = useState({});
  const [perProjectPokerHistory, setPerProjectPokerHistory] = useState({});
  const [perProjectNotes, setPerProjectNotes] = useState({});
  const [perProjectBoardSettings, setPerProjectBoardSettings] = useState({});
  const [currentUser, setCurrentUser] = useState("");
  const [globalActivityLog, setGlobalActivityLog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [perProjectBurndownSnapshots, setPerProjectBurndownSnapshots] = useState({});
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprintDefaults, setSprintDefaults] = useState(DEFAULT_SPRINT_DEFAULTS);
  const [spaces, setSpaces] = useState([]);
  const [docPages, setDocPages] = useState([]);
  const [releases, setReleases] = useState([]);
  const [testSuites, setTestSuites] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [perProjectCompletedSprints, setPerProjectCompletedSprints] = useState({});
  const [perProjectPlannedSprints, setPerProjectPlannedSprints] = useState({});

  // ── Archive ───────────────────────────────────────────────────────────────
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [archivedEpics, setArchivedEpics] = useState([]);

  // ── User preferences (previously in localStorage) ────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectsViewMode, setProjectsViewMode] = useState("grid");
  const [perProjectBoardFilters, setPerProjectBoardFilters] = useState({});

  // Sync dark mode class to DOM (only after Firestore loaded)
  // Also cache in localStorage for instant loading screen color on next visit
  useEffect(() => {
    if (!dbReady) return;
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try { localStorage.setItem("corechestra_dark", darkMode ? "1" : "0"); } catch (_) {}
  }, [darkMode, dbReady]);

  // Computed: per-project columns
  const columns = useMemo(
    () => projectColumns[currentProjectId] || DEFAULT_COLUMNS,
    [projectColumns, currentProjectId]
  );

  // Computed: current project's sprint + scoped setter
  const sprint = perProjectSprint[currentProjectId] ?? null;
  const setSprint = useCallback((updaterOrValue) => {
    setPerProjectSprint((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? null)
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: current project's backlog sections + scoped setter
  const backlogSections = perProjectBacklog[currentProjectId] || [];
  const setBacklogSections = useCallback((updaterOrValue) => {
    setPerProjectBacklog((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] || [])
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: per-project retrospective
  const retrospectiveItems = perProjectRetrospective[currentProjectId] ?? { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] };
  const setRetrospectiveItems = useCallback((updaterOrValue) => {
    setPerProjectRetrospective((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] })
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: per-project poker history
  const pokerHistory = perProjectPokerHistory[currentProjectId] ?? [];
  const setPokerHistory = useCallback((updaterOrValue) => {
    setPerProjectPokerHistory((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? [])
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: per-project notes
  const notesList = perProjectNotes[currentProjectId] ?? [];
  const setNotesList = useCallback((updaterOrValue) => {
    setPerProjectNotes((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? [])
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: per-project board settings
  const boardSettings = perProjectBoardSettings[currentProjectId] ?? DEFAULT_BOARD_SETTINGS;
  const setBoardSettings = useCallback((updaterOrValue) => {
    setPerProjectBoardSettings((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? DEFAULT_BOARD_SETTINGS)
        : updaterOrValue,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Computed: per-project burndown snapshots
  const burndownSnapshots = perProjectBurndownSnapshots[currentProjectId] ?? [];

  // Computed: completed sprints for current project
  const completedSprints = perProjectCompletedSprints[currentProjectId] ?? [];

  // Computed: planned future sprints for current project
  const plannedSprints = perProjectPlannedSprints[currentProjectId] ?? [];

  // Auto-snapshot: record today's remaining story points once per day
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setPerProjectBurndownSnapshots((prev) => {
      const existing = prev[currentProjectId] || [];
      if (existing.some((s) => s.date === today)) return prev;
      const total = activeTasks.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
      const remaining = activeTasks.filter((t) => t.status !== "done").reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
      const updated = [...existing, { date: today, remaining, total }].slice(-60);
      return { ...prev, [currentProjectId]: updated };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks, currentProjectId]);

  // ── Field → setter map (used by both initial load and real-time sync) ─────
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
    sprintDefaults: setSprintDefaults,
    perProjectBurndownSnapshots: setPerProjectBurndownSnapshots,
    spaces: setSpaces,
    docPages: setDocPages,
    releases: setReleases,
    testSuites: setTestSuites,
    testCases: setTestCases,
    testRuns: setTestRuns,
    perProjectCompletedSprints: setPerProjectCompletedSprints,
    perProjectPlannedSprints: setPerProjectPlannedSprints,
    darkMode: setDarkMode,
    sidebarCollapsed: setSidebarCollapsed,
    projectsViewMode: setProjectsViewMode,
    perProjectBoardFilters: setPerProjectBoardFilters,
    archivedTasks: setArchivedTasks,
    archivedProjects: setArchivedProjects,
    archivedEpics: setArchivedEpics,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial load via React Query (retry, error state, devtools) ──────────
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

  // Apply loaded data to state when query resolves
  useEffect(() => {
    if (remoteData === undefined) return;
    if (remoteData) {
      Object.entries(remoteData).forEach(([field, value]) => {
        if (value !== undefined) fieldSetters[field]?.(value);
      });
    }
    setDbReady(true);
  }, [remoteData]); // eslint-disable-line react-hooks/exhaustive-deps

  // On permanent load failure, still mark ready so app doesn't hang
  useEffect(() => {
    if (loadFailed) {
      console.warn("[AppContext] Initial load failed — starting with empty state");
      setDbReady(true);
    }
  }, [loadFailed]);

  // ── Real-time listener — syncs remote changes from other tabs/devices ─────
  useEffect(() => {
    const unsubscribe = subscribeToAll((field, value) => {
      fieldSetters[field]?.(value);
    });
    return unsubscribe;
  }, [fieldSetters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Domain-based Firestore persistence ────────────────────────────────────
  useEffect(() => {
    if (!dbReady) return;
    saveDomain("config", {
      currentUser, currentProjectId, sprintDefaults,
      darkMode, sidebarCollapsed, projectsViewMode, perProjectBoardFilters,
    });
  }, [currentUser, currentProjectId, sprintDefaults,
      darkMode, sidebarCollapsed, projectsViewMode, perProjectBoardFilters, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("entities", { projects, teams, users, epics, labels });
  }, [projects, teams, users, epics, labels, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("tasks", { activeTasks, perProjectBacklog });
  }, [activeTasks, perProjectBacklog, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("sprints", {
      perProjectSprint, projectColumns, perProjectBoardSettings,
      perProjectBurndownSnapshots, perProjectCompletedSprints, perProjectPlannedSprints,
    });
  }, [perProjectSprint, projectColumns, perProjectBoardSettings,
      perProjectBurndownSnapshots, perProjectCompletedSprints, perProjectPlannedSprints, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("activity", { globalActivityLog, notifications });
  }, [globalActivityLog, notifications, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("workspace", { perProjectRetrospective, perProjectPokerHistory, perProjectNotes });
  }, [perProjectRetrospective, perProjectPokerHistory, perProjectNotes, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("docs", { spaces, docPages });
  }, [spaces, docPages, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("releases", { releases });
  }, [releases, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("testing", { testSuites, testCases, testRuns });
  }, [testSuites, testCases, testRuns, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveDomain("archive", { archivedTasks, archivedProjects, archivedEpics });
  }, [archivedTasks, archivedProjects, archivedEpics, dbReady]);

  // Derived
  const allTasks = useMemo(() => {
    const bt = backlogSections.flatMap((s) => s.tasks);
    return [...activeTasks, ...bt];
  }, [activeTasks, backlogSections]);

  const idToGlobalIndex = useMemo(() => {
    const map = {};
    allTasks.forEach((t, i) => { map[t.id] = i; });
    return map;
  }, [allTasks]);

  // ── Activity Log helper ────────────────────────────────────────────────────
  const logActivity = useCallback((taskId, action, details = {}) => {
    const entry = {
      id: Date.now(),
      taskId,
      action,
      details,
      user: "You",
      timestamp: new Date().toISOString(),
      projectId: currentProjectId,
    };
    setGlobalActivityLog((prev) => [entry, ...prev].slice(0, 200));
    const updateTaskLog = (tasks) =>
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, activityLog: [entry, ...(t.activityLog || [])].slice(0, 50) }
          : t
      );
    setActiveTasks((prev) => updateTaskLog(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({ ...s, tasks: updateTaskLog(s.tasks) }));
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // ── Notification helpers ───────────────────────────────────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [
      { id: Date.now(), read: false, timestamp: new Date().toISOString(), ...notif },
      ...prev,
    ].slice(0, 50));
  }, []);

  const markNotifRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotifsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ── Task Actions ───────────────────────────────────────────────────────────
  const updateActiveTask = useCallback((updatedTask, logMsg) => {
    setActiveTasks((prev) => {
      const prevTask = prev.find((t) => t.id === updatedTask.id);
      if (prevTask) {
        if (prevTask.status !== updatedTask.status) {
          const statusLabels = { todo: "To Do", inprogress: "In Progress", review: "Review", awaiting: "Awaiting", blocked: "Blocked", done: "Done" };
          const label = statusLabels[updatedTask.status] || updatedTask.status;
          addNotification({
            type: updatedTask.status === "done" ? "status_done" : updatedTask.status === "blocked" ? "status_blocked" : "status_change",
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            text: `"${updatedTask.title}" moved to ${label}`,
          });
        }
        if (prevTask.assignedTo !== updatedTask.assignedTo && updatedTask.assignedTo) {
          addNotification({
            type: "assignment",
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            text: `You were assigned to "${updatedTask.title}"`,
          });
        }
      }
      return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    });
    if (logMsg) logActivity(updatedTask.id, logMsg);
  }, [logActivity, addNotification]);

  const createTask = useCallback((taskData, sprintValue) => {
    const newTask = {
      ...taskData,
      id: generateId(),
      status: "todo",
      statusChangedAt: new Date().toISOString(),
      subtasks: taskData.subtasks || [],
      comments: [],
      activityLog: [],
      labels: taskData.labels || [],
      timeEstimate: taskData.timeEstimate || 0,
      timeSpent: 0,
      watchers: [],
      epicId: taskData.epicId || null,
      projectId: currentProjectId,
    };
    if (sprintValue === "active") {
      setActiveTasks((prev) => [...prev, newTask]);
    } else if (sprintValue?.startsWith("backlog-")) {
      const backlogId = parseInt(sprintValue.replace("backlog-", ""), 10);
      setBacklogSections((prev) =>
        prev.map((s) => (s.id === backlogId ? { ...s, tasks: [...s.tasks, newTask] } : s))
      );
    } else {
      setActiveTasks((prev) => [...prev, newTask]);
    }
    logActivity(newTask.id, "created task");
    addNotification({ type: "task_created", taskId: newTask.id, taskTitle: newTask.title, text: `"${newTask.title}" created` });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logActivity, addNotification, currentProjectId, setBacklogSections]);

  // deleteTask now archives instead of permanently removing
  const deleteTask = useCallback((taskId) => {
    const task = activeTasks.find((t) => t.id === taskId)
      || Object.values(perProjectBacklog).flatMap((s) => s.flatMap((sec) => sec.tasks)).find((t) => t.id === taskId);
    setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }));
      }
      return next;
    });
    if (task) {
      setArchivedTasks((prev) => [{ ...task, archivedAt: new Date().toISOString() }, ...prev]);
      addNotification({ type: "task_archived", taskId, taskTitle: task.title, text: `"${task.title}" moved to archive` });
    }
  }, [activeTasks, perProjectBacklog, addNotification]);

  // ── Archive Actions ─────────────────────────────────────────────────────────
  const restoreTask = useCallback((taskId) => {
    const task = archivedTasks.find((t) => t.id === taskId);
    if (!task) return;
    const { archivedAt, ...restored } = task;
    setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTasks((prev) => [...prev, { ...restored, status: "todo" }]);
    addNotification({ type: "task_restored", taskId, taskTitle: restored.title, text: `"${restored.title}" restored from archive` });
  }, [archivedTasks, addNotification]);

  const permanentDeleteTask = useCallback((taskId) => {
    const task = archivedTasks.find((t) => t.id === taskId);
    setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (task) addNotification({ type: "task_deleted", taskId, taskTitle: task.title, text: `"${task.title}" permanently deleted` });
  }, [archivedTasks, addNotification]);

  const emptyArchive = useCallback(() => {
    const count = archivedTasks.length + archivedProjects.length + archivedEpics.length;
    setArchivedTasks([]);
    setArchivedProjects([]);
    setArchivedEpics([]);
    addNotification({ type: "archive_emptied", text: `Archive emptied (${count} items removed)` });
  }, [archivedTasks, archivedProjects, archivedEpics, addNotification]);

  const updateBacklogTask = useCallback((updatedTask) => {
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
        }));
      }
      return next;
    });
    setActiveTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  // ── Sprint Actions ─────────────────────────────────────────────────────────
  const startSprint = useCallback((sprintData) => {
    setSprint({ ...sprintData, status: "active" });
    logActivity("sprint", "started sprint", { name: sprintData.name });
    addNotification({ type: "sprint_started", text: `Sprint "${sprintData.name}" started` });
  }, [logActivity, addNotification]);

  const completeSprint = useCallback((moveToBacklogSectionId) => {
    const projectTasks = activeTasks.filter((t) => (t.projectId || "proj-1") === currentProjectId);
    const incomplete = projectTasks.filter((t) => t.status !== "done");
    const done = projectTasks.filter((t) => t.status === "done");
    if (moveToBacklogSectionId && incomplete.length > 0) {
      setBacklogSections((prev) =>
        prev.map((s) =>
          s.id === moveToBacklogSectionId
            ? { ...s, tasks: [...s.tasks, ...incomplete] }
            : s
        )
      );
      setActiveTasks((prev) => prev.filter((t) => t.status === "done" || (t.projectId || "proj-1") !== currentProjectId));
    }
    // Save completed sprint snapshot
    const currentSprint = perProjectSprint[currentProjectId];
    if (currentSprint) {
      const totalPoints = projectTasks.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
      const completedPoints = done.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
      const snapshot = {
        id: `cs-${Date.now()}`,
        name: currentSprint.name || "Sprint",
        goal: currentSprint.goal || "",
        startDate: currentSprint.startDate || "",
        endDate: currentSprint.endDate || "",
        completedAt: new Date().toISOString(),
        totalTasks: projectTasks.length,
        doneTasks: done.length,
        totalPoints,
        completedPoints,
        completionRate: projectTasks.length > 0 ? Math.round((done.length / projectTasks.length) * 100) : 0,
      };
      setPerProjectCompletedSprints((prev) => ({
        ...prev,
        [currentProjectId]: [snapshot, ...(prev[currentProjectId] || [])],
      }));
    }
    setSprint((prev) => ({ ...prev, status: "completed" }));
    logActivity("sprint", "completed sprint");
    addNotification({ type: "sprint_completed", text: `Sprint completed — ${done.length}/${projectTasks.length} tasks done` });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks, currentProjectId, perProjectSprint, logActivity, setBacklogSections, setSprint]);

  const updateSprint = useCallback((patch) => {
    setSprint((prev) => ({ ...prev, ...patch }));
  }, [setSprint]);

  const createPlannedSprint = useCallback((data) => {
    const sectionId = Date.now();
    const newSprint = {
      id: `ps-${sectionId}`,
      name: data.name,
      goal: data.goal || "",
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
      status: "planned",
      backlogSectionId: sectionId,
    };
    // Create a dedicated backlog section for this future sprint
    setBacklogSections((prev) => [
      ...prev,
      { id: sectionId, title: data.name, tasks: [] },
    ]);
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), newSprint],
    }));
  }, [currentProjectId, setBacklogSections]);

  const deletePlannedSprint = useCallback((sprintId) => {
    const sprintToDelete = (perProjectPlannedSprints[currentProjectId] || []).find((s) => s.id === sprintId);
    if (sprintToDelete?.backlogSectionId) {
      setBacklogSections((prev) => prev.filter((s) => s.id !== sprintToDelete.backlogSectionId));
    }
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter((s) => s.id !== sprintId),
    }));
  }, [currentProjectId, perProjectPlannedSprints, setBacklogSections]);

  // ── Project Actions ────────────────────────────────────────────────────────
  const createProject = useCallback((data) => {
    const id = `proj-${Date.now()}`;
    setProjects((prev) => [...prev, { ...data, id }]);
    // Initialize all per-project state for the new project
    setProjectColumns((prev) => ({ ...prev, [id]: DEFAULT_COLUMNS }));
    setPerProjectSprint((prev) => ({ ...prev, [id]: { id: `sprint-${id}`, name: "Sprint 1", goal: "", startDate: "", endDate: "", status: "planned" } }));
    setPerProjectBacklog((prev) => ({ ...prev, [id]: [{ id: Date.now(), title: "Backlog", tasks: [] }] }));
    setPerProjectRetrospective((prev) => ({ ...prev, [id]: { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] } }));
    setPerProjectPokerHistory((prev) => ({ ...prev, [id]: [] }));
    setPerProjectNotes((prev) => ({ ...prev, [id]: [] }));
    setPerProjectBoardSettings((prev) => ({ ...prev, [id]: { ...DEFAULT_BOARD_SETTINGS, boardName: data.name || "New Project", projectKey: data.key || "NP" } }));
    setPerProjectCompletedSprints((prev) => ({ ...prev, [id]: [] }));
    setPerProjectPlannedSprints((prev) => ({ ...prev, [id]: [] }));
    addNotification({ type: "project_created", text: `Project "${data.name}" created` });
  }, [addNotification]);

  const updateProject = useCallback((updated) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    // Keep boardSettings in sync: project name/key → boardName/projectKey
    setPerProjectBoardSettings((prev) => ({
      ...prev,
      [updated.id]: {
        ...(prev[updated.id] || DEFAULT_BOARD_SETTINGS),
        boardName:  updated.name,
        projectKey: updated.key,
      },
    }));
  }, []);

  const deleteProject = useCallback((projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (proj) addNotification({ type: "project_deleted", text: `Project "${proj.name}" deleted` });
  }, [projects, addNotification]);

  // ── Epic Actions ───────────────────────────────────────────────────────────
  const createEpic = useCallback((epicData) => {
    const newEpic = { ...epicData, id: `epic-${Date.now()}`, projectId: currentProjectId };
    setEpics((prev) => [...prev, newEpic]);
    addNotification({ type: "epic_created", text: `Epic "${epicData.title}" created` });
  }, [currentProjectId, addNotification]);

  const updateEpic = useCallback((updatedEpic) => {
    setEpics((prev) => prev.map((e) => (e.id === updatedEpic.id ? updatedEpic : e)));
  }, []);

  const deleteEpic = useCallback((epicId) => {
    const epic = epics.find((e) => e.id === epicId);
    setEpics((prev) => prev.filter((e) => e.id !== epicId));
    const unsetEpic = (tasks) => tasks.map((t) => t.epicId === epicId ? { ...t, epicId: null } : t);
    setActiveTasks((prev) => unsetEpic(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({ ...s, tasks: unsetEpic(s.tasks) }));
      }
      return next;
    });
    if (epic) addNotification({ type: "epic_deleted", text: `Epic "${epic.title}" deleted` });
  }, [epics, addNotification]);

  // ── Label Actions ──────────────────────────────────────────────────────────
  const createLabel = useCallback((labelData) => {
    setLabels((prev) => [...prev, { ...labelData, id: `lbl-${Date.now()}` }]);
  }, []);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    const removeLabel = (tasks) => tasks.map((t) => ({ ...t, labels: (t.labels || []).filter((l) => l !== labelId) }));
    setActiveTasks((prev) => removeLabel(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({ ...s, tasks: removeLabel(s.tasks) }));
      }
      return next;
    });
  }, []);

  // ── Column Actions (per-project) ───────────────────────────────────────────
  const _setCols = (updater) =>
    setProjectColumns((prev) => ({
      ...prev,
      [currentProjectId]: updater(prev[currentProjectId] || DEFAULT_COLUMNS),
    }));

  const renameColumn = useCallback((columnId, newTitle) => {
    _setCols((cols) => cols.map((c) => (c.id === columnId ? { ...c, title: newTitle } : c)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const createColumn = useCallback((title) => {
    const id = `custom_${Date.now()}`;
    _setCols((cols) => [...cols, { id, title, custom: true }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const deleteColumn = useCallback((columnId) => {
    _setCols((cols) => cols.filter((c) => c.id !== columnId));
    setActiveTasks((prev) => prev.map((t) => t.status === columnId ? { ...t, status: "todo" } : t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const reorderColumns = useCallback((newCols) => {
    setProjectColumns((prev) => ({ ...prev, [currentProjectId]: newCols }));
  }, [currentProjectId]);

  const updateProjectColumns = useCallback((projectId, newCols) => {
    setProjectColumns((prev) => ({ ...prev, [projectId]: newCols }));
  }, []);

  // ── Backlog Actions ────────────────────────────────────────────────────────
  const createBacklogSection = useCallback(() => {
    setBacklogSections((prev) => [
      ...prev,
      { id: Date.now(), title: `Backlog ${prev.length + 1}`, tasks: [] },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBacklogSections]);

  const deleteBacklogSection = useCallback((sectionId) => {
    setBacklogSections((prev) => prev.filter((s) => s.id !== sectionId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBacklogSections]);

  const renameBacklogSection = useCallback((sectionId, newTitle) => {
    setBacklogSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBacklogSections]);

  const handleBacklogDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const getSectionIdx = (id) => {
        if (id.startsWith("backlog-")) {
          const sid = parseInt(id.replace("backlog-", ""), 10);
          return backlogSections.findIndex((s) => s.id === sid);
        }
        return null;
      };

      const srcIdx = getSectionIdx(source.droppableId);
      const dstIdx = getSectionIdx(destination.droppableId);

      let draggedTask = null;
      if (source.droppableId === "active-sprint") {
        draggedTask = activeTasks.find((t) => t.id === draggableId);
      } else if (srcIdx !== null && srcIdx >= 0) {
        draggedTask = backlogSections[srcIdx].tasks.find((t) => t.id === draggableId);
      }
      if (!draggedTask) return;

      if (destination.droppableId === "active-sprint" && srcIdx !== null && srcIdx >= 0) {
        setBacklogSections((prev) => prev.map((s, i) => i !== srcIdx ? s : { ...s, tasks: s.tasks.filter((t) => t.id !== draggableId) }));
        setActiveTasks((prev) => {
          const newArr = [...prev];
          newArr.splice(destination.index, 0, { ...draggedTask, status: "todo", priority: draggedTask.priority || "medium" });
          return newArr;
        });
        return;
      }
      if (destination.droppableId.startsWith("backlog-") && source.droppableId === "active-sprint") {
        setActiveTasks((prev) => prev.filter((t) => t.id !== draggableId));
        setBacklogSections((prev) => prev.map((s, i) => {
          if (i !== dstIdx) return s;
          const newTasks = [...s.tasks];
          newTasks.splice(destination.index, 0, { ...draggedTask, status: "todo" });
          return { ...s, tasks: newTasks };
        }));
        return;
      }
      if (srcIdx !== null && dstIdx !== null && srcIdx !== dstIdx) {
        let taskToMove = null;
        setBacklogSections((prev) => {
          const updated = prev.map((s, i) => {
            if (i === srcIdx) { taskToMove = s.tasks.find((t) => t.id === draggableId); return { ...s, tasks: s.tasks.filter((t) => t.id !== draggableId) }; }
            return s;
          });
          return updated.map((s, i) => {
            if (i === dstIdx && taskToMove) { const t = [...s.tasks]; t.splice(destination.index, 0, taskToMove); return { ...s, tasks: t }; }
            return s;
          });
        });
        return;
      }
      if (srcIdx !== null && srcIdx === dstIdx) {
        setBacklogSections((prev) => prev.map((s, i) => {
          if (i !== srcIdx) return s;
          const t = s.tasks.filter((task) => task.id !== draggableId);
          t.splice(destination.index, 0, draggedTask);
          return { ...s, tasks: t };
        }));
        return;
      }
      if (destination.droppableId === "active-sprint" && source.droppableId === "active-sprint") {
        setActiveTasks((prev) => {
          const arr = prev.filter((t) => t.id !== draggableId);
          arr.splice(destination.index, 0, draggedTask);
          return arr;
        });
      }
    },
    [activeTasks, backlogSections, setBacklogSections] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Retrospective ──────────────────────────────────────────────────────────
  const addRetroItem = useCallback((category) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: [...prev[category], { id: Date.now(), text: "", checked: false, score: 0, isEditing: true }],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  const updateRetroItem = useCallback((category, itemId, text) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, text, isEditing: false } : item),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  const deleteRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({ ...prev, [category]: prev[category].filter((item) => item.id !== itemId) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  const voteRetroItem = useCallback((category, itemId, delta) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, score: (item.score || 0) + delta } : item),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  const toggleRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  const setRetroItemEditing = useCallback((category, itemId, isEditing) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, isEditing } : { ...item, isEditing: false }),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRetrospectiveItems]);

  // ── Notes ──────────────────────────────────────────────────────────────────
  const addNote = useCallback((content) => {
    if (!content?.trim()) return;
    setNotesList((prev) => [{ id: Date.now(), content }, ...prev]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNotesList]);

  const deleteNote = useCallback((noteId) => {
    setNotesList((prev) => prev.filter((n) => n.id !== noteId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNotesList]);

  // ── Planning Poker ─────────────────────────────────────────────────────────
  const savePokerResult = useCallback((result) => {
    setPokerHistory((prev) => [{ ...result, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    if (result.taskId && typeof result.estimation === "number") {
      const update = (tasks) => tasks.map((t) => t.id === result.taskId ? { ...t, storyPoint: result.estimation } : t);
      setActiveTasks((prev) => update(prev));
      setPerProjectBacklog((prev) => {
        const next = {};
        for (const [pid, sections] of Object.entries(prev)) {
          next[pid] = sections.map((s) => ({ ...s, tasks: update(s.tasks) }));
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPokerHistory]);

  // ── Board Settings ─────────────────────────────────────────────────────────
  const updateBoardSettings = useCallback((patch) => {
    setBoardSettings((prev) => ({ ...prev, ...patch }));
    // Two-way sync: if boardName/projectKey changes here, also update project record
    if (patch.boardName !== undefined) {
      setProjects((prev) => prev.map((p) =>
        p.id === currentProjectId ? { ...p, name: patch.boardName } : p
      ));
    }
    if (patch.projectKey !== undefined) {
      setProjects((prev) => prev.map((p) =>
        p.id === currentProjectId ? { ...p, key: patch.projectKey } : p
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBoardSettings, currentProjectId]);

  const createTeam = useCallback((data) => {
    setTeams((prev) => [...prev, { ...data, id: `team-${Date.now()}` }]);
  }, []);

  const updateTeam = useCallback((updated) => {
    setTeams((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }, []);

  const deleteTeam = useCallback((teamId) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  }, []);

  // ── User Actions ───────────────────────────────────────────────────────────
  const createUser = useCallback((data) => {
    setUsers((prev) => [...prev, { ...data, id: `user-${Date.now()}`, joinedAt: new Date().toISOString().slice(0, 10) }]);
  }, []);

  const updateUser = useCallback((updated) => {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
  }, []);

  const deleteUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // ── Derived: team member list for assignee dropdowns ───────────────────────
  const teamMembers = useMemo(() => [
    { value: "", label: "All Members" },
    { value: "unassigned", label: "Unassigned" },
    ...users.filter((u) => u.status === "active").map((u) => ({ value: u.username, label: u.name, color: u.color })),
  ], [users]);

  // ── Sprint Defaults ─────────────────────────────────────────────────────────
  const updateSprintDefaults = useCallback((patch) => {
    setSprintDefaults((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Documentation Space Actions ────────────────────────────────────────────
  const createSpace = useCallback((data) => {
    const id = `space-${Date.now()}`;
    setSpaces((prev) => [...prev, { ...data, id, createdAt: new Date().toISOString() }]);
  }, []);

  const updateSpace = useCallback((updated) => {
    setSpaces((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }, []);

  const deleteSpace = useCallback((spaceId) => {
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
    setDocPages((prev) => prev.filter((p) => p.spaceId !== spaceId));
  }, []);

  // ── Documentation Page Actions ─────────────────────────────────────────────
  const createDocPage = useCallback((data) => {
    const id = `page-${Date.now()}`;
    const now = new Date().toISOString();
    setDocPages((prev) => [...prev, {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      labels: data.labels || [],
    }]);
    return id;
  }, []);

  const updateDocPage = useCallback((updated) => {
    setDocPages((prev) => prev.map((p) =>
      p.id === updated.id ? { ...p, ...updated, updatedAt: new Date().toISOString() } : p
    ));
  }, []);

  const deleteDocPage = useCallback((pageId) => {
    // Also delete all descendants
    setDocPages((prev) => {
      const toDelete = new Set();
      const collect = (id) => {
        toDelete.add(id);
        prev.filter((p) => p.parentId === id).forEach((child) => collect(child.id));
      };
      collect(pageId);
      return prev.filter((p) => !toDelete.has(p.id));
    });
  }, []);

  const moveDocPage = useCallback((pageId, newParentId) => {
    setDocPages((prev) => prev.map((p) =>
      p.id === pageId ? { ...p, parentId: newParentId, updatedAt: new Date().toISOString() } : p
    ));
  }, []);

  const addDocComment = useCallback((pageId, text) => {
    if (!text?.trim()) return;
    const comment = {
      id: `dcmt-${Date.now()}`,
      author: currentUser,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setDocPages((prev) => prev.map((p) =>
      p.id === pageId ? { ...p, comments: [...(p.comments || []), comment] } : p
    ));
  }, [currentUser]);

  const deleteDocComment = useCallback((pageId, commentId) => {
    setDocPages((prev) => prev.map((p) =>
      p.id === pageId ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) } : p
    ));
  }, []);

  // ── Release Actions ────────────────────────────────────────────────────────
  const createRelease = useCallback((data) => {
    const newRelease = {
      ...data,
      id: `rel-${Date.now()}`,
      taskIds: data.taskIds || [],
      changelog: data.changelog || [],
    };
    setReleases((prev) => [...prev, newRelease]);
  }, []);

  const updateRelease = useCallback((updated) => {
    setReleases((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const deleteRelease = useCallback((id) => {
    setReleases((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addChangelogEntry = useCallback((releaseId, entry) => {
    const newEntry = {
      ...entry,
      id: `cl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setReleases((prev) =>
      prev.map((r) =>
        r.id === releaseId ? { ...r, changelog: [...(r.changelog || []), newEntry] } : r
      )
    );
  }, []);

  const deleteChangelogEntry = useCallback((releaseId, entryId) => {
    setReleases((prev) =>
      prev.map((r) =>
        r.id === releaseId
          ? { ...r, changelog: (r.changelog || []).filter((e) => e.id !== entryId) }
          : r
      )
    );
  }, []);

  // ── Test Suite Actions ─────────────────────────────────────────────────────
  const createTestSuite = useCallback((data) => {
    setTestSuites((prev) => [...prev, { ...data, id: `ts-${Date.now()}` }]);
  }, []);

  const updateTestSuite = useCallback((updated) => {
    setTestSuites((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
  }, []);

  const deleteTestSuite = useCallback((id) => {
    setTestSuites((prev) => prev.filter((s) => s.id !== id));
    setTestCases((prev) => prev.filter((c) => c.suiteId !== id));
    setTestRuns((prev) => prev.filter((r) => r.suiteId !== id));
  }, []);

  // ── Test Case Actions ──────────────────────────────────────────────────────
  const createTestCase = useCallback((data) => {
    setTestCases((prev) => [...prev, { ...data, id: `tc-${Date.now()}`, status: data.status || "untested" }]);
  }, []);

  const updateTestCase = useCallback((updated) => {
    setTestCases((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
  }, []);

  const deleteTestCase = useCallback((id) => {
    setTestCases((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Test Run Actions ───────────────────────────────────────────────────────
  const createTestRun = useCallback((data) => {
    setTestRuns((prev) => [...prev, { ...data, id: `tr-${Date.now()}`, createdAt: new Date().toISOString(), completedAt: null, results: data.results || [] }]);
  }, []);

  const updateTestRun = useCallback((updated) => {
    setTestRuns((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
  }, []);

  const updateTestRunResult = useCallback((runId, caseId, result) => {
    setTestRuns((prev) => prev.map((r) => {
      if (r.id !== runId) return r;
      const existing = (r.results || []).find((x) => x.caseId === caseId);
      const results = existing
        ? r.results.map((x) => x.caseId === caseId ? { ...x, ...result } : x)
        : [...(r.results || []), { caseId, ...result }];
      return { ...r, results };
    }));
  }, []);

  const resetAllData = useCallback(() => {
    clearAllDomains();
    setProjects([]);
    setCurrentProjectId("");
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
    setSprintDefaults(DEFAULT_SPRINT_DEFAULTS);
    setSpaces([]);
    setDocPages([]);
    setReleases([]);
    setTestSuites([]);
    setTestCases([]);
    setTestRuns([]);
    setPerProjectCompletedSprints({});
    setArchivedTasks([]);
    setArchivedProjects([]);
    setArchivedEpics([]);
    setDarkMode(false);
    setSidebarCollapsed(false);
    setProjectsViewMode("grid");
    setPerProjectBoardFilters({});
  }, []);

  const value = {
    // Current user
    currentUser, setCurrentUser,
    // Projects
    projects, setProjects, currentProjectId, setCurrentProjectId,
    createProject, updateProject, deleteProject,
    // Teams
    teams, createTeam, updateTeam, deleteTeam,
    // Users
    users, createUser, updateUser, deleteUser, teamMembers,
    // Sprint Defaults
    sprintDefaults, updateSprintDefaults,
    // Epics
    epics, createEpic, updateEpic, deleteEpic,
    // Labels
    labels, createLabel, deleteLabel,
    // Sprint
    sprint, startSprint, completeSprint, updateSprint,
    plannedSprints, createPlannedSprint, deletePlannedSprint,
    // Columns
    columns, renameColumn, createColumn, deleteColumn, reorderColumns,
    projectColumns, updateProjectColumns,
    // Tasks
    activeTasks, setActiveTasks,
    backlogSections, setBacklogSections,
    allTasks, idToGlobalIndex,
    updateActiveTask, createTask, deleteTask, updateBacklogTask,
    createBacklogSection, deleteBacklogSection, renameBacklogSection,
    handleBacklogDragEnd,
    // Retro
    retrospectiveItems,
    addRetroItem, updateRetroItem, deleteRetroItem, voteRetroItem, toggleRetroItem, setRetroItemEditing,
    // Notes
    notesList, addNote, deleteNote,
    // Poker
    pokerHistory, savePokerResult,
    // Burndown snapshots
    burndownSnapshots,
    // Completed sprints history
    completedSprints,
    // Archive
    archivedTasks, archivedProjects, archivedEpics,
    restoreTask, permanentDeleteTask, emptyArchive,
    // Settings
    boardSettings, updateBoardSettings, resetAllData, dbReady,
    // User preferences
    darkMode, setDarkMode, sidebarCollapsed, setSidebarCollapsed,
    projectsViewMode, setProjectsViewMode,
    perProjectBoardFilters, setPerProjectBoardFilters,
    // Activity
    globalActivityLog, logActivity,
    // Notifications
    notifications, addNotification, markNotifRead, markAllNotifsRead,
    // Documentation
    spaces, createSpace, updateSpace, deleteSpace,
    docPages, createDocPage, updateDocPage, deleteDocPage, moveDocPage, addDocComment, deleteDocComment,
    // Releases
    releases, createRelease, updateRelease, deleteRelease, addChangelogEntry, deleteChangelogEntry,
    // Test Management
    testSuites, setTestSuites, createTestSuite, updateTestSuite, deleteTestSuite,
    testCases, setTestCases, createTestCase, updateTestCase, deleteTestCase,
    testRuns, setTestRuns, createTestRun, updateTestRun, updateTestRunResult,
  };

  return (
    <AppContext.Provider value={value}>
      {!dbReady && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: _cachedDark ? "#181c2a" : "#ffffff" }}>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
