import { act, renderHook } from "@testing-library/react";
import { useAutomationActions } from "./useAutomationActions";
import { resetAppStore, useAppStore } from "../../../store/useAppStore";

function renderActions() {
  const logAuditEvent = jest.fn();
  const { result } = renderHook(() => useAutomationActions({
    currentUser: "alice",
    setAutomationRules: useAppStore.getState().setAutomationRules,
    setAutomationLog: useAppStore.getState().setAutomationLog,
    logAuditEvent,
  }));
  return { actions: result.current, logAuditEvent };
}

describe("useAutomationActions", () => {
  beforeEach(() => resetAppStore());

  it("creates, updates, toggles, duplicates and deletes rules", () => {
    const { actions, logAuditEvent } = renderActions();
    let rule;
    act(() => {
      rule = actions.createAutomationRule({
        name: "  Notify  ",
        projectId: "p1",
        trigger: { type: "status_changed", config: { to: "done" } },
        actions: [{ type: "notify", config: { to: "reporter" } }],
      });
    });
    expect(rule).toMatchObject({ name: "Notify", projectId: "p1", enabled: true, createdBy: "alice", runCount: 0 });
    expect(rule.actions[0].id).toMatch(/^act-/);
    expect(logAuditEvent).toHaveBeenCalledWith("created automation rule", expect.objectContaining({ ruleId: rule.id }));

    act(() => {
      useAppStore.getState().setAutomationRules((prev) => prev.map((item) => ({ ...item, firedKeys: ["k1"] })));
      actions.updateAutomationRule(rule.id, { trigger: { type: "due_date", config: { when: "overdue" } } });
    });
    expect(useAppStore.getState().automationRules[0]).toMatchObject({ trigger: { type: "due_date" }, firedKeys: [] });

    act(() => actions.toggleAutomationRule(rule.id));
    expect(useAppStore.getState().automationRules[0].enabled).toBe(false);

    act(() => { actions.duplicateAutomationRule(rule.id); });
    const rules = useAppStore.getState().automationRules;
    expect(rules).toHaveLength(2);
    expect(rules[1]).toMatchObject({ name: "Notify (copy)", enabled: false, runCount: 0 });
    expect(rules[1].id).not.toBe(rule.id);

    act(() => actions.deleteAutomationRule(rule.id));
    expect(useAppStore.getState().automationRules.map((item) => item.name)).toEqual(["Notify (copy)"]);
  });

  it("clears the log for one project or entirely", () => {
    const { actions } = renderActions();
    act(() => useAppStore.getState().setAutomationLog([{ id: "1", projectId: "p1" }, { id: "2", projectId: "p2" }]));
    act(() => actions.clearAutomationLog("p1"));
    expect(useAppStore.getState().automationLog).toEqual([{ id: "2", projectId: "p2" }]);
    act(() => actions.clearAutomationLog());
    expect(useAppStore.getState().automationLog).toEqual([]);
  });
});
