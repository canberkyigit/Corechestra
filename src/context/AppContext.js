import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { loadState, saveState } from "../services/storage";
import { generateId } from "../utils/helpers";
import {
  SEED_PROJECTS, SEED_EPICS, SEED_LABELS, SEED_SPRINT, SEED_PROJ2_SPRINT,
  SEED_ACTIVE_TASKS, SEED_BACKLOG_SECTIONS, SEED_PROJ2_BACKLOG_SECTIONS,
  SEED_TEAMS, SEED_RETRO, SEED_PROJ2_RETRO, SEED_USERS, SEED_CUSTOM_FIELDS,
  DEFAULT_SPRINT_DEFAULTS, DEFAULT_BOARD_SETTINGS, DEFAULT_COLUMNS,
  SEED_SPACES, SEED_DOC_PAGES,
  SEED_RELEASES, SEED_TEST_SUITES, SEED_TEST_CASES, SEED_TEST_RUNS,
} from "./AppSeeds";

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const persisted = loadState();

  const [projects, setProjects] = useState(persisted?.projects ?? SEED_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState(persisted?.currentProjectId ?? "proj-1");
  const [epics, setEpics] = useState(persisted?.epics ?? SEED_EPICS);
  const [labels, setLabels] = useState(persisted?.labels ?? SEED_LABELS);
  const [perProjectSprint, setPerProjectSprint] = useState(() => {
    if (persisted?.perProjectSprint) {
      if (!persisted.perProjectSprint["proj-2"])
        return { ...persisted.perProjectSprint, "proj-2": SEED_PROJ2_SPRINT };
      return persisted.perProjectSprint;
    }
    return {
      "proj-1": persisted?.sprint ?? SEED_SPRINT,
      "proj-2": SEED_PROJ2_SPRINT,
    };
  });
  const [projectColumns, setProjectColumns] = useState(
    persisted?.projectColumns ?? { "proj-1": DEFAULT_COLUMNS, "proj-2": DEFAULT_COLUMNS }
  );

  // Migration: inject proj-2 active tasks if missing from persisted data
  const [activeTasks, setActiveTasks] = useState(() => {
    const base = persisted?.activeTasks ?? SEED_ACTIVE_TASKS;
    const hasProj2 = base.some((t) => t.projectId === "proj-2");
    if (!hasProj2) {
      const proj2Seeds = SEED_ACTIVE_TASKS.filter((t) => t.projectId === "proj-2");
      return [...base, ...proj2Seeds];
    }
    return base;
  });

  // Per-project backlog (migration from old flat backlogSections)
  const [perProjectBacklog, setPerProjectBacklog] = useState(() => {
    if (persisted?.perProjectBacklog) {
      // Inject proj-2 sections if missing
      if (!persisted.perProjectBacklog["proj-2"]) {
        return { ...persisted.perProjectBacklog, "proj-2": SEED_PROJ2_BACKLOG_SECTIONS };
      }
      return persisted.perProjectBacklog;
    }
    return {
      "proj-1": persisted?.backlogSections ?? SEED_BACKLOG_SECTIONS,
      "proj-2": SEED_PROJ2_BACKLOG_SECTIONS,
    };
  });
  const [perProjectRetrospective, setPerProjectRetrospective] = useState(() => {
    if (persisted?.perProjectRetrospective) {
      if (!persisted.perProjectRetrospective["proj-2"])
        return { ...persisted.perProjectRetrospective, "proj-2": SEED_PROJ2_RETRO };
      return persisted.perProjectRetrospective;
    }
    return { "proj-1": persisted?.retrospectiveItems ?? SEED_RETRO, "proj-2": SEED_PROJ2_RETRO };
  });

  const [perProjectPokerHistory, setPerProjectPokerHistory] = useState(() => {
    if (persisted?.perProjectPokerHistory) {
      if (!persisted.perProjectPokerHistory["proj-2"])
        return { ...persisted.perProjectPokerHistory, "proj-2": [] };
      return persisted.perProjectPokerHistory;
    }
    return { "proj-1": persisted?.pokerHistory ?? [], "proj-2": [] };
  });

  const [perProjectNotes, setPerProjectNotes] = useState(() => {
    if (persisted?.perProjectNotes) {
      if (!persisted.perProjectNotes["proj-2"])
        return { ...persisted.perProjectNotes, "proj-2": [] };
      return persisted.perProjectNotes;
    }
    return { "proj-1": persisted?.notesList ?? [], "proj-2": [] };
  });

  const [perProjectBoardSettings, setPerProjectBoardSettings] = useState(() => {
    if (persisted?.perProjectBoardSettings) {
      if (!persisted.perProjectBoardSettings["proj-2"])
        return { ...persisted.perProjectBoardSettings, "proj-2": { ...DEFAULT_BOARD_SETTINGS, boardName: "Mobile App", projectKey: "MB" } };
      return persisted.perProjectBoardSettings;
    }
    return {
      "proj-1": { ...DEFAULT_BOARD_SETTINGS, ...(persisted?.boardSettings ?? {}), taskViewMode: "panel" },
      "proj-2": { ...DEFAULT_BOARD_SETTINGS, boardName: "Mobile App", projectKey: "MB", taskViewMode: "panel" },
    };
  });
  const [currentUser, setCurrentUser] = useState(persisted?.currentUser ?? "alice");
  const [globalActivityLog, setGlobalActivityLog] = useState(persisted?.globalActivityLog ?? []);
  const [notifications, setNotifications] = useState(persisted?.notifications ?? []);
  const [perProjectBurndownSnapshots, setPerProjectBurndownSnapshots] = useState(persisted?.perProjectBurndownSnapshots ?? { "proj-1": [], "proj-2": [] });
  const [teams, setTeams] = useState(persisted?.teams ?? SEED_TEAMS);
  const [users, setUsers] = useState(persisted?.users ?? SEED_USERS);
  const [customFields, setCustomFields] = useState(persisted?.customFields ?? SEED_CUSTOM_FIELDS);
  const [sprintDefaults, setSprintDefaults] = useState(persisted?.sprintDefaults ?? DEFAULT_SPRINT_DEFAULTS);
  const [spaces, setSpaces] = useState(persisted?.spaces ?? SEED_SPACES);
  const [docPages, setDocPages] = useState(persisted?.docPages ?? SEED_DOC_PAGES);
  const [releases, setReleases] = useState(persisted?.releases ?? SEED_RELEASES);
  const [testSuites, setTestSuites] = useState(persisted?.testSuites ?? SEED_TEST_SUITES);
  const [testCases, setTestCases] = useState(persisted?.testCases ?? SEED_TEST_CASES);
  const [testRuns, setTestRuns] = useState(persisted?.testRuns ?? SEED_TEST_RUNS);
  const [perProjectCompletedSprints, setPerProjectCompletedSprints] = useState(
    persisted?.perProjectCompletedSprints ?? { "proj-1": [], "proj-2": [] }
  );

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
  const retrospectiveItems = perProjectRetrospective[currentProjectId] ?? SEED_RETRO;
  const setRetrospectiveItems = useCallback((updaterOrValue) => {
    setPerProjectRetrospective((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? SEED_RETRO)
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

  // Persist
  useEffect(() => {
    saveState({
      projects, currentProjectId, currentUser, epics, labels, perProjectSprint, projectColumns,
      activeTasks, perProjectBacklog, perProjectRetrospective, perProjectPokerHistory,
      perProjectNotes, perProjectBoardSettings, globalActivityLog, notifications, teams,
      users, customFields, sprintDefaults, perProjectBurndownSnapshots,
      spaces, docPages, releases, testSuites, testCases, testRuns,
      perProjectCompletedSprints,
    });
  }, [projects, currentProjectId, currentUser, epics, labels, perProjectSprint, projectColumns,
      activeTasks, perProjectBacklog, perProjectRetrospective, perProjectPokerHistory,
      perProjectNotes, perProjectBoardSettings, globalActivityLog, notifications, teams,
      users, customFields, sprintDefaults, perProjectBurndownSnapshots,
      spaces, docPages, releases, testSuites, testCases, testRuns,
      perProjectCompletedSprints]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logActivity, currentProjectId, setBacklogSections]);

  const deleteTask = useCallback((taskId) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [pid, sections] of Object.entries(prev)) {
        next[pid] = sections.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }));
      }
      return next;
    });
  }, []);

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
  }, [logActivity]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks, currentProjectId, perProjectSprint, logActivity, setBacklogSections, setSprint]);

  const updateSprint = useCallback((patch) => {
    setSprint((prev) => ({ ...prev, ...patch }));
  }, []);

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
  }, []);

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
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  // ── Epic Actions ───────────────────────────────────────────────────────────
  const createEpic = useCallback((epicData) => {
    const newEpic = { ...epicData, id: `epic-${Date.now()}`, projectId: currentProjectId };
    setEpics((prev) => [...prev, newEpic]);
  }, [currentProjectId]);

  const updateEpic = useCallback((updatedEpic) => {
    setEpics((prev) => prev.map((e) => (e.id === updatedEpic.id ? updatedEpic : e)));
  }, []);

  const deleteEpic = useCallback((epicId) => {
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
  }, []);

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

  // ── Custom Field Actions ────────────────────────────────────────────────────
  const createCustomField = useCallback((data) => {
    setCustomFields((prev) => [...prev, { ...data, id: `cf-${Date.now()}` }]);
  }, []);

  const updateCustomField = useCallback((updated) => {
    setCustomFields((prev) => prev.map((f) => f.id === updated.id ? updated : f));
  }, []);

  const deleteCustomField = useCallback((fieldId) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

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
    setProjects(SEED_PROJECTS);
    setCurrentProjectId("proj-1");
    setEpics(SEED_EPICS);
    setLabels(SEED_LABELS);
    setSprint(SEED_SPRINT);
    setProjectColumns({ "proj-1": DEFAULT_COLUMNS, "proj-2": DEFAULT_COLUMNS });
    setPerProjectSprint({ "proj-1": SEED_SPRINT, "proj-2": SEED_PROJ2_SPRINT });
    setActiveTasks(SEED_ACTIVE_TASKS);
    setPerProjectBacklog({ "proj-1": SEED_BACKLOG_SECTIONS, "proj-2": SEED_PROJ2_BACKLOG_SECTIONS });
    setPerProjectRetrospective({ "proj-1": SEED_RETRO, "proj-2": SEED_PROJ2_RETRO });
    setPerProjectPokerHistory({ "proj-1": [], "proj-2": [] });
    setPerProjectNotes({ "proj-1": [], "proj-2": [] });
    setPerProjectBoardSettings({
      "proj-1": DEFAULT_BOARD_SETTINGS,
      "proj-2": { ...DEFAULT_BOARD_SETTINGS, boardName: "Mobile App", projectKey: "MB" },
    });
    setGlobalActivityLog([]);
    setNotifications([]);
    setPerProjectBurndownSnapshots({ "proj-1": [], "proj-2": [] });
    setTeams(SEED_TEAMS);
    setUsers(SEED_USERS);
    setCustomFields(SEED_CUSTOM_FIELDS);
    setSprintDefaults(DEFAULT_SPRINT_DEFAULTS);
    setSpaces(SEED_SPACES);
    setDocPages(SEED_DOC_PAGES);
    setReleases(SEED_RELEASES);
    setTestSuites(SEED_TEST_SUITES);
    setTestCases(SEED_TEST_CASES);
    setTestRuns(SEED_TEST_RUNS);
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
    users, createUser, updateUser, deleteUser,
    // Custom Fields
    customFields, createCustomField, updateCustomField, deleteCustomField,
    // Sprint Defaults
    sprintDefaults, updateSprintDefaults,
    // Epics
    epics, createEpic, updateEpic, deleteEpic,
    // Labels
    labels, createLabel, deleteLabel,
    // Sprint
    sprint, startSprint, completeSprint, updateSprint,
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
    // Settings
    boardSettings, updateBoardSettings, resetAllData,
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
    testSuites, createTestSuite, updateTestSuite, deleteTestSuite,
    testCases, createTestCase, updateTestCase, deleteTestCase,
    testRuns, createTestRun, updateTestRun, updateTestRunResult,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
