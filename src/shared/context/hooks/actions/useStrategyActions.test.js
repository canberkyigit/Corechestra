import { act, renderHook } from "@testing-library/react";
import { useStrategyActions } from "./useStrategyActions";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";

function renderActions() {
  const logAuditEvent = jest.fn();
  const { result } = renderHook(() => useStrategyActions({
    currentUser: "alice",
    setGoals: useAppStore.getState().setGoals,
    setProjectStatusUpdates: useAppStore.getState().setProjectStatusUpdates,
    logAuditEvent,
  }));
  return { actions: result.current, logAuditEvent };
}

describe("useStrategyActions", () => {
  beforeEach(() => resetAppStore());

  it("creates, updates and deletes goals, re-parenting children", () => {
    const { actions, logAuditEvent } = renderActions();
    let parent;
    let child;
    act(() => {
      parent = actions.createGoal({ title: "Company", level: "company", period: "2026-Q4", keyResults: [{ title: "Users", type: "metric", target: 10 }] });
    });
    act(() => {
      child = actions.createGoal({ title: "Team", level: "team", teamId: "t1", parentId: parent.id, period: "2026-Q4" });
    });
    expect(parent).toMatchObject({ title: "Company", createdBy: "alice", checkIns: [] });
    expect(parent.keyResults[0].id).toMatch(/^kr-/);
    expect(logAuditEvent).toHaveBeenCalledWith("created goal", expect.objectContaining({ goalId: parent.id }));

    act(() => actions.updateGoal(child.id, { title: "Team v2", parentId: child.id }));
    expect(useAppStore.getState().goals[1]).toMatchObject({ title: "Team v2", parentId: null });

    act(() => actions.updateGoal(child.id, { parentId: parent.id }));
    act(() => actions.deleteGoal(parent.id));
    expect(useAppStore.getState().goals).toHaveLength(1);
    expect(useAppStore.getState().goals[0]).toMatchObject({ id: child.id, parentId: null });
  });

  it("updates key results and records check-ins newest first", () => {
    const { actions } = renderActions();
    let goal;
    act(() => {
      goal = actions.createGoal({ title: "G", period: "2026-Q4", keyResults: [{ title: "Users", type: "metric", start: 0, target: 10, current: 1 }] });
    });
    act(() => actions.updateKeyResult(goal.id, goal.keyResults[0].id, { current: "7" }));
    expect(useAppStore.getState().goals[0].keyResults[0]).toMatchObject({ current: 7, id: goal.keyResults[0].id });

    act(() => { actions.addGoalCheckIn(goal.id, { health: "at-risk", note: "Slipping", progress: 70 }); });
    act(() => { actions.addGoalCheckIn(goal.id, { note: "Recovered" }); });
    const stored = useAppStore.getState().goals[0];
    expect(stored.health).toBe("at-risk");
    expect(stored.checkIns.map((checkIn) => checkIn.note)).toEqual(["Recovered", "Slipping"]);
    expect(stored.checkIns[1]).toMatchObject({ by: "alice", health: "at-risk", progress: 70 });
  });

  it("imports and removes sample goals", () => {
    const { actions } = renderActions();
    act(() => { actions.createGoal({ title: "Real", period: "2026-Q4", parentId: "goal-sample-1" }); });
    act(() => actions.importGoals([{ id: "goal-sample-1", title: "Sample", sample: true }, { id: "goal-sample-1", title: "Dup", sample: true }]));
    expect(useAppStore.getState().goals).toHaveLength(2);
    act(() => actions.removeSampleGoals());
    expect(useAppStore.getState().goals).toHaveLength(1);
    expect(useAppStore.getState().goals[0]).toMatchObject({ title: "Real", parentId: null });
  });

  it("posts project status updates newest first and validates health", () => {
    const { actions } = renderActions();
    let first;
    act(() => { first = actions.postProjectStatusUpdate({ projectId: "p1", health: "on-track", summary: " All good " }); });
    act(() => { actions.postProjectStatusUpdate({ projectId: "p1", health: "at-risk", summary: "Slipping" }); });
    act(() => { expect(actions.postProjectStatusUpdate({ projectId: "p1", health: "bogus" })).toBeNull(); });
    const updates = useAppStore.getState().projectStatusUpdates;
    expect(updates.map((update) => update.health)).toEqual(["at-risk", "on-track"]);
    expect(first).toMatchObject({ summary: "All good", createdBy: "alice" });
    act(() => actions.deleteProjectStatusUpdate(first.id));
    expect(useAppStore.getState().projectStatusUpdates).toHaveLength(1);
  });
});
