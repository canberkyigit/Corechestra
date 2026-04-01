import { buildTree, getBreadcrumb } from "./docsTree";

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

  it("builds a breadcrumb trail from root to target page", () => {
    const pages = [
      { id: "root", title: "Root" },
      { id: "child", title: "Child", parentId: "root" },
      { id: "leaf", title: "Leaf", parentId: "child" },
    ];

    expect(getBreadcrumb("leaf", pages).map((page) => page.id)).toEqual(["root", "child", "leaf"]);
    expect(getBreadcrumb("missing", pages)).toEqual([]);
  });
});
