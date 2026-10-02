import { act } from "@testing-library/react";

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn((db, collection, id) => ({ collection, id, path: `${collection}/${id}` }));

jest.mock("./firebase", () => ({
  db: { mocked: true },
}));

jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

function snap(data) {
  return { exists: () => data !== null && data !== undefined, data: () => data };
}

function mockDocs(map) {
  mockGetDoc.mockImplementation(async (ref) => snap(map[ref.path] ?? null));
}

async function advance(ms) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe("userPrefs storage (Firestore)", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    // CRA resets mock implementations between tests.
    mockDoc.mockImplementation((db, collection, id) => ({ collection, id, path: `${collection}/${id}` }));
    mockSetDoc.mockResolvedValue();
    mockOnSnapshot.mockReturnValue(() => {});
  });

  it("loads an existing userPrefs doc without touching the legacy config", async () => {
    mockDocs({
      "userPrefs/uid-a": { darkMode: true, currentProjectId: "proj-2", _updatedAt: 5, _version: 3 },
      "appData/config": { darkMode: false, currentProjectId: "proj-legacy" },
    });
    const { loadUserPrefs, getUserPrefsSnapshot } = await import("./userPrefsStorage");

    const result = await loadUserPrefs("uid-a");

    expect(result).toEqual({ prefs: { darkMode: true, currentProjectId: "proj-2" }, migrated: false });
    expect(getUserPrefsSnapshot("uid-a")).toEqual({ darkMode: true, currentProjectId: "proj-2" });
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("seeds a missing doc once from the legacy personal fields in appData/config", async () => {
    mockDocs({
      "appData/config": {
        currentUser: "someone-else",
        currentProjectId: "proj-1",
        darkMode: true,
        perProjectBoardFilters: { "proj-1": { type: "bug" } },
        favoriteItems: [{ id: "doc:1" }],
        sprintDefaults: { duration: 14 },
        permissionMatrix: { admin: {} },
        _updatedAt: 1,
      },
    });
    const { loadUserPrefs } = await import("./userPrefsStorage");

    const result = await loadUserPrefs("uid-a");

    const seed = {
      currentProjectId: "proj-1",
      darkMode: true,
      perProjectBoardFilters: { "proj-1": { type: "bug" } },
      favoriteItems: [{ id: "doc:1" }],
    };
    expect(result).toEqual({ prefs: seed, migrated: true });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = mockSetDoc.mock.calls[0];
    expect(ref.path).toBe("userPrefs/uid-a");
    expect(payload).toEqual({
      ...seed,
      _updatedAt: expect.any(Number),
      _updatedBy: "uid-a",
      _version: 1,
      _migratedFrom: "appData/config",
      _migratedAt: expect.any(Number),
    });
    // Workspace settings and the last writer's identity are never copied.
    expect(payload).not.toHaveProperty("currentUser");
    expect(payload).not.toHaveProperty("sprintDefaults");
    expect(payload).not.toHaveProperty("permissionMatrix");
    expect(options).toBeUndefined();
  });

  it("creates an empty doc when there is no legacy config to migrate", async () => {
    mockDocs({});
    const { loadUserPrefs, getUserPrefsSnapshot } = await import("./userPrefsStorage");

    await expect(loadUserPrefs("uid-new")).resolves.toEqual({ prefs: {}, migrated: true });
    expect(mockSetDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ _version: 1, _updatedBy: "uid-new" }));
    expect(getUserPrefsSnapshot("uid-new")).toEqual({});
  });

  it("debounces saves for 1500 ms and replaces only the changed top-level fields", async () => {
    jest.useFakeTimers();
    mockDocs({ "userPrefs/uid-a": { darkMode: false, perProjectBoardFilters: { p1: { type: "bug" }, p2: {} }, _version: 2 } });
    const { loadUserPrefs, saveUserPrefs } = await import("./userPrefsStorage");
    await loadUserPrefs("uid-a");

    saveUserPrefs("uid-a", { darkMode: true, sidebarCollapsed: false });
    saveUserPrefs("uid-a", { perProjectBoardFilters: { p1: { type: "bug" } }, notAPref: 1 });
    await advance(1499);
    expect(mockSetDoc).not.toHaveBeenCalled();
    await advance(1);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = mockSetDoc.mock.calls[0];
    expect(ref.path).toBe("userPrefs/uid-a");
    expect(payload).toEqual({
      darkMode: true,
      sidebarCollapsed: false,
      perProjectBoardFilters: { p1: { type: "bug" } },
      _updatedAt: expect.any(Number),
      _updatedBy: "uid-a",
      _version: 3,
    });
    expect(options.mergeFields.sort()).toEqual(
      ["darkMode", "sidebarCollapsed", "perProjectBoardFilters", "_updatedAt", "_updatedBy", "_version"].sort()
    );
  });

  it("skips redundant writes and ignores saves outside the active session", async () => {
    jest.useFakeTimers();
    mockDocs({ "userPrefs/uid-a": { darkMode: true } });
    const { loadUserPrefs, saveUserPrefs, endUserPrefsSession } = await import("./userPrefsStorage");

    saveUserPrefs("uid-a", { darkMode: false }); // before load: not hydrated yet
    await loadUserPrefs("uid-a");
    saveUserPrefs("uid-a", { darkMode: true }); // unchanged
    saveUserPrefs("uid-b", { darkMode: false }); // not the signed-in user
    await advance(1500);
    expect(mockSetDoc).not.toHaveBeenCalled();

    saveUserPrefs("uid-a", { darkMode: false });
    endUserPrefsSession("uid-a"); // logout drops what was not flushed
    await advance(1500);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("flushes pending prefs immediately and resends them after a failed write", async () => {
    jest.useFakeTimers();
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockDocs({ "userPrefs/uid-a": { darkMode: false } });
    const { loadUserPrefs, saveUserPrefs, flushUserPrefs } = await import("./userPrefsStorage");
    await loadUserPrefs("uid-a");

    mockSetDoc.mockRejectedValueOnce(new Error("offline"));
    saveUserPrefs("uid-a", { darkMode: true });
    await expect(flushUserPrefs()).resolves.toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "corechestra:storage-error" }));

    saveUserPrefs("uid-a", { darkMode: true });
    await expect(flushUserPrefs()).resolves.toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetDoc.mock.calls[1][1].darkMode).toBe(true);

    // Nothing pending → no timer write later.
    await advance(1500);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    dispatchSpy.mockRestore();
  });

  it("pushes only remote changes from the user's own doc and ignores echoes of own writes", async () => {
    jest.useFakeTimers();
    let emit;
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      expect(ref.path).toBe("userPrefs/uid-a");
      emit = (data) => onNext(snap(data));
      return () => {};
    });
    mockDocs({ "userPrefs/uid-a": { darkMode: false, sidebarCollapsed: false, projectsViewMode: "grid" } });
    const { loadUserPrefs, saveUserPrefs, subscribeToUserPrefs } = await import("./userPrefsStorage");
    await loadUserPrefs("uid-a");
    const onUpdate = jest.fn();
    subscribeToUserPrefs("uid-a", onUpdate);

    // Own write: its echo carries what this tab already knows.
    saveUserPrefs("uid-a", { darkMode: true });
    await advance(1500);
    emit({ darkMode: true, sidebarCollapsed: false, projectsViewMode: "grid", _updatedAt: Date.now() });
    expect(onUpdate).not.toHaveBeenCalled();

    // Another tab/device of the same user.
    emit({ darkMode: true, sidebarCollapsed: true, projectsViewMode: "grid", _updatedAt: 1 });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("sidebarCollapsed", true);

    // A field queued locally keeps the local value (it is written on flush).
    onUpdate.mockClear();
    saveUserPrefs("uid-a", { projectsViewMode: "list" });
    emit({ darkMode: true, sidebarCollapsed: true, projectsViewMode: "table" });
    expect(onUpdate).not.toHaveBeenCalled();
    await advance(1500);
    expect(mockSetDoc.mock.calls.at(-1)[1].projectsViewMode).toBe("list");
  });

  it("adopts the doc from the listener when the initial load failed", async () => {
    let emit;
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      emit = (data) => onNext(snap(data));
      return () => {};
    });
    mockGetDoc.mockRejectedValue(new Error("offline"));
    const { loadUserPrefs, saveUserPrefs, subscribeToUserPrefs, getUserPrefsSnapshot, flushUserPrefs } = await import("./userPrefsStorage");

    await expect(loadUserPrefs("uid-a")).resolves.toBeNull();
    saveUserPrefs("uid-a", { darkMode: true });
    await expect(flushUserPrefs()).resolves.toBe(false); // read-only until the doc is known

    const onUpdate = jest.fn();
    subscribeToUserPrefs("uid-a", onUpdate);
    emit({ darkMode: false, currentProjectId: "proj-9" });
    expect(onUpdate).toHaveBeenCalledWith("currentProjectId", "proj-9");
    expect(getUserPrefsSnapshot("uid-a")).toEqual({ darkMode: false, currentProjectId: "proj-9" });
  });
});

describe("userPrefs storage (E2E fake backend)", () => {
  const ORIGINAL_E2E = process.env.REACT_APP_E2E;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    process.env.REACT_APP_E2E = "1";
  });

  afterAll(() => {
    process.env.REACT_APP_E2E = ORIGINAL_E2E;
  });

  it("keeps one localStorage key per uid, seeded from the legacy E2E config", async () => {
    localStorage.setItem("corechestra_e2e_domains", JSON.stringify({
      config: { currentUser: "alice", currentProjectId: "project-1", darkMode: true, sprintDefaults: { duration: 14 } },
    }));
    const { loadUserPrefs, saveUserPrefs, endUserPrefsSession } = await import("./userPrefsStorage");

    await expect(loadUserPrefs("uid-admin")).resolves.toEqual({
      prefs: { currentProjectId: "project-1", darkMode: true },
      migrated: true,
    });
    saveUserPrefs("uid-admin", { darkMode: false });
    const adminDoc = JSON.parse(localStorage.getItem("corechestra_e2e_user_prefs:uid-admin"));
    expect(adminDoc).toEqual(expect.objectContaining({ currentProjectId: "project-1", darkMode: false, _version: 2 }));
    endUserPrefsSession("uid-admin");

    // A second user on the same browser gets their own doc.
    await loadUserPrefs("uid-member");
    saveUserPrefs("uid-member", { currentProjectId: "project-2" });
    const memberDoc = JSON.parse(localStorage.getItem("corechestra_e2e_user_prefs:uid-member"));
    expect(memberDoc).toEqual(expect.objectContaining({ currentProjectId: "project-2", darkMode: true }));
    expect(JSON.parse(localStorage.getItem("corechestra_e2e_user_prefs:uid-admin")).currentProjectId).toBe("project-1");
    expect(JSON.parse(localStorage.getItem("corechestra_e2e_domains")).config.darkMode).toBe(true);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it("syncs another tab's writes for the same uid", async () => {
    localStorage.setItem("corechestra_e2e_user_prefs:uid-admin", JSON.stringify({ darkMode: false, _version: 1 }));
    const { loadUserPrefs, subscribeToUserPrefs } = await import("./userPrefsStorage");
    const { writeE2EUserPrefs } = await import("../e2e/testMode");
    await loadUserPrefs("uid-admin");
    const onUpdate = jest.fn();
    const unsubscribe = subscribeToUserPrefs("uid-admin", onUpdate);

    writeE2EUserPrefs("uid-admin", { darkMode: true, _version: 2 });
    writeE2EUserPrefs("uid-other", { darkMode: false, sidebarCollapsed: true });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("darkMode", true);
    unsubscribe();
  });
});
