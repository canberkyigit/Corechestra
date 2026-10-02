import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStoreSync } from "./useAppStoreSync";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

jest.mock("../../services/storage", () => ({
  loadAllDomains: jest.fn(),
  loadPersonalPrefs: jest.fn(),
  getLegacyPersonalPrefs: jest.fn(),
  markPersonalPrefsHydrated: jest.fn(),
  saveDomain: jest.fn(),
  savePersonalPrefs: jest.fn(),
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
    storage.loadPersonalPrefs.mockResolvedValue(null);
    storage.getLegacyPersonalPrefs.mockReturnValue({});
  });

  it("keeps writes disabled and reports an error when the initial load fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    storage.loadAllDomains.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useAppStoreSync("uid-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(useAppStore.getState().dbReady).toBe(false);
    expect(storage.saveDomain).not.toHaveBeenCalled();
    expect(storage.savePersonalPrefs).not.toHaveBeenCalled();

    storage.loadAllDomains.mockResolvedValue({ projects: [{ id: "proj-1" }] });
    await act(async () => { await result.current.retryLoad(); });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(result.current.loadError).toBe(false);
    warnSpy.mockRestore();
  });

  it("hydrates the user's own prefs over legacy shared values and saves them per user", async () => {
    storage.loadAllDomains.mockResolvedValue({ projects: [{ id: "proj-1" }, { id: "proj-2" }] });
    storage.getLegacyPersonalPrefs.mockReturnValue({ currentProjectId: "proj-1" });
    storage.loadPersonalPrefs.mockResolvedValue({ currentProjectId: "proj-2", darkMode: true });

    renderHook(() => useAppStoreSync("uid-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(storage.loadPersonalPrefs).toHaveBeenCalledWith("uid-1");
    expect(useAppStore.getState().currentProjectId).toBe("proj-2");
    expect(useAppStore.getState().darkMode).toBe(true);
    expect(storage.markPersonalPrefsHydrated).toHaveBeenCalledWith("uid-1", { currentProjectId: "proj-2", darkMode: true });

    act(() => { useAppStore.getState().setSidebarCollapsed(true); });

    await waitFor(() => {
      expect(storage.savePersonalPrefs).toHaveBeenLastCalledWith("uid-1", expect.objectContaining({
        currentProjectId: "proj-2",
        sidebarCollapsed: true,
      }));
    });
    expect(storage.saveDomain).not.toHaveBeenCalledWith("config", expect.objectContaining({ sidebarCollapsed: true }));
  });

  it("seeds a missing prefs doc from the legacy shared config", async () => {
    storage.getLegacyPersonalPrefs.mockReturnValue({ currentProjectId: "proj-7" });

    renderHook(() => useAppStoreSync("uid-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(useAppStore.getState().dbReady).toBe(true));
    expect(useAppStore.getState().currentProjectId).toBe("proj-7");
    // Empty "known" state → the first save creates the doc with every field.
    expect(storage.markPersonalPrefsHydrated).toHaveBeenCalledWith("uid-1", {});
  });

  it("hydrates remote data into the store and marks dbReady", async () => {
    storage.getLegacyPersonalPrefs.mockReturnValue({ currentProjectId: "proj-1" });
    storage.loadAllDomains.mockResolvedValue({
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
    storage.getLegacyPersonalPrefs.mockReturnValue({ currentProjectId: "proj-1" });
    storage.loadAllDomains.mockResolvedValue({
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
    storage.getLegacyPersonalPrefs.mockReturnValue({ currentProjectId: "proj-1" });
    storage.loadAllDomains.mockResolvedValue({
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
});
