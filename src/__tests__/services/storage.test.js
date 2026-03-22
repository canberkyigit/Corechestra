import { loadState, saveState, clearState } from "../../services/storage";

const STORAGE_KEY = "corechestra_v1";

beforeEach(() => {
  localStorage.clear();
});

// ─── loadState ────────────────────────────────────────────────────────────────
describe("loadState", () => {
  it("returns null when localStorage is empty", () => {
    expect(loadState()).toBeNull();
  });

  it("returns parsed object when valid JSON is stored", () => {
    const state = { projects: [{ id: "proj-1", name: "Test" }] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    expect(loadState()).toEqual(state);
  });

  it("returns null when stored value is invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    expect(loadState()).toBeNull();
  });

  it("returns null when stored value is an empty string", () => {
    localStorage.setItem(STORAGE_KEY, "");
    expect(loadState()).toBeNull();
  });

  it("preserves deeply nested state", () => {
    const complex = {
      sprint: { id: "s1", status: "active", goal: "Ship it" },
      activeTasks: [
        { id: "t1", subtasks: [{ id: "sub1", done: true }], labels: ["lbl-1"] },
      ],
      backlogSections: [{ id: 1, title: "Backlog", tasks: [] }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complex));
    expect(loadState()).toEqual(complex);
  });

  it("reads from the correct localStorage key", () => {
    localStorage.setItem("wrong_key", JSON.stringify({ x: 1 }));
    expect(loadState()).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 1 }));
    expect(loadState()).toEqual({ x: 1 });
  });

  it("preserves boolean, number, and null values", () => {
    const state = { active: true, count: 42, ref: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const loaded = loadState();
    expect(loaded.active).toBe(true);
    expect(loaded.count).toBe(42);
    expect(loaded.ref).toBeNull();
  });
});

// ─── saveState ────────────────────────────────────────────────────────────────
describe("saveState", () => {
  it("saves state under the correct key", () => {
    saveState({ version: 1 });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ version: 1 }));
  });

  it("overwrites a previous save", () => {
    saveState({ version: 1 });
    saveState({ version: 2 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).version).toBe(2);
  });

  it("saves complex nested objects correctly", () => {
    const state = {
      tasks: [{ id: "T1", labels: ["a", "b"], subtasks: [{ done: false }] }],
    };
    saveState(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(state);
  });

  it("saved state can be reloaded by loadState", () => {
    const state = { sprint: { id: "s1" }, projects: [] };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it("does not throw when localStorage throws (quota exceeded)", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveState({ data: "big payload" })).not.toThrow();
    Storage.prototype.setItem = original;
  });

  it("serializes arrays correctly", () => {
    const state = { ids: [1, 2, 3], flags: [true, false] };
    saveState(state);
    const loaded = loadState();
    expect(loaded.ids).toEqual([1, 2, 3]);
    expect(loaded.flags).toEqual([true, false]);
  });
});

// ─── clearState ───────────────────────────────────────────────────────────────
describe("clearState", () => {
  it("removes the stored state", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 1 }));
    clearState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw when nothing is stored", () => {
    expect(() => clearState()).not.toThrow();
  });

  it("only removes the app key, leaving other keys intact", () => {
    localStorage.setItem("other-key", "some-value");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    clearState();
    expect(localStorage.getItem("other-key")).toBe("some-value");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("after clear, loadState returns null", () => {
    saveState({ projects: [] });
    clearState();
    expect(loadState()).toBeNull();
  });
});
