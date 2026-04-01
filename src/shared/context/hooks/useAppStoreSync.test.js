import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStoreSync } from "./useAppStoreSync";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

jest.mock("../../services/storage", () => ({
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
});
