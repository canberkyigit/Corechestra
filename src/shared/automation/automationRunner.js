/**
 * Connects the pure automation engine to the app.
 *
 * - Watches the Zustand store for LOCAL task and sprint changes (remote
 *   snapshots and hydration are wrapped in `runAsRemote` by `useAppStoreSync`,
 *   so a change runs its automations once, on the client that made it).
 * - Matches enabled rules, evaluates conditions and applies the planned
 *   actions through the regular facade actions (`updateTask`, `createTask`,
 *   `addNotification`), so workflow rules, notifications and the activity log
 *   behave exactly as for a manual edit.
 * - Changes made by a rule can trigger other rules up to
 *   `AUTOMATION_MAX_CHAIN_DEPTH`; a rule never re-fires for the same task
 *   inside its own chain, and runs are rate limited per client.
 * - Scheduled (`due_date`) rules are checked on start and every few minutes
 *   by every open client; `rule.firedKeys` dedupes them.
 */
import { DEFAULT_COLUMNS } from "../context/AppSeeds";
import {
  buildTaskIndex,
  diffSprintMaps,
  diffTaskIndexes,
  evaluateConditions,
  findDueDateMatches,
  planRuleActions,
  ruleAppliesToProject,
  triggerMatchesEvent,
} from "./automationEngine";
import {
  AUTOMATION_FIRED_KEYS_LIMIT,
  AUTOMATION_LOG_LIMIT,
  AUTOMATION_MAX_CHAIN_DEPTH,
  AUTOMATION_MAX_RUNS_PER_MINUTE,
  AUTOMATION_SCHEDULE_INTERVAL_MS,
  createAutomationId,
} from "./automationMeta";

let remoteDepth = 0;

/** Runs `fn` as a remote/hydration update: automation rules ignore it. */
export function runAsRemote(fn) {
  remoteDepth += 1;
  try {
    return fn();
  } finally {
    remoteDepth -= 1;
  }
}

export function isApplyingRemoteUpdate() {
  return remoteDepth > 0;
}

function tasksChanged(state, prev) {
  return state.activeTasks !== prev.activeTasks || state.perProjectBacklog !== prev.perProjectBacklog;
}

export function createAutomationRunner({
  store,
  getActions,
  schedule = (callback) => queueMicrotask(callback),
  now = () => new Date(),
  scheduleIntervalMs = AUTOMATION_SCHEDULE_INTERVAL_MS,
  initialScheduledDelayMs = 4000,
}) {
  let taskSnapshot = new Map();
  let archivedIds = new Set();
  let initialized = false;
  let activeChain = null;
  let recentRuns = [];
  let unsubscribe = null;
  let intervalId = null;
  let initialTimer = null;

  const rememberArchived = (state) => {
    (state.archivedTasks || []).forEach((task) => {
      if (task?.id !== undefined) archivedIds.add(task.id);
    });
  };

  /** Keeps entries that disappeared (moves between sprint/backlog are two writes). */
  const mergeSnapshot = (nextIndex) => {
    const merged = new Map(nextIndex);
    if (taskSnapshot.size <= nextIndex.size + 500) {
      taskSnapshot.forEach((entry, id) => {
        if (!merged.has(id)) merged.set(id, entry);
      });
    }
    taskSnapshot = merged;
  };

  const resetSnapshot = (state) => {
    taskSnapshot = buildTaskIndex(state);
    archivedIds = new Set();
    rememberArchived(state);
  };

  const withinRateLimit = () => {
    const nowMs = now().getTime();
    recentRuns = recentRuns.filter((time) => nowMs - time < 60000);
    if (recentRuns.length >= AUTOMATION_MAX_RUNS_PER_MINUTE) return false;
    recentRuns.push(nowMs);
    return true;
  };

  const appendLog = (entry) => {
    store.getState().setAutomationLog((prev) => [entry, ...(prev || [])].slice(0, AUTOMATION_LOG_LIMIT));
  };

  const updateRuleStats = (ruleId, { status, at, firedKey }) => {
    store.getState().setAutomationRules((prev) => (prev || []).map((rule) => {
      if (rule.id !== ruleId) return rule;
      const next = {
        ...rule,
        runCount: (rule.runCount || 0) + 1,
        lastRunAt: at,
        lastStatus: status,
      };
      if (firedKey) {
        next.firedKeys = [...(rule.firedKeys || []), firedKey].slice(-AUTOMATION_FIRED_KEYS_LIMIT);
      }
      return next;
    }));
  };

  const findCurrentTask = (state, taskId) => {
    if (taskId === undefined || taskId === null) return null;
    return buildTaskIndex(state).get(taskId)?.task || null;
  };

  const resolveBacklogTarget = (state, projectId) => {
    const sections = state.perProjectBacklog?.[projectId] || [];
    return sections.length > 0 ? `backlog-${sections[0].id}` : "active";
  };

  /** Applies one rule to one event. Returns the log entry (or null when skipped). */
  const runRule = (rule, event, { depth, firedKey } = {}) => {
    const state = store.getState();
    const actions = getActions() || {};
    const task = findCurrentTask(state, event.taskId);
    const actor = event.actor ?? state.currentUser ?? null;
    if (event.taskId !== undefined && event.taskId !== null && !task) return null;

    const conditionContext = { task, actor };
    if (!evaluateConditions(rule.conditions, conditionContext)) return null;

    const at = now().toISOString();
    if (!withinRateLimit()) {
      const entry = {
        id: createAutomationId("alog"),
        ruleId: rule.id,
        ruleName: rule.name || "Untitled rule",
        projectId: event.projectId || null,
        taskId: event.taskId ?? null,
        trigger: event.type,
        status: "error",
        message: "Skipped: too many automation runs in the last minute.",
        actor,
        at,
        depth,
      };
      appendLog(entry);
      return entry;
    }

    const projectId = event.projectId || state.currentProjectId || null;
    const project = (state.projects || []).find((item) => item.id === projectId) || null;
    const plan = planRuleActions(rule, {
      task,
      actor,
      project,
      sprintName: event.sprintName || state.perProjectSprint?.[projectId]?.name || "",
      users: state.users || [],
      labels: state.labels || [],
      columns: state.projectColumns?.[projectId] || DEFAULT_COLUMNS,
      now: now(),
    });
    const errors = [...plan.errors];

    if (task && plan.taskChanged && actions.updateTask) {
      const logMessage = `⚡ Automation "${rule.name || "Untitled rule"}": ${plan.summary.join(", ")}`;
      let outcome = actions.updateTask(plan.nextTask, logMessage);
      if (outcome && outcome.ok === false && plan.nextTask.status !== task.status) {
        // Workflow rules rejected the transition: keep the other changes.
        errors.push(outcome.message || "Status change was blocked by the workflow.");
        const withoutStatus = { ...plan.nextTask, status: task.status };
        const changedOtherwise = JSON.stringify({ ...withoutStatus, status: null }) !== JSON.stringify({ ...task, status: null });
        outcome = changedOtherwise ? actions.updateTask(withoutStatus, logMessage) : null;
      }
      if (outcome && outcome.ok === false) errors.push(outcome.message || "Task update failed.");
    }

    plan.notifications.forEach((notification) => {
      actions.addNotification?.({
        type: "workflow_automation",
        text: notification.text,
        ...(notification.recipient ? { recipient: notification.recipient } : {}),
        actor,
        ...(task ? { taskId: task.id, taskTitle: task.title } : {}),
      });
    });

    plan.tasksToCreate.forEach((taskData) => {
      const isSprintEvent = event.type === "sprint_started" || event.type === "sprint_completed";
      const target = isSprintEvent ? resolveBacklogTarget(state, projectId) : "active";
      actions.createTask?.(taskData, target);
    });

    const didSomething = plan.summary.length > 0;
    const status = errors.length === 0 ? "success" : didSomething ? "partial" : "error";
    const entry = {
      id: createAutomationId("alog"),
      ruleId: rule.id,
      ruleName: rule.name || "Untitled rule",
      projectId,
      taskId: task?.id ?? null,
      taskTitle: task?.title || "",
      trigger: event.type,
      status,
      message: [
        didSomething ? plan.summary.join(", ") : "No changes needed",
        ...errors,
      ].join(" · "),
      actor,
      at,
      depth,
    };
    appendLog(entry);
    updateRuleStats(rule.id, { status, at, firedKey });
    return entry;
  };

  const executeEvents = (events, parentChain) => {
    const depth = parentChain ? parentChain.depth + 1 : 0;
    if (depth > AUTOMATION_MAX_CHAIN_DEPTH) return;
    const state = store.getState();
    const rules = (state.automationRules || []).filter((rule) => rule?.enabled);
    if (rules.length === 0) return;

    events.forEach((event) => {
      rules.forEach((rule) => {
        if (!ruleAppliesToProject(rule, event.projectId)) return;
        if (!triggerMatchesEvent(rule.trigger, event)) return;
        const chainKey = `${rule.id}:${event.taskId ?? event.projectId ?? ""}`;
        if (parentChain?.fired.has(chainKey)) return;

        const previousChain = activeChain;
        activeChain = { depth, fired: new Set([...(parentChain?.fired || []), chainKey]) };
        try {
          runRule(rule, event, { depth });
        } catch (error) {
          appendLog({
            id: createAutomationId("alog"),
            ruleId: rule.id,
            ruleName: rule.name || "Untitled rule",
            projectId: event.projectId || null,
            taskId: event.taskId ?? null,
            trigger: event.type,
            status: "error",
            message: `Rule crashed: ${error?.message || error}`,
            actor: event.actor ?? null,
            at: now().toISOString(),
            depth,
          });
        } finally {
          activeChain = previousChain;
        }
      });
    });
  };

  const listener = (state, prev) => {
    if (!state.dbReady) {
      initialized = false;
      return;
    }
    if (!initialized) {
      initialized = true;
      resetSnapshot(state);
      return;
    }

    if (state.archivedTasks !== prev.archivedTasks) rememberArchived(state);
    const taskChange = tasksChanged(state, prev);
    const sprintChange = state.perProjectSprint !== prev.perProjectSprint;
    if (!taskChange && !sprintChange) return;

    const remote = isApplyingRemoteUpdate();
    const actor = state.currentUser || null;
    const events = [];

    if (taskChange) {
      const nextIndex = buildTaskIndex(state);
      if (!remote) {
        events.push(...diffTaskIndexes(taskSnapshot, nextIndex, { actor, knownIds: archivedIds }));
      }
      mergeSnapshot(nextIndex);
    }
    if (sprintChange && !remote) {
      events.push(...diffSprintMaps(prev.perProjectSprint, state.perProjectSprint, { actor }));
    }
    if (events.length === 0) return;

    const parentChain = activeChain;
    schedule(() => executeEvents(events, parentChain));
  };

  const runScheduledCheck = () => {
    const state = store.getState();
    if (!state.dbReady) return [];
    const matches = findDueDateMatches({
      rules: state.automationRules,
      taskIndex: buildTaskIndex(state),
      now: now(),
    });
    const entries = [];
    matches.forEach(({ rule, event, dedupeKey }) => {
      const previousChain = activeChain;
      activeChain = { depth: 0, fired: new Set([`${rule.id}:${event.taskId}`]) };
      try {
        const entry = runRule(rule, event, { depth: 0, firedKey: dedupeKey });
        if (entry) entries.push(entry);
        else {
          // Conditions did not match: remember the key so it is not re-evaluated all day.
          store.getState().setAutomationRules((prev) => (prev || []).map((item) => (
            item.id === rule.id
              ? { ...item, firedKeys: [...(item.firedKeys || []), dedupeKey].slice(-AUTOMATION_FIRED_KEYS_LIMIT) }
              : item
          )));
        }
      } finally {
        activeChain = previousChain;
      }
    });
    return entries;
  };

  return {
    start() {
      if (unsubscribe) return;
      const state = store.getState();
      if (state.dbReady) {
        initialized = true;
        resetSnapshot(state);
      }
      unsubscribe = store.subscribe(listener);
      if (scheduleIntervalMs > 0) {
        initialTimer = setTimeout(runScheduledCheck, initialScheduledDelayMs);
        intervalId = setInterval(runScheduledCheck, scheduleIntervalMs);
      }
    },
    stop() {
      unsubscribe?.();
      unsubscribe = null;
      if (initialTimer) clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
      initialTimer = null;
      intervalId = null;
      initialized = false;
    },
    runScheduledCheck,
    /** Runs one rule against a task on demand ("Test rule" in the editor). */
    runRuleNow(rule, taskId) {
      const state = store.getState();
      const entry = buildTaskIndex(state).get(taskId);
      if (!entry) return null;
      const previousChain = activeChain;
      activeChain = { depth: 0, fired: new Set([`${rule.id}:${taskId}`]) };
      try {
        return runRule(rule, {
          type: "manual",
          taskId,
          projectId: entry.projectId,
          actor: state.currentUser || null,
        }, { depth: 0 });
      } finally {
        activeChain = previousChain;
      }
    },
  };
}
