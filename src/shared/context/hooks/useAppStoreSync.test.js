import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { buildDefaultUserPrefs, useAppStoreSync } from "./useAppStoreSync";
import { resetAppStore, useAppStore } from "../../store/useAppStore";
import { isApplyingRemoteUpdate } from "../../automation/automationRunner";

jest.mock("../../services/storage", () => ({
  flushPendingWrites: jest.fn(),
  loadAllDomains: jest.fn(),
  saveDomain: jest.fn(),
  setStorageActor: jest.fn(),
  subscribeToAll: jest.fn(),
}));

jest.mock("../../services/userPrefsStorage", () => ({
  USER_PREFS_FIELDS: [
    "currentUser", "currentProjectId", "darkMode", "sidebarCollapsed", "projectsViewMode",
    "perProjectBoardFilters", "savedViews", "recentItems", "favoriteItems", "pinnedItems",
    "notificationPreferences",
  ],
  loadUserPrefs: jest.fn(),
  getUserPrefsSnapshot: jest.fn(),
  saveUserPrefs: jest.fn(),
  flushUserPrefs: jest.fn(() => Promise.resolve(false)),
  subscribeToUserPrefs: jest.fn(),
  endUserPrefsSession: jest.fn(),
}));

const storage = jest.requireMock("../../services/storage");
const userPrefs = jest.requireMock("../../services/userPrefsStorage");

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
    userPrefs.subscribeToUserPrefs.mockReturnValue(() => {});
    userPrefs.loadUserPrefs.mockResolvedValue({ prefs: {}, migrated: false });
    userPrefs.getUserPrefsSnapshot.mockReturnValue({});
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

  it("hydrates and persists goals and project status updates in the strategy domain", async () => {
    storage.loadAllDomains.mockResolvedValue({
      goals: [{ id: "goal-1", title: "Loaded goal" }],
      projectStatusUpdates: [{ id: "psu-1", projectId: "proj-1", health: "on-track" }],
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().goals).toEqual([{ id: "goal-1", title: "Loaded goal" }]);
    storage.saveDomain.mockClear();

    act(() => {
      useAppStore.getState().setGoals((previous) => [...previous, { id: "goal-2", title: "New goal" }]);
    });

    await waitFor(() => {
      expect(storage.saveDomain).toHaveBeenCalledWith("strategy", {
        goals: [{ id: "goal-1", title: "Loaded goal" }, { id: "goal-2", title: "New goal" }],
        projectStatusUpdates: [{ id: "psu-1", projectId: "proj-1", health: "on-track" }],
      });
    });
  });

  it("hydrates and persists custom field definitions in the entities domain", async () => {
    storage.loadAllDomains.mockResolvedValue({
      customFieldDefs: [{ id: "cf-1", projectId: "proj-1", name: "Severity", type: "select" }],
    });

    renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().customFieldDefs).toHaveLength(1);
    storage.saveDomain.mockClear();

    act(() => {
      useAppStore.getState().setCustomFieldDefs((previous) => [...previous, { id: "cf-2", projectId: "proj-1", name: "Customer", type: "text" }]);
    });

    await waitFor(() => {
      expect(storage.saveDomain).toHaveBeenCalledWith("entities", {
        customFieldDefs: [
          { id: "cf-1", projectId: "proj-1", name: "Severity", type: "select" },
          { id: "cf-2", projectId: "proj-1", name: "Customer", type: "text" },
        ],
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

  describe("personal prefs (userPrefs/{uid})", () => {
    function configPayloads() {
      return storage.saveDomain.mock.calls.filter(([domain]) => domain === "config").map(([, data]) => data);
    }

    it("waits for the uid and the user's prefs before marking dbReady", async () => {
      let resolvePrefs;
      userPrefs.loadUserPrefs.mockReturnValue(new Promise((resolve) => { resolvePrefs = resolve; }));
      userPrefs.getUserPrefsSnapshot.mockReturnValue({ currentProjectId: "proj-2", darkMode: true, favoriteItems: [{ id: "doc:1" }] });

      renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });

      await waitFor(() => expect(storage.loadAllDomains).toHaveBeenCalled());
      expect(userPrefs.loadUserPrefs).toHaveBeenCalledWith("uid-a");
      expect(userPrefs.subscribeToUserPrefs).toHaveBeenCalledWith("uid-a", expect.any(Function));
      await act(async () => { await Promise.resolve(); });
      expect(useAppStore.getState().dbReady).toBe(false);

      await act(async () => resolvePrefs({ prefs: {}, migrated: false }));

      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
      expect(useAppStore.getState()).toMatchObject({
        currentProjectId: "proj-2",
        darkMode: true,
        favoriteItems: [{ id: "doc:1" }],
      });
      expect(userPrefs.getUserPrefsSnapshot).toHaveBeenCalledWith("uid-a");
    });

    it("persists personal fields to userPrefs and keeps them out of the config domain", async () => {
      renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
      storage.saveDomain.mockClear();
      userPrefs.saveUserPrefs.mockClear();

      act(() => {
        useAppStore.getState().setDarkMode(true);
        useAppStore.getState().setCurrentProjectId("proj-3");
        useAppStore.getState().setPerProjectBoardFilters({ "proj-3": { type: "bug" } });
        useAppStore.getState().setSprintDefaults((previous) => ({ ...previous, duration: 7 }));
      });

      await waitFor(() => {
        expect(userPrefs.saveUserPrefs).toHaveBeenCalledWith("uid-a", expect.objectContaining({ darkMode: true }));
      });
      expect(userPrefs.saveUserPrefs).toHaveBeenCalledWith("uid-a", expect.objectContaining({ currentProjectId: "proj-3" }));
      expect(userPrefs.saveUserPrefs).toHaveBeenCalledWith("uid-a", expect.objectContaining({
        perProjectBoardFilters: { "proj-3": { type: "bug" } },
      }));

      const personal = Object.keys(buildDefaultUserPrefs());
      expect(configPayloads().length).toBeGreaterThan(0);
      expect(configPayloads()).toContainEqual({ sprintDefaults: expect.objectContaining({ duration: 7 }) });
      configPayloads().forEach((payload) => {
        personal.forEach((field) => expect(payload).not.toHaveProperty(field));
      });
    });

    it("does not persist personal fields without a uid", async () => {
      renderHook(() => useAppStoreSync(), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
      act(() => useAppStore.getState().setDarkMode(true));
      await act(async () => { await Promise.resolve(); });

      expect(userPrefs.loadUserPrefs).not.toHaveBeenCalled();
      expect(userPrefs.saveUserPrefs).not.toHaveBeenCalled();
    });

    it("keeps the store's values as the base for a freshly migrated doc", async () => {
      // Pre-domain legacy formats return personal fields with the workspace data.
      storage.loadAllDomains.mockResolvedValue({ sidebarCollapsed: true, currentProjectId: "proj-old" });
      userPrefs.loadUserPrefs.mockResolvedValue({ prefs: { currentProjectId: "proj-1" }, migrated: true });
      userPrefs.getUserPrefsSnapshot.mockReturnValue({ currentProjectId: "proj-1" });

      renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));

      expect(useAppStore.getState()).toMatchObject({ sidebarCollapsed: true, currentProjectId: "proj-1" });
    });

    it("applies remote changes to the user's own doc only after hydration", async () => {
      let onPrefsUpdate;
      userPrefs.subscribeToUserPrefs.mockImplementation((uid, callback) => {
        onPrefsUpdate = callback;
        return () => {};
      });
      renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));

      const seenRemote = [];
      const unsubscribe = useAppStore.subscribe(() => seenRemote.push(isApplyingRemoteUpdate()));
      act(() => onPrefsUpdate("sidebarCollapsed", true));
      unsubscribe();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      // Automations must not fire on another tab's pref changes.
      expect(seenRemote).toEqual([true]);
    });

    it("resets personal fields on user switch so the next user never sees them", async () => {
      userPrefs.getUserPrefsSnapshot.mockImplementation((uid) => (uid === "uid-a"
        ? { darkMode: true, currentProjectId: "proj-a", favoriteItems: [{ id: "a-fav" }] }
        : { currentProjectId: "proj-b" }));

      const { rerender } = renderHook(({ uid }) => useAppStoreSync(uid), {
        wrapper: createWrapper(),
        initialProps: { uid: "uid-a" },
      });
      await waitFor(() => expect(useAppStore.getState().currentProjectId).toBe("proj-a"));
      userPrefs.saveUserPrefs.mockClear();

      rerender({ uid: "uid-b" });

      expect(userPrefs.endUserPrefsSession).toHaveBeenCalledWith("uid-a");
      await waitFor(() => expect(useAppStore.getState().currentProjectId).toBe("proj-b"));
      expect(useAppStore.getState().darkMode).toBe(false);
      expect(useAppStore.getState().favoriteItems).toEqual([]);
      expect(userPrefs.loadUserPrefs).toHaveBeenLastCalledWith("uid-b");
      // Nothing of uid-a's state is ever saved into uid-b's doc.
      userPrefs.saveUserPrefs.mock.calls.forEach(([uid, data]) => {
        if (uid !== "uid-b") return;
        expect(data).not.toMatchObject({ darkMode: true });
        expect(data).not.toMatchObject({ currentProjectId: "proj-a" });
      });
      expect(userPrefs.saveUserPrefs.mock.calls.every(([uid]) => uid === "uid-b")).toBe(true);
    });

    it("resets personal fields and dbReady on logout (unmount)", async () => {
      userPrefs.getUserPrefsSnapshot.mockReturnValue({ darkMode: true, pinnedItems: [{ id: "pin-1" }] });
      const { unmount } = renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().pinnedItems).toEqual([{ id: "pin-1" }]));

      unmount();

      expect(userPrefs.endUserPrefsSession).toHaveBeenCalledWith("uid-a");
      expect(useAppStore.getState()).toMatchObject({ ...buildDefaultUserPrefs(), dbReady: false });
    });

    it("flushes pending prefs when the page is hidden or unloaded", async () => {
      renderHook(() => useAppStoreSync("uid-a"), { wrapper: createWrapper() });
      await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
      userPrefs.flushUserPrefs.mockClear();

      window.dispatchEvent(new Event("beforeunload"));
      const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      visibility.mockRestore();

      expect(userPrefs.flushUserPrefs).toHaveBeenCalledTimes(2);
    });
  });
});
