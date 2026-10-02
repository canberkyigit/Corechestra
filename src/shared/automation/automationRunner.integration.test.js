import { act, renderHook } from "@testing-library/react";
import { useApp } from "../context/hooks/useAppApi";
import { resetAppStore, useAppStore } from "../store/useAppStore";
import { createAutomationRunner } from "./automationRunner";

jest.mock("../services/storage", () => ({
  clearAllDomains: jest.fn(),
}));

const flushMicrotasks = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
});

describe("automation runner with the real facade", () => {
  let runner;

  beforeEach(() => {
    resetAppStore();
    act(() => {
      useAppStore.setState({
        currentProjectId: "p1",
        currentUser: "bob",
        projects: [{ id: "p1", name: "Mobile", workflowRules: { requireReviewBeforeDone: true } }],
        projectColumns: {
          p1: [
            { id: "todo", title: "To Do" },
            { id: "inprogress", title: "In Progress" },
            { id: "review", title: "Review" },
            { id: "done", title: "Done" },
          ],
        },
        activeTasks: [{
          id: "CY-1", title: "Checkout", status: "todo", priority: "medium",
          assignedTo: "unassigned", reporter: "alice", projectId: "p1", comments: [], subtasks: [], watchers: [],
        }],
        dbReady: true,
      });
    });
  });

  afterEach(() => runner?.stop());

  it("assigns the mover and notifies the reporter through the normal task actions", async () => {
    const { result } = renderHook(() => useApp());
    runner = createAutomationRunner({ store: useAppStore, getActions: () => result.current, scheduleIntervalMs: 0 });
    runner.start();

    act(() => {
      result.current.createAutomationRule({
        name: "Start work",
        projectId: "p1",
        trigger: { type: "status_changed", config: { to: "inprogress" } },
        conditions: [{ field: "assignedTo", operator: "is_empty", value: "" }],
        actions: [
          { type: "set_assignee", config: { mode: "actor" } },
          { type: "notify", config: { to: "reporter", message: "{{task.key}} started by {{actor}}" } },
        ],
      });
    });

    act(() => {
      result.current.moveTask("CY-1", { status: "inprogress" });
    });
    await flushMicrotasks();

    const state = useAppStore.getState();
    expect(state.activeTasks[0]).toMatchObject({ status: "inprogress", assignedTo: "bob" });
    expect(state.notifications.find((item) => item.type === "workflow_automation")).toMatchObject({
      recipient: "alice",
      text: "CY-1 started by bob",
    });
    expect(state.activeTasks[0].activityLog.some((entry) => entry.action.includes("Automation \"Start work\""))).toBe(true);
    expect(state.automationLog[0]).toMatchObject({ status: "success", ruleName: "Start work" });
  });

  it("logs workflow rejections but keeps the other changes", async () => {
    const { result } = renderHook(() => useApp());
    runner = createAutomationRunner({ store: useAppStore, getActions: () => result.current, scheduleIntervalMs: 0 });
    runner.start();

    act(() => {
      result.current.createAutomationRule({
        name: "Close bugs",
        projectId: "p1",
        trigger: { type: "status_changed", config: { to: "inprogress" } },
        actions: [
          { type: "set_status", config: { status: "done" } },
          { type: "set_priority", config: { priority: "high" } },
        ],
      });
    });

    act(() => {
      result.current.moveTask("CY-1", { status: "inprogress" });
    });
    await flushMicrotasks();

    const state = useAppStore.getState();
    expect(state.activeTasks[0]).toMatchObject({ status: "inprogress", priority: "high" });
    expect(state.automationLog[0].status).toBe("partial");
    expect(state.automationLog[0].message).toMatch(/Review/);
  });
});
