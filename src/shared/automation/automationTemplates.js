/**
 * Ready-to-use rule templates for the template gallery. Every template works
 * without extra configuration; `buildRuleFromTemplate` gives each condition
 * and action a fresh id.
 */
import { createAutomationId } from "./automationMeta";

export const AUTOMATION_TEMPLATES = [
  {
    id: "tpl-done-notify-reporter",
    category: "Notifications",
    name: "Tell the reporter when work is done",
    description: "When a task moves to Done, notify the person who reported it.",
    trigger: { type: "status_changed", config: { from: "", to: "done" } },
    conditions: [],
    actions: [
      { type: "notify", config: { to: "reporter", message: "{{task.key}} \"{{task.title}}\" is done (moved by {{actor}})." } },
    ],
  },
  {
    id: "tpl-inprogress-assign-actor",
    category: "Assignment",
    name: "Assign whoever starts the work",
    description: "When an unassigned task moves to In Progress, assign it to the person who moved it.",
    trigger: { type: "status_changed", config: { from: "", to: "inprogress" } },
    conditions: [{ field: "assignedTo", operator: "is_empty", value: "" }],
    actions: [{ type: "set_assignee", config: { mode: "actor", user: "" } }],
  },
  {
    id: "tpl-blocked-escalate",
    category: "Workflow",
    name: "Escalate blocked work",
    description: "When a task is blocked, raise its priority to High and notify the watchers.",
    trigger: { type: "status_changed", config: { from: "", to: "blocked" } },
    conditions: [{ field: "priority", operator: "is", value: ["low", "medium"] }],
    actions: [
      { type: "set_priority", config: { priority: "high" } },
      { type: "notify", config: { to: "watchers", message: "{{task.key}} is blocked: {{task.title}}" } },
    ],
  },
  {
    id: "tpl-critical-bug-triage",
    category: "Bugs",
    name: "Critical bug triage",
    description: "When a critical bug is created, add a triage checklist comment and notify the assignee.",
    trigger: { type: "task_created", config: {} },
    conditions: [
      { field: "type", operator: "is", value: ["bug", "defect"] },
      { field: "priority", operator: "is", value: "critical" },
    ],
    actions: [
      {
        type: "add_comment",
        config: { text: "Triage checklist:\n- Reproduce the issue\n- Assess impact\n- Link the related release\n- Agree on a fix owner" },
      },
      { type: "notify", config: { to: "assignee", message: "Critical bug {{task.key}}: {{task.title}}" } },
    ],
  },
  {
    id: "tpl-subtasks-review",
    category: "Workflow",
    name: "Send to review when subtasks are done",
    description: "When every subtask is checked off, move the parent task to Review.",
    trigger: { type: "subtasks_completed", config: {} },
    conditions: [{ field: "status", operator: "is_not", value: ["review", "done"] }],
    actions: [{ type: "set_status", config: { status: "review" } }],
  },
  {
    id: "tpl-due-tomorrow",
    category: "Reminders",
    name: "Due tomorrow reminder",
    description: "One day before a task is due, remind the assignee.",
    trigger: { type: "due_date", config: { when: "before", days: 1 } },
    conditions: [{ field: "assignedTo", operator: "is_not_empty", value: "" }],
    actions: [{ type: "notify", config: { to: "assignee", message: "Reminder: {{task.key}} \"{{task.title}}\" is due tomorrow." } }],
  },
  {
    id: "tpl-overdue-alert",
    category: "Reminders",
    name: "Overdue alert",
    description: "When a task becomes overdue, notify the assignee and the reporter.",
    trigger: { type: "due_date", config: { when: "overdue", days: 0 } },
    conditions: [],
    actions: [
      { type: "notify", config: { to: "assignee", message: "{{task.key}} is overdue (was due {{task.dueDate}})." } },
      { type: "notify", config: { to: "reporter", message: "{{task.key}} is overdue (was due {{task.dueDate}})." } },
    ],
  },
  {
    id: "tpl-comment-reopen",
    category: "Workflow",
    name: "Reopen on new comment",
    description: "When someone comments on an Awaiting Customer task, move it back to In Progress.",
    trigger: { type: "comment_added", config: {} },
    conditions: [{ field: "status", operator: "is", value: "awaiting" }],
    actions: [{ type: "set_status", config: { status: "inprogress" } }],
  },
  {
    id: "tpl-sprint-retro-task",
    category: "Sprints",
    name: "Schedule the retrospective",
    description: "When a sprint is completed, create a task to run its retrospective.",
    trigger: { type: "sprint_completed", config: {} },
    conditions: [],
    actions: [
      { type: "create_task", config: { title: "Run retrospective for {{sprint.name}}", type: "task", priority: "medium", assigneeMode: "actor", user: "" } },
    ],
  },
  {
    id: "tpl-sprint-kickoff",
    category: "Sprints",
    name: "Announce sprint kickoff",
    description: "When a sprint starts, tell the whole workspace.",
    trigger: { type: "sprint_started", config: {} },
    conditions: [],
    actions: [{ type: "notify", config: { to: "everyone", message: "{{sprint.name}} has started in {{project.name}}." } }],
  },
];

export function buildRuleFromTemplate(template) {
  return {
    name: template.name,
    description: template.description,
    trigger: { type: template.trigger.type, config: { ...(template.trigger.config || {}) } },
    conditions: (template.conditions || []).map((condition) => ({ ...condition, id: createAutomationId("cond") })),
    actions: (template.actions || []).map((action) => ({
      ...action,
      id: createAutomationId("act"),
      config: { ...(action.config || {}) },
    })),
    templateId: template.id,
  };
}
