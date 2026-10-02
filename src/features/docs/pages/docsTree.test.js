import { buildTree, canMovePage, getBreadcrumb, getDescendantIds, planDocsDrag } from "./docsTree";

describe("docsTree helpers", () => {
  it("builds a sorted nested page tree", () => {
    const pages = [
      { id: "child-2", title: "Child 2", parentId: "root", position: 2 },
      { id: "root", title: "Root", position: 1 },
      { id: "child-1", title: "Child 1", parentId: "root", position: 1 },
      { id: "leaf", title: "Leaf", parentId: "child-1", position: 0 },
    ];

    const tree = buildTree(pages);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children.map((page) => page.id)).toEqual(["child-1", "child-2"]);
    expect(tree[0].children[0].children.map((page) => page.id)).toEqual(["leaf"]);
  });

  it("treats orphaned pages as roots", () => {
    const pages = [
      { id: "orphan", title: "Orphan", parentId: "missing", position: 0 },
      { id: "root", title: "Root", position: 1 },
    ];

    const tree = buildTree(pages);

    expect(tree.map((page) => page.id)).toEqual(["orphan", "root"]);
  });

  it("keeps pages caught in a parentId cycle visible as roots", () => {
    const pages = [
      { id: "a", title: "A", parentId: "b", position: 0 },
      { id: "b", title: "B", parentId: "a", position: 1 },
      { id: "c", title: "C", parentId: "a", position: 0 },
    ];

    const tree = buildTree(pages);

    expect(tree.map((page) => page.id)).toEqual(["a", "b"]);
    expect(tree[0].children.map((page) => page.id)).toEqual(["c"]);
  });

  it("builds a breadcrumb trail from root to target page", () => {
    const pages = [
      { id: "root", title: "Root" },
      { id: "child", title: "Child", parentId: "root" },
      { id: "leaf", title: "Leaf", parentId: "child" },
    ];

    expect(getBreadcrumb("leaf", pages).map((page) => page.id)).toEqual(["root", "child", "leaf"]);
    expect(getBreadcrumb("missing", pages)).toEqual([]);
  });

  it("terminates breadcrumbs on cyclic data", () => {
    const pages = [
      { id: "a", title: "A", parentId: "b" },
      { id: "b", title: "B", parentId: "a" },
    ];

    expect(getBreadcrumb("a", pages).map((page) => page.id)).toEqual(["b", "a"]);
  });

  it("blocks moving a page under itself or its descendants", () => {
    const pages = [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
      { id: "leaf", parentId: "child" },
      { id: "other", parentId: null },
    ];

    expect([...getDescendantIds("root", pages)].sort()).toEqual(["child", "leaf"]);
    expect(canMovePage("root", "root", pages)).toBe(false);
    expect(canMovePage("root", "leaf", pages)).toBe(false);
    expect(canMovePage("leaf", "other", pages)).toBe(true);
    expect(canMovePage("child", null, pages)).toBe(true);
  });
});

describe("planDocsDrag", () => {
  const pages = [
    { id: "a", title: "A", position: 0 },
    { id: "b", title: "B", position: 1 },
    { id: "a1", title: "A1", parentId: "a", position: 0 },
  ];

  it("ignores drops without a destination or onto the same slot", () => {
    expect(planDocsDrag({ draggableId: "a", source: { droppableId: "dnd-root", index: 0 } }, pages)).toBeNull();
    expect(planDocsDrag({
      draggableId: "a",
      source: { droppableId: "dnd-root", index: 0 },
      destination: { droppableId: "dnd-root", index: 0 },
    }, pages)).toBeNull();
  });

  it("nests a page when combined onto another page and reindexes the old siblings", () => {
    const plan = planDocsDrag({ draggableId: "b", combine: { draggableId: "a" }, source: { droppableId: "dnd-root", index: 1 } }, pages);
    expect(plan.kind).toBe("combine");
    expect(plan.expandId).toBe("a");
    expect(plan.combinedInto.id).toBe("a");
    expect(plan.updates).toEqual([
      { id: "b", parentId: "a", position: 1 },
      { id: "a", position: 0 },
    ]);
  });

  it("reorders within the root and rejects moves into a descendant", () => {
    const reorder = planDocsDrag({
      draggableId: "b",
      source: { droppableId: "dnd-root", index: 1 },
      destination: { droppableId: "dnd-root", index: 0 },
    }, pages);
    expect(reorder.kind).toBe("reorder");
    expect(reorder.updates).toEqual([
      { id: "b", position: 0, parentId: null },
      { id: "a", position: 1 },
    ]);
    expect(planDocsDrag({ draggableId: "a", combine: { draggableId: "a1" } }, pages)).toEqual({ error: "cycle" });
  });
});
