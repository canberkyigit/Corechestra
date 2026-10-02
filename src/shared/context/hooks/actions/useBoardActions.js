import { useCallback } from "react";
import { generateId, getTaskProjectId, isInProject } from "../../../utils/helpers";
import { DEFAULT_COLUMNS } from "../../AppSeeds";
import { useAppStore } from "../../../store/useAppStore";
import { TASK_STATUS_SHORT_LABELS } from "../../../constants/taskMeta";
import { emitWorkspaceEvent, WORKSPACE_EVENT_TYPES } from "../../../services/workspaceEvents";
import { describeCustomFieldChanges, withCustomFieldValues } from "../../../utils/customFields";

// ─── Workflow + task helpers (pure, exported for board UI pre-validation) ────

export const DEFAULT_WORKFLOW_RULES = {
  requireReviewBeforeDone: false,
  captureBlockReason: true,
  notifyOnBlocked: true,
  allowBackwardMoves: true,
};

export function getWorkflowRules(project) {
  return { ...DEFAULT_WORKFLOW_RULES, ...(project?.workflowRules || {}) };
}

export function getStatusLabel(status, columns) {
  return (columns || []).find((column) => column.id === status)?.title
    || TASK_STATUS_SHORT_LABELS[status]
    || status;
}

/**
 * Validates a status transition against a project's workflow rules.
 * Returns `{ ok: true }` or `{ ok: false, code, message }`.
 * Codes: "review_required" | "backward_move" | "block_reason_required".
 */
export function validateWorkflowTransition({ fromStatus, toStatus, rules, columns, blockReason }) {
  if (!toStatus || fromStatus === toStatus) return { ok: true };
  const activeRules = { ...DEFAULT_WORKFLOW_RULES, ...(rules || {}) };
  const columnIds = (columns && columns.length > 0 ? columns : DEFAULT_COLUMNS).map((column) => column.id);

  if (
    activeRules.requireReviewBeforeDone
    && toStatus === "done"
    && fromStatus !== "review"
    && columnIds.includes("review")
  ) {
    return {
      ok: false,
      code: "review_required",
      message: `Move the task to "${getStatusLabel("review", columns)}" before marking it ${getStatusLabel("done", columns)}.`,
    };
  }

  // "Blocked" is a side state: blocking and unblocking are never "backward".
  if (activeRules.allowBackwardMoves === false && fromStatus !== "blocked" && toStatus !== "blocked") {
    const fromIndex = columnIds.indexOf(fromStatus);
    const toIndex = columnIds.indexOf(toStatus);
    if (fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex) {
      return {
        ok: false,
        code: "backward_move",
        message: "Backward moves are disabled for this project's workflow.",
      };
    }
  }

  if (activeRules.captureBlockReason && toStatus === "blocked" && !String(blockReason || "").trim()) {
    return {
      ok: false,
      code: "block_reason_required",
      message: "A blocker reason is required before blocking this task.",
    };
  }

  return { ok: true };
}

const TRANSIENT_TASK_FIELDS = ["index", "_source"];

export function stripTransientTaskFields(task) {
  if (!task || typeof task !== "object") return task;
  if (!TRANSIENT_TASK_FIELDS.some((field) => field in task)) return task;
  const clean = { ...task };
  TRANSIENT_TASK_FIELDS.forEach((field) => { delete clean[field]; });
  return clean;
}

/** Drops empty custom field values so tasks only store fields that are set. */
function compactTaskCustomFields(task) {
  if (!task || !("customFields" in task)) return task;
  return withCustomFieldValues(task, task.customFields);
}

function findTask(activeTasks, perProjectBacklog, taskId) {
  return (activeTasks || []).find((task) => task.id === taskId)
    || Object.values(perProjectBacklog || {})
      .flatMap((sections) => (sections || []).flatMap((section) => section.tasks || []))
      .find((task) => task.id === taskId);
}

function collectTaskIds(activeTasks, perProjectBacklog) {
  const ids = new Set();
  (activeTasks || []).forEach((task) => ids.add(task.id));
  Object.values(perProjectBacklog || {}).forEach((sections) => {
    (sections || []).forEach((section) => (section.tasks || []).forEach((task) => ids.add(task.id)));
  });
  return ids;
}

function mapBacklogTasks(perProjectBacklog, mapper) {
  const next = {};
  for (const [projectId, sections] of Object.entries(perProjectBacklog || {})) {
    next[projectId] = (sections || []).map((section) => ({
      ...section,
      tasks: mapper(section.tasks || []),
    }));
  }
  return next;
}

/** Applies statusChangedAt + blocker bookkeeping for a status transition. */
function applyStatusSideEffects(previousTask, nextTask) {
  const now = new Date().toISOString();
  const result = { ...nextTask, statusChangedAt: now };
  if (nextTask.status === "blocked") {
    if (nextTask.blockReason) result.blockReason = String(nextTask.blockReason).trim();
    result.blockedAt = previousTask?.status === "blocked" ? (previousTask.blockedAt || now) : now;
  } else {
    delete result.blockReason;
    delete result.blockedAt;
  }
  return result;
}

function resolveWorkflowContext(task) {
  const state = useAppStore.getState();
  const projectId = getTaskProjectId(task, state.currentProjectId);
  const project = (state.projects || []).find((item) => item.id === projectId);
  const columns = state.projectColumns?.[projectId] || DEFAULT_COLUMNS;
  return { rules: getWorkflowRules(project), columns };
}

function describePatch(patch, previousTask) {
  const parts = [];
  if ("assignedTo" in patch && patch.assignedTo !== previousTask.assignedTo) {
    parts.push(patch.assignedTo && patch.assignedTo !== "unassigned"
      ? `assigned to ${patch.assignedTo}`
      : "unassigned task");
  }
  if ("priority" in patch && patch.priority !== previousTask.priority) {
    parts.push(`changed priority to ${patch.priority}`);
  }
  if ("epicId" in patch && patch.epicId !== previousTask.epicId) {
    parts.push(patch.epicId ? "moved to another epic" : "removed from epic");
  }
  return parts.join(", ");
}

/** Inserts `task` into `list` (without it) at a project-relative index. */
function insertAtProjectIndex(list, task, projectId, projectIndex) {
  const without = list.filter((item) => item.id !== task.id);
  const positions = [];
  without.forEach((item, index) => {
    if (isInProject(item, projectId)) positions.push(index);
  });
  let at;
  if (projectIndex >= 0 && projectIndex < positions.length) at = positions[projectIndex];
  else at = positions.length > 0 ? positions[positions.length - 1] + 1 : without.length;
  without.splice(at, 0, task);
  return without;
}

export function useBoardActions({
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
  setPerProjectPlannedSprints,
  setProjects,
  setProjectColumns,
  setEpics,
  setRetrospectiveItems,
  setNotesList,
  setPokerHistory,
  setBoardSettings,
  setPerProjectCompletedSprints: setCompletedSprintMap,
  logActivity,
  addNotification,
}) {
  // Every board notification records who acted.
  const notify = useCallback((notification) => (
    addNotification({ actor: currentUser || null, ...notification })
  ), [addNotification, currentUser]);

  // Read the freshest backlog from the store: facade closures can lag behind
  // when several actions run inside one event handler.
  const getCurrentBacklog = useCallback(() => (
    useAppStore.getState().perProjectBacklog?.[currentProjectId] || backlogSections || []
  ), [backlogSections, currentProjectId]);

  /**
   * Emits one targeted notification per recipient (usernames). The acting
   * user is never notified about their own change. With no recipients the
   * notification is dropped unless `broadcastIfEmpty` is set.
   */
  const notifyRecipients = useCallback((base, recipients, { broadcastIfEmpty = false } = {}) => {
    const actor = currentUser || null;
    const actorKey = String(actor || "").trim().toLowerCase();
    const seen = new Set();
    const targets = (recipients || []).filter((recipient) => {
      if (!recipient || recipient === "unassigned") return false;
      const key = String(recipient).trim().toLowerCase();
      if (!key || key === actorKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (targets.length === 0) {
      if (broadcastIfEmpty) notify({ ...base, actor });
      return;
    }
    targets.forEach((recipient) => notify({ ...base, recipient, actor }));
  }, [notify, currentUser]);

  const emitTaskNotifications = useCallback((previousTask, nextTask, { rules, columns }) => {
    const taskSummary = {
      id: nextTask.id, title: nextTask.title, type: nextTask.type || "task", priority: nextTask.priority || null,
      assignedTo: nextTask.assignedTo || null, status: nextTask.status,
    };
    if (previousTask.status !== nextTask.status) {
      emitWorkspaceEvent({
        type: WORKSPACE_EVENT_TYPES.TASK_STATUS,
        projectId: getTaskProjectId(nextTask, currentProjectId),
        actor: currentUser || null,
        task: taskSummary,
        from: previousTask.status,
        fromLabel: getStatusLabel(previousTask.status, columns),
        to: nextTask.status,
        toLabel: getStatusLabel(nextTask.status, columns),
        blockReason: nextTask.blockReason || "",
      });
    }
    if (previousTask.assignedTo !== nextTask.assignedTo && nextTask.assignedTo && nextTask.assignedTo !== "unassigned") {
      emitWorkspaceEvent({
        type: WORKSPACE_EVENT_TYPES.TASK_ASSIGNED,
        projectId: getTaskProjectId(nextTask, currentProjectId),
        actor: currentUser || null,
        task: taskSummary,
        assignee: nextTask.assignedTo,
      });
    }
    if (previousTask.status !== nextTask.status) {
      const label = getStatusLabel(nextTask.status, columns);
      const isBlocked = nextTask.status === "blocked";
      const strongBlock = isBlocked && rules.notifyOnBlocked;
      notifyRecipients({
        type: nextTask.status === "done"
          ? "status_done"
          : strongBlock
            ? "status_blocked"
            : "status_change",
        taskId: nextTask.id,
        taskTitle: nextTask.title,
        text: `"${nextTask.title}" moved to ${label}${isBlocked && nextTask.blockReason ? ` — ${nextTask.blockReason}` : ""}`,
      }, [nextTask.assignedTo, nextTask.reporter, ...(nextTask.watchers || [])], { broadcastIfEmpty: strongBlock });
    }
    if (
      previousTask.assignedTo !== nextTask.assignedTo
      && nextTask.assignedTo
      && nextTask.assignedTo !== "unassigned"
    ) {
      notifyRecipients({
        type: "assignment",
        taskId: nextTask.id,
        taskTitle: nextTask.title,
        text: `You were assigned to "${nextTask.title}"`,
      }, [nextTask.assignedTo]);
    }
  }, [currentProjectId, currentUser, notifyRecipients]);

  /**
   * Full-replace update of a task wherever it lives (active sprint or any
   * backlog). Enforces the project's workflow rules on status changes.
   * Returns `{ ok: true, task }` or `{ ok: false, code, message }`.
   */
  const updateTask = useCallback((incomingTask, logMsg) => {
    let updatedTask = compactTaskCustomFields(stripTransientTaskFields(incomingTask));
    if (!updatedTask?.id) return { ok: false, code: "invalid", message: "Task is missing an id." };
    const { activeTasks, perProjectBacklog } = useAppStore.getState();
    const previousTask = findTask(activeTasks, perProjectBacklog, updatedTask.id);

    if (previousTask) {
      const context = resolveWorkflowContext(previousTask);
      if (previousTask.status !== updatedTask.status) {
        const verdict = validateWorkflowTransition({
          fromStatus: previousTask.status,
          toStatus: updatedTask.status,
          rules: context.rules,
          columns: context.columns,
          blockReason: updatedTask.blockReason,
        });
        if (!verdict.ok) return verdict;
        updatedTask = applyStatusSideEffects(previousTask, updatedTask);
      }
      emitTaskNotifications(previousTask, updatedTask, context);
    }

    const replace = (tasks) => tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    setActiveTasks((prev) => replace(prev));
    setPerProjectBacklog((prev) => mapBacklogTasks(prev, replace));

    if (previousTask && previousTask.status !== updatedTask.status) {
      const { columns } = resolveWorkflowContext(previousTask);
      logActivity(updatedTask.id, `moved to ${getStatusLabel(updatedTask.status, columns)}`, {
        from: previousTask.status,
        to: updatedTask.status,
        ...(updatedTask.blockReason ? { blockReason: updatedTask.blockReason } : {}),
      });
    }
    if (previousTask) {
      // One activity entry per changed custom field, named after the field.
      const { customFieldDefs, users } = useAppStore.getState();
      describeCustomFieldChanges(previousTask.customFields, updatedTask.customFields, customFieldDefs, { users })
        .forEach((change) => {
          logActivity(updatedTask.id, change.action, {
            customFieldId: change.fieldId,
            fieldName: change.fieldName,
            from: change.from,
            to: change.to,
          });
        });
    }
    if (logMsg) logActivity(updatedTask.id, logMsg);
    return { ok: true, task: updatedTask };
  }, [emitTaskNotifications, logActivity, setActiveTasks, setPerProjectBacklog]);

  const updateActiveTask = updateTask;

  /**
   * Moves an active-sprint task (Kanban drag, bulk status change, swimlane
   * reassignment). Positions relative to `beforeTaskId` / `afterTaskId`;
   * otherwise appends to the end of the destination column.
   */
  const moveTask = useCallback((taskId, options = {}) => {
    const { status, beforeTaskId, afterTaskId, patch = {}, blockReason } = options;
    const { activeTasks, currentProjectId: fallbackProjectId } = useAppStore.getState();
    const current = (activeTasks || []).find((task) => task.id === taskId);
    if (!current) return { ok: false, code: "not_found", message: "Task not found in the active sprint." };

    const nextStatus = status ?? patch.status ?? current.status;
    const statusChanged = nextStatus !== current.status;
    const context = resolveWorkflowContext(current);
    const reason = blockReason ?? patch.blockReason ?? (current.status === "blocked" ? current.blockReason : "");

    if (statusChanged) {
      const verdict = validateWorkflowTransition({
        fromStatus: current.status,
        toStatus: nextStatus,
        rules: context.rules,
        columns: context.columns,
        blockReason: reason,
      });
      if (!verdict.ok) return verdict;
    }

    let nextTask = stripTransientTaskFields({ ...current, ...patch, status: nextStatus });
    if (statusChanged) {
      nextTask = applyStatusSideEffects(current, {
        ...nextTask,
        blockReason: nextStatus === "blocked" ? String(reason || "").trim() : nextTask.blockReason,
      });
    }

    setActiveTasks((prev) => {
      const without = prev.filter((task) => task.id !== taskId);
      let at = -1;
      if (beforeTaskId !== undefined && beforeTaskId !== null) {
        at = without.findIndex((task) => task.id === beforeTaskId);
      }
      if (at < 0 && afterTaskId !== undefined && afterTaskId !== null) {
        const afterIndex = without.findIndex((task) => task.id === afterTaskId);
        if (afterIndex >= 0) at = afterIndex + 1;
      }
      if (at < 0) {
        const projectId = getTaskProjectId(nextTask, fallbackProjectId);
        let lastInColumn = -1;
        without.forEach((task, index) => {
          if (isInProject(task, projectId, fallbackProjectId) && task.status === nextTask.status) lastInColumn = index;
        });
        at = lastInColumn >= 0 ? lastInColumn + 1 : without.length;
      }
      without.splice(at, 0, nextTask);
      return without;
    });

    emitTaskNotifications(current, nextTask, context);
    if (statusChanged) {
      logActivity(taskId, `moved to ${getStatusLabel(nextStatus, context.columns)}`, {
        from: current.status,
        to: nextStatus,
        ...(nextTask.blockReason ? { blockReason: nextTask.blockReason } : {}),
      });
    }
    const patchSummary = describePatch(patch, current);
    if (patchSummary) logActivity(taskId, patchSummary);
    return { ok: true, task: nextTask };
  }, [emitTaskNotifications, logActivity, setActiveTasks]);

  const createTask = useCallback((taskData, sprintValue) => {
    const { activeTasks, perProjectBacklog } = useAppStore.getState();
    const newTask = compactTaskCustomFields({
      ...stripTransientTaskFields(taskData),
      id: generateId(collectTaskIds(activeTasks, perProjectBacklog)),
      status: taskData.status || "todo",
      statusChangedAt: new Date().toISOString(),
      subtasks: taskData.subtasks || [],
      comments: [],
      activityLog: [],
      labels: taskData.labels || [],
      watchers: taskData.watchers || [],
      epicId: taskData.epicId || null,
      reporter: taskData.reporter || currentUser || null,
      projectId: currentProjectId,
    });
    let addedToBacklog = false;
    if (typeof sprintValue === "string" && sprintValue.startsWith("backlog-")) {
      const backlogId = parseInt(sprintValue.replace("backlog-", ""), 10);
      const sections = getCurrentBacklog();
      const target = sections.find((section) => section.id === backlogId) || sections[0];
      if (target) {
        addedToBacklog = true;
        setBacklogSections((prev) => prev.map((section) => (
          section.id === target.id
            ? { ...section, tasks: [...(section.tasks || []), newTask] }
            : section
        )));
      }
    }
    if (!addedToBacklog) {
      setActiveTasks((prev) => [...prev, newTask]);
    }
    logActivity(newTask.id, "created task");
    emitWorkspaceEvent({
      type: WORKSPACE_EVENT_TYPES.TASK_CREATED,
      projectId: newTask.projectId,
      actor: currentUser || null,
      task: {
        id: newTask.id, title: newTask.title, type: newTask.type || "task", priority: newTask.priority || null,
        assignedTo: newTask.assignedTo || null, status: newTask.status,
      },
      destination: addedToBacklog ? "backlog" : "sprint",
    });
    notify({
      type: "task_created",
      taskId: newTask.id,
      taskTitle: newTask.title,
      text: `"${newTask.title}" created`,
      actor: currentUser || null,
    });
    if (newTask.assignedTo && newTask.assignedTo !== "unassigned") {
      notifyRecipients({
        type: "assignment",
        taskId: newTask.id,
        taskTitle: newTask.title,
        text: `You were assigned to "${newTask.title}"`,
      }, [newTask.assignedTo]);
    }
    return newTask;
  }, [notify, currentProjectId, currentUser, getCurrentBacklog, logActivity, notifyRecipients, setActiveTasks, setBacklogSections]);

  const deleteTask = useCallback((taskId) => {
    const { activeTasks, perProjectBacklog } = useAppStore.getState();
    const task = findTask(activeTasks, perProjectBacklog, taskId);
    setActiveTasks((prev) => prev.filter((item) => item.id !== taskId));
    setPerProjectBacklog((prev) => mapBacklogTasks(prev, (tasks) => tasks.filter((item) => item.id !== taskId)));
    if (task) {
      setArchivedTasks((prev) => [{ ...stripTransientTaskFields(task), archivedAt: new Date().toISOString() }, ...prev]);
      emitWorkspaceEvent({
        type: WORKSPACE_EVENT_TYPES.TASK_ARCHIVED,
        projectId: getTaskProjectId(task, currentProjectId),
        actor: currentUser || null,
        task: { id: task.id, title: task.title, type: task.type || "task", status: task.status },
      });
      notify({
        type: "task_archived",
        taskId,
        taskTitle: task.title,
        text: `"${task.title}" moved to archive`,
      });
    }
  }, [currentProjectId, currentUser, notify, setActiveTasks, setArchivedTasks, setPerProjectBacklog]);

  const restoreTask = useCallback((taskId) => {
    const { archivedTasks } = useAppStore.getState();
    const task = (archivedTasks || []).find((item) => item.id === taskId);
    if (!task) return;
    const { archivedAt, ...restored } = task;
    setArchivedTasks((prev) => prev.filter((item) => item.id !== taskId));
    setActiveTasks((prev) => [...prev, { ...restored, status: "todo" }]);
    notify({
      type: "task_restored",
      taskId,
      taskTitle: restored.title,
      text: `"${restored.title}" restored from archive`,
    });
  }, [notify, setActiveTasks, setArchivedTasks]);

  const permanentDeleteTask = useCallback((taskId) => {
    const { archivedTasks } = useAppStore.getState();
    const task = (archivedTasks || []).find((item) => item.id === taskId);
    setArchivedTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (task) {
      notify({
        type: "task_deleted",
        taskId,
        taskTitle: task.title,
        text: `"${task.title}" permanently deleted`,
      });
    }
  }, [notify, setArchivedTasks]);

  /**
   * Empties the archive. With `projectId` only that project's archived tasks
   * are removed (one store write, a single summary notification); without it
   * archived tasks, projects and epics are all cleared.
   */
  const emptyArchive = useCallback((projectId) => {
    const {
      archivedTasks, archivedProjects, archivedEpics, currentProjectId: fallbackProjectId,
    } = useAppStore.getState();
    if (projectId) {
      const inProject = (task) => isInProject(task, projectId, fallbackProjectId);
      const removed = (archivedTasks || []).filter(inProject).length;
      if (removed === 0) return 0;
      setArchivedTasks((prev) => (prev || []).filter((task) => !inProject(task)));
      notify({
        type: "archive_emptied",
        text: `Archive emptied (${removed} item${removed === 1 ? "" : "s"} removed)`,
        actor: currentUser || null,
      });
      return removed;
    }
    const count = (archivedTasks || []).length + (archivedProjects || []).length + (archivedEpics || []).length;
    setArchivedTasks([]);
    setArchivedProjects([]);
    setArchivedEpics([]);
    notify({ type: "archive_emptied", text: `Archive emptied (${count} items removed)`, actor: currentUser || null });
    return count;
  }, [notify, currentUser, setArchivedEpics, setArchivedProjects, setArchivedTasks]);

  const startSprint = useCallback((sprintData) => {
    setSprint({ ...sprintData, status: "active" });
    logActivity("sprint", "started sprint", { name: sprintData.name });
    notify({ type: "sprint_started", text: `Sprint "${sprintData.name}" started` });
    emitWorkspaceEvent({
      type: WORKSPACE_EVENT_TYPES.SPRINT_STARTED,
      projectId: currentProjectId,
      actor: currentUser || null,
      sprint: { name: sprintData.name, goal: sprintData.goal || "", startDate: sprintData.startDate || null, endDate: sprintData.endDate || null },
    });
  }, [currentProjectId, currentUser, notify, logActivity, setSprint]);

  const completeSprint = useCallback((moveToBacklogSectionId) => {
    const { activeTasks, perProjectSprint } = useAppStore.getState();
    const projectId = currentProjectId || "";
    const projectTasks = (activeTasks || []).filter((task) => isInProject(task, projectId));
    const incomplete = projectTasks
      .filter((task) => task.status !== "done")
      .map(stripTransientTaskFields);
    const done = projectTasks.filter((task) => task.status === "done");

    if (incomplete.length > 0) {
      // Never drop unfinished work: fall back to the first section, or create one.
      setBacklogSections((prev) => {
        const sections = prev || [];
        const targetIndex = sections.findIndex((section) => section.id === moveToBacklogSectionId);
        const index = targetIndex >= 0 ? targetIndex : (sections.length > 0 ? 0 : -1);
        if (index === -1) return [{ id: Date.now(), title: "Backlog", tasks: incomplete }];
        return sections.map((section, sectionIndex) => (
          sectionIndex === index
            ? { ...section, tasks: [...(section.tasks || []), ...incomplete] }
            : section
        ));
      });
    }

    if (done.length > 0) {
      setArchivedTasks((prev) => [
        ...done.map((task) => ({ ...stripTransientTaskFields(task), archivedAt: new Date().toISOString() })),
        ...prev,
      ]);
    }

    setActiveTasks((prev) => prev.filter((task) => !isInProject(task, projectId)));

    const currentSprint = perProjectSprint?.[currentProjectId];
    if (currentSprint) {
      const totalPoints = projectTasks.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const completedPoints = done.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const snapshot = {
        id: `cs-${Date.now()}`,
        name: currentSprint.name || "Sprint",
        goal: currentSprint.goal || "",
        reviewNotes: currentSprint.reviewNotes || "",
        startDate: currentSprint.startDate || "",
        endDate: currentSprint.endDate || "",
        completedAt: new Date().toISOString(),
        totalTasks: projectTasks.length,
        doneTasks: done.length,
        totalPoints,
        completedPoints,
        completionRate: projectTasks.length > 0
          ? Math.round((done.length / projectTasks.length) * 100)
          : 0,
      };
      setCompletedSprintMap((prev) => ({
        ...prev,
        [currentProjectId]: [snapshot, ...(prev[currentProjectId] || [])],
      }));
    }

    setSprint((prev) => (prev ? { ...prev, status: "completed" } : prev));
    logActivity("sprint", "completed sprint");
    notify({
      type: "sprint_completed",
      text: `Sprint completed — ${done.length}/${projectTasks.length} tasks done`,
    });
    emitWorkspaceEvent({
      type: WORKSPACE_EVENT_TYPES.SPRINT_COMPLETED,
      projectId: currentProjectId,
      actor: currentUser || null,
      sprint: { name: perProjectSprint?.[currentProjectId]?.name || "Sprint" },
      done: done.length,
      total: projectTasks.length,
      carriedOver: incomplete.length,
    });
  }, [
    currentUser,
    notify,
    currentProjectId,
    logActivity,
    setActiveTasks,
    setArchivedTasks,
    setBacklogSections,
    setCompletedSprintMap,
    setSprint,
  ]);

  const updateSprint = useCallback((patchOrUpdater) => {
    setSprint((prev) => {
      // Never create a nameless partial sprint from a patch.
      if (!prev) return prev;
      const patch = typeof patchOrUpdater === "function"
        ? patchOrUpdater(prev)
        : patchOrUpdater;
      return { ...prev, ...patch };
    });
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
    setBacklogSections((prev) => [
      ...prev,
      { id: sectionId, title: data.name, tasks: [] },
    ]);
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), newSprint],
    }));
  }, [currentProjectId, setBacklogSections, setPerProjectPlannedSprints]);

  const archiveSectionTasks = useCallback((section) => {
    const tasks = section?.tasks || [];
    if (tasks.length === 0) return;
    const archivedAt = new Date().toISOString();
    setArchivedTasks((prev) => [
      ...tasks.map((task) => ({ ...stripTransientTaskFields(task), archivedAt })),
      ...prev,
    ]);
  }, [setArchivedTasks]);

  const deletePlannedSprint = useCallback((sprintId) => {
    const { perProjectPlannedSprints } = useAppStore.getState();
    const sprintToDelete = (perProjectPlannedSprints?.[currentProjectId] || [])
      .find((item) => item.id === sprintId);
    if (sprintToDelete?.backlogSectionId) {
      archiveSectionTasks(getCurrentBacklog().find((section) => section.id === sprintToDelete.backlogSectionId));
      setBacklogSections((prev) => prev.filter((section) => (
        section.id !== sprintToDelete.backlogSectionId
      )));
    }
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter((item) => item.id !== sprintId),
    }));
  }, [archiveSectionTasks, currentProjectId, getCurrentBacklog, setBacklogSections, setPerProjectPlannedSprints]);

  const createEpic = useCallback((epicData) => {
    const newEpic = { ...epicData, id: `epic-${Date.now()}`, projectId: currentProjectId };
    setEpics((prev) => [...prev, newEpic]);
    notify({ type: "epic_created", text: `Epic "${epicData.title}" created` });
    emitWorkspaceEvent({
      type: WORKSPACE_EVENT_TYPES.EPIC_CREATED,
      projectId: currentProjectId,
      actor: currentUser || null,
      epic: { id: newEpic.id, title: newEpic.title, color: newEpic.color || null },
    });
  }, [currentUser, notify, currentProjectId, setEpics]);

  const updateEpic = useCallback((updatedEpic) => {
    setEpics((prev) => prev.map((epic) => (
      epic.id === updatedEpic.id ? updatedEpic : epic
    )));
  }, [setEpics]);

  const deleteEpic = useCallback((epicId) => {
    const epic = (useAppStore.getState().epics || []).find((item) => item.id === epicId);
    setEpics((prev) => prev.filter((item) => item.id !== epicId));
    const unsetEpic = (tasks) => tasks.map((task) => (
      task.epicId === epicId ? { ...task, epicId: null } : task
    ));
    setActiveTasks((prev) => unsetEpic(prev));
    setPerProjectBacklog((prev) => mapBacklogTasks(prev, unsetEpic));
    if (epic) {
      notify({ type: "epic_deleted", text: `Epic "${epic.title}" deleted` });
    }
  }, [notify, setActiveTasks, setEpics, setPerProjectBacklog]);

  const setColumnsForCurrentProject = useCallback((updater) => {
    setProjectColumns((prev) => ({
      ...prev,
      [currentProjectId]: updater(prev[currentProjectId] || DEFAULT_COLUMNS),
    }));
  }, [currentProjectId, setProjectColumns]);

  const renameColumn = useCallback((columnId, newTitle) => {
    setColumnsForCurrentProject((cols) => cols.map((column) => (
      column.id === columnId ? { ...column, title: newTitle } : column
    )));
  }, [setColumnsForCurrentProject]);

  const createColumn = useCallback((title) => {
    const id = `custom_${Date.now()}`;
    setColumnsForCurrentProject((cols) => [...cols, { id, title, custom: true }]);
  }, [setColumnsForCurrentProject]);

  const deleteColumn = useCallback((columnId) => {
    const projectId = currentProjectId || "";
    setColumnsForCurrentProject((cols) => cols.filter((column) => column.id !== columnId));
    // Only remap the current project's tasks.
    setActiveTasks((prev) => prev.map((task) => (
      task.status === columnId && isInProject(task, projectId) ? { ...task, status: "todo" } : task
    )));
  }, [currentProjectId, setActiveTasks, setColumnsForCurrentProject]);

  const reorderColumns = useCallback((newCols) => {
    setProjectColumns((prev) => ({ ...prev, [currentProjectId]: newCols }));
  }, [currentProjectId, setProjectColumns]);

  const updateProjectColumns = useCallback((projectId, newCols) => {
    setProjectColumns((prev) => ({ ...prev, [projectId]: newCols }));
  }, [setProjectColumns]);

  const createBacklogSection = useCallback(() => {
    setBacklogSections((prev) => [
      ...prev,
      { id: Date.now(), title: `Backlog ${prev.length + 1}`, tasks: [] },
    ]);
  }, [setBacklogSections]);

  const deleteBacklogSection = useCallback((sectionId) => {
    // Tasks inside the section are archived (restorable) instead of dropped.
    archiveSectionTasks(getCurrentBacklog().find((section) => section.id === sectionId));
    setBacklogSections((prev) => prev.filter((section) => section.id !== sectionId));
  }, [archiveSectionTasks, getCurrentBacklog, setBacklogSections]);

  const renameBacklogSection = useCallback((sectionId, newTitle) => {
    setBacklogSections((prev) => prev.map((section) => (
      section.id === sectionId ? { ...section, title: newTitle } : section
    )));
  }, [setBacklogSections]);

  /**
   * DnD handler for the Backlog tab. `destination.index` for "active-sprint"
   * is relative to the current project's active tasks; for backlog sections it
   * is relative to the section's full task list (BacklogTab maps rendered
   * indices to these before calling).
   */
  const handleBacklogDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId
      && destination.index === source.index
    ) {
      return;
    }

    const projectId = currentProjectId || "";
    const sections = getCurrentBacklog();
    const { activeTasks } = useAppStore.getState();

    const getSectionIdx = (id) => {
      if (!id.startsWith("backlog-")) return null;
      const sectionId = parseInt(id.replace("backlog-", ""), 10);
      return sections.findIndex((section) => section.id === sectionId);
    };

    const srcIdx = getSectionIdx(source.droppableId);
    const dstIdx = getSectionIdx(destination.droppableId);

    let draggedTask = null;
    if (source.droppableId === "active-sprint") {
      draggedTask = (activeTasks || []).find((task) => task.id === draggableId);
    } else if (srcIdx !== null && srcIdx >= 0) {
      draggedTask = (sections[srcIdx].tasks || []).find((task) => task.id === draggableId);
    }
    if (!draggedTask) return;

    if (destination.droppableId === "active-sprint" && srcIdx !== null && srcIdx >= 0) {
      setBacklogSections((prev) => prev.map((section, index) => (
        index !== srcIdx
          ? section
          : { ...section, tasks: (section.tasks || []).filter((task) => task.id !== draggableId) }
      )));
      setActiveTasks((prev) => insertAtProjectIndex(prev, {
        ...stripTransientTaskFields(draggedTask),
        status: "todo",
        priority: draggedTask.priority || "medium",
        projectId: draggedTask.projectId || projectId,
      }, projectId, destination.index));
      return;
    }

    if (destination.droppableId.startsWith("backlog-") && source.droppableId === "active-sprint") {
      if (dstIdx === null || dstIdx < 0) return;
      setActiveTasks((prev) => prev.filter((task) => task.id !== draggableId));
      setBacklogSections((prev) => prev.map((section, index) => {
        if (index !== dstIdx) return section;
        const newTasks = [...(section.tasks || [])];
        newTasks.splice(destination.index, 0, { ...stripTransientTaskFields(draggedTask), status: "todo" });
        return { ...section, tasks: newTasks };
      }));
      return;
    }

    if (srcIdx !== null && dstIdx !== null && srcIdx >= 0 && dstIdx >= 0 && srcIdx !== dstIdx) {
      setBacklogSections((prev) => {
        let taskToMove = null;
        const updated = prev.map((section, index) => {
          if (index === srcIdx) {
            taskToMove = (section.tasks || []).find((task) => task.id === draggableId);
            return { ...section, tasks: (section.tasks || []).filter((task) => task.id !== draggableId) };
          }
          return section;
        });
        return updated.map((section, index) => {
          if (index === dstIdx && taskToMove) {
            const newTasks = [...(section.tasks || [])];
            newTasks.splice(destination.index, 0, taskToMove);
            return { ...section, tasks: newTasks };
          }
          return section;
        });
      });
      return;
    }

    if (srcIdx !== null && srcIdx >= 0 && srcIdx === dstIdx) {
      setBacklogSections((prev) => prev.map((section, index) => {
        if (index !== srcIdx) return section;
        const newTasks = (section.tasks || []).filter((task) => task.id !== draggableId);
        newTasks.splice(destination.index, 0, draggedTask);
        return { ...section, tasks: newTasks };
      }));
      return;
    }

    if (destination.droppableId === "active-sprint" && source.droppableId === "active-sprint") {
      setActiveTasks((prev) => insertAtProjectIndex(prev, draggedTask, projectId, destination.index));
    }
  }, [currentProjectId, getCurrentBacklog, setActiveTasks, setBacklogSections]);

  const updateRetroCategory = useCallback((category, mapper) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: mapper(prev?.[category] || []),
    }));
  }, [setRetrospectiveItems]);

  const addRetroItem = useCallback((category) => {
    updateRetroCategory(category, (items) => [
      ...items,
      { id: Date.now(), text: "", checked: false, score: 0, isEditing: true },
    ]);
  }, [updateRetroCategory]);

  const updateRetroItem = useCallback((category, itemId, text) => {
    updateRetroCategory(category, (items) => items.map((item) => (
      item.id === itemId ? { ...item, text, isEditing: false } : item
    )));
  }, [updateRetroCategory]);

  const deleteRetroItem = useCallback((category, itemId) => {
    updateRetroCategory(category, (items) => items.filter((item) => item.id !== itemId));
  }, [updateRetroCategory]);

  const voteRetroItem = useCallback((category, itemId, delta) => {
    updateRetroCategory(category, (items) => items.map((item) => (
      item.id === itemId ? { ...item, score: (item.score || 0) + delta } : item
    )));
  }, [updateRetroCategory]);

  const toggleRetroItem = useCallback((category, itemId) => {
    updateRetroCategory(category, (items) => items.map((item) => (
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )));
  }, [updateRetroCategory]);

  const setRetroItemEditing = useCallback((category, itemId, isEditing) => {
    updateRetroCategory(category, (items) => items.map((item) => (
      item.id === itemId
        ? { ...item, isEditing }
        : { ...item, isEditing: false }
    )));
  }, [updateRetroCategory]);

  const addNote = useCallback((content) => {
    if (!content?.trim()) return;
    setNotesList((prev) => [{
      id: Date.now(),
      content,
      createdAt: new Date().toISOString(),
      author: currentUser || null,
    }, ...prev]);
  }, [currentUser, setNotesList]);

  const deleteNote = useCallback((noteId) => {
    setNotesList((prev) => prev.filter((note) => note.id !== noteId));
  }, [setNotesList]);

  const savePokerResult = useCallback((result) => {
    const numericEstimation = (
      typeof result.estimation === "number"
        ? result.estimation
        : typeof result.estimation === "string" && result.estimation.trim() !== "" && Number.isFinite(Number(result.estimation))
          ? Number(result.estimation)
          : null
    );
    setPokerHistory((prev) => [
      { ...result, id: Date.now(), date: new Date().toISOString() },
      ...prev,
    ]);
    if (result.taskId && numericEstimation !== null) {
      const updateTaskPoints = (tasks) => tasks.map((task) => (
        task.id === result.taskId ? { ...task, storyPoint: numericEstimation } : task
      ));
      setActiveTasks((prev) => updateTaskPoints(prev));
      setPerProjectBacklog((prev) => mapBacklogTasks(prev, updateTaskPoints));
    }
  }, [setActiveTasks, setPerProjectBacklog, setPokerHistory]);

  const updateBoardSettings = useCallback((patch) => {
    setBoardSettings((prev) => ({ ...prev, ...patch }));
    if (patch.boardName !== undefined) {
      setProjects((prev) => prev.map((project) => (
        project.id === currentProjectId ? { ...project, name: patch.boardName } : project
      )));
    }
    if (patch.projectKey !== undefined) {
      setProjects((prev) => prev.map((project) => (
        project.id === currentProjectId ? { ...project, key: patch.projectKey } : project
      )));
    }
  }, [currentProjectId, setBoardSettings, setProjects]);

  return {
    updateTask,
    updateActiveTask,
    moveTask,
    createTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyArchive,
    startSprint,
    completeSprint,
    updateSprint,
    createPlannedSprint,
    deletePlannedSprint,
    createEpic,
    updateEpic,
    deleteEpic,
    renameColumn,
    createColumn,
    deleteColumn,
    reorderColumns,
    updateProjectColumns,
    createBacklogSection,
    deleteBacklogSection,
    renameBacklogSection,
    handleBacklogDragEnd,
    addRetroItem,
    updateRetroItem,
    deleteRetroItem,
    voteRetroItem,
    toggleRetroItem,
    setRetroItemEditing,
    addNote,
    deleteNote,
    savePokerResult,
    updateBoardSettings,
  };
}
