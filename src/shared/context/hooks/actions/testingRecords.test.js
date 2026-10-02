import {
  EXECUTION_ATTEMPT_LIMIT, applyCasePatch, buildExecutionResult, buildTestCaseRecord, collectSuiteDescendants, compactRecord,
  diffCaseFields, nextCaseSeq, normalizeStepsForWrite,
} from "./testingRecords";

describe("testingRecords", () => {
  it("compacts records without dropping meaningful falsy values", () => {
    expect(compactRecord({ a: "", b: [], c: undefined, d: 0, e: false, f: null, g: "x" })).toEqual({ d: 0, e: false, f: null, g: "x" });
  });

  it("normalizes steps for write (strings, objects, shared refs, blanks)", () => {
    const steps = normalizeStepsForWrite(["  Open ", "", { action: "Pay", data: " 42 ", expected: "" }, { sharedStepsId: "g1" }, { action: "", data: "", expected: "" }]);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ id: expect.any(String), action: "Open" });
    expect(steps[1]).toEqual({ id: expect.any(String), action: "Pay", data: "42" });
    expect(steps[2]).toEqual({ id: expect.any(String), sharedStepsId: "g1" });
    expect(normalizeStepsForWrite("a\nb").map((step) => step.action)).toEqual(["a", "b"]);
  });

  it("computes project-scoped case sequences counting legacy cases", () => {
    const suites = [{ id: "s1", projectId: "p1" }, { id: "s2", projectId: "p2" }];
    const cases = [{ id: "a", suiteId: "s1", seq: 4 }, { id: "b", suiteId: "s1" }, { id: "c", suiteId: "s2", seq: 99 }];
    expect(nextCaseSeq(cases, suites, "p1")).toBe(6);
    expect(nextCaseSeq([], [], "p1")).toBe(1);
  });

  it("builds compact case records", () => {
    const record = buildTestCaseRecord({ title: " T ", estimate: "15", tags: ["a", "a", " b "], priority: "nope" }, "alice", "2026-01-01T00:00:00.000Z", { projectId: "p1", seq: 7 });
    expect(record).toEqual(expect.objectContaining({ title: "T", estimate: 15, tags: ["a", "b"], priority: "medium", seq: 7, projectId: "p1", owner: "alice" }));
    expect(record).not.toHaveProperty("steps");
    expect(record).not.toHaveProperty("requirementIds");
  });

  it("diffs tracked fields and writes history with scalar changes", () => {
    expect(diffCaseFields({ title: "A", tags: [] }, { title: "A", tags: [] })).toEqual([]);
    expect(diffCaseFields({ title: "A" }, { title: "B", tags: [] })).toEqual(["title"]);
    const next = applyCasePatch({ id: "c", title: "A", priority: "low" }, { priority: "high", steps: ["Go"] }, { by: "bob", now: "2026-01-01T00:00:00.000Z" });
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toEqual(expect.objectContaining({ by: "bob", fields: ["priority", "steps"], changes: { priority: { from: "low", to: "high" } } }));
    expect(applyCasePatch(next, { priority: "high" }, { by: "bob" }).history).toHaveLength(1);
  });

  it("builds executions: no case text, reset to untested keeps an attempt, caps attempts", () => {
    let result = buildExecutionResult(null, { caseId: "c", status: "passed", comment: "ok" }, { by: "a", now: "2026-01-01T10:00:00.000Z" });
    expect(result).toEqual({ caseId: "c", status: "passed", comment: "ok", executedBy: "a", executedAt: "2026-01-01T10:00:00.000Z" });
    result = buildExecutionResult(result, { status: "untested" }, { by: "a", now: "2026-01-01T11:00:00.000Z" });
    expect(result).toEqual({ caseId: "c", status: "untested", attempts: [{ status: "passed", executedBy: "a", executedAt: "2026-01-01T10:00:00.000Z" }] });
    for (let i = 0; i < 15; i += 1) {
      result = buildExecutionResult(result, { status: i % 2 ? "failed" : "passed" }, { by: "b", now: new Date(Date.UTC(2026, 0, 2, i)).toISOString() });
    }
    expect(result.attempts).toHaveLength(EXECUTION_ATTEMPT_LIMIT);
  });

  it("collects suite descendants cycle-safely", () => {
    const suites = [{ id: "a" }, { id: "b", parentId: "a" }, { id: "c", parentId: "b" }, { id: "x", parentId: "y" }, { id: "y", parentId: "x" }];
    expect([...collectSuiteDescendants(suites, "a")].sort()).toEqual(["a", "b", "c"]);
    expect([...collectSuiteDescendants(suites, "x")].sort()).toEqual(["x", "y"]);
  });
});
