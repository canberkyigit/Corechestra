function buildPageMap(pages) {
  const map = new Map();
  (pages || []).forEach((page) => {
    if (page?.id != null) map.set(page.id, page);
  });
  return map;
}

/** True when following `page.parentId` upwards eventually returns to `page`. */
function isInParentCycle(page, map) {
  const visited = new Set([page.id]);
  let current = page.parentId ? map.get(page.parentId) : null;
  while (current) {
    if (current.id === page.id) return true;
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    current = current.parentId ? map.get(current.parentId) : null;
  }
  return false;
}

/**
 * Builds a nested tree from a flat page list. Orphans (parent missing from the
 * input) and pages caught in a corrupted parentId cycle are rendered as roots
 * so they never silently disappear.
 */
export function buildTree(pages) {
  const source = buildPageMap(pages);
  const nodes = new Map();
  source.forEach((page, id) => {
    nodes.set(id, { ...page, children: [] });
  });

  const roots = [];
  source.forEach((page, id) => {
    const node = nodes.get(id);
    if (page.parentId && nodes.has(page.parentId) && !isInParentCycle(page, source)) {
      nodes.get(page.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
  const visited = new Set();
  const sortNode = (node) => {
    if (visited.has(node.id)) return node;
    visited.add(node.id);
    node.children.sort(byPosition);
    node.children.forEach(sortNode);
    return node;
  };

  roots.sort(byPosition);
  roots.forEach(sortNode);
  return roots;
}

/** Trail from the root to `pageId`. Cycle-safe: stops when an id repeats. */
export function getBreadcrumb(pageId, pages) {
  const map = buildPageMap(pages);
  const trail = [];
  const visited = new Set();
  let current = map.get(pageId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    trail.unshift(current);
    current = current.parentId ? map.get(current.parentId) : null;
  }

  return trail;
}

/** Ids of every descendant of `pageId` (excluding the page itself). */
export function getDescendantIds(pageId, pages) {
  const childrenByParent = new Map();
  (pages || []).forEach((page) => {
    if (!page?.parentId) return;
    const list = childrenByParent.get(page.parentId) || [];
    list.push(page.id);
    childrenByParent.set(page.parentId, list);
  });
  const result = new Set();
  const stack = [...(childrenByParent.get(pageId) || [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === pageId || result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenByParent.get(id) || []));
  }
  return result;
}

/** A page may not be moved under itself or any of its descendants. */
export function canMovePage(pageId, newParentId, pages) {
  if (!newParentId) return true;
  if (newParentId === pageId) return false;
  return !getDescendantIds(pageId, pages).has(newParentId);
}

/**
 * Plans a page-tree drag result (@hello-pangea/dnd) against the unfiltered
 * pages of one space. Returns `null` when nothing should change, otherwise
 * `{ error: "cycle" }` or `{ kind, updates, expandId, draggedPage, combinedInto }` where
 * `updates` is the batch for `reorderDocPages` (position-only entries do not
 * carry `parentId`).
 */
export function planDocsDrag(result, spacePages) {
  const { draggableId, destination, source, combine } = result || {};
  if (!destination && !combine) return null;
  const draggedPage = (spacePages || []).find((p) => p.id === draggableId);
  if (!draggedPage) return null;

  const siblingsOf = (parentId) => spacePages
    .filter((p) => p.id !== draggableId && (parentId === null ? !p.parentId : p.parentId === parentId))
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const reindex = (pages) => pages.map((p, idx) => ({ id: p.id, position: idx }));
  const oldParentId = draggedPage.parentId || null;

  // Combine: drop ON an item → make it a child.
  if (combine) {
    const targetId = combine.draggableId;
    if (!canMovePage(draggableId, targetId, spacePages)) return { error: "cycle" };
    const targetChildren = siblingsOf(targetId);
    return {
      updates: [
        { id: draggableId, parentId: targetId, position: targetChildren.length },
        ...(oldParentId === targetId ? [] : reindex(siblingsOf(oldParentId))),
      ],
      kind: "combine",
      expandId: targetId,
      draggedPage,
      combinedInto: spacePages.find((p) => p.id === targetId) || null,
    };
  }

  // Reorder: drop in a gap between items.
  if (destination.droppableId === source?.droppableId && destination.index === source?.index) return null;
  const newParentId = destination.droppableId === "dnd-root" ? null : destination.droppableId;
  if (!canMovePage(draggableId, newParentId, spacePages)) return { error: "cycle" };

  const ordered = siblingsOf(newParentId);
  ordered.splice(Math.min(destination.index, ordered.length), 0, draggedPage);
  const updates = ordered.map((p, idx) => (
    p.id === draggableId ? { id: p.id, position: idx, parentId: newParentId } : { id: p.id, position: idx }
  ));
  if (oldParentId !== newParentId) updates.push(...reindex(siblingsOf(oldParentId)));
  return { kind: "reorder", updates, expandId: newParentId, draggedPage, combinedInto: null };
}
