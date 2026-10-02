import {
  AUTOMATION_AUTHOR,
  buildTaskIndex,
  daysUntil,
  diffSprintMaps,
  diffTaskIndexes,
  evaluateConditions,
  findDueDateMatches,
  planRuleActions,
  renderTemplate,
  ruleAppliesToProject,
  triggerMatchesEvent,
  validateRule,
} from "./automationEngine";
import { describeRule, makeDescribeLookups } from "./automationDescribe";
import { AUTOMATION_TEMPLATES, buildRuleFromTemplate } from "./automationTemplates";

const baseTask = {
  id: "CY-1",
  title: "Login fails",
  type: "bug",
  status: "todo",
  priority: "medium",
  assignedTo: "unassigned",
  reporter: "alice",
  watchers: ["carol"],
  labels: [],
  comments: [],
  subtasks: [],
  projectId: "p1",
};

function indexOf(...tasks) {
  return buildTaskIndex({ activeTasks: tasks, perProjectBacklog: {}, currentProjectId: "p1" });
}

describe("buildTaskIndex", () => {
  it("indexes active and backlog tasks with their project", () => {
    const index = buildTaskIndex({
      activeTasks: [{ id: "a", projectId: "p1" }],
      perProjectBacklog: { p2: [{ id: 1, title: "Backlog", tasks: [{ id: "b" }] }] },
      currentProjectId: "p1",
    });
    expect(index.get("a").projectId).toBe("p1");
    expect(index.get("b").projectId).toBe("p2");
  });
});

describe("diffTaskIndexes", () => {
  it("detects created tasks unless they are known (restored)", () => {
    const next = indexOf(baseTask);
    expect(diffTaskIndexes(new Map(), next).map((event) => event.type)).toEqual(["task_created"]);
    expect(diffTaskIndexes(new Map(), next, { knownIds: new Set(["CY-1"]) })).toEqual([]);
  });

  it("detects status, field, assignment, comment and subtask changes", () => {
    const previous = indexOf({ ...baseTask, subtasks: [{ id: 1, done: true }, { id: 2, done: false }] });
    const next = indexOf({
      ...baseTask,
      status: "inprogress",
      priority: "high",
      assignedTo: "bob",
      comments: [
        { id: "c1", author: "bob", text: "on it" },
        { id: "c2", author: AUTOMATION_AUTHOR, text: "auto" },
      ],
      subtasks: [{ id: 1, done: true }, { id: 2, done: true }],
    });
    const events = diffTaskIndexes(previous, next, { actor: "bob" });
    const types = events.map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining([
      "status_changed", "field_changed", "assigned", "comment_added", "subtasks_completed",
    ]));
    expect(events.find((event) => event.type === "status_changed")).toMatchObject({ from: "todo", to: "inprogress", actor: "bob" });
    expect(events.filter((event) => event.type === "comment_added")).toHaveLength(1);
    expect(events.filter((event) => event.type === "field_changed").map((event) => event.field))
      .toEqual(expect.arrayContaining(["priority", "assignedTo"]));
  });

  it("ignores identical task objects", () => {
    const index = indexOf(baseTask);
    expect(diffTaskIndexes(index, index)).toEqual([]);
  });
});

describe("diffSprintMaps", () => {
  it("emits sprint start and completion", () => {
    expect(diffSprintMaps({ p1: { status: "planned" } }, { p1: { status: "active", name: "S1" } }))
      .toEqual([{ type: "sprint_started", projectId: "p1", actor: null, sprintName: "S1" }]);
    expect(diffSprintMaps({ p1: { status: "active" } }, { p1: { status: "completed", name: "S1" } })[0].type)
      .toBe("sprint_completed");
    expect(diffSprintMaps({ p1: { status: "planned" } }, { p1: { status: "completed" } })).toEqual([]);
  });
});

describe("matching", () => {
  it("matches status triggers on from/to", () => {
    const event = { type: "status_changed", from: "review", to: "done" };
    expect(triggerMatchesEvent({ type: "status_changed", config: { to: "done" } }, event)).toBe(true);
    expect(triggerMatchesEvent({ type: "status_changed", config: { from: "todo", to: "done" } }, event)).toBe(false);
    expect(triggerMatchesEvent({ type: "task_created", config: {} }, event)).toBe(false);
  });

  it("scopes rules to a project or to every project", () => {
    expect(ruleAppliesToProject({ projectId: null }, "p2")).toBe(true);
    expect(ruleAppliesToProject({ projectId: "p1" }, "p1")).toBe(true);
    expect(ruleAppliesToProject({ projectId: "p1" }, "p2")).toBe(false);
  });

  it("evaluates conditions with AND semantics", () => {
    const context = { task: { ...baseTask, labels: ["lbl-ui"], storyPoint: 5 }, actor: "bob" };
    expect(evaluateConditions([
      { field: "type", operator: "is", value: ["bug", "defect"] },
      { field: "assignedTo", operator: "is_empty", value: "" },
      { field: "labels", operator: "contains", value: "lbl-ui" },
      { field: "storyPoint", operator: "gt", value: 3 },
      { field: "actor", operator: "is", value: "BOB" },
      { field: "title", operator: "contains", value: "login" },
    ], context)).toBe(true);
    expect(evaluateConditions([
      { field: "type", operator: "is", value: "bug" },
      { field: "priority", operator: "is", value: "critical" },
    ], context)).toBe(false);
  });
});

describe("planRuleActions", () => {
  const users = [{ id: "u1", username: "bob", name: "Bob Builder" }, { id: "u2", username: "alice", name: "Alice" }];

  it("applies task actions in order and renders smart values", () => {
    const rule = {
      id: "r1",
      name: "Start work",
      actions: [
        { type: "set_assignee", config: { mode: "actor" } },
        { type: "set_priority", config: { priority: "high" } },
        { type: "add_label", config: { labelId: "lbl-1" } },
        { type: "add_comment", config: { text: "{{task.key}} picked up by {{actor}}" } },
        { type: "notify", config: { to: "reporter", message: "{{task.title}} → {{task.assignee}}" } },
      ],
    };
    const plan = planRuleActions(rule, { task: baseTask, actor: "bob", users, labels: [{ id: "lbl-1", name: "UI" }] });
    expect(plan.taskChanged).toBe(true);
    expect(plan.nextTask).toMatchObject({ assignedTo: "bob", priority: "high", labels: ["lbl-1"] });
    expect(plan.nextTask.comments[0]).toMatchObject({ author: AUTOMATION_AUTHOR, text: "CY-1 picked up by Bob Builder" });
    expect(plan.notifications).toEqual([{ recipient: "alice", text: "Login fails → Bob Builder" }]);
    expect(plan.errors).toEqual([]);
  });

  it("sets a relative due date and reports missing recipients", () => {
    const rule = {
      id: "r2",
      name: "Due",
      actions: [
        { type: "set_due_date", config: { offsetDays: 2 } },
        { type: "notify", config: { to: "assignee", message: "hi" } },
      ],
    };
    const plan = planRuleActions(rule, { task: baseTask, now: new Date(2026, 9, 2) });
    expect(plan.nextTask.dueDate).toBe("2026-10-04");
    expect(plan.notifications).toEqual([]);
    expect(plan.errors).toEqual(["Notification has no recipient."]);
  });

  it("skips task actions without a task and creates tasks for sprint rules", () => {
    const rule = {
      id: "r3",
      name: "Retro",
      actions: [
        { type: "set_priority", config: { priority: "low" } },
        { type: "create_task", config: { title: "Retro for {{sprint.name}}", assigneeMode: "actor" } },
      ],
    };
    const plan = planRuleActions(rule, { task: null, actor: "bob", sprintName: "Sprint 4" });
    expect(plan.nextTask).toBeNull();
    expect(plan.tasksToCreate).toEqual([expect.objectContaining({ title: "Retro for Sprint 4", assignedTo: "bob" })]);
    expect(plan.errors).toHaveLength(1);
  });
});

describe("renderTemplate", () => {
  it("leaves unknown tokens untouched", () => {
    expect(renderTemplate("{{task.key}} {{nope}}", { "task.key": "CY-9" })).toBe("CY-9 {{nope}}");
  });
});

describe("findDueDateMatches", () => {
  const now = new Date(2026, 9, 2, 10, 0);
  const index = indexOf(
    { ...baseTask, id: "CY-1", dueDate: "2026-10-03" },
    { ...baseTask, id: "CY-2", dueDate: "2026-09-30" },
    { ...baseTask, id: "CY-3", dueDate: "2026-09-30", status: "done" },
  );

  it("matches tasks due in N days and overdue tasks once", () => {
    expect(daysUntil("2026-10-03", now)).toBe(1);
    const rules = [
      { id: "before", enabled: true, projectId: null, trigger: { type: "due_date", config: { when: "before", days: 1 } } },
      { id: "overdue", enabled: true, projectId: "p1", trigger: { type: "due_date", config: { when: "overdue" } } },
      { id: "off", enabled: false, projectId: null, trigger: { type: "due_date", config: { when: "overdue" } } },
    ];
    const matches = findDueDateMatches({ rules, taskIndex: index, now });
    expect(matches.map((match) => `${match.rule.id}:${match.event.taskId}`)).toEqual(["before:CY-1", "overdue:CY-2"]);

    const fired = rules.map((rule) => ({ ...rule, firedKeys: matches.filter((m) => m.rule.id === rule.id).map((m) => m.dedupeKey) }));
    expect(findDueDateMatches({ rules: fired, taskIndex: index, now })).toEqual([]);
  });
});

describe("validateRule", () => {
  it("lists problems for incomplete rules", () => {
    expect(validateRule({ name: "", trigger: { type: "sprint_started" }, actions: [{ type: "set_priority", config: {} }] }))
      .toEqual(["Give the rule a name.", "Action 1 needs a task trigger."]);
  });

  it("accepts every built-in template", () => {
    AUTOMATION_TEMPLATES.forEach((template) => {
      expect(validateRule(buildRuleFromTemplate(template))).toEqual([]);
    });
  });
});

describe("describeRule", () => {
  it("builds a readable sentence", () => {
    const lookups = makeDescribeLookups({ users: [{ username: "alice", name: "Alice" }] });
    const { summary } = describeRule({
      trigger: { type: "status_changed", config: { to: "done" } },
      conditions: [{ field: "type", operator: "is", value: "bug" }],
      actions: [{ type: "notify", config: { to: "user", user: "alice" } }],
    }, lookups);
    expect(summary).toBe("When status changes to Done, if Type is Bug, then notify Alice");
  });
});
