import { useAppStore, resetAppStore } from "../store/useAppStore";
import { createAutomationRunner, runAsRemote } from "./automationRunner";

function makeTask(overrides = {}) {
  return {
    id: "CY-1",
    title: "Checkout bug",
    type: "bug",
    status: "todo",
    priority: "medium",
    assignedTo: "unassigned",
    reporter: "alice",
    watchers: [],
    labels: [],
    comments: [],
    subtasks: [],
    projectId: "p1",
    ...overrides,
  };
}

function rule(overrides = {}) {
  return {
    id: "r1",
    name: "Rule",
    enabled: true,
    projectId: "p1",
    trigger: { type: "status_changed", config: { to: "done" } },
    conditions: [],
    actions: [{ id: "a1", type: "notify", config: { to: "reporter", message: "{{task.key}} done" } }],
    firedKeys: [],
    ...overrides,
  };
}

function setup({ rules = [], tasks = [makeTask()], now = () => new Date(2026, 9, 2, 9) } = {}) {
  const queue = [];
  const actions = {
    updateTask: jest.fn((task) => {
      useAppStore.getState().setActiveTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
      return { ok: true, task };
    }),
    addNotification: jest.fn(),
    createTask: jest.fn(),
  };
  const store = useAppStore.getState();
  store.setCurrentProjectId("p1");
  store.setCurrentUser("bob");
  store.setActiveTasks(tasks);
  store.setAutomationRules(rules);
  store.setDbReady(true);

  const runner = createAutomationRunner({
    store: useAppStore,
    getActions: () => actions,
    schedule: (callback) => queue.push(callback),
    now,
    scheduleIntervalMs: 0,
  });
  runner.start();

  const flush = () => {
    let guard = 0;
    while (queue.length > 0 && guard < 50) {
      queue.shift()();
      guard += 1;
    }
  };
  const move = (status) => {
    useAppStore.getState().setActiveTasks((prev) => prev.map((task) => (task.id === "CY-1" ? { ...task, status } : task)));
  };
  return { runner, actions, flush, move };
}

describe("automationRunner", () => {
  afterEach(() => {
    resetAppStore();
  });

  it("runs matching rules for local changes and logs the run", () => {
    const { runner, actions, flush, move } = setup({ rules: [rule()] });
    move("done");
    flush();

    expect(actions.addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "workflow_automation",
      recipient: "alice",
      text: "CY-1 done",
      actor: "bob",
      taskId: "CY-1",
    }));
    const [entry] = useAppStore.getState().automationLog;
    expect(entry).toMatchObject({ ruleId: "r1", status: "success", trigger: "status_changed", taskId: "CY-1" });
    expect(useAppStore.getState().automationRules[0]).toMatchObject({ runCount: 1, lastStatus: "success" });
    runner.stop();
  });

  it("ignores remote updates, disabled rules and other projects", () => {
    const { runner, actions, flush, move } = setup({
      rules: [rule({ id: "off", enabled: false }), rule({ id: "other", projectId: "p2" })],
    });
    move("done");
    flush();
    expect(actions.addNotification).not.toHaveBeenCalled();

    const live = setup;
    runner.stop();
    resetAppStore();
    const second = live({ rules: [rule()] });
    runAsRemote(() => second.move("done"));
    second.flush();
    expect(second.actions.addNotification).not.toHaveBeenCalled();
    second.runner.stop();
  });

  it("applies task changes through updateTask and evaluates conditions", () => {
    const { runner, actions, flush, move } = setup({
      rules: [rule({
        trigger: { type: "status_changed", config: { to: "inprogress" } },
        conditions: [{ id: "c1", field: "assignedTo", operator: "is_empty", value: "" }],
        actions: [{ id: "a1", type: "set_assignee", config: { mode: "actor" } }],
      })],
    });
    move("inprogress");
    flush();
    expect(actions.updateTask).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activeTasks[0].assignedTo).toBe("bob");

    // Already assigned now: the condition no longer matches.
    move("todo");
    move("inprogress");
    flush();
    expect(actions.updateTask).toHaveBeenCalledTimes(1);
    runner.stop();
  });

  it("stops rule loops", () => {
    const { runner, actions, flush, move } = setup({
      rules: [
        rule({
          id: "ping",
          trigger: { type: "status_changed", config: { to: "inprogress" } },
          actions: [{ id: "a1", type: "set_status", config: { status: "review" } }],
        }),
        rule({
          id: "pong",
          trigger: { type: "status_changed", config: { to: "review" } },
          actions: [{ id: "a2", type: "set_status", config: { status: "inprogress" } }],
        }),
      ],
    });
    move("inprogress");
    flush();
    // ping → pong → (ping again is blocked: it already ran for this task in the chain)
    expect(actions.updateTask).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().activeTasks[0].status).toBe("inprogress");
    runner.stop();
  });

  it("creates tasks for sprint rules", () => {
    const { runner, actions, flush } = setup({
      rules: [rule({
        trigger: { type: "sprint_completed", config: {} },
        actions: [{ id: "a1", type: "create_task", config: { title: "Retro {{sprint.name}}", assigneeMode: "unassigned" } }],
      })],
    });
    useAppStore.getState().setPerProjectSprint({ p1: { name: "Sprint 7", status: "active" } });
    useAppStore.getState().setPerProjectSprint({ p1: { name: "Sprint 7", status: "completed" } });
    flush();
    expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Retro Sprint 7" }), "active");
    runner.stop();
  });

  it("runs due-date rules once per task", () => {
    const { runner, actions } = setup({
      tasks: [makeTask({ dueDate: "2026-10-03", assignedTo: "carol" })],
      rules: [rule({
        trigger: { type: "due_date", config: { when: "before", days: 1 } },
        actions: [{ id: "a1", type: "notify", config: { to: "assignee", message: "due" } }],
      })],
    });
    expect(runner.runScheduledCheck()).toHaveLength(1);
    expect(runner.runScheduledCheck()).toHaveLength(0);
    expect(actions.addNotification).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().automationRules[0].firedKeys).toHaveLength(1);
    runner.stop();
  });

  it("runs a rule on demand", () => {
    const { runner, actions } = setup({
      rules: [],
    });
    const entry = runner.runRuleNow(rule({
      actions: [{ id: "a1", type: "set_priority", config: { priority: "critical" } }],
    }), "CY-1");
    expect(entry.status).toBe("success");
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ priority: "critical" }), expect.stringContaining("Automation"));
    runner.stop();
  });
});
