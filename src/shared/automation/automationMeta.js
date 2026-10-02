/**
 * Catalog of automation building blocks (triggers, conditions, actions).
 *
 * Rule shape (persisted in `automationRules`, domain `automation`):
 * {
 *   id: "auto-<ts>-<rand>",
 *   name, description,
 *   projectId: string | null,       // null = applies to every project (admin only)
 *   enabled: boolean,
 *   trigger:    { type, config },   // see AUTOMATION_TRIGGERS
 *   conditions: [{ id, field, operator, value }],   // all must match (AND)
 *   actions:    [{ id, type, config }],             // run in order
 *   createdBy, createdAt, updatedAt,
 *   runCount, lastRunAt, lastStatus,
 *   firedKeys: string[]             // dedupe keys for scheduled triggers
 * }
 */

export const AUTOMATION_MAX_CHAIN_DEPTH = 3;
export const AUTOMATION_MAX_RUNS_PER_MINUTE = 60;
export const AUTOMATION_LOG_LIMIT = 200;
export const AUTOMATION_FIRED_KEYS_LIMIT = 300;
export const AUTOMATION_SCHEDULE_INTERVAL_MS = 5 * 60 * 1000;

// ─── Triggers ───────────────────────────────────────────────────────────────

export const AUTOMATION_TRIGGERS = [
  {
    type: "task_created",
    label: "Task created",
    sentence: "a task is created",
    group: "Task",
    scope: "task",
  },
  {
    type: "status_changed",
    label: "Status changed",
    sentence: "status changes",
    group: "Task",
    scope: "task",
    // config: { from?: status | "", to?: status | "" }
  },
  {
    type: "field_changed",
    label: "Field changed",
    sentence: "a field changes",
    group: "Task",
    scope: "task",
    // config: { field }
  },
  {
    type: "assigned",
    label: "Task assigned",
    sentence: "a task is assigned",
    group: "Task",
    scope: "task",
    // config: { to?: username | "" }
  },
  {
    type: "comment_added",
    label: "Comment added",
    sentence: "a comment is added",
    group: "Task",
    scope: "task",
  },
  {
    type: "subtasks_completed",
    label: "All subtasks done",
    sentence: "all subtasks are completed",
    group: "Task",
    scope: "task",
  },
  {
    type: "due_date",
    label: "Due date",
    sentence: "a due date arrives",
    group: "Schedule",
    scope: "task",
    // config: { when: "before" | "on" | "overdue", days }
  },
  {
    type: "sprint_started",
    label: "Sprint started",
    sentence: "a sprint starts",
    group: "Sprint",
    scope: "sprint",
  },
  {
    type: "sprint_completed",
    label: "Sprint completed",
    sentence: "a sprint is completed",
    group: "Sprint",
    scope: "sprint",
  },
];

export const TRIGGER_BY_TYPE = Object.fromEntries(AUTOMATION_TRIGGERS.map((item) => [item.type, item]));

export const WATCHED_TASK_FIELDS = [
  { value: "priority", label: "Priority" },
  { value: "assignedTo", label: "Assignee" },
  { value: "dueDate", label: "Due date" },
  { value: "storyPoint", label: "Story points" },
  { value: "type", label: "Type" },
  { value: "epicId", label: "Epic" },
  { value: "labels", label: "Labels" },
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
];

export const DUE_DATE_WHEN_OPTIONS = [
  { value: "before", label: "days before the due date" },
  { value: "on", label: "on the due date" },
  { value: "overdue", label: "when it becomes overdue" },
];

// ─── Conditions ─────────────────────────────────────────────────────────────

export const CONDITION_OPERATORS = {
  is: { label: "is", needsValue: true },
  is_not: { label: "is not", needsValue: true },
  contains: { label: "contains", needsValue: true },
  not_contains: { label: "does not contain", needsValue: true },
  is_empty: { label: "is empty", needsValue: false },
  is_not_empty: { label: "is not empty", needsValue: false },
  gt: { label: "is greater than", needsValue: true },
  lt: { label: "is less than", needsValue: true },
};

export const CONDITION_FIELDS = [
  { value: "type", label: "Type", input: "type", operators: ["is", "is_not"] },
  { value: "priority", label: "Priority", input: "priority", operators: ["is", "is_not"] },
  { value: "status", label: "Status", input: "status", operators: ["is", "is_not"] },
  { value: "assignedTo", label: "Assignee", input: "user", operators: ["is", "is_not", "is_empty", "is_not_empty"] },
  { value: "reporter", label: "Reporter", input: "user", operators: ["is", "is_not", "is_empty", "is_not_empty"] },
  { value: "labels", label: "Labels", input: "label", operators: ["contains", "not_contains", "is_empty", "is_not_empty"] },
  { value: "epicId", label: "Epic", input: "epic", operators: ["is", "is_not", "is_empty", "is_not_empty"] },
  { value: "storyPoint", label: "Story points", input: "number", operators: ["is", "gt", "lt", "is_empty", "is_not_empty"] },
  { value: "dueDate", label: "Due date", input: "none", operators: ["is_empty", "is_not_empty"] },
  { value: "title", label: "Title", input: "text", operators: ["contains", "not_contains"] },
  { value: "actor", label: "Triggered by", input: "user", operators: ["is", "is_not"] },
];

export const CONDITION_FIELD_BY_VALUE = Object.fromEntries(CONDITION_FIELDS.map((item) => [item.value, item]));

// ─── Actions ────────────────────────────────────────────────────────────────

export const ASSIGNEE_MODES = [
  { value: "user", label: "a specific person" },
  { value: "actor", label: "the person who triggered the rule" },
  { value: "reporter", label: "the reporter" },
  { value: "unassigned", label: "nobody (unassign)" },
];

export const NOTIFY_TARGETS = [
  { value: "assignee", label: "the assignee" },
  { value: "reporter", label: "the reporter" },
  { value: "watchers", label: "the watchers" },
  { value: "user", label: "a specific person" },
  { value: "everyone", label: "everyone in the workspace" },
];

export const WATCHER_MODES = [
  { value: "user", label: "a specific person" },
  { value: "actor", label: "the person who triggered the rule" },
  { value: "assignee", label: "the assignee" },
  { value: "reporter", label: "the reporter" },
];

export const AUTOMATION_ACTIONS = [
  { type: "set_status", label: "Change status", scope: "task" },
  { type: "set_priority", label: "Set priority", scope: "task" },
  { type: "set_assignee", label: "Assign", scope: "task" },
  { type: "set_story_points", label: "Set story points", scope: "task" },
  { type: "set_due_date", label: "Set due date", scope: "task" },
  { type: "add_label", label: "Add label", scope: "task" },
  { type: "remove_label", label: "Remove label", scope: "task" },
  { type: "add_watcher", label: "Add watcher", scope: "task" },
  { type: "add_comment", label: "Add comment", scope: "task" },
  { type: "create_subtask", label: "Create subtask", scope: "task" },
  { type: "notify", label: "Send notification", scope: "any" },
  { type: "create_task", label: "Create task", scope: "any" },
];

export const ACTION_BY_TYPE = Object.fromEntries(AUTOMATION_ACTIONS.map((item) => [item.type, item]));

export const DEFAULT_ACTION_CONFIG = {
  set_status: { status: "inprogress" },
  set_priority: { priority: "high" },
  set_assignee: { mode: "actor", user: "" },
  set_story_points: { value: 1 },
  set_due_date: { offsetDays: 3, clear: false },
  add_label: { labelId: "" },
  remove_label: { labelId: "" },
  add_watcher: { mode: "actor", user: "" },
  add_comment: { text: "" },
  create_subtask: { title: "" },
  notify: { to: "assignee", user: "", message: "{{task.key}} needs your attention: {{task.title}}" },
  create_task: { title: "", type: "task", priority: "medium", assigneeMode: "unassigned", user: "" },
};

export const DEFAULT_TRIGGER_CONFIG = {
  task_created: {},
  status_changed: { from: "", to: "" },
  field_changed: { field: "priority" },
  assigned: { to: "" },
  comment_added: {},
  subtasks_completed: {},
  due_date: { when: "before", days: 1 },
  sprint_started: {},
  sprint_completed: {},
};

export const SMART_VALUES = [
  { token: "{{task.key}}", label: "Task key" },
  { token: "{{task.title}}", label: "Task title" },
  { token: "{{task.status}}", label: "Task status" },
  { token: "{{task.priority}}", label: "Task priority" },
  { token: "{{task.assignee}}", label: "Assignee" },
  { token: "{{task.reporter}}", label: "Reporter" },
  { token: "{{task.dueDate}}", label: "Due date" },
  { token: "{{actor}}", label: "Triggered by" },
  { token: "{{project.name}}", label: "Project name" },
  { token: "{{sprint.name}}", label: "Sprint name" },
  { token: "{{rule.name}}", label: "Rule name" },
];

export function isTaskScopedTrigger(type) {
  return TRIGGER_BY_TYPE[type]?.scope === "task";
}

/** Actions usable with a trigger (sprint triggers have no task to act on). */
export function getActionsForTrigger(triggerType) {
  if (isTaskScopedTrigger(triggerType)) return AUTOMATION_ACTIONS;
  return AUTOMATION_ACTIONS.filter((action) => action.scope === "any");
}

export function createAutomationId(prefix = "auto") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
