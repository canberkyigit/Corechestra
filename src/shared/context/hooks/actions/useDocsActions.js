import { useCallback } from "react";

// ─── Pure hierarchy helpers (cycle-safe) ─────────────────────────────────────

/**
 * Collects `pageId` plus every descendant id. Uses an explicit stack and a
 * visited set so corrupted data with parentId cycles can never recurse forever.
 */
export function collectDocPageSubtreeIds(pages, pageId) {
  const childrenByParent = new Map();
  (pages || []).forEach((page) => {
    if (!page?.parentId) return;
    const list = childrenByParent.get(page.parentId) || [];
    list.push(page.id);
    childrenByParent.set(page.parentId, list);
  });

  const visited = new Set();
  const stack = [pageId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    (childrenByParent.get(id) || []).forEach((childId) => {
      if (!visited.has(childId)) stack.push(childId);
    });
  }
  return visited;
}

/**
 * True when re-parenting `pageId` under `newParentId` would create a cycle
 * (dropping a page onto itself or onto one of its descendants).
 */
export function wouldCreateDocPageCycle(pages, pageId, newParentId) {
  if (!newParentId) return false;
  if (newParentId === pageId) return true;
  const byId = new Map((pages || []).map((page) => [page.id, page]));
  const visited = new Set();
  let current = byId.get(newParentId);
  while (current) {
    if (current.id === pageId) return true;
    if (visited.has(current.id)) return false; // pre-existing cycle not involving pageId
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return false;
}

export function useDocsActions({
  currentUser,
  setSpaces,
  setDocPages,
}) {
  const createSpace = useCallback((data) => {
    const now = new Date().toISOString();
    const id = `space-${Date.now()}`;
    setSpaces((prev) => [
      ...prev,
      {
        ...data,
        id,
        owner: data.owner || currentUser || null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return id;
  }, [currentUser, setSpaces]);

  const updateSpace = useCallback((updated) => {
    setSpaces((prev) => prev.map((space) => (
      space.id === updated.id
        ? { ...space, ...updated, updatedAt: new Date().toISOString() }
        : space
    )));
  }, [setSpaces]);

  const deleteSpace = useCallback((spaceId) => {
    setSpaces((prev) => prev.filter((space) => space.id !== spaceId));
    setDocPages((prev) => prev.filter((page) => page.spaceId !== spaceId));
  }, [setDocPages, setSpaces]);

  const createDocPage = useCallback((data) => {
    const id = `page-${Date.now()}`;
    const now = new Date().toISOString();
    setDocPages((prev) => [
      ...prev,
      {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
        labels: data.labels || [],
        owner: data.owner || currentUser || null,
      },
    ]);
    return id;
  }, [currentUser, setDocPages]);

  /**
   * Merge-updates a page. A `parentId` change that would create a cycle is
   * ignored. Pass `{ touch: false }` to keep `updatedAt` (structural edits).
   */
  const updateDocPage = useCallback((updated, options = {}) => {
    const touch = options.touch !== false;
    setDocPages((prev) => prev.map((page) => {
      if (page.id !== updated.id) return page;
      const next = { ...page, ...updated };
      if (
        Object.prototype.hasOwnProperty.call(updated, "parentId")
        && (updated.parentId || null) !== (page.parentId || null)
        && wouldCreateDocPageCycle(prev, page.id, updated.parentId)
      ) {
        next.parentId = page.parentId ?? null;
      }
      if (touch) next.updatedAt = new Date().toISOString();
      return next;
    }));
  }, [setDocPages]);

  const deleteDocPage = useCallback((pageId) => {
    setDocPages((prev) => {
      const toDelete = collectDocPageSubtreeIds(prev, pageId);
      return prev.filter((page) => !toDelete.has(page.id));
    });
  }, [setDocPages]);

  /**
   * Re-parents a page. Returns false (and changes nothing) when the move would
   * create a cycle. `position` is optional; when omitted the page keeps its own.
   */
  const moveDocPage = useCallback((pageId, newParentId, position) => {
    let moved = false;
    setDocPages((prev) => {
      if (wouldCreateDocPageCycle(prev, pageId, newParentId)) return prev;
      return prev.map((page) => {
        if (page.id !== pageId) return page;
        moved = true;
        const parentChanged = (page.parentId || null) !== (newParentId || null);
        return {
          ...page,
          parentId: newParentId || null,
          ...(typeof position === "number" ? { position } : {}),
          ...(parentChanged ? { updatedAt: new Date().toISOString() } : {}),
        };
      });
    });
    return moved;
  }, [setDocPages]);

  /**
   * Applies many `{ id, position, parentId? }` changes in a single store write.
   * Position-only changes do not bump `updatedAt`; a parent change does.
   * The whole batch is rejected (returns false) if any parent change would
   * create a cycle.
   */
  const reorderDocPages = useCallback((updates = []) => {
    if (!Array.isArray(updates) || updates.length === 0) return true;
    let applied = false;
    setDocPages((prev) => {
      const byId = new Map(prev.map((page) => [page.id, { ...page }]));
      for (const update of updates) {
        const page = byId.get(update?.id);
        if (!page) continue;
        if (Object.prototype.hasOwnProperty.call(update, "parentId")) {
          const nextParent = update.parentId || null;
          if (nextParent !== (page.parentId || null)) {
            if (wouldCreateDocPageCycle([...byId.values()], page.id, nextParent)) return prev;
            page.parentId = nextParent;
            page.updatedAt = new Date().toISOString();
          }
        }
        if (typeof update.position === "number") page.position = update.position;
      }
      applied = true;
      return prev.map((page) => byId.get(page.id) || page);
    });
    return applied;
  }, [setDocPages]);

  const addDocComment = useCallback((pageId, text) => {
    if (!text?.trim()) return null;
    const comment = {
      id: `dcmt-${Date.now()}`,
      author: currentUser,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setDocPages((prev) => prev.map((page) => (
      page.id === pageId
        ? { ...page, comments: [...(page.comments || []), comment] }
        : page
    )));
    return comment;
  }, [currentUser, setDocPages]);

  /** Returns the removed comment so callers can offer Undo via restoreDocComment. */
  const deleteDocComment = useCallback((pageId, commentId) => {
    let removed = null;
    setDocPages((prev) => prev.map((page) => {
      if (page.id !== pageId) return page;
      removed = (page.comments || []).find((comment) => comment.id === commentId) || null;
      return {
        ...page,
        comments: (page.comments || []).filter((comment) => comment.id !== commentId),
      };
    }));
    return removed;
  }, [setDocPages]);

  const restoreDocComment = useCallback((pageId, comment) => {
    if (!comment) return;
    setDocPages((prev) => prev.map((page) => {
      if (page.id !== pageId || (page.comments || []).some((item) => item.id === comment.id)) return page;
      const comments = [...(page.comments || []), comment]
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
      return { ...page, comments };
    }));
  }, [setDocPages]);

  return {
    createSpace,
    updateSpace,
    deleteSpace,
    createDocPage,
    updateDocPage,
    deleteDocPage,
    moveDocPage,
    reorderDocPages,
    addDocComment,
    deleteDocComment,
    restoreDocComment,
  };
}
