import { generateId, getTaskProjectId, isInProject, taskKey } from "./helpers";

describe("generateId", () => {
  it("keeps the CY-<digits> format compatible with taskKey", () => {
    const id = generateId();
    expect(id).toMatch(/^CY-\d+$/);
    expect(taskKey(id)).toBe(id);
  });

  it("never repeats within a session, even when generated in a tight loop", () => {
    const ids = new Set();
    for (let i = 0; i < 20000; i += 1) ids.add(generateId());
    expect(ids.size).toBe(20000);
  });

  it("avoids ids present in an optional existing collection", () => {
    const spy = jest.spyOn(Date, "now").mockReturnValue(Date.UTC(2030, 0, 1));
    const hasCrypto = typeof window.crypto?.getRandomValues === "function";
    const randomSpy = hasCrypto
      ? jest.spyOn(window.crypto, "getRandomValues").mockImplementation((buf) => {
          buf[0] = 0;
          return buf;
        })
      : jest.spyOn(Math, "random").mockReturnValue(0);
    try {
      const probe = generateId();
      const next = Number(probe.slice(3)) + 1;
      const taken = [`CY-${next}`, { id: `CY-${next + 1}` }];
      const id = generateId(taken);
      expect(id).toBe(`CY-${next + 2}`);
    } finally {
      spy.mockRestore();
      randomSpy.mockRestore();
    }
  });
});

describe("project scoping helpers", () => {
  it("attributes tasks without projectId to the fallback (current) project", () => {
    expect(getTaskProjectId({ projectId: "proj-2" }, "proj-9")).toBe("proj-2");
    expect(getTaskProjectId({}, "proj-9")).toBe("proj-9");
    expect(getTaskProjectId(null)).toBe("");
  });

  it("matches legacy tasks to the current project instead of a hard-coded seed id", () => {
    expect(isInProject({}, "proj-7")).toBe(true);
    expect(isInProject({ projectId: "proj-7" }, "proj-7")).toBe(true);
    expect(isInProject({ projectId: "proj-1" }, "proj-7")).toBe(false);
    // Viewing another project: legacy tasks still belong to the current one.
    expect(isInProject({}, "proj-2", "proj-7")).toBe(false);
    expect(isInProject({}, "proj-7", "proj-7")).toBe(true);
  });
});
