import { act } from "@testing-library/react";

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn((db, collection, id) => ({ collection, id }));
const mockResetWorkspaceData = jest.fn();

jest.mock("./firebase", () => ({
  db: { mocked: true },
}));

jest.mock("./adminFunctions", () => ({
  resetWorkspaceData: (...args) => mockResetWorkspaceData(...args),
}));

jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

describe("storage service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    mockResetWorkspaceData.mockResolvedValue({ success: true });
    mockDoc.mockImplementation((db, collection, id) => ({ collection, id }));
  });

  it("merges data from Firestore domain documents", async () => {
    const emptySnap = {
      exists: () => false,
      data: () => ({}),
    };

    mockGetDoc
      .mockResolvedValueOnce(emptySnap)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ projects: [{ id: "proj-1" }], users: [{ id: "user-1" }] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeTasks: [{ id: "task-1" }] }),
      })
      .mockResolvedValue(emptySnap);

    const { loadAllDomains } = await import("./storage");
    const result = await loadAllDomains();

    expect(result).toEqual({
      projects: [{ id: "proj-1" }],
      users: [{ id: "user-1" }],
      activeTasks: [{ id: "task-1" }],
    });
  });

  it("dispatches a UI event when a debounced save fails", async () => {
    jest.useFakeTimers();
    mockSetDoc.mockRejectedValue(new Error("save failed"));
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { saveDomain } = await import("./storage");

    saveDomain("tasks", { activeTasks: [] });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.type).toBe("corechestra:storage-error");
    expect(event.detail.message).toBe("Failed to save tasks data to Firestore.");

    warnSpy.mockRestore();
  });

  it("merges pending domain patches and writes with Firestore merge mode", async () => {
    jest.useFakeTimers();
    const { saveDomain } = await import("./storage");

    saveDomain("config", { sprintDefaults: { duration: 14 } });
    saveDomain("config", { workspaceSettings: { name: "Corechestra" } });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      sprintDefaults: { duration: 14 },
      workspaceSettings: { name: "Corechestra" },
      _updatedAt: expect.any(Number),
    }));
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  it("skips redundant writes when the domain patch matches the last known data", async () => {
    jest.useFakeTimers();
    const { saveDomain } = await import("./storage");

    saveDomain("config", { sprintDefaults: { duration: 14 } });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    mockSetDoc.mockClear();

    saveDomain("config", { sprintDefaults: { duration: 14 } });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("stores personal preferences in a user-scoped document", async () => {
    jest.useFakeTimers();
    const { saveUserPreferences } = await import("./storage");

    saveUserPreferences("uid-1", { darkMode: true, projectsViewMode: "list" });

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      { collection: "userPreferences", id: "uid-1" },
      expect.objectContaining({ darkMode: true, projectsViewMode: "list", _updatedAt: expect.any(Number) }),
      { merge: true }
    );
  });

  it("does not persist shared workspace mutations for viewers", async () => {
    jest.useFakeTimers();
    const { saveDomain, setStorageActor } = await import("./storage");

    setStorageActor("viewer@example.com", "viewer");
    saveDomain("tasks", { activeTasks: [{ id: "blocked" }] });
    jest.advanceTimersByTime(1500);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("merges conflicting collection updates instead of dropping local changes", async () => {
    jest.useFakeTimers();
    const { saveDomain, subscribeToAll } = await import("./storage");

    saveDomain("tasks", {
      activeTasks: [{ id: "task-1", title: "Base task", updatedAt: "2026-04-01T08:00:00.000Z" }],
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    mockSetDoc.mockClear();

    mockOnSnapshot.mockImplementation(() => jest.fn());

    const unsubscribe = subscribeToAll(() => {});
    const taskListener = mockOnSnapshot.mock.calls.find((call) => call[0]?.id === "tasks")?.[1];

    saveDomain("tasks", {
      activeTasks: [
        { id: "task-1", title: "Local task", updatedAt: "2026-04-01T10:00:00.000Z" },
        { id: "task-3", title: "Local addition", updatedAt: "2026-04-01T10:00:00.000Z" },
      ],
    });

    taskListener({
      exists: () => true,
      data: () => ({
        activeTasks: [
          { id: "task-1", title: "Remote task", updatedAt: "2026-04-01T09:00:00.000Z" },
          { id: "task-2", title: "Remote addition", updatedAt: "2026-04-01T09:00:00.000Z" },
        ],
        _updatedAt: Date.now() + 1000,
      }),
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    const mergedTasks = mockSetDoc.mock.calls[0][1].activeTasks;
    expect(mergedTasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "task-1", title: "Local task" }),
      expect.objectContaining({ id: "task-2", title: "Remote addition" }),
      expect.objectContaining({ id: "task-3", title: "Local addition" }),
    ]));

    unsubscribe();
  });

  it("clears all domains and cancels pending writes before reporting success", async () => {
    jest.useFakeTimers();
    const { clearAllDomains, saveDomain } = await import("./storage");

    saveDomain("tasks", { activeTasks: [{ id: "pending-task" }] });
    const cleared = await clearAllDomains();

    jest.advanceTimersByTime(1500);
    expect(cleared).toBe(true);
    expect(mockResetWorkspaceData).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("reports failure when persisted domains cannot be cleared", async () => {
    mockResetWorkspaceData.mockRejectedValue(new Error("delete failed"));
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { clearAllDomains } = await import("./storage");

    const cleared = await clearAllDomains();

    expect(cleared).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "corechestra:storage-error",
    }));
    warnSpy.mockRestore();
  });
});
