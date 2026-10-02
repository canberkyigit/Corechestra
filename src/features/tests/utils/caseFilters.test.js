import { EMPTY_CASE_FILTERS, buildFacetCounts, countActiveFilters, filterCases, sortCases } from "./caseFilters";
import { assignTesters, assignmentDistribution, resolveScope } from "./cycleScope";
import { buildSuiteTree } from "./testingTree";

const cases = [
  { id: "a", displaySeq: 1, key: "TC-1", title: "Login", priority: "high", type: "smoke", automation: "automated", status: "ready", owner: "alice", tags: ["auth"], suiteId: "s1", order: 1, preconditions: "", steps: [{ action: "Open page", expected: "Form" }], updatedAt: "2026-01-02" },
  { id: "b", displaySeq: 2, key: "TC-2", title: "Logout", priority: "critical", type: "functional", automation: "manual", status: "draft", owner: null, tags: [], suiteId: "f1", order: 0, preconditions: "Logged in", steps: [], updatedAt: "2026-01-05" },
  { id: "c", displaySeq: 3, key: "TC-3", title: "Pay", priority: "low", type: "e2e", automation: "manual", status: "ready", owner: "bob", tags: ["payments"], suiteId: "s2", order: 0, preconditions: "", steps: [], updatedAt: "2026-01-01" },
];
const latest = new Map([["a", { status: "failed" }], ["c", { status: "passed" }]]);

describe("caseFilters", () => {
  it("filters by facets, folder subtree and query (key, title, steps)", () => {
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, priority: ["high", "critical"] }).map((c) => c.id)).toEqual(["a", "b"]);
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, owner: ["__none__"] }).map((c) => c.id)).toEqual(["b"]);
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, lastResult: ["untested"] }, { latestMap: latest }).map((c) => c.id)).toEqual(["b"]);
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, tags: ["payments"] }).map((c) => c.id)).toEqual(["c"]);
    expect(filterCases(cases, EMPTY_CASE_FILTERS, { folderIds: new Set(["s1", "f1"]) }).map((c) => c.id)).toEqual(["a", "b"]);
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, query: "tc-3" }).map((c) => c.id)).toEqual(["c"]);
    expect(filterCases(cases, { ...EMPTY_CASE_FILTERS, query: "open page" }).map((c) => c.id)).toEqual(["a"]);
    expect(countActiveFilters({ ...EMPTY_CASE_FILTERS, priority: ["high"], tags: ["x"] })).toBe(2);
  });

  it("sorts by priority, result, updated and folder order", () => {
    expect(sortCases(cases, { by: "priority", dir: "asc" }).map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(sortCases(cases, { by: "lastResult", dir: "asc" }, { latestMap: latest }).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(sortCases(cases, { by: "updated", dir: "asc" }).map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(sortCases(cases, { by: "order", dir: "asc" }, { folderRank: new Map([["s1", 0], ["f1", 1], ["s2", 2]]) }).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(sortCases(cases, { by: "key", dir: "desc" }).map((c) => c.id)).toEqual(["c", "b", "a"]);
  });

  it("counts facets", () => {
    const facets = buildFacetCounts(cases, latest);
    expect(facets.priority).toEqual({ high: 1, critical: 1, low: 1 });
    expect(facets.lastResult).toEqual({ failed: 1, untested: 1, passed: 1 });
    expect(facets.owner.__none__).toBe(1);
  });
});

describe("cycleScope", () => {
  const tree = buildSuiteTree([{ id: "s1", name: "Web" }, { id: "f1", name: "Auth", parentId: "s1" }, { id: "s2", name: "API" }]);

  it("resolves scope by folders (with sub-folders), filters, explicit ids and exclusions", () => {
    expect(resolveScope(cases, { folders: ["s1"], status: [] }, { tree }).map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(resolveScope(cases, { folders: [], status: ["ready"] }, { tree }).map((c) => c.id).sort()).toEqual(["a", "c"]);
    expect(resolveScope(cases, { status: ["ready"] }, { tree, explicitIds: ["b"] }).map((c) => c.id)).toEqual(["b"]);
    expect(resolveScope(cases, { status: [] }, { tree, excluded: new Set(["a"]) }).map((c) => c.id).sort()).toEqual(["b", "c"]);
  });

  it("assigns testers round-robin, by owner or to a single tester", () => {
    expect(assignTesters(cases, { strategy: "round-robin", testers: ["x", "y"] })).toEqual({ a: "x", b: "y", c: "x" });
    expect(assignTesters(cases, { strategy: "owner", testers: [], defaultTester: "z" })).toEqual({ a: "alice", b: "z", c: "bob" });
    expect(assignTesters(cases, { strategy: "owner", testers: ["bob"], defaultTester: "z" })).toEqual({ a: "z", b: "z", c: "bob" });
    expect(assignTesters(cases, { strategy: "single", defaultTester: null })).toEqual({});
    expect(assignmentDistribution({ a: "x", c: "x" }, ["a", "b", "c"])).toEqual([{ user: "x", count: 2 }, { user: null, count: 1 }]);
  });
});
