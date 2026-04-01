import { act, renderHook } from "@testing-library/react";
import { useAppStateDomains } from "./useAppStateDomains";
import { resetAppStore } from "../../store/useAppStore";

describe("useAppStateDomains", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("dedupes active team members by username and filters inactive users", () => {
    const { result } = renderHook(() => useAppStateDomains());

    act(() => {
      result.current.setUsers([
        { id: "1", username: "taro", name: "Taro Yamada", status: "active", color: "#f00" },
        { id: "2", username: "taro", name: "Taro Yamada", status: "active", color: "#0f0" },
        { id: "3", username: "richard", name: "Richard Roe", status: "active", color: "#00f" },
        { id: "4", username: "inactive", name: "Inactive User", status: "inactive", color: "#999" },
      ]);
    });

    expect(result.current.teamMembers).toEqual([
      { value: "", label: "All Members" },
      { value: "unassigned", label: "Unassigned" },
      { value: "taro", label: "Taro Yamada", color: "#f00" },
      { value: "richard", label: "Richard Roe", color: "#00f" },
    ]);
  });

  it("builds allTasks and index maps using active and scoped backlog tasks", () => {
    const { result } = renderHook(() => useAppStateDomains());

    act(() => {
      result.current.setCurrentProjectId("proj-1");
      result.current.setActiveTasks([
        { id: "active-1", title: "Active Task", status: "todo", storyPoint: 3 },
      ]);
      result.current.setPerProjectBacklog({
        "proj-1": [
          {
            id: 1,
            title: "Backlog",
            tasks: [{ id: "backlog-1", title: "Backlog Task", status: "todo", storyPoint: 2 }],
          },
        ],
      });
    });

    expect(result.current.allTasks.map((task) => task.id)).toEqual(["active-1", "backlog-1"]);
    expect(result.current.idToGlobalIndex).toEqual({
      "active-1": 0,
      "backlog-1": 1,
    });
  });
});
