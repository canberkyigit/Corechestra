/**
 * Pure automation engine: change detection, rule matching, condition
 * evaluation and action planning. Nothing here touches the store or React;
 * `automationRunner.js` wires it to the app.
 */
import { getTaskProjectId, taskKey } from "../utils/helpers";
import { TASK_STATUS_SHORT_LABELS } from "../constants/taskMeta";
import {
  CONDITION_OPERATORS,
  WATCHED_TASK_FIELDS,
  isTaskScopedTrigger,
} from "./automationMeta";

export const AUTOMATION_AUTHOR = "automation";

const WATCHED_FIELD_KEYS = WATCHED_TASK_FIELDS.map((field) => field.value);

// ─── Small helpers ──────────────────────────────────────────────────────────

function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  const text = String(value).trim();
  return text === "" || text === "unassigned";
}

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a || []) === JSON.stringify(b || []);
  }
  return (a ?? "") === (b ?? "");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

/** Local calendar date as `yyyy-MM-dd`. */
export function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole calendar days from `from` to the `yyyy-MM-dd` date (negative = past). */
export function daysUntil(dateValue, from = new Date()) {
  const due = parseLocalDate(dateValue);
  if (!due) return null;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((due.getTime() - start.getTime()) / 86400000);
}

function addDays(from, days) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + days);
  return date;
}

// ─── Task index + change detection ──────────────────────────────────────────

/**
 * Flattens active-sprint and backlog tasks into `Map<id, { task, projectId }>`.
 * Backlog tasks take the project of the backlog map key.
 */
export function buildTaskIndex({ activeTasks, perProjectBacklog, currentProjectId }) {
  const index = new Map();
  (activeTasks || []).forEach((task) => {
    if (task?.id === undefined || task?.id === null) return;
    index.set(task.id, { task, projectId: getTaskProjectId(task, currentProjectId) });
  });
  Object.entries(perProjectBacklog || {}).forEach(([projectId, sections]) => {
    (sections || []).forEach((section) => {
      (section?.tasks || []).forEach((task) => {
        if (task?.id === undefined || task?.id === null || index.has(task.id)) return;
        index.set(task.id, { task, projectId: task.projectId || projectId });
      });
    });
  });
  return index;
}

function subtasksAllDone(task) {
  const subtasks = task?.subtasks || [];
  return subtasks.length > 0 && subtasks.every((subtask) => subtask?.done || subtask?.status === "done");
}

/**
 * Compares two task indexes and returns automation events for local changes.
 * `knownIds` are ids that must never count as "created" (e.g. tasks that were
 * just restored from the archive).
 */
export function diffTaskIndexes(previousIndex, nextIndex, { actor = null, knownIds } = {}) {
  const events = [];
  nextIndex.forEach(({ task, projectId }, taskId) => {
    const previousEntry = previousIndex.get(taskId);
    const base = { taskId, projectId, actor };

    if (!previousEntry) {
      if (!knownIds || !knownIds.has(taskId)) {
        events.push({ ...base, type: "task_created" });
      }
      return;
    }

    const previous = previousEntry.task;
    if (previous === task) return;

    if ((previous.status || "") !== (task.status || "")) {
      events.push({ ...base, type: "status_changed", from: previous.status || "", to: task.status || "" });
    }

    WATCHED_FIELD_KEYS.forEach((field) => {
      if (!sameValue(previous[field], task[field])) {
        events.push({ ...base, type: "field_changed", field, from: previous[field] ?? null, to: task[field] ?? null });
      }
    });

    if (!sameValue(previous.assignedTo, task.assignedTo) && !isBlank(task.assignedTo)) {
      events.push({ ...base, type: "assigned", from: previous.assignedTo || "", to: task.assignedTo });
    }

    const previousCommentIds = new Set((previous.comments || []).map((comment) => comment?.id));
    (task.comments || []).forEach((comment) => {
      if (!comment || previousCommentIds.has(comment.id)) return;
      if (comment.author === AUTOMATION_AUTHOR || comment.automation) return;
      events.push({ ...base, type: "comment_added", commentId: comment.id, commentText: comment.text || "" });
    });

    if (!subtasksAllDone(previous) && subtasksAllDone(task)) {
      events.push({ ...base, type: "subtasks_completed" });
    }
  });
  return events;
}

/** Sprint lifecycle events from `perProjectSprint` changes. */
export function diffSprintMaps(previousMap, nextMap, { actor = null } = {}) {
  const events = [];
  Object.entries(nextMap || {}).forEach(([projectId, sprint]) => {
    const previous = (previousMap || {})[projectId];
    if (!sprint || previous?.status === sprint.status) return;
    if (sprint.status === "active") {
      events.push({ type: "sprint_started", projectId, actor, sprintName: sprint.name || "" });
    } else if (sprint.status === "completed" && previous?.status === "active") {
      events.push({ type: "sprint_completed", projectId, actor, sprintName: sprint.name || "" });
    }
  });
  return events;
}

// ─── Matching ───────────────────────────────────────────────────────────────

export function ruleAppliesToProject(rule, projectId) {
  if (!rule) return false;
  if (!rule.projectId) return true;
  return rule.projectId === projectId;
}

export function triggerMatchesEvent(trigger, event) {
  if (!trigger || !event || trigger.type !== event.type) return false;
  const config = trigger.config || {};
  switch (trigger.type) {
    case "status_changed":
      return (!config.from || config.from === event.from) && (!config.to || config.to === event.to);
    case "field_changed":
      return !config.field || config.field === event.field;
    case "assigned":
      return !config.to || normalizeName(config.to) === normalizeName(event.to);
    default:
      return true;
  }
}

function readConditionField(field, { task, actor }) {
  if (field === "actor") return actor || "";
  return task?.[field];
}

function compareNumbers(actual, expected, operator) {
  const a = Number(actual);
  const b = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (operator === "gt") return a > b;
  if (operator === "lt") return a < b;
  return a === b;
}

function matchesOne(actual, expected) {
  if (Array.isArray(expected)) return expected.some((item) => matchesOne(actual, item));
  if (typeof actual === "number" || typeof expected === "number") return compareNumbers(actual, expected, "is");
  return normalizeName(actual) === normalizeName(expected);
}

export function evaluateCondition(condition, context) {
  if (!condition?.field || !condition?.operator) return true;
  const actual = readConditionField(condition.field, context);
  const expected = condition.value;
  switch (condition.operator) {
    case "is":
      if (condition.field === "storyPoint") return compareNumbers(actual, expected, "is");
      return matchesOne(actual, expected);
    case "is_not":
      return !matchesOne(actual, expected);
    case "contains":
      if (Array.isArray(actual)) return actual.some((item) => matchesOne(item, expected));
      return normalizeName(actual).includes(normalizeName(expected)) && !isBlank(expected);
    case "not_contains":
      if (Array.isArray(actual)) return !actual.some((item) => matchesOne(item, expected));
      return !normalizeName(actual).includes(normalizeName(expected)) || isBlank(expected);
    case "is_empty":
      return isBlank(actual);
    case "is_not_empty":
      return !isBlank(actual);
    case "gt":
    case "lt":
      return compareNumbers(actual, expected, condition.operator);
    default:
      return false;
  }
}

export function evaluateConditions(conditions, context) {
  return (conditions || []).every((condition) => evaluateCondition(condition, context));
}

export function isConditionComplete(condition) {
  if (!condition?.field || !condition?.operator) return false;
  if (!CONDITION_OPERATORS[condition.operator]?.needsValue) return true;
  return !isBlank(condition.value) || condition.value === 0;
}

// ─── Smart values ───────────────────────────────────────────────────────────

function displayUser(username, users) {
  if (isBlank(username)) return "Unassigned";
  const match = (users || []).find((user) => (
    normalizeName(user?.username) === normalizeName(username)
    || normalizeName(user?.id) === normalizeName(username)
  ));
  return match?.name || username;
}

function statusLabel(status, columns) {
  return (columns || []).find((column) => column.id === status)?.title
    || TASK_STATUS_SHORT_LABELS[status]
    || status
    || "";
}

export function buildSmartValues({ task, actor, project, sprintName, rule, users, columns }) {
  return {
    "task.key": task ? taskKey(task.id) : "",
    "task.title": task?.title || "",
    "task.status": task ? statusLabel(task.status, columns) : "",
    "task.priority": task?.priority || "",
    "task.assignee": task ? displayUser(task.assignedTo, users) : "",
    "task.reporter": task ? displayUser(task.reporter, users) : "",
    "task.dueDate": task?.dueDate || "",
    actor: displayUser(actor, users),
    "project.name": project?.name || "",
    "sprint.name": sprintName || "",
    "rule.name": rule?.name || "",
  };
}

export function renderTemplate(template, values) {
  return String(template || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values || {}, key) ? String(values[key]) : match
  ));
}

// ─── Action planning ────────────────────────────────────────────────────────

function resolvePerson(mode, { user, task, actor }) {
  switch (mode) {
    case "user": return user || "";
    case "actor": return actor || "";
    case "reporter": return task?.reporter || "";
    case "assignee": return task?.assignedTo || "";
    default: return "";
  }
}

function notificationRecipients(config, { task, actor }) {
  switch (config.to) {
    case "assignee": return [task?.assignedTo];
    case "reporter": return [task?.reporter];
    case "watchers": return [...(task?.watchers || [])];
    case "user": return [config.user];
    case "actor": return [actor];
    default: return [];
  }
}

function uniqueRecipients(list) {
  const seen = new Set();
  return (list || []).filter((recipient) => {
    if (isBlank(recipient)) return false;
    const key = normalizeName(recipient);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Plans the effects of a rule's actions for one event. Pure: returns what to
 * do, the runner applies it.
 *
 * Returns `{ nextTask, taskChanged, notifications, tasksToCreate, summary, errors }`.
 * - `nextTask`: the task after every task-scoped action (or null without a task)
 * - `notifications`: `{ recipient | null, text }` (null = workspace broadcast)
 * - `tasksToCreate`: partial task objects for `createTask`
 */
export function planRuleActions(rule, context) {
  const {
    task = null, actor = null, users = [], labels = [], columns = [], now = new Date(),
  } = context;
  const result = {
    nextTask: task ? { ...task } : null,
    taskChanged: false,
    notifications: [],
    tasksToCreate: [],
    summary: [],
    errors: [],
  };
  const draft = result.nextTask;
  // Smart values reflect earlier actions of the same rule (e.g. a new assignee).
  const currentValues = () => buildSmartValues({ ...context, task: draft, rule });
  let subtaskSeed = now.getTime();

  const requireTask = (action) => {
    if (draft) return true;
    result.errors.push(`"${action.type}" needs a task — skipped.`);
    return false;
  };

  (rule.actions || []).forEach((action) => {
    const config = action?.config || {};
    switch (action?.type) {
      case "set_status": {
        if (!requireTask(action) || !config.status || draft.status === config.status) break;
        draft.status = config.status;
        result.taskChanged = true;
        result.summary.push(`status → ${statusLabel(config.status, columns)}`);
        break;
      }
      case "set_priority": {
        if (!requireTask(action) || !config.priority || draft.priority === config.priority) break;
        draft.priority = config.priority;
        result.taskChanged = true;
        result.summary.push(`priority → ${config.priority}`);
        break;
      }
      case "set_assignee": {
        if (!requireTask(action)) break;
        const next = config.mode === "unassigned"
          ? "unassigned"
          : resolvePerson(config.mode, { user: config.user, task: draft, actor });
        if (!next) {
          result.errors.push("Assign: nobody to assign.");
          break;
        }
        if (normalizeName(draft.assignedTo) === normalizeName(next)) break;
        draft.assignedTo = next;
        result.taskChanged = true;
        result.summary.push(next === "unassigned" ? "unassigned" : `assigned to ${displayUser(next, users)}`);
        break;
      }
      case "set_story_points": {
        if (!requireTask(action)) break;
        const points = Number(config.value);
        if (!Number.isFinite(points) || points < 0) {
          result.errors.push("Story points must be a non-negative number.");
          break;
        }
        if (Number(draft.storyPoint) === points && draft.storyPoint !== "") break;
        draft.storyPoint = points;
        result.taskChanged = true;
        result.summary.push(`story points → ${points}`);
        break;
      }
      case "set_due_date": {
        if (!requireTask(action)) break;
        const next = config.clear ? "" : toLocalDateKey(addDays(now, Number(config.offsetDays) || 0));
        if ((draft.dueDate || "") === next) break;
        draft.dueDate = next;
        result.taskChanged = true;
        result.summary.push(next ? `due date → ${next}` : "due date cleared");
        break;
      }
      case "add_label":
      case "remove_label": {
        if (!requireTask(action) || !config.labelId) break;
        const current = draft.labels || [];
        const has = current.includes(config.labelId);
        const labelName = (labels || []).find((label) => label.id === config.labelId)?.name || config.labelId;
        if (action.type === "add_label" && !has) {
          draft.labels = [...current, config.labelId];
          result.taskChanged = true;
          result.summary.push(`label "${labelName}" added`);
        }
        if (action.type === "remove_label" && has) {
          draft.labels = current.filter((id) => id !== config.labelId);
          result.taskChanged = true;
          result.summary.push(`label "${labelName}" removed`);
        }
        break;
      }
      case "add_watcher": {
        if (!requireTask(action)) break;
        const watcher = resolvePerson(config.mode, { user: config.user, task: draft, actor });
        if (isBlank(watcher)) break;
        const watchers = draft.watchers || [];
        if (watchers.some((item) => normalizeName(item) === normalizeName(watcher))) break;
        draft.watchers = [...watchers, watcher];
        result.taskChanged = true;
        result.summary.push(`${displayUser(watcher, users)} watching`);
        break;
      }
      case "add_comment": {
        if (!requireTask(action)) break;
        const text = renderTemplate(config.text, currentValues()).trim();
        if (!text) {
          result.errors.push("Comment text is empty.");
          break;
        }
        draft.comments = [
          ...(draft.comments || []),
          {
            id: `tcmt-auto-${now.getTime()}-${Math.floor(Math.random() * 10000)}`,
            author: AUTOMATION_AUTHOR,
            text,
            createdAt: now.toISOString(),
            replyTo: null,
            reactions: {},
            pinned: false,
            automation: { ruleId: rule.id, ruleName: rule.name || "" },
          },
        ];
        result.taskChanged = true;
        result.summary.push("comment added");
        break;
      }
      case "create_subtask": {
        if (!requireTask(action)) break;
        const title = renderTemplate(config.title, currentValues()).trim();
        if (!title) {
          result.errors.push("Subtask title is empty.");
          break;
        }
        subtaskSeed += 1;
        draft.subtasks = [
          ...(draft.subtasks || []),
          { id: subtaskSeed, title, done: false, priority: "medium", storyPoint: "", assignedTo: "unassigned" },
        ];
        result.taskChanged = true;
        result.summary.push(`subtask "${title}" created`);
        break;
      }
      case "notify": {
        const text = renderTemplate(config.message, currentValues()).trim()
          || `Automation "${rule.name || "Untitled rule"}" ran`;
        if (config.to === "everyone") {
          result.notifications.push({ recipient: null, text });
          result.summary.push("notified everyone");
          break;
        }
        const recipients = uniqueRecipients(notificationRecipients(config, { task: draft, actor }));
        if (recipients.length === 0) {
          result.errors.push("Notification has no recipient.");
          break;
        }
        recipients.forEach((recipient) => result.notifications.push({ recipient, text }));
        result.summary.push(`notified ${recipients.map((item) => displayUser(item, users)).join(", ")}`);
        break;
      }
      case "create_task": {
        const title = renderTemplate(config.title, currentValues()).trim();
        if (!title) {
          result.errors.push("New task title is empty.");
          break;
        }
        const assignedTo = config.assigneeMode && config.assigneeMode !== "unassigned"
          ? resolvePerson(config.assigneeMode, { user: config.user, task: draft, actor }) || "unassigned"
          : "unassigned";
        result.tasksToCreate.push({
          title,
          type: config.type || "task",
          priority: config.priority || "medium",
          assignedTo,
          description: `Created by automation "${rule.name || "Untitled rule"}".`,
        });
        result.summary.push(`task "${title}" created`);
        break;
      }
      default:
        result.errors.push(`Unknown action "${action?.type}".`);
    }
  });

  return result;
}

// ─── Scheduled (due date) triggers ──────────────────────────────────────────

/**
 * Finds `due_date` rule matches for the given day. Each match carries a
 * `dedupeKey`; the runner skips keys already stored in `rule.firedKeys`.
 */
export function findDueDateMatches({ rules, taskIndex, now = new Date() }) {
  const matches = [];
  (rules || []).forEach((rule) => {
    if (!rule?.enabled || rule.trigger?.type !== "due_date") return;
    const config = rule.trigger.config || {};
    const when = config.when || "before";
    const days = Math.max(0, Number(config.days) || 0);
    const fired = new Set(rule.firedKeys || []);
    taskIndex.forEach(({ task, projectId }, taskId) => {
      if (!task?.dueDate || task.status === "done") return;
      if (!ruleAppliesToProject(rule, projectId)) return;
      const remaining = daysUntil(task.dueDate, now);
      if (remaining === null) return;
      let hit = false;
      let dedupeKey = "";
      if (when === "overdue") {
        hit = remaining < 0;
        dedupeKey = `${rule.id}:${taskId}:overdue:${task.dueDate}`;
      } else if (when === "on") {
        hit = remaining === 0;
        dedupeKey = `${rule.id}:${taskId}:on:${task.dueDate}`;
      } else {
        hit = remaining === days;
        dedupeKey = `${rule.id}:${taskId}:before${days}:${task.dueDate}`;
      }
      if (!hit || fired.has(dedupeKey)) return;
      matches.push({
        rule,
        dedupeKey,
        event: { type: "due_date", taskId, projectId, actor: null, daysRemaining: remaining },
      });
    });
  });
  return matches;
}

/** Validation for the rule editor. Returns a list of human-readable problems. */
export function validateRule(rule) {
  const problems = [];
  if (!String(rule?.name || "").trim()) problems.push("Give the rule a name.");
  if (!rule?.trigger?.type) problems.push("Choose a trigger.");
  if (!rule?.actions?.length) problems.push("Add at least one action.");
  (rule?.conditions || []).forEach((condition, index) => {
    if (!isConditionComplete(condition)) problems.push(`Condition ${index + 1} is incomplete.`);
  });
  const taskScoped = isTaskScopedTrigger(rule?.trigger?.type);
  (rule?.actions || []).forEach((action, index) => {
    const config = action?.config || {};
    const label = `Action ${index + 1}`;
    if (!taskScoped && !["notify", "create_task"].includes(action?.type)) {
      problems.push(`${label} needs a task trigger.`);
    }
    if (action?.type === "set_assignee" && config.mode === "user" && !config.user) problems.push(`${label}: pick a person.`);
    if (action?.type === "add_watcher" && config.mode === "user" && !config.user) problems.push(`${label}: pick a person.`);
    if (["add_label", "remove_label"].includes(action?.type) && !config.labelId) problems.push(`${label}: pick a label.`);
    if (action?.type === "add_comment" && !String(config.text || "").trim()) problems.push(`${label}: write the comment.`);
    if (action?.type === "create_subtask" && !String(config.title || "").trim()) problems.push(`${label}: name the subtask.`);
    if (action?.type === "create_task" && !String(config.title || "").trim()) problems.push(`${label}: name the task.`);
    if (action?.type === "notify" && config.to === "user" && !config.user) problems.push(`${label}: pick who to notify.`);
    if (action?.type === "notify" && !taskScoped && ["assignee", "reporter", "watchers"].includes(config.to)) {
      problems.push(`${label}: sprint rules can only notify a person or everyone.`);
    }
  });
  return problems;
}
