import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStoreSync } from "./useAppStoreSync";
import { resetAppStore, useAppStore } from "../../store/useAppStore";
import { isApplyingRemoteUpdate } from "../../automation/automationRunner";

jest.mock("../../services/storage", () => ({
  flushPendingWrites: jest.fn(),
  loadAllDomains: jest.fn(),
  saveDomain: jest.fn(),
  setStorageActor: jest.fn(),
  subscribeToAll: jest.fn(),
}));

const storage = jest.requireMock("../../services/storage");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAppStoreSync", () => {
  beforeEach(() => {
    resetAppStore();
    jest.clearAllMocks();
    storage.subscribeToAll.mockReturnValue(() => {});
    storage.loadAllDomains.mockResolvedValue(null);
  });

  it("hydrates remote data into the store and marks dbReady", async () => {
    storage.loadAllDomains.mockResolvedValue({
      currentProjectId: "proj-1",
      projects: [{ id: "proj-1", name: "Corechestra" }],
      activeTasks: [{ id: "task-1", title: "Loaded task", projectId: "proj-1" }],
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().projects).toEqual([{ id: "proj-1", name: "Corechestra" }]);
    expect(useAppStore.getState().activeTasks[0]).toMatchObject({ id: "task-1" });
  });

  it("applies remote subscription updates into the store", async () => {
    let onUpdate;
    storage.subscribeToAll.mockImplementation((callback) => {
      onUpdate = callback;
      return () => {};
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));

    act(() => {
      onUpdate("notifications", [{ id: 1, text: "Remote notification" }]);
    });

    await waitFor(() => {
      expect(useAppStore.getState().notifications).toEqual([{ id: 1, text: "Remote notification" }]);
    });
  });

  it("creates burndown snapshots from only the current project's tasks", async () => {
    storage.loadAllDomains.mockResolvedValue({
      currentProjectId: "proj-1",
      activeTasks: [
        { id: "p1-open", projectId: "proj-1", status: "todo", storyPoint: 5 },
        { id: "p1-done", projectId: "proj-1", status: "done", storyPoint: 3 },
        { id: "p2-open", projectId: "proj-2", status: "todo", storyPoint: 13 },
      ],
      perProjectBurndownSnapshots: {},
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(useAppStore.getState().perProjectBurndownSnapshots["proj-1"]).toHaveLength(1);
    });

    expect(useAppStore.getState().perProjectBurndownSnapshots["proj-1"][0]).toMatchObject({
      total: 8,
      remaining: 5,
    });
  });

  it("queues changed sprint capacities for the persisted sprints domain", async () => {
    storage.loadAllDomains.mockResolvedValue({
      currentProjectId: "proj-1",
      perProjectSprint: {
        "proj-1": { id: "sprint-1", teamCapacities: { "u-1": 80 } },
      },
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    storage.saveDomain.mockClear();

    act(() => {
      useAppStore.getState().setPerProjectSprint((previous) => ({
        ...previous,
        "proj-1": {
          ...previous["proj-1"],
          teamCapacities: { "u-1": 50 },
        },
      }));
    });

    await waitFor(() => {
      expect(storage.saveDomain).toHaveBeenCalledWith("sprints", {
        perProjectSprint: {
          "proj-1": { id: "sprint-1", teamCapacities: { "u-1": 50 } },
        },
      });
    });
  });

  it("hydrates and persists shared test steps in the testing domain", async () => {
    storage.loadAllDomains.mockResolvedValue({
      currentProjectId: "proj-1",
      testSharedSteps: [{ id: "tss-1", name: "Login as admin", steps: [{ id: "s1", action: "Open" }] }],
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().testSharedSteps).toEqual([{ id: "tss-1", name: "Login as admin", steps: [{ id: "s1", action: "Open" }] }]);
    storage.saveDomain.mockClear();

    act(() => {
      useAppStore.getState().setTestSharedSteps((previous) => [...previous, { id: "tss-2", name: "Reset data", steps: [] }]);
    });

    await waitFor(() => {
      expect(storage.saveDomain).toHaveBeenCalledWith("testing", {
        testSharedSteps: [
          { id: "tss-1", name: "Login as admin", steps: [{ id: "s1", action: "Open" }] },
          { id: "tss-2", name: "Reset data", steps: [] },
        ],
      });
    });
  });

  it("applies remote testSharedSteps updates", async () => {
    let onUpdate;
    storage.subscribeToAll.mockImplementation((callback) => {
      onUpdate = callback;
      return () => {};
    });
    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });
    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    act(() => onUpdate("testSharedSteps", [{ id: "tss-9", name: "Remote" }]));
    await waitFor(() => expect(useAppStore.getState().testSharedSteps).toEqual([{ id: "tss-9", name: "Remote" }]));
  });

  it("hydrates and persists automation rules in the automation domain", async () => {
    storage.loadAllDomains.mockResolvedValue({
      automationRules: [{ id: "auto-1", name: "Loaded rule" }],
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().automationRules).toEqual([{ id: "auto-1", name: "Loaded rule" }]);
    storage.saveDomain.mockClear();

    act(() => {
      useAppStore.getState().setAutomationRules((previous) => [...previous, { id: "auto-2", name: "New rule" }]);
    });

    await waitFor(() => {
      expect(storage.saveDomain).toHaveBeenCalledWith("automation", {
        automationRules: [{ id: "auto-1", name: "Loaded rule" }, { id: "auto-2", name: "New rule" }],
      });
    });
  });

  it("marks remote subscription updates so automations ignore them", async () => {
    let onUpdate;
    const seenRemote = [];
    storage.subscribeToAll.mockImplementation((callback) => {
      onUpdate = callback;
      return () => {};
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });
    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));

    const unsubscribe = useAppStore.subscribe(() => seenRemote.push(isApplyingRemoteUpdate()));
    act(() => {
      onUpdate("activeTasks", [{ id: "remote-1", title: "Remote" }]);
    });
    unsubscribe();

    expect(seenRemote).toContain(true);
    expect(isApplyingRemoteUpdate()).toBe(false);
  });
  describe("flushing pending writes", () => {
    let visibilityState;

    beforeEach(() => {
      visibilityState = "visible";
      jest.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("flushes on beforeunload and when the page becomes hidden", async () => {
      renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));

      window.dispatchEvent(new Event("beforeunload"));
      expect(storage.flushPendingWrites).toHaveBeenCalledTimes(1);

      document.dispatchEvent(new Event("visibilitychange"));
      expect(storage.flushPendingWrites).toHaveBeenCalledTimes(1);

      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      expect(storage.flushPendingWrites).toHaveBeenCalledTimes(2);
    });

    it("removes the listeners on unmount", async () => {
      const { unmount } = renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
      unmount();

      visibilityState = "hidden";
      window.dispatchEvent(new Event("beforeunload"));
      document.dispatchEvent(new Event("visibilitychange"));
      expect(storage.flushPendingWrites).not.toHaveBeenCalled();
    });
  });
});
