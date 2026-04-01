import { act, renderHook } from "@testing-library/react";
import { useBoardState } from "./useBoardState";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

describe("useBoardState", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("builds project members from explicit members and task assignees", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        projects: [{ id: "proj-1", memberUsernames: ["alice"] }],
        users: [
          { id: "u1", username: "alice", name: "Alice", status: "active", color: "#f00" },
          { id: "u2", username: "bob", name: "Bob", status: "active", color: "#0f0" },
          { id: "u3", username: "charlie", name: "Charlie", status: "inactive", color: "#00f" },
        ],
        activeTasks: [{ id: "t1", projectId: "proj-1", assignedTo: "bob", title: "Task", status: "todo" }],
      });
    });

    const { result } = renderHook(() => useBoardState({}));

    expect(result.current.projectMembers).toEqual([
      { value: "", label: "All Members" },
      { value: "unassigned", label: "Unassigned" },
      { value: "alice", label: "Alice", color: "#f00" },
      { value: "bob", label: "Bob", color: "#0f0" },
    ]);
  });

  it("filters tasks by type, member, and search query", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [
          { id: "t1", projectId: "proj-1", title: "Fix login", description: "bug in auth", type: "bug", assignedTo: "alice", status: "todo" },
          { id: "t2", projectId: "proj-1", title: "Build docs", description: "feature docs", type: "feature", assignedTo: "bob", status: "todo" },
        ],
      });
    });

    const { result } = renderHook(() => useBoardState({
      filterValue: "bug",
      memberValue: "alice",
      search: "login",
    }));

    expect(result.current.filteredTasks.map((task) => task.id)).toEqual(["t1"]);
  });

  it("returns sprint metrics alongside filtered board data", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [
          { id: "t1", projectId: "proj-1", title: "Done task", status: "done", storyPoint: 3 },
          { id: "t2", projectId: "proj-1", title: "Open task", status: "todo", storyPoint: 2 },
        ],
        perProjectSprint: {
          "proj-1": { id: "s1", name: "Sprint 1", endDate: "2099-12-31" },
        },
      });
    });

    const { result } = renderHook(() => useBoardState({}));

    expect(result.current.doneTasks).toBe(1);
    expect(result.current.sprintPct).toBe(50);
    expect(result.current.sprint).toEqual({ id: "s1", name: "Sprint 1", endDate: "2099-12-31" });
  });
});
