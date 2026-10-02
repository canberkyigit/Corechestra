/**
 * Human-readable sentences for automation rules ("When status changes to
 * Done, if Type is Bug, then notify the reporter"). Used by the rule list and
 * the live preview in the rule editor.
 */
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_SHORT_LABELS, TASK_TYPE_LABELS } from "../constants/taskMeta";
import {
  ASSIGNEE_MODES,
  CONDITION_FIELD_BY_VALUE,
  CONDITION_OPERATORS,
  NOTIFY_TARGETS,
  WATCHED_TASK_FIELDS,
  WATCHER_MODES,
} from "./automationMeta";

function lookupLabel(list, value) {
  return (list || []).find((item) => item.value === value)?.label || value;
}

const PRIORITY_LABELS = Object.fromEntries(TASK_PRIORITY_OPTIONS.map((option) => [option.value, option.label]));

export function makeDescribeLookups({ columns = [], users = [], labels = [], epics = [] } = {}) {
  return {
    status: (value) => (columns.find((column) => column.id === value)?.title || TASK_STATUS_SHORT_LABELS[value] || value),
    user: (value) => {
      if (!value) return "nobody";
      const match = users.find((user) => user?.username === value || user?.id === value);
      return match?.name || value;
    },
    label: (value) => labels.find((label) => label.id === value)?.name || value,
    epic: (value) => epics.find((epic) => epic.id === value)?.title || value,
    priority: (value) => PRIORITY_LABELS[value] || value,
    type: (value) => TASK_TYPE_LABELS[value] || value,
  };
}

function describeValue(field, value, lookups) {
  const input = CONDITION_FIELD_BY_VALUE[field]?.input;
  const format = (item) => {
    if (input === "status") return lookups.status(item);
    if (input === "user") return lookups.user(item);
    if (input === "label") return lookups.label(item);
    if (input === "epic") return lookups.epic(item);
    if (input === "priority") return lookups.priority(item);
    if (input === "type") return lookups.type(item);
    return item;
  };
  if (Array.isArray(value)) return value.map(format).join(" or ");
  return format(value);
}

export function describeTrigger(trigger, lookups) {
  const config = trigger?.config || {};
  switch (trigger?.type) {
    case "task_created":
      return "a task is created";
    case "status_changed": {
      const from = config.from ? ` from ${lookups.status(config.from)}` : "";
      const to = config.to ? ` to ${lookups.status(config.to)}` : "";
      return `status changes${from}${to}`;
    }
    case "field_changed":
      return `${lookupLabel(WATCHED_TASK_FIELDS, config.field || "a field").toLowerCase()} changes`;
    case "assigned":
      return config.to ? `a task is assigned to ${lookups.user(config.to)}` : "a task is assigned";
    case "comment_added":
      return "a comment is added";
    case "subtasks_completed":
      return "all subtasks are completed";
    case "due_date": {
      if (config.when === "overdue") return "a task becomes overdue";
      if (config.when === "on") return "a task is due today";
      const days = Number(config.days) || 0;
      return days === 0 ? "a task is due today" : `a task is due in ${days} day${days === 1 ? "" : "s"}`;
    }
    case "sprint_started":
      return "a sprint starts";
    case "sprint_completed":
      return "a sprint is completed";
    default:
      return "something happens";
  }
}

export function describeCondition(condition, lookups) {
  const field = CONDITION_FIELD_BY_VALUE[condition?.field]?.label || condition?.field || "field";
  const operator = CONDITION_OPERATORS[condition?.operator];
  if (!operator) return field;
  if (!operator.needsValue) return `${field} ${operator.label}`;
  return `${field} ${operator.label} ${describeValue(condition.field, condition.value, lookups) || "…"}`;
}

export function describeAction(action, lookups) {
  const config = action?.config || {};
  switch (action?.type) {
    case "set_status":
      return `move to ${lookups.status(config.status) || "…"}`;
    case "set_priority":
      return `set priority to ${lookups.priority(config.priority) || "…"}`;
    case "set_assignee":
      if (config.mode === "user") return `assign to ${lookups.user(config.user)}`;
      if (config.mode === "unassigned") return "unassign";
      return `assign to ${lookupLabel(ASSIGNEE_MODES, config.mode)}`;
    case "set_story_points":
      return `set story points to ${config.value ?? "…"}`;
    case "set_due_date":
      if (config.clear) return "clear the due date";
      return `set due date to today + ${Number(config.offsetDays) || 0} day(s)`;
    case "add_label":
      return `add label ${config.labelId ? `"${lookups.label(config.labelId)}"` : "…"}`;
    case "remove_label":
      return `remove label ${config.labelId ? `"${lookups.label(config.labelId)}"` : "…"}`;
    case "add_watcher":
      if (config.mode === "user") return `add ${lookups.user(config.user)} as watcher`;
      return `add ${lookupLabel(WATCHER_MODES, config.mode)} as watcher`;
    case "add_comment":
      return "add a comment";
    case "create_subtask":
      return `create subtask "${config.title || "…"}"`;
    case "notify":
      if (config.to === "user") return `notify ${lookups.user(config.user)}`;
      return `notify ${lookupLabel(NOTIFY_TARGETS, config.to)}`;
    case "create_task":
      return `create task "${config.title || "…"}"`;
    default:
      return "do something";
  }
}

/** `{ when, conditions, actions }` sentence parts plus a single-line summary. */
export function describeRule(rule, lookups) {
  const when = describeTrigger(rule?.trigger, lookups);
  const conditions = (rule?.conditions || []).map((condition) => describeCondition(condition, lookups));
  const actions = (rule?.actions || []).map((action) => describeAction(action, lookups));
  const summary = [
    `When ${when}`,
    conditions.length ? `if ${conditions.join(" and ")}` : "",
    actions.length ? `then ${actions.join(", ")}` : "then …",
  ].filter(Boolean).join(", ");
  return { when, conditions, actions, summary };
}
