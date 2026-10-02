import { assignDisplaySeqs, formatCaseKey, parseCaseKey } from "./caseKeys";
import {
  buildPathIndex, buildSuiteTree, flattenTree, formatSuitePath, getDescendantIds, getRootSuiteId, isInvalidMove,
} from "./testingTree";

const suites = [
  { id: "api", name: "API", order: 1 },
  { id: "web", name: "Web", order: 0 },
  { id: "auth", name: "Auth", parentId: "web", order: 1 },
  { id: "checkout", name: "Checkout", parentId: "web", order: 0 },
  { id: "pay", name: "Payments", parentId: "checkout" },
  { id: "loopA", name: "Loop A", parentId: "loopB" },
  { id: "loopB", name: "Loop B", parentId: "loopA" },
];

describe("testingTree", () => {
  it("builds a sorted tree and treats cyclic parents as roots", () => {
    const tree = buildSuiteTree(suites);
    expect(tree.roots.map((suite) => suite.id)).toEqual(["web", "api", "loopA", "loopB"]);
    expect(tree.childrenById.get("web").map((suite) => suite.id)).toEqual(["checkout", "auth"]);
  });

  it("flattens visible rows by expansion state", () => {
    const tree = buildSuiteTree(suites);
    expect(flattenTree(tree, new Set(["web"])).map((row) => `${row.suite.id}:${row.depth}`)).toEqual(["web:0", "checkout:1", "auth:1", "api:0", "loopA:0", "loopB:0"]);
    expect(flattenTree(tree, new Set(["web", "checkout"])).find((row) => row.suite.id === "pay").depth).toBe(2);
  });

  it("resolves descendants, paths and roots", () => {
    const tree = buildSuiteTree(suites);
    expect([...getDescendantIds("web", tree.childrenById)].sort()).toEqual(["auth", "checkout", "pay", "web"]);
    expect(formatSuitePath("pay", tree.byId)).toBe("Web › Checkout › Payments");
    expect(getRootSuiteId("pay", tree.byId)).toBe("web");
    expect(isInvalidMove("web", "pay", tree.childrenById)).toBe(true);
    expect(isInvalidMove("pay", "api", tree.childrenById)).toBe(false);
    expect(buildPathIndex(suites).get("pay")).toEqual(["Web", "Checkout", "Payments"]);
  });
});

describe("caseKeys", () => {
  it("formats and parses keys", () => {
    expect(formatCaseKey(12)).toBe("TC-12");
    expect(parseCaseKey("tc-7")).toBe(7);
    expect(parseCaseKey("TC12")).toBe(12);
    expect(parseCaseKey("42")).toBe(42);
    expect(parseCaseKey("login")).toBeNull();
  });

  it("re-numbers duplicate persisted sequences for display", () => {
    const map = assignDisplaySeqs([
      { id: "a", seq: 1, createdAt: "2026-01-01" },
      { id: "b", seq: 1, createdAt: "2026-01-02" },
      { id: "c", createdAt: "2026-01-03" },
    ]);
    expect([map.get("a"), map.get("b"), map.get("c")]).toEqual([1, 2, 3]);
  });
});
