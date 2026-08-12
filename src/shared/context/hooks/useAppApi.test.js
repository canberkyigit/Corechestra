import { act, renderHook } from "@testing-library/react";
import { useApp } from "./useAppApi";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

const mockClearAllDomains = jest.fn();
const mockCanPerform = jest.fn(() => true);

jest.mock("../../services/storage", () => ({
  clearAllDomains: (...args) => mockClearAllDomains(...args),
}));

jest.mock("./usePermissions", () => ({
  usePermissions: () => ({
    role: "admin",
    canAccessModule: () => true,
    canPerform: (...args) => mockCanPerform(...args),
  }),
}));

describe("useApp", () => {
  beforeEach(() => {
    resetAppStore();
    mockClearAllDomains.mockReset();
    mockClearAllDomains.mockResolvedValue(true);
    mockCanPerform.mockReset();
    mockCanPerform.mockReturnValue(true);
  });

  it("blocks task mutations when the current permission set is read-only", () => {
    mockCanPerform.mockReturnValue(false);
    act(() => {
      useAppStore.setState({
        activeTasks: [{ id: "task-locked", title: "Locked task", status: "todo" }],
        archivedTasks: [],
      });
    });
    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.createTask({ title: "Blocked create" }, "active");
      result.current.updateTask({ id: "task-locked", title: "Blocked edit", status: "done" });
      result.current.deleteTask("task-locked");
    });

    expect(useAppStore.getState().activeTasks).toEqual([
      expect.objectContaining({ id: "task-locked", title: "Locked task", status: "todo" }),
    ]);
    expect(useAppStore.getState().archivedTasks).toEqual([]);
  });

  it("creates a task in the active sprint and records activity + notification", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        currentUser: "alice",
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.createTask({ title: "Ship login", type: "task", priority: "high" }, "active");
    });

    const state = useAppStore.getState();
    expect(state.activeTasks).toHaveLength(1);
    expect(state.activeTasks[0]).toMatchObject({
      title: "Ship login",
      projectId: "proj-1",
      status: "todo",
    });
    expect(state.globalActivityLog[0]).toMatchObject({
      action: "created task",
      user: "alice",
    });
    expect(state.notifications[0]).toMatchObject({
      type: "task_created",
      taskTitle: "Ship login",
    });
  });

  it("creates a task inside a backlog section when the sprint target is backlog", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        perProjectBacklog: {
          "proj-1": [{ id: 42, title: "Backlog", tasks: [] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.createTask({ title: "Backlog task", type: "task" }, "backlog-42");
    });

    expect(useAppStore.getState().perProjectBacklog["proj-1"][0].tasks[0]).toMatchObject({
      title: "Backlog task",
      projectId: "proj-1",
    });
  });

  it("deletes a task by moving it into the archive", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [{ id: "task-1", projectId: "proj-1", title: "Archive me", status: "todo" }],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.deleteTask("task-1");
    });

    const state = useAppStore.getState();
    expect(state.activeTasks).toEqual([]);
    expect(state.archivedTasks[0]).toMatchObject({ id: "task-1", title: "Archive me" });
  });

  it("completes a sprint by moving incomplete tasks to backlog and archiving done tasks", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        currentUser: "alice",
        activeTasks: [
          { id: "done-1", projectId: "proj-1", title: "Done", status: "done", storyPoint: 5 },
          { id: "todo-1", projectId: "proj-1", title: "Todo", status: "todo", storyPoint: 3 },
        ],
        perProjectBacklog: {
          "proj-1": [{ id: 7, title: "Carry over", tasks: [] }],
        },
        perProjectSprint: {
          "proj-1": { id: "s1", name: "Sprint 1", goal: "Ship it", reviewNotes: "Stakeholders approved", startDate: "2026-03-01", endDate: "2026-03-14", status: "active" },
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.completeSprint(7);
    });

    const state = useAppStore.getState();
    expect(state.activeTasks).toEqual([]);
    expect(state.perProjectBacklog["proj-1"][0].tasks.map((task) => task.id)).toEqual(["todo-1"]);
    expect(state.archivedTasks[0]).toMatchObject({ id: "done-1" });
    expect(state.perProjectCompletedSprints["proj-1"]).toHaveLength(1);
    expect(state.perProjectCompletedSprints["proj-1"][0].reviewNotes).toBe("Stakeholders approved");
    expect(state.notifications[0].type).toBe("sprint_completed");
  });

  it("deletes an epic and unsets epicId on active and backlog tasks", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        epics: [{ id: "epic-1", title: "Epic" }],
        activeTasks: [{ id: "task-1", projectId: "proj-1", epicId: "epic-1", title: "A", status: "todo" }],
        perProjectBacklog: {
          "proj-1": [{ id: 1, title: "Backlog", tasks: [{ id: "task-2", epicId: "epic-1", title: "B" }] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.deleteEpic("epic-1");
    });

    const state = useAppStore.getState();
    expect(state.epics).toEqual([]);
    expect(state.activeTasks[0].epicId).toBeNull();
    expect(state.perProjectBacklog["proj-1"][0].tasks[0].epicId).toBeNull();
  });

  it("moves a task from backlog into the active sprint through drag-drop", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [],
        perProjectBacklog: {
          "proj-1": [{ id: 11, title: "Backlog", tasks: [{ id: "task-1", title: "From backlog", priority: "high" }] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "backlog-11", index: 0 },
        destination: { droppableId: "active-sprint", index: 0 },
        draggableId: "task-1",
      });
    });

    const state = useAppStore.getState();
    expect(state.activeTasks[0]).toMatchObject({ id: "task-1", status: "todo", priority: "high" });
    expect(state.perProjectBacklog["proj-1"][0].tasks).toEqual([]);
  });

  it("moves a task from the active sprint back into backlog through drag-drop", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [{ id: "task-1", projectId: "proj-1", title: "Active task", status: "review" }],
        perProjectBacklog: {
          "proj-1": [{ id: 11, title: "Backlog", tasks: [] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "active-sprint", index: 0 },
        destination: { droppableId: "backlog-11", index: 0 },
        draggableId: "task-1",
      });
    });

    const state = useAppStore.getState();
    expect(state.activeTasks).toEqual([]);
    expect(state.perProjectBacklog["proj-1"][0].tasks[0]).toMatchObject({ id: "task-1", status: "todo" });
  });

  it("reorders tasks inside the same backlog section through drag-drop", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        perProjectBacklog: {
          "proj-1": [{
            id: 11,
            title: "Backlog",
            tasks: [
              { id: "task-1", title: "First" },
              { id: "task-2", title: "Second" },
            ],
          }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "backlog-11", index: 0 },
        destination: { droppableId: "backlog-11", index: 1 },
        draggableId: "task-1",
      });
    });

    expect(useAppStore.getState().perProjectBacklog["proj-1"][0].tasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);
  });

  it("deletes doc pages recursively and supports moving a page to a new parent", () => {
    act(() => {
      useAppStore.setState({
        docPages: [
          { id: "root", title: "Root", parentId: null },
          { id: "child", title: "Child", parentId: "root" },
          { id: "leaf", title: "Leaf", parentId: "child" },
        ],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.moveDocPage("leaf", "root");
    });

    expect(useAppStore.getState().docPages.find((page) => page.id === "leaf")).toMatchObject({ parentId: "root" });

    act(() => {
      result.current.deleteDocPage("root");
    });

    expect(useAppStore.getState().docPages).toEqual([]);
  });

  it("adds trimmed doc comments with the current user as author", () => {
    act(() => {
      useAppStore.setState({
        currentUser: "alice",
        docPages: [{ id: "page-1", title: "Doc", comments: [] }],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.addDocComment("page-1", "  hello world  ");
    });

    expect(useAppStore.getState().docPages[0].comments[0]).toMatchObject({
      author: "alice",
      text: "hello world",
    });
  });

  it("moves a task between backlog sections through drag-drop", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        perProjectBacklog: {
          "proj-1": [
            { id: 11, title: "Backlog A", tasks: [{ id: "task-1", title: "Move me" }] },
            { id: 12, title: "Backlog B", tasks: [] },
          ],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "backlog-11", index: 0 },
        destination: { droppableId: "backlog-12", index: 0 },
        draggableId: "task-1",
      });
    });

    const sections = useAppStore.getState().perProjectBacklog["proj-1"];
    expect(sections[0].tasks).toEqual([]);
    expect(sections[1].tasks[0]).toMatchObject({ id: "task-1", title: "Move me" });
  });

  it("reorders active sprint tasks through drag-drop", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [
          { id: "task-1", projectId: "proj-1", title: "First", status: "todo" },
          { id: "task-2", projectId: "proj-1", title: "Second", status: "review" },
        ],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "active-sprint", index: 0 },
        destination: { droppableId: "active-sprint", index: 1 },
        draggableId: "task-1",
      });
    });

    expect(useAppStore.getState().activeTasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);
  });

  it("ignores backlog drag events that do not have a destination", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [{ id: "task-1", projectId: "proj-1", title: "Stable", status: "todo" }],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.handleBacklogDragEnd({
        source: { droppableId: "active-sprint", index: 0 },
        destination: null,
        draggableId: "task-1",
      });
    });

    expect(useAppStore.getState().activeTasks).toEqual([
      { id: "task-1", projectId: "proj-1", title: "Stable", status: "todo" },
    ]);
  });

  it("deletes a doc comment by id", () => {
    act(() => {
      useAppStore.setState({
        docPages: [
          {
            id: "page-1",
            title: "Doc",
            comments: [
              { id: "comment-1", text: "Keep" },
              { id: "comment-2", text: "Remove" },
            ],
          },
        ],
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.deleteDocComment("page-1", "comment-2");
    });

    expect(useAppStore.getState().docPages[0].comments).toEqual([
      { id: "comment-1", text: "Keep" },
    ]);
  });

  it("updates a backlog task without moving it into the active sprint", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [],
        perProjectBacklog: {
          "proj-1": [{ id: 11, title: "Backlog", tasks: [{ id: "task-1", title: "Before", status: "todo" }] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.updateTask({ id: "task-1", title: "After", status: "todo" });
    });

    expect(useAppStore.getState().activeTasks).toEqual([]);
    expect(useAppStore.getState().perProjectBacklog["proj-1"][0].tasks[0].title).toBe("After");
  });

  it("writes a numeric Planning Poker result to active and backlog tasks", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [{ id: "active-1", projectId: "proj-1", title: "Active", storyPoint: 1 }],
        perProjectBacklog: {
          "proj-1": [{ id: 11, title: "Backlog", tasks: [{ id: "backlog-1", title: "Backlog", storyPoint: 2 }] }],
        },
      });
    });

    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.savePokerResult({ taskId: "active-1", estimation: "8" });
      result.current.savePokerResult({ taskId: "backlog-1", estimation: 13 });
    });

    const state = useAppStore.getState();
    expect(state.activeTasks[0].storyPoint).toBe(8);
    expect(state.perProjectBacklog["proj-1"][0].tasks[0].storyPoint).toBe(13);
    expect(state.perProjectPokerHistory["proj-1"]).toHaveLength(2);
  });

  it("clears persisted domains before resetting the store", async () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        currentUser: "alice",
        activeTasks: [{ id: "task-1", title: "A" }],
        notifications: [{ id: 1, text: "Hi" }],
        darkMode: true,
        dbReady: true,
      });
    });

    const { result } = renderHook(() => useApp());

    await act(async () => {
      await result.current.resetAllData();
    });

    const state = useAppStore.getState();
    expect(mockClearAllDomains).toHaveBeenCalledTimes(1);
    expect(state.currentProjectId).toBe("");
    expect(state.currentUser).toBe("");
    expect(state.activeTasks).toEqual([]);
    expect(state.notifications).toEqual([]);
    expect(state.darkMode).toBe(true);
    expect(state.dbReady).toBe(false);
  });

  it("keeps local data when persisted-domain reset fails", async () => {
    mockClearAllDomains.mockResolvedValue(false);
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        currentUser: "alice",
        activeTasks: [{ id: "task-1", title: "Keep me" }],
        dbReady: true,
      });
    });

    const { result } = renderHook(() => useApp());
    let didReset;
    await act(async () => {
      didReset = await result.current.resetAllData();
    });

    expect(didReset).toBe(false);
    expect(useAppStore.getState().activeTasks).toEqual([{ id: "task-1", title: "Keep me" }]);
    expect(useAppStore.getState().currentProjectId).toBe("proj-1");
    expect(useAppStore.getState().dbReady).toBe(true);
  });
});
