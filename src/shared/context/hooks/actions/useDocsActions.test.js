import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { collectDocPageSubtreeIds, useDocsActions, wouldCreateDocPageCycle } from "./useDocsActions";

function useHarness(initialPages) {
  const [docPages, setDocPages] = useState(initialPages);
  const [spaces, setSpaces] = useState([]);
  const actions = useDocsActions({ currentUser: "alice", setSpaces, setDocPages });
  return { docPages, spaces, ...actions };
}

const PAGES = [
  { id: "root", parentId: null, position: 0, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "child", parentId: "root", position: 0, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "leaf", parentId: "child", position: 0, updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "other", parentId: null, position: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
];

describe("useDocsActions", () => {
  it("detects cycles and collects subtrees safely even on corrupted data", () => {
    expect(wouldCreateDocPageCycle(PAGES, "root", "leaf")).toBe(true);
    expect(wouldCreateDocPageCycle(PAGES, "root", "root")).toBe(true);
    expect(wouldCreateDocPageCycle(PAGES, "leaf", "other")).toBe(false);

    const cyclic = [{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }];
    expect([...collectDocPageSubtreeIds(cyclic, "a")].sort()).toEqual(["a", "b"]);
  });

  it("refuses to move a page under its own descendant", () => {
    const { result } = renderHook(() => useHarness(PAGES));
    let moved;
    act(() => { moved = result.current.moveDocPage("root", "leaf"); });

    expect(moved).toBe(false);
    expect(result.current.docPages.find((page) => page.id === "root").parentId).toBeNull();

    act(() => { moved = result.current.moveDocPage("leaf", "other", 0); });
    expect(moved).toBe(true);
    expect(result.current.docPages.find((page) => page.id === "leaf")).toMatchObject({ parentId: "other", position: 0 });
  });

  it("ignores cyclic parent changes in updateDocPage", () => {
    const { result } = renderHook(() => useHarness(PAGES));
    act(() => { result.current.updateDocPage({ id: "root", parentId: "leaf", title: "Renamed" }); });

    expect(result.current.docPages.find((page) => page.id === "root")).toMatchObject({ parentId: null, title: "Renamed" });
  });

  it("reorders in one batch without bumping updatedAt for position-only changes", () => {
    const { result } = renderHook(() => useHarness(PAGES));
    let ok;
    act(() => {
      ok = result.current.reorderDocPages([
        { id: "other", position: 0 },
        { id: "root", position: 1 },
        { id: "leaf", position: 0, parentId: "other" },
      ]);
    });

    expect(ok).toBe(true);
    const byId = Object.fromEntries(result.current.docPages.map((page) => [page.id, page]));
    expect(byId.other).toMatchObject({ position: 0, updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(byId.root).toMatchObject({ position: 1, updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(byId.leaf.parentId).toBe("other");
    expect(byId.leaf.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
  });

  it("rejects the whole batch when a parent change would create a cycle", () => {
    const { result } = renderHook(() => useHarness(PAGES));
    let ok;
    act(() => {
      ok = result.current.reorderDocPages([
        { id: "other", position: 5 },
        { id: "root", parentId: "child", position: 0 },
      ]);
    });

    expect(ok).toBe(false);
    expect(result.current.docPages).toEqual(PAGES);
  });

  it("deletes subtrees without recursing forever on cyclic data", () => {
    const cyclic = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
      { id: "keep", parentId: null },
    ];
    const { result } = renderHook(() => useHarness(cyclic));
    act(() => { result.current.deleteDocPage("a"); });

    expect(result.current.docPages.map((page) => page.id)).toEqual(["keep"]);
  });
});
