import { act, renderHook } from "@testing-library/react";
import { useApp } from "../useAppApi";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";
import { validateWorkflowTransition, stripTransientTaskFields } from "./useBoardActions";

jest.mock("../../../services/storage", () => ({
  clearAllDomains: jest.fn().mockResolvedValue(true),
}));

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

function seed(state) {
  act(() => {
    useAppStore.setState({
      currentProjectId: "proj-1",
      currentUser: "alice",
      projects: [{ id: "proj-1", name: "Core", workflowRules: { captureBlockReason: true } }],
      projectColumns: { "proj-1": COLUMNS },
      ...state,
    });
  });
  return renderHook(() => useApp()).result;
}

describe("validateWorkflowTransition", () => {
  it("allows any move by default except blocking without a reason", () => {
    expect(validateWorkflowTransition({ fromStatus: "todo", toStatus: "done", rules: {}, columns: COLUMNS }).ok).toBe(true);
    expect(validateWorkflowTransition({ fromStatus: "todo", toStatus: "blocked", rules: {}, columns: COLUMNS }))
      .toMatchObject({ ok: false, code: "block_reason_required" });
    expect(validateWorkflowTransition({ fromStatus: "todo", toStatus: "blocked", rules: {}, columns: COLUMNS, blockReason: "API down" }).ok).toBe(true);
  });

  it("enforces review-before-done and backward-move rules", () => {
    const rules = { requireReviewBeforeDone: true, allowBackwardMoves: false, captureBlockReason: false };
    expect(validateWorkflowTransition({ fromStatus: "inprogress", toStatus: "done", rules, columns: COLUMNS }))
      .toMatchObject({ ok: false, code: "review_required" });
    expect(validateWorkflowTransition({ fromStatus: "review", toStatus: "done", rules, columns: COLUMNS }).ok).toBe(true);
    expect(validateWorkflowTransition({ fromStatus: "review", toStatus: "todo", rules, columns: COLUMNS }))
      .toMatchObject({ ok: false, code: "backward_move" });
    // Unblocking is never treated as a backward move.
    expect(validateWorkflowTransition({ fromStatus: "blocked", toStatus: "inprogress", rules, columns: COLUMNS }).ok).toBe(true);
  });

  it("skips the review rule when the workflow has no review column", () => {
    const columns = COLUMNS.filter((column) => column.id !== "review");
    expect(validateWorkflowTransition({ fromStatus: "todo", toStatus: "done", rules: { requireReviewBeforeDone: true }, columns }).ok).toBe(true);
  });
});

describe("board actions", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("restores archived tasks to their backlog section and keeps their status", () => {
    const result = seed({
      activeTasks: [{ id: "s1", projectId: "proj-1", title: "Sprint task", status: "inprogress" }],
      perProjectBacklog: {
        "proj-1": [{ id: "sec-1", title: "Backlog", tasks: [{ id: "b1", projectId: "proj-1", title: "Backlog task", status: "review" }] }],
      },
    });

    act(() => {
      expect(result.current.deleteTask("b1")).toBe(true);
      expect(result.current.deleteTask("s1")).toBe(true);
    });
    expect(useAppStore.getState().archivedTasks.find((task) => task.id === "b1").archivedFrom)
      .toEqual({ kind: "backlog", projectId: "proj-1", sectionId: "sec-1" });

    let destinations;
    act(() => {
      destinations = [result.current.restoreTask("b1"), result.current.restoreTask("s1")];
    });

    expect(destinations).toEqual(["backlog", "sprint"]);
    const state = useAppStore.getState();
    expect(state.perProjectBacklog["proj-1"][0].tasks.map((task) => task.id)).toEqual(["b1"]);
    expect(state.perProjectBacklog["proj-1"][0].tasks[0]).not.toHaveProperty("archivedFrom");
    expect(state.activeTasks.find((task) => task.id === "s1").status).toBe("inprogress");
    expect(state.archivedTasks).toHaveLength(0);
  });

  it("soft-deletes projects into the archive and restores them", () => {
    const result = seed({
      projects: [{ id: "proj-1", name: "Core" }, { id: "proj-2", name: "Apollo" }],
      activeTasks: [{ id: "t1", projectId: "proj-2", title: "Kept", status: "todo" }],
    });

    act(() => { result.current.deleteProject("proj-2"); });
    let state = useAppStore.getState();
    expect(state.projects.map((project) => project.id)).toEqual(["proj-1"]);
    expect(state.archivedProjects[0]).toMatchObject({ id: "proj-2", name: "Apollo", archivedAt: expect.any(String) });
    expect(state.activeTasks.map((task) => task.id)).toEqual(["t1"]);

    act(() => { expect(result.current.restoreProject("proj-2")).toBe(true); });
    state = useAppStore.getState();
    expect(state.projects.map((project) => project.id)).toEqual(["proj-1", "proj-2"]);
    expect(state.projects[1]).not.toHaveProperty("archivedAt");
    expect(state.archivedProjects).toHaveLength(0);
  });

  it("moveTask reorders via anchors, records activity and notifies the assignee (not the actor)", () => {
    const result = seed({
      activeTasks: [
        { id: "a", projectId: "proj-1", title: "A", status: "todo", assignedTo: "bob" },
        { id: "x", projectId: "proj-2", title: "Other project", status: "inprogress" },
        { id: "b", projectId: "proj-1", title: "B", status: "inprogress" },
        { id: "c", projectId: "proj-1", title: "C", status: "inprogress" },
      ],
    });

    let outcome;
    act(() => {
      outcome = result.current.moveTask("a", { status: "inprogress", beforeTaskId: "c" });
    });

    expect(outcome.ok).toBe(true);
    const state = useAppStore.getState();
    expect(state.activeTasks.map((task) => task.id)).toEqual(["x", "b", "a", "c"]);
    const moved = state.activeTasks.find((task) => task.id === "a");
    expect(moved.status).toBe("inprogress");
    expect(moved.statusChangedAt).toEqual(expect.any(String));
    expect(moved.activityLog[0]).toMatchObject({ action: "moved to In Progress", user: "alice" });
    expect(state.notifications[0]).toMatchObject({ type: "status_change", recipient: "bob", actor: "alice" });
  });

  it("moveTask enforces workflow rules and requires a blocker reason", () => {
    const result = seed({
      projects: [{ id: "proj-1", workflowRules: { requireReviewBeforeDone: true, captureBlockReason: true } }],
      activeTasks: [{ id: "a", projectId: "proj-1", title: "A", status: "inprogress" }],
    });

    let rejected;
    act(() => { rejected = result.current.moveTask("a", { status: "done" }); });
    expect(rejected).toMatchObject({ ok: false, code: "review_required" });
    expect(useAppStore.getState().activeTasks[0].status).toBe("inprogress");

    act(() => { rejected = result.current.moveTask("a", { status: "blocked" }); });
    expect(rejected).toMatchObject({ ok: false, code: "block_reason_required" });

    act(() => { result.current.moveTask("a", { status: "blocked", blockReason: "  Waiting on API  " }); });
    expect(useAppStore.getState().activeTasks[0]).toMatchObject({ status: "blocked", blockReason: "Waiting on API" });
    // notifyOnBlocked defaults on → broadcast when nobody is assigned.
    expect(useAppStore.getState().notifications[0]).toMatchObject({ type: "status_blocked", actor: "alice" });
    expect(useAppStore.getState().notifications[0].recipient).toBeUndefined();

    act(() => { result.current.moveTask("a", { status: "review" }); });
    const unblocked = useAppStore.getState().activeTasks[0];
    expect(unblocked.status).toBe("review");
    expect(unblocked.blockReason).toBeUndefined();
  });

  it("moveTask applies a swimlane patch and logs the reassignment", () => {
    const result = seed({
      activeTasks: [{ id: "a", projectId: "proj-1", title: "A", status: "todo", assignedTo: "alice" }],
    });

    act(() => { result.current.moveTask("a", { status: "todo", patch: { assignedTo: "carol" } }); });

    const task = useAppStore.getState().activeTasks[0];
    expect(task.assignedTo).toBe("carol");
    expect(task.activityLog[0].action).toBe("assigned to carol");
    expect(useAppStore.getState().notifications[0]).toMatchObject({ type: "assignment", recipient: "carol" });
  });

  it("updateTask rejects invalid transitions, strips transient fields and stamps statusChangedAt", () => {
    const result = seed({
      projects: [{ id: "proj-1", workflowRules: { allowBackwardMoves: false, captureBlockReason: false } }],
      activeTasks: [{ id: "a", projectId: "proj-1", title: "A", status: "review" }],
    });

    let outcome;
    act(() => { outcome = result.current.updateTask({ id: "a", projectId: "proj-1", title: "A", status: "todo" }); });
    expect(outcome).toMatchObject({ ok: false, code: "backward_move" });
    expect(useAppStore.getState().activeTasks[0].status).toBe("review");

    act(() => {
      outcome = result.current.updateTask({ id: "a", projectId: "proj-1", title: "A2", status: "done", index: 3, _source: "active" });
    });
    expect(outcome.ok).toBe(true);
    const saved = useAppStore.getState().activeTasks[0];
    expect(saved).toMatchObject({ title: "A2", status: "done" });
    expect(saved).not.toHaveProperty("index");
    expect(saved).not.toHaveProperty("_source");
    expect(saved.statusChangedAt).toEqual(expect.any(String));
  });

  it("createTask keeps the requested status, records the reporter and avoids id collisions", () => {
    const result = seed({ activeTasks: [], perProjectBacklog: { "proj-1": [] } });

    let created;
    act(() => {
      created = result.current.createTask({ title: "Inline", status: "review", assignedTo: "bob" }, "active");
    });

    expect(created).toMatchObject({ status: "review", reporter: "alice", projectId: "proj-1" });
    expect(created.id).toMatch(/^CY-\d+$/);
    expect(useAppStore.getState().notifications.some((notification) => notification.type === "assignment" && notification.recipient === "bob")).toBe(true);
  });

  it("createTask falls back to the first backlog section when the target section is missing", () => {
    const result = seed({ perProjectBacklog: { "proj-1": [{ id: 5, title: "Backlog", tasks: [] }] } });

    act(() => { result.current.createTask({ title: "Lost?" }, "backlog-999"); });

    expect(useAppStore.getState().perProjectBacklog["proj-1"][0].tasks[0].title).toBe("Lost?");
    expect(useAppStore.getState().activeTasks).toEqual([]);
  });

  it("completeSprint never drops unfinished tasks when no backlog section exists", () => {
    const result = seed({
      activeTasks: [{ id: "todo-1", projectId: "proj-1", title: "Todo", status: "todo" }],
      perProjectBacklog: { "proj-1": [] },
      perProjectSprint: { "proj-1": { id: "s1", name: "Sprint 1", status: "active" } },
    });

    act(() => { result.current.completeSprint(null); });

    const sections = useAppStore.getState().perProjectBacklog["proj-1"];
    expect(sections).toHaveLength(1);
    expect(sections[0].tasks.map((task) => task.id)).toEqual(["todo-1"]);
  });

  it("deleteBacklogSection archives the section's tasks instead of dropping them", () => {
    const result = seed({
      perProjectBacklog: { "proj-1": [{ id: 9, title: "Old", tasks: [{ id: "t1", title: "Keep me" }] }] },
    });

    act(() => { result.current.deleteBacklogSection(9); });

    expect(useAppStore.getState().perProjectBacklog["proj-1"]).toEqual([]);
    expect(useAppStore.getState().archivedTasks[0]).toMatchObject({ id: "t1", archivedAt: expect.any(String) });
  });

  it("handleBacklogDragEnd inserts at a project-relative index and stamps projectId", () => {
    const result = seed({
      activeTasks: [
        { id: "other", projectId: "proj-2", title: "Other", status: "todo" },
        { id: "p1", projectId: "proj-1", title: "P1", status: "todo" },
        { id: "p2", projectId: "proj-1", title: "P2", status: "todo" },
      ],
      perProjectBacklog: { "proj-1": [{ id: 11, title: "Backlog", tasks: [{ id: "new", title: "From backlog" }] }] },
    });

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "backlog-11", index: 0 },
        destination: { droppableId: "active-sprint", index: 1 },
        draggableId: "new",
      });
    });

    const ids = useAppStore.getState().activeTasks.map((task) => task.id);
    expect(ids).toEqual(["other", "p1", "new", "p2"]);
    expect(useAppStore.getState().activeTasks[2]).toMatchObject({ projectId: "proj-1", status: "todo" });
  });

  it("emptyArchive(projectId) only removes that project's archived tasks in one write", () => {
    const result = seed({
      archivedTasks: [
        { id: "a", projectId: "proj-1" },
        { id: "b" },
        { id: "c", projectId: "proj-2" },
      ],
      archivedProjects: [{ id: "old" }],
    });

    let removed;
    act(() => { removed = result.current.emptyArchive("proj-1"); });

    expect(removed).toBe(2);
    expect(useAppStore.getState().archivedTasks.map((task) => task.id)).toEqual(["c"]);
    expect(useAppStore.getState().archivedProjects).toHaveLength(1);
    expect(useAppStore.getState().notifications.filter((notification) => notification.type === "archive_emptied")).toHaveLength(1);
  });

  it("stores createdAt and author on sprint notes", () => {
    const result = seed({ perProjectNotes: { "proj-1": [] } });

    act(() => { result.current.addNote("## Decision"); });

    expect(useAppStore.getState().perProjectNotes["proj-1"][0]).toMatchObject({
      content: "## Decision",
      author: "alice",
      createdAt: expect.any(String),
    });
  });

  it("updateSprint does not create a partial sprint when none exists", () => {
    const result = seed({ perProjectSprint: {} });

    act(() => { result.current.updateSprint({ goal: "Orphan" }); });

    expect(useAppStore.getState().perProjectSprint["proj-1"]).toBeFalsy();
  });

  it("updateProject merges partial patches so earlier saves are preserved", () => {
    const result = seed({
      projects: [{ id: "proj-1", name: "Core", key: "CY", description: "Old", workflowRules: { allowBackwardMoves: true } }],
    });

    act(() => { result.current.updateProject({ id: "proj-1", description: "New" }); });
    act(() => { result.current.updateProject({ id: "proj-1", workflowRules: { allowBackwardMoves: false } }); });

    expect(useAppStore.getState().projects[0]).toMatchObject({
      name: "Core",
      key: "CY",
      description: "New",
      workflowRules: { allowBackwardMoves: false },
    });
  });

  it("strips transient UI fields", () => {
    expect(stripTransientTaskFields({ id: "a", index: 2, _source: "backlog" })).toEqual({ id: "a" });
  });
});
