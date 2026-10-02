import { act, renderHook } from "@testing-library/react";
import { useApp } from "../useAppApi";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";

jest.mock("../../../services/storage", () => ({
  clearAllDomains: jest.fn().mockResolvedValue(true),
}));

function seed(state = {}) {
  act(() => {
    useAppStore.setState({
      currentProjectId: "p1",
      currentUser: "alice",
      projects: [{ id: "p1", name: "Core" }],
      users: [{ id: "u1", username: "alice", name: "Alice Admin", status: "active" }],
      ...state,
    });
  });
  return renderHook(() => useApp()).result;
}

describe("custom field definition actions", () => {
  beforeEach(() => resetAppStore());

  it("creates, updates, archives, restores and audits definitions", () => {
    const result = seed();
    let def;
    act(() => {
      def = result.current.createCustomFieldDef({
        name: "  Severity ",
        type: "select",
        options: [{ label: "High" }, { label: "Low" }],
        required: true,
      });
    });
    expect(def).toMatchObject({ name: "Severity", type: "select", projectId: "p1", order: 0, archived: false, createdBy: "alice" });
    expect(def.id).toMatch(/^cf-/);
    expect(def.options.map((option) => option.label)).toEqual(["High", "Low"]);
    expect(useAppStore.getState().customFieldDefs).toHaveLength(1);
    expect(useAppStore.getState().globalActivityLog[0]).toMatchObject({ action: "custom_field_created", entityType: "custom_field" });

    act(() => { result.current.updateCustomFieldDef(def.id, { name: "Impact", type: "text", showOnCard: true }); });
    // The type is fixed after creation.
    expect(useAppStore.getState().customFieldDefs[0]).toMatchObject({ name: "Impact", type: "select", showOnCard: true });

    act(() => { result.current.archiveCustomFieldDef(def.id); });
    expect(useAppStore.getState().customFieldDefs[0].archived).toBe(true);
    expect(result.current.customFieldDefs[0].archived).toBe(true);
    act(() => { result.current.restoreCustomFieldDef(def.id); });
    expect(useAppStore.getState().customFieldDefs[0].archived).toBe(false);
    expect(useAppStore.getState().globalActivityLog.map((entry) => entry.action).slice(0, 3))
      .toEqual(["custom_field_restored", "custom_field_archived", "custom_field_updated"]);
  });

  it("reorders and moves fields within a project only", () => {
    const result = seed({
      customFieldDefs: [
        { id: "a", projectId: "p1", name: "A", type: "text", order: 0 },
        { id: "b", projectId: "p1", name: "B", type: "text", order: 1 },
        { id: "c", projectId: "p1", name: "C", type: "text", order: 2 },
        { id: "x", projectId: "p2", name: "X", type: "text", order: 0 },
      ],
    });
    act(() => { result.current.reorderCustomFieldDefs("p1", ["c", "a", "b"]); });
    const order = () => Object.fromEntries(useAppStore.getState().customFieldDefs.map((def) => [def.id, def.order]));
    expect(order()).toEqual({ a: 1, b: 2, c: 0, x: 0 });
    act(() => { result.current.moveCustomFieldDef("b", -1); });
    expect(order()).toEqual({ a: 2, b: 1, c: 0, x: 0 });
    act(() => { result.current.moveCustomFieldDef("c", -1); }); // already first
    expect(order()).toEqual({ a: 2, b: 1, c: 0, x: 0 });
  });

  it("hard delete removes the definition and its values from every task", () => {
    const result = seed({
      customFieldDefs: [
        { id: "cf-1", projectId: "p1", name: "Customer", type: "text", order: 0 },
        { id: "cf-2", projectId: "p1", name: "Budget", type: "number", order: 1 },
      ],
      activeTasks: [{ id: "t1", projectId: "p1", title: "A", customFields: { "cf-1": "Acme", "cf-2": 3 } }],
      perProjectBacklog: { p1: [{ id: 1, title: "Backlog", tasks: [{ id: "t2", projectId: "p1", title: "B", customFields: { "cf-1": "Beta" } }] }] },
      archivedTasks: [{ id: "t3", projectId: "p1", title: "C", customFields: { "cf-1": "Gone" } }],
    });
    let affected;
    act(() => { affected = result.current.deleteCustomFieldDef("cf-1"); });
    expect(affected).toBe(3);
    const state = useAppStore.getState();
    expect(state.customFieldDefs.map((def) => def.id)).toEqual(["cf-2"]);
    expect(state.activeTasks[0].customFields).toEqual({ "cf-2": 3 });
    expect(state.perProjectBacklog.p1[0].tasks[0].customFields).toBeUndefined();
    expect(state.archivedTasks[0].customFields).toBeUndefined();
    expect(state.globalActivityLog[0]).toMatchObject({ action: "custom_field_deleted", severity: "warning" });
    expect(result.current.deleteCustomFieldDef("missing")).toBe(-1);
  });
});

describe("custom field values through updateTask", () => {
  beforeEach(() => resetAppStore());

  it("stores only set values and logs each change with the field name", () => {
    const result = seed({
      customFieldDefs: [
        { id: "cf-sev", projectId: "p1", name: "Severity", type: "select", order: 0, options: [{ id: "hi", label: "High", color: "#f00" }] },
        { id: "cf-cu", projectId: "p1", name: "Customer", type: "text", order: 1 },
      ],
      activeTasks: [{ id: "t1", projectId: "p1", title: "Crash", status: "todo", customFields: { "cf-cu": "Acme" } }],
    });

    let outcome;
    act(() => {
      outcome = result.current.updateTask({
        ...useAppStore.getState().activeTasks[0],
        customFields: { "cf-sev": "hi", "cf-cu": "" },
      });
    });
    expect(outcome.ok).toBe(true);
    const task = useAppStore.getState().activeTasks[0];
    expect(task.customFields).toEqual({ "cf-sev": "hi" });
    expect(task.activityLog.map((entry) => entry.action)).toEqual(['set "Severity" to High', 'cleared "Customer"']);
    expect(task.activityLog[0].details).toMatchObject({ customFieldId: "cf-sev", fieldName: "Severity", from: null, to: "hi" });

    act(() => {
      result.current.updateTask({ ...useAppStore.getState().activeTasks[0], customFields: {} });
    });
    expect(useAppStore.getState().activeTasks[0].customFields).toBeUndefined();
  });

  it("drops empty values on create", () => {
    const result = seed();
    let created;
    act(() => { created = result.current.createTask({ title: "New", customFields: { a: "", b: "x" } }, "active"); });
    expect(created.customFields).toEqual({ b: "x" });
  });
});
