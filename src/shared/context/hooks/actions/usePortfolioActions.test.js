import { act, renderHook } from "@testing-library/react";
import { usePortfolioActions } from "./usePortfolioActions";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";

function renderActions() {
  const logAuditEvent = jest.fn();
  const { result } = renderHook(() => usePortfolioActions({
    currentUser: "alice",
    setProjectStatusUpdates: useAppStore.getState().setProjectStatusUpdates,
    logAuditEvent,
  }));
  return { actions: result.current, logAuditEvent };
}

describe("usePortfolioActions", () => {
  beforeEach(() => resetAppStore());

  it("posts project status updates newest first and validates health", () => {
    const { actions, logAuditEvent } = renderActions();
    let first;
    act(() => { first = actions.postProjectStatusUpdate({ projectId: "p1", health: "on-track", summary: " All good " }); });
    act(() => { actions.postProjectStatusUpdate({ projectId: "p1", health: "at-risk", summary: "Slipping" }); });
    act(() => { expect(actions.postProjectStatusUpdate({ projectId: "p1", health: "bogus" })).toBeNull(); });
    act(() => { expect(actions.postProjectStatusUpdate({ health: "on-track" })).toBeNull(); });

    const updates = useAppStore.getState().projectStatusUpdates;
    expect(updates.map((update) => update.health)).toEqual(["at-risk", "on-track"]);
    expect(first).toMatchObject({ summary: "All good", createdBy: "alice", projectId: "p1" });
    expect(logAuditEvent).toHaveBeenCalledWith("posted project status update", expect.objectContaining({ projectId: "p1" }));

    act(() => actions.deleteProjectStatusUpdate(first.id));
    expect(useAppStore.getState().projectStatusUpdates).toHaveLength(1);
  });

  it("keeps at most 20 updates per project", () => {
    const { actions } = renderActions();
    act(() => {
      for (let i = 0; i < 25; i += 1) actions.postProjectStatusUpdate({ projectId: "p1", health: "on-track", summary: `#${i}` });
      actions.postProjectStatusUpdate({ projectId: "p2", health: "off-track", summary: "Other" });
    });
    const updates = useAppStore.getState().projectStatusUpdates;
    expect(updates.filter((update) => update.projectId === "p1")).toHaveLength(20);
    expect(updates.find((update) => update.projectId === "p1").summary).toBe("#24");
    expect(updates.filter((update) => update.projectId === "p2")).toHaveLength(1);
  });
});
