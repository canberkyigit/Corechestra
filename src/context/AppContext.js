import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { loadState, saveState } from "../services/storage";
import { generateSubtasks, generateId } from "../utils/helpers";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PROJECTS = [
  { id: "proj-1", name: "Corechestra", key: "CY", color: "#2563eb" },
  { id: "proj-2", name: "Mobile App", key: "MB", color: "#7c3aed" },
];

const SEED_EPICS = [
  { id: "epic-1", title: "Authentication", color: "#7c3aed", projectId: "proj-1", description: "Login, SSO, user management" },
  { id: "epic-2", title: "UI Overhaul", color: "#0891b2", projectId: "proj-1", description: "New design system rollout" },
  { id: "epic-3", title: "Testing Suite", color: "#059669", projectId: "proj-1", description: "E2E and regression tests" },
  { id: "epic-4", title: "Performance", color: "#d97706", projectId: "proj-1", description: "Speed & optimization" },
];

const SEED_LABELS = [
  { id: "lbl-1", name: "Frontend", color: "#3b82f6" },
  { id: "lbl-2", name: "Backend", color: "#10b981" },
  { id: "lbl-3", name: "Bug", color: "#ef4444" },
  { id: "lbl-4", name: "Enhancement", color: "#8b5cf6" },
  { id: "lbl-5", name: "Design", color: "#f59e0b" },
  { id: "lbl-6", name: "Urgent", color: "#dc2626" },
];

const SEED_SPRINT = {
  id: "sprint-1",
  name: "Sprint 86",
  goal: "Complete authentication overhaul and UI refinements",
  startDate: "2026-03-10",
  endDate: "2026-03-28",
  status: "active", // planned | active | completed
};

const SEED_ACTIVE_TASKS = [
  { id: "1", title: "Login bug fix", description: "Fix double SSO login.", status: "blocked", priority: "critical", type: "defect", assignedTo: "alice", storyPoint: 3, dueDate: "2026-03-19", epicId: "epic-1", labels: ["lbl-3"], timeEstimate: 4, timeSpent: 2, watchers: ["alice", "bob"] },
  { id: "2", title: "UWP Regression Test", description: "APAC UWP regression test.", status: "review", priority: "high", type: "defect", assignedTo: "bob", storyPoint: 5, dueDate: "2026-03-22", epicId: "epic-3", labels: ["lbl-2"], timeEstimate: 8, timeSpent: 5, watchers: ["bob"] },
  { id: "3", title: "Translation update", description: "Essity Finland translations.", status: "inprogress", priority: "medium", type: "task", assignedTo: "carol", storyPoint: 2, dueDate: "2026-03-24", epicId: null, labels: ["lbl-1"], timeEstimate: 3, timeSpent: 1, watchers: [] },
  { id: "4", title: "Mail Scroll", description: "Fix email preview scroll.", status: "done", priority: "low", type: "feature", assignedTo: "dave", storyPoint: 1, dueDate: "2026-03-15", epicId: "epic-2", labels: ["lbl-1", "lbl-5"], timeEstimate: 2, timeSpent: 2, watchers: [] },
  { id: "5", title: "Test Payment Flow", description: "Test the new payment integration.", status: "todo", priority: "medium", type: "test", assignedTo: "alice", storyPoint: 8, dueDate: "2026-03-25", epicId: "epic-3", labels: ["lbl-2"], timeEstimate: 12, timeSpent: 0, watchers: ["alice", "carol"] },
  { id: "6", title: "Set Up Test Set", description: "Create a test set for regression.", status: "awaiting", priority: "low", type: "testset", assignedTo: "bob", storyPoint: 3, dueDate: "2026-03-28", epicId: "epic-3", labels: [], timeEstimate: 4, timeSpent: 0, watchers: [] },
  { id: "7", title: "Execute Regression Suite", description: "Run all regression tests.", status: "inprogress", priority: "high", type: "testexecution", assignedTo: "carol", storyPoint: 13, dueDate: "2026-03-27", epicId: "epic-3", labels: ["lbl-6"], timeEstimate: 16, timeSpent: 8, watchers: ["carol", "dave"] },
  { id: "8", title: "Precondition Setup", description: "Prepare preconditions for E2E.", status: "todo", priority: "medium", type: "precondition", assignedTo: "dave", storyPoint: 2, dueDate: "2026-04-02", epicId: null, labels: [], timeEstimate: 3, timeSpent: 0, watchers: [] },
  { id: "9", title: "UI Polish", description: "Polish UI for better UX.", status: "review", priority: "low", type: "feature", assignedTo: "alice", storyPoint: 1, dueDate: "2026-03-26", epicId: "epic-2", labels: ["lbl-1", "lbl-5"], timeEstimate: 4, timeSpent: 3, watchers: [] },
].map((t) => ({ ...t, subtasks: generateSubtasks(t.title), comments: [], activityLog: [] }));

const SEED_BACKLOG_TASKS = [
  { id: "b1", title: "Refactor authentication", description: "Improve login security and UX.", epicId: "epic-1", labels: ["lbl-1", "lbl-4"] },
  { id: "b2", title: "Add dark mode", description: "Theme support for dark mode.", epicId: "epic-2", labels: ["lbl-1", "lbl-5"] },
  { id: "b3", title: "Mobile responsive UI", description: "Make app fully responsive.", epicId: "epic-2", labels: ["lbl-1"] },
  { id: "b4", title: "Integrate Google Calendar", description: "Sync events with Google Calendar.", epicId: null, labels: ["lbl-2"] },
  { id: "b5", title: "Bulk task actions", description: "Allow multi-select and bulk actions.", epicId: null, labels: ["lbl-4"] },
  { id: "b6", title: "Export tasks to CSV", description: "Download board as CSV.", epicId: null, labels: [] },
  { id: "b7", title: "Add notifications panel", description: "Centralize all notifications.", epicId: null, labels: ["lbl-1", "lbl-4"] },
  { id: "b8", title: "Custom fields for tasks", description: "Support custom fields per project.", epicId: null, labels: ["lbl-4"] },
  { id: "b9", title: "Recurring tasks", description: "Allow tasks to repeat on schedule.", epicId: null, labels: [] },
  { id: "b10", title: "API rate limiting", description: "Protect backend from abuse.", epicId: null, labels: ["lbl-2"] },
];

const SEED_BACKLOG_SECTIONS = [
  {
    id: 1,
    title: "Backlog",
    tasks: SEED_BACKLOG_TASKS.map((t) => ({
      ...t,
      status: "todo",
      storyPoint: 1,
      dueDate: "",
      assignedTo: "unassigned",
      priority: "medium",
      subtasks: generateSubtasks(t.title),
      comments: [],
      activityLog: [],
      timeEstimate: 0,
      timeSpent: 0,
      watchers: [],
    })),
  },
];

const SEED_TEAMS = [
  { id: "team-1", name: "Frontend Team", color: "#3b82f6", description: "UI/UX development", memberNames: ["alice", "carol"], projectIds: ["proj-1"] },
  { id: "team-2", name: "Backend Team", color: "#10b981", description: "API and infrastructure", memberNames: ["bob", "dave"], projectIds: ["proj-1", "proj-2"] },
];

const SEED_RETRO = {
  wentWell: [
    { id: 1, text: "Team collaboration was excellent", checked: false, score: 0 },
    { id: 2, text: "Sprint goals were achieved on time", checked: false, score: 0 },
    { id: 3, text: "Code quality improved significantly", checked: false, score: 0 },
  ],
  wentWrong: [
    { id: 1, text: "Some bugs were not caught in testing", checked: false, score: 0 },
    { id: 2, text: "Communication gaps between team members", checked: false, score: 0 },
  ],
  canImprove: [
    { id: 1, text: "Implement better testing practices", checked: false, score: 0 },
    { id: 2, text: "Improve daily standup efficiency", checked: false, score: 0 },
    { id: 3, text: "Better documentation practices", checked: false, score: 0 },
  ],
  actionItems: [
    { id: 1, text: "Set up automated testing pipeline", checked: false, score: 0 },
    { id: 2, text: "Schedule team communication workshop", checked: false, score: 0 },
  ],
};

const SEED_USERS = [
  { id: "user-1", name: "Alice Johnson",  email: "alice@corechestra.io", username: "alice", role: "admin",  status: "active",   color: "#3b82f6", joinedAt: "2025-01-10" },
  { id: "user-2", name: "Bob Smith",      email: "bob@corechestra.io",   username: "bob",   role: "member", status: "active",   color: "#7c3aed", joinedAt: "2025-02-14" },
  { id: "user-3", name: "Carol Davis",    email: "carol@corechestra.io", username: "carol", role: "member", status: "active",   color: "#10b981", joinedAt: "2025-02-20" },
  { id: "user-4", name: "Dave Wilson",    email: "dave@corechestra.io",  username: "dave",  role: "viewer", status: "inactive", color: "#f59e0b", joinedAt: "2025-03-05" },
];

const SEED_CUSTOM_FIELDS = [
  { id: "cf-1", name: "Customer",      type: "text",     required: false, description: "Customer this task relates to",  options: [] },
  { id: "cf-2", name: "Environment",   type: "dropdown", required: false, description: "Target deployment environment",  options: ["Production", "Staging", "Development", "Local"] },
  { id: "cf-3", name: "External Link", type: "url",      required: false, description: "Link to external resource",      options: [] },
];

const DEFAULT_SPRINT_DEFAULTS = {
  duration: 14,
  namingFormat: "Sprint {n}",
  autoStart: false,
  workingDays: ["mon", "tue", "wed", "thu", "fri"],
  startDay: "mon",
  velocity: 0,
};

const DEFAULT_BOARD_SETTINGS = {
  showBadges: true,
  showPriorityColors: true,
  showTaskIds: true,
  showSubtaskButtons: true,
  boardName: "Corechestra",
  projectKey: "CY",
  taskViewMode: "panel", // "modal" | "panel"
};

const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const persisted = loadState();

  const [projects, setProjects] = useState(persisted?.projects ?? SEED_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState(persisted?.currentProjectId ?? "proj-1");
  const [epics, setEpics] = useState(persisted?.epics ?? SEED_EPICS);
  const [labels, setLabels] = useState(persisted?.labels ?? SEED_LABELS);
  const [sprint, setSprint] = useState(persisted?.sprint ?? SEED_SPRINT);
  const [projectColumns, setProjectColumns] = useState(
    persisted?.projectColumns ?? { "proj-1": DEFAULT_COLUMNS, "proj-2": DEFAULT_COLUMNS }
  );

  const [activeTasks, setActiveTasks] = useState(persisted?.activeTasks ?? SEED_ACTIVE_TASKS);
  const [backlogSections, setBacklogSections] = useState(persisted?.backlogSections ?? SEED_BACKLOG_SECTIONS);
  const [retrospectiveItems, setRetrospectiveItems] = useState(persisted?.retrospectiveItems ?? SEED_RETRO);
  const [pokerHistory, setPokerHistory] = useState(persisted?.pokerHistory ?? []);
  const [notesList, setNotesList] = useState(persisted?.notesList ?? []);
  const [boardSettings, setBoardSettings] = useState({ ...DEFAULT_BOARD_SETTINGS, ...(persisted?.boardSettings ?? {}), taskViewMode: "panel" });
  const [globalActivityLog, setGlobalActivityLog] = useState(persisted?.globalActivityLog ?? []);
  const [teams, setTeams] = useState(persisted?.teams ?? SEED_TEAMS);
  const [users, setUsers] = useState(persisted?.users ?? SEED_USERS);
  const [customFields, setCustomFields] = useState(persisted?.customFields ?? SEED_CUSTOM_FIELDS);
  const [sprintDefaults, setSprintDefaults] = useState(persisted?.sprintDefaults ?? DEFAULT_SPRINT_DEFAULTS);

  // Computed: per-project columns
  const columns = useMemo(
    () => projectColumns[currentProjectId] || DEFAULT_COLUMNS,
    [projectColumns, currentProjectId]
  );

  // Persist
  useEffect(() => {
    saveState({
      projects, currentProjectId, epics, labels, sprint, projectColumns,
      activeTasks, backlogSections, retrospectiveItems, pokerHistory,
      notesList, boardSettings, globalActivityLog, teams,
      users, customFields, sprintDefaults,
    });
  }, [projects, currentProjectId, epics, labels, sprint, projectColumns,
      activeTasks, backlogSections, retrospectiveItems, pokerHistory,
      notesList, boardSettings, globalActivityLog, teams,
      users, customFields, sprintDefaults]);

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
    };
    setGlobalActivityLog((prev) => [entry, ...prev].slice(0, 200));
    // Also append to task's own activityLog
    const updateTaskLog = (tasks) =>
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, activityLog: [entry, ...(t.activityLog || [])].slice(0, 50) }
          : t
      );
    setActiveTasks((prev) => updateTaskLog(prev));
    setBacklogSections((prev) =>
      prev.map((s) => ({ ...s, tasks: updateTaskLog(s.tasks) }))
    );
  }, []);

  // ── Task Actions ───────────────────────────────────────────────────────────
  const updateActiveTask = useCallback((updatedTask, logMsg) => {
    setActiveTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    if (logMsg) logActivity(updatedTask.id, logMsg);
  }, [logActivity]);

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
  }, [logActivity]);

  const deleteTask = useCallback((taskId) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
    setBacklogSections((prev) =>
      prev.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }))
    );
  }, []);

  const updateBacklogTask = useCallback((updatedTask) => {
    setBacklogSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }))
    );
    setActiveTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  // ── Sprint Actions ─────────────────────────────────────────────────────────
  const startSprint = useCallback((sprintData) => {
    setSprint({ ...sprintData, status: "active" });
    logActivity("sprint", "started sprint", { name: sprintData.name });
  }, [logActivity]);

  const completeSprint = useCallback((moveToBacklogSectionId) => {
    const incomplete = activeTasks.filter((t) => t.status !== "done");
    if (moveToBacklogSectionId && incomplete.length > 0) {
      setBacklogSections((prev) =>
        prev.map((s) =>
          s.id === moveToBacklogSectionId
            ? { ...s, tasks: [...s.tasks, ...incomplete] }
            : s
        )
      );
      setActiveTasks((prev) => prev.filter((t) => t.status === "done"));
    }
    setSprint((prev) => ({ ...prev, status: "completed" }));
    logActivity("sprint", "completed sprint");
  }, [activeTasks, logActivity]);

  const updateSprint = useCallback((patch) => {
    setSprint((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Project Actions ────────────────────────────────────────────────────────
  const createProject = useCallback((data) => {
    setProjects((prev) => [...prev, { ...data, id: `proj-${Date.now()}` }]);
  }, []);

  const updateProject = useCallback((updated) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
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
    setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: unsetEpic(s.tasks) })));
  }, []);

  // ── Label Actions ──────────────────────────────────────────────────────────
  const createLabel = useCallback((labelData) => {
    setLabels((prev) => [...prev, { ...labelData, id: `lbl-${Date.now()}` }]);
  }, []);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    const removeLabel = (tasks) => tasks.map((t) => ({ ...t, labels: (t.labels || []).filter((l) => l !== labelId) }));
    setActiveTasks((prev) => removeLabel(prev));
    setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: removeLabel(s.tasks) })));
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

  // ── Backlog Actions ────────────────────────────────────────────────────────
  const createBacklogSection = useCallback(() => {
    setBacklogSections((prev) => [
      ...prev,
      { id: Date.now(), title: `Backlog ${prev.length + 1}`, tasks: [] },
    ]);
  }, []);

  const deleteBacklogSection = useCallback((sectionId) => {
    setBacklogSections((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const renameBacklogSection = useCallback((sectionId, newTitle) => {
    setBacklogSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
  }, []);

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
    [activeTasks, backlogSections]
  );

  // ── Retrospective ──────────────────────────────────────────────────────────
  const addRetroItem = useCallback((category) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: [...prev[category], { id: Date.now(), text: "", checked: false, score: 0, isEditing: true }],
    }));
  }, []);

  const updateRetroItem = useCallback((category, itemId, text) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, text, isEditing: false } : item),
    }));
  }, []);

  const deleteRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({ ...prev, [category]: prev[category].filter((item) => item.id !== itemId) }));
  }, []);

  const voteRetroItem = useCallback((category, itemId, delta) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, score: (item.score || 0) + delta } : item),
    }));
  }, []);

  const toggleRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item),
    }));
  }, []);

  const setRetroItemEditing = useCallback((category, itemId, isEditing) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => item.id === itemId ? { ...item, isEditing } : { ...item, isEditing: false }),
    }));
  }, []);

  // ── Notes ──────────────────────────────────────────────────────────────────
  const addNote = useCallback((content) => {
    if (!content?.trim()) return;
    setNotesList((prev) => [{ id: Date.now(), content }, ...prev]);
  }, []);

  const deleteNote = useCallback((noteId) => {
    setNotesList((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // ── Planning Poker ─────────────────────────────────────────────────────────
  const savePokerResult = useCallback((result) => {
    setPokerHistory((prev) => [{ ...result, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    if (result.taskId && typeof result.estimation === "number") {
      const update = (tasks) => tasks.map((t) => t.id === result.taskId ? { ...t, storyPoint: result.estimation } : t);
      setActiveTasks((prev) => update(prev));
      setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: update(s.tasks) })));
    }
  }, []);

  // ── Board Settings ─────────────────────────────────────────────────────────
  const updateBoardSettings = useCallback((patch) => {
    setBoardSettings((prev) => ({ ...prev, ...patch }));
  }, []);

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

  const resetAllData = useCallback(() => {
    setProjects(SEED_PROJECTS);
    setCurrentProjectId("proj-1");
    setEpics(SEED_EPICS);
    setLabels(SEED_LABELS);
    setSprint(SEED_SPRINT);
    setProjectColumns({ "proj-1": DEFAULT_COLUMNS, "proj-2": DEFAULT_COLUMNS });
    setActiveTasks(SEED_ACTIVE_TASKS);
    setBacklogSections(SEED_BACKLOG_SECTIONS);
    setRetrospectiveItems(SEED_RETRO);
    setPokerHistory([]);
    setNotesList([]);
    setBoardSettings(DEFAULT_BOARD_SETTINGS);
    setGlobalActivityLog([]);
    setTeams(SEED_TEAMS);
    setUsers(SEED_USERS);
    setCustomFields(SEED_CUSTOM_FIELDS);
    setSprintDefaults(DEFAULT_SPRINT_DEFAULTS);
  }, []);

  const value = {
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
    // Settings
    boardSettings, updateBoardSettings, resetAllData,
    // Activity
    globalActivityLog, logActivity,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
