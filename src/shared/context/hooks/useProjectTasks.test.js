import { act, renderHook } from "@testing-library/react";
import { useProjectTasks } from "./useProjectTasks";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

describe("useProjectTasks", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("returns project-scoped active, backlog, and merged tasks", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [
          { id: "active-1", projectId: "proj-1", title: "A" },
          { id: "active-2", projectId: "proj-2", title: "B" },
        ],
        perProjectBacklog: {
          "proj-1": [{ id: 1, title: "Backlog", tasks: [{ id: "backlog-1", title: "C" }] }],
          "proj-2": [{ id: 2, title: "Backlog", tasks: [{ id: "backlog-2", title: "D" }] }],
        },
      });
    });

    const { result } = renderHook(() => useProjectTasks());

    expect(result.current.projectActiveTasks.map((task) => task.id)).toEqual(["active-1"]);
    expect(result.current.backlogTasks.map((task) => task.id)).toEqual(["backlog-1"]);
    expect(result.current.allProjectTasks.map((task) => task.id)).toEqual(["active-1", "backlog-1"]);
  });

  it("supports overriding the project id", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [{ id: "active-2", projectId: "proj-2", title: "B" }],
        perProjectBacklog: {
          "proj-2": [{ id: 2, title: "Backlog", tasks: [{ id: "backlog-2", title: "D" }] }],
        },
      });
    });

    const { result } = renderHook(() => useProjectTasks("proj-2"));

    expect(result.current.projectId).toBe("proj-2");
    expect(result.current.allProjectTasks.map((task) => task.id)).toEqual(["active-2", "backlog-2"]);
  });

  it("returns empty collections when the selected project has no tasks", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-3",
        activeTasks: [{ id: "active-1", projectId: "proj-1", title: "A" }],
        perProjectBacklog: {},
      });
    });

    const { result } = renderHook(() => useProjectTasks());

    expect(result.current.projectActiveTasks).toEqual([]);
    expect(result.current.backlogSections).toEqual([]);
    expect(result.current.allProjectTasks).toEqual([]);
  });
});
