import { act, renderHook } from "@testing-library/react";
import { addDays, format } from "date-fns";
import { useSprintMetrics } from "./useSprintMetrics";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

describe("useSprintMetrics", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("computes sprint completion and story point metrics", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        activeTasks: [
          { id: "t1", projectId: "proj-1", status: "done", storyPoint: 5 },
          { id: "t2", projectId: "proj-1", status: "todo", storyPoint: 3 },
        ],
        perProjectSprint: {
          "proj-1": { id: "s1", name: "Sprint 1", endDate: format(addDays(new Date(), 3), "yyyy-MM-dd") },
        },
      });
    });

    const { result } = renderHook(() => useSprintMetrics());

    expect(result.current.doneTasks).toBe(1);
    expect(result.current.totalStoryPoints).toBe(8);
    expect(result.current.completedStoryPoints).toBe(5);
    expect(result.current.sprintPct).toBe(50);
  });

  it("exposes completed sprint history for the current project", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        perProjectCompletedSprints: {
          "proj-1": [{ id: "cs-1", name: "Sprint 1" }],
        },
      });
    });

    const { result } = renderHook(() => useSprintMetrics());

    expect(result.current.completedSprints).toEqual([{ id: "cs-1", name: "Sprint 1" }]);
  });

  it("clamps sprintDaysLeft to zero for past end dates", () => {
    act(() => {
      useAppStore.setState({
        currentProjectId: "proj-1",
        perProjectSprint: {
          "proj-1": { id: "s1", name: "Sprint 1", endDate: "2000-01-01" },
        },
      });
    });

    const { result } = renderHook(() => useSprintMetrics());

    expect(result.current.sprintDaysLeft).toBe(0);
  });
});
