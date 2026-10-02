// Suite/folder tree helpers. A suite with `parentId` is a folder (section)
// nested in another suite. All helpers are cycle-safe: a corrupted parent
// chain never loops; such nodes surface as roots.
import { siblingSort } from "../../../shared/context/hooks/actions/testingRecords";

export { siblingSort };

/** { roots, childrenById, parentById } with siblings sorted by order/name. */
export function buildSuiteTree(suites = []) {
  const byId = new Map(suites.map((suite) => [suite.id, suite]));
  const childrenById = new Map();
  const roots = [];
  suites.forEach((suite) => {
    const parentId = suite.parentId && byId.has(suite.parentId) && !createsCycle(byId, suite.id) ? suite.parentId : null;
    if (!parentId) {
      roots.push(suite);
      return;
    }
    const list = childrenById.get(parentId) || [];
    list.push(suite);
    childrenById.set(parentId, list);
  });
  roots.sort(siblingSort);
  childrenById.forEach((list) => list.sort(siblingSort));
  return { roots, childrenById, byId };
}

function createsCycle(byId, id) {
  const seen = new Set([id]);
  let current = byId.get(id)?.parentId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.parentId;
  }
  return false;
}

/** `id` plus all descendants. */
export function getDescendantIds(id, childrenById) {
  const out = new Set();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    if (out.has(current)) continue;
    out.add(current);
    (childrenById.get(current) || []).forEach((child) => stack.push(child.id));
  }
  return out;
}

/** Ancestor chain root → node (inclusive). */
export function getSuitePath(id, byId) {
  const path = [];
  const seen = new Set();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return path;
}

export function getRootSuiteId(id, byId) {
  return getSuitePath(id, byId)[0]?.id || id || null;
}

export function formatSuitePath(id, byId, separator = " › ") {
  return getSuitePath(id, byId).map((suite) => suite.name).join(separator);
}

/**
 * Visible rows of the tree for rendering / keyboard navigation.
 * Each row: { suite, depth, hasChildren, expanded }.
 */
export function flattenTree(tree, expandedIds) {
  const rows = [];
  const walk = (nodes, depth) => {
    nodes.forEach((suite) => {
      const children = tree.childrenById.get(suite.id) || [];
      const expanded = expandedIds.has(suite.id);
      rows.push({ suite, depth, hasChildren: children.length > 0, expanded });
      if (expanded && children.length) walk(children, depth + 1);
    });
  };
  walk(tree.roots, 0);
  return rows;
}

/** True when moving `id` under `targetParentId` would create a cycle. */
export function isInvalidMove(id, targetParentId, childrenById) {
  if (!targetParentId) return false;
  return getDescendantIds(id, childrenById).has(targetParentId);
}

/** Every suite path as text, e.g. for CSV export / import matching. */
export function buildPathIndex(suites = []) {
  const byId = new Map(suites.map((suite) => [suite.id, suite]));
  const pathById = new Map();
  suites.forEach((suite) => pathById.set(suite.id, getSuitePath(suite.id, byId).map((node) => node.name)));
  return pathById;
}
