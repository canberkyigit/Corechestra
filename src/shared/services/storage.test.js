import { act } from "@testing-library/react";

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn((db, collection, id) => ({ collection, id }));

jest.mock("./firebase", () => ({
  db: { mocked: true },
}));

jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

async function flushAsync() {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

describe("storage service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
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

  it("maps testSharedSteps to the testing domain and loads it from the testing document", async () => {
    mockGetDoc.mockImplementation(async (ref) => (ref.id === "testing"
      ? { exists: () => true, data: () => ({ testSuites: [{ id: "ts-1" }], testSharedSteps: [{ id: "tss-1", name: "Login" }] }) }
      : { exists: () => false, data: () => ({}) }));

    const { DOMAIN_FIELDS, loadAllDomains } = await import("./storage");
    expect(DOMAIN_FIELDS.testing).toEqual(["testPlans", "testSuites", "testCases", "testRuns", "testSharedSteps"]);
    const result = await loadAllDomains();
    expect(result).toEqual({ testSuites: [{ id: "ts-1" }], testSharedSteps: [{ id: "tss-1", name: "Login" }] });
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

  it("merges pending domain patches and replaces only the changed fields", async () => {
    jest.useFakeTimers();
    const { saveDomain } = await import("./storage");

    saveDomain("config", { sprintDefaults: { duration: 10 } });
    saveDomain("config", { workspaceSettings: { displayName: "Acme" } });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      sprintDefaults: { duration: 10 },
      workspaceSettings: { displayName: "Acme" },
      _updatedAt: expect.any(Number),
    }));
    expect(mockSetDoc.mock.calls[0][2]).toEqual({
      mergeFields: ["sprintDefaults", "workspaceSettings", "_updatedAt", "_updatedBy", "_version", "_lastMutationId"],
    });
  });

  it("skips redundant writes when the domain patch matches the last known data", async () => {
    jest.useFakeTimers();
    const { saveDomain } = await import("./storage");

    saveDomain("config", { sprintDefaults: { duration: 10 } });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    mockSetDoc.mockClear();

    saveDomain("config", { sprintDefaults: { duration: 10 } });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

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
    mockDeleteDoc.mockResolvedValue();
    const { clearAllDomains, saveDomain } = await import("./storage");

    saveDomain("tasks", { activeTasks: [{ id: "pending-task" }] });
    const cleared = await clearAllDomains();

    jest.advanceTimersByTime(1500);
    expect(cleared).toBe(true);
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("reports failure when persisted domains cannot be cleared", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete failed"));
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
  describe("map key deletions", () => {
    it("writes a map field without the removed key and replaces it as a whole", async () => {
      jest.useFakeTimers();
      const { saveDomain } = await import("./storage");

      saveDomain("sprints", {
        perProjectSprint: { "proj-1": { id: "s-1" }, "proj-2": { id: "s-2" } },
        projectColumns: { "proj-1": [{ id: "todo" }] },
      });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      mockSetDoc.mockClear();

      saveDomain("sprints", {
        perProjectSprint: { "proj-1": { id: "s-1" } },
        projectColumns: { "proj-1": [{ id: "todo" }] },
      });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, payload, options] = mockSetDoc.mock.calls[0];
      expect(payload.perProjectSprint).toEqual({ "proj-1": { id: "s-1" } });
      // Unchanged fields stay out of the payload and the field mask.
      expect(payload).not.toHaveProperty("projectColumns");
      expect(options).toEqual({
        mergeFields: ["perProjectSprint", "_updatedAt", "_updatedBy", "_version", "_lastMutationId"],
      });
      expect(options).not.toHaveProperty("merge");
    });

    it("keeps a local key deletion when a remote edit to another key is merged in", async () => {
      jest.useFakeTimers();
      mockOnSnapshot.mockImplementation(() => jest.fn());
      const { saveDomain, subscribeToAll } = await import("./storage");

      saveDomain("workspace", {
        perProjectNotes: { "proj-1": [{ id: "n-1", text: "Base" }], "proj-2": [{ id: "n-2", text: "Remove me" }] },
      });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      mockSetDoc.mockClear();

      const unsubscribe = subscribeToAll(() => {});
      const listener = mockOnSnapshot.mock.calls.find((call) => call[0]?.id === "workspace")?.[1];

      // Local: drop proj-2. Remote (meanwhile): edit proj-1 only.
      saveDomain("workspace", { perProjectNotes: { "proj-1": [{ id: "n-1", text: "Base" }] } });
      listener({
        exists: () => true,
        data: () => ({
          perProjectNotes: { "proj-1": [{ id: "n-1", text: "Remote edit" }], "proj-2": [{ id: "n-2", text: "Remove me" }] },
          _updatedAt: Date.now() + 1000,
        }),
      });

      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, payload, options] = mockSetDoc.mock.calls[0];
      expect(payload.perProjectNotes).toEqual({ "proj-1": [{ id: "n-1", text: "Remote edit" }] });
      expect(options.mergeFields).toContain("perProjectNotes");
      unsubscribe();
    });
  });

  describe("flushPendingWrites", () => {
    it("writes pending domains immediately and cancels their debounce timers", async () => {
      jest.useFakeTimers();
      const { flushPendingWrites, saveDomain } = await import("./storage");

      saveDomain("tasks", { activeTasks: [{ id: "task-1" }] });
      saveDomain("config", { workspaceSettings: true });
      expect(mockSetDoc).not.toHaveBeenCalled();

      flushPendingWrites();
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc.mock.calls.map((call) => call[0].id).sort()).toEqual(["config", "tasks"]);

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no write is pending", async () => {
      const { flushPendingWrites } = await import("./storage");
      await flushPendingWrites();
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe("in-flight writes", () => {
    it("does not report a conflict for edits queued while its own write was in flight", async () => {
      jest.useFakeTimers();
      let resolveFirst;
      mockSetDoc
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValue();
      const dispatchSpy = jest.spyOn(window, "dispatchEvent");
      const { saveDomain } = await import("./storage");

      saveDomain("config", { templateRegistry: ["a", "b"] });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      saveDomain("config", { templateRegistry: ["a"] });
      await act(async () => {
        resolveFirst();
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc.mock.calls[1][1].templateRegistry).toEqual(["a"]);
      expect(dispatchSpy.mock.calls.some(([event]) => event.type === "corechestra:storage-conflict")).toBe(false);
    });
  });

  describe("failed writes", () => {
    it("retries a failed write with the same data", async () => {
      jest.useFakeTimers();
      jest.spyOn(console, "warn").mockImplementation(() => {});
      mockSetDoc.mockRejectedValueOnce(new Error("offline")).mockResolvedValue();
      const { saveDomain } = await import("./storage");

      saveDomain("tasks", { activeTasks: [{ id: "task-1" }] });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc.mock.calls[1][1].activeTasks).toEqual([{ id: "task-1" }]);

      // Succeeded: nothing else is retried.
      await act(async () => {
        jest.advanceTimersByTime(30000);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    });

    it("keeps newer data queued while the failed write was in flight", async () => {
      jest.useFakeTimers();
      jest.spyOn(console, "warn").mockImplementation(() => {});
      let rejectFirst;
      mockSetDoc
        .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectFirst = reject; }))
        .mockResolvedValue();
      const { flushPendingWrites, saveDomain } = await import("./storage");

      saveDomain("config", { sprintDefaults: "alice", workspaceSettings: true });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Queued during the in-flight write: a newer workspaceSettings and a new field.
      saveDomain("config", { workspaceSettings: false, sensitiveActionPolicy: true });

      await act(async () => {
        rejectFirst(new Error("offline"));
        await flushAsync();
      });

      flushPendingWrites();
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      const [, payload, options] = mockSetDoc.mock.calls[1];
      expect(payload).toEqual(expect.objectContaining({
        sprintDefaults: "alice",
        workspaceSettings: false,
        sensitiveActionPolicy: true,
      }));
      expect(options.mergeFields).toEqual(expect.arrayContaining(["sprintDefaults", "workspaceSettings", "sensitiveActionPolicy"]));
    });

    it("stops retrying after the last backoff step but keeps the data pending", async () => {
      jest.useFakeTimers();
      jest.spyOn(console, "warn").mockImplementation(() => {});
      mockSetDoc.mockRejectedValue(new Error("offline"));
      const { flushPendingWrites, saveDomain } = await import("./storage");

      saveDomain("docs", { spaces: [{ id: "space-1" }] });
      await act(async () => {
        jest.advanceTimersByTime(1500);
        await flushAsync();
      });
      for (const delay of [2000, 5000, 15000]) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          jest.advanceTimersByTime(delay);
          await flushAsync();
        });
      }
      expect(mockSetDoc).toHaveBeenCalledTimes(4);

      await act(async () => {
        jest.advanceTimersByTime(60000);
        await flushAsync();
      });
      expect(mockSetDoc).toHaveBeenCalledTimes(4);

      mockSetDoc.mockResolvedValue();
      flushPendingWrites();
      expect(mockSetDoc).toHaveBeenCalledTimes(5);
      expect(mockSetDoc.mock.calls[4][1].spaces).toEqual([{ id: "space-1" }]);
    });
  });

  it("keeps only workspace-wide settings in the shared config domain", async () => {
    jest.useFakeTimers();
    mockGetDoc.mockImplementation(async (ref) => (ref.id === "config"
      ? {
        exists: () => true,
        data: () => ({ sprintDefaults: { duration: 14 }, darkMode: true, currentProjectId: "proj-legacy", favoriteItems: [{ id: "f1" }] }),
      }
      : { exists: () => false, data: () => ({}) }));
    const { DOMAIN_FIELDS, loadAllDomains, saveDomain } = await import("./storage");

    expect(DOMAIN_FIELDS.config).toEqual(["sprintDefaults", "templateRegistry", "permissionMatrix", "workspaceSettings", "sensitiveActionPolicy"]);
    // Legacy personal copies in appData/config are no longer hydrated from it…
    await expect(loadAllDomains()).resolves.toEqual({ sprintDefaults: { duration: 14 } });

    // …nor written back to it.
    saveDomain("config", {
      currentUser: "alice",
      currentProjectId: "proj-2",
      darkMode: false,
      perProjectBoardFilters: { "proj-2": { type: "bug" } },
      sprintDefaults: { duration: 10 },
    });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.sprintDefaults).toEqual({ duration: 10 });
    ["currentUser", "currentProjectId", "darkMode", "perProjectBoardFilters"].forEach((field) => {
      expect(payload).not.toHaveProperty(field);
    });
  });
});
