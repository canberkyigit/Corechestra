import { useCallback } from "react";

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

  const updateDocPage = useCallback((updated) => {
    setDocPages((prev) => prev.map((page) => (
      page.id === updated.id
        ? { ...page, ...updated, updatedAt: new Date().toISOString() }
        : page
    )));
  }, [setDocPages]);

  const deleteDocPage = useCallback((pageId) => {
    setDocPages((prev) => {
      const toDelete = new Set();
      const collect = (id) => {
        toDelete.add(id);
        prev.filter((page) => page.parentId === id).forEach((child) => collect(child.id));
      };
      collect(pageId);
      return prev.filter((page) => !toDelete.has(page.id));
    });
  }, [setDocPages]);

  const moveDocPage = useCallback((pageId, newParentId) => {
    setDocPages((prev) => prev.map((page) => (
      page.id === pageId
        ? { ...page, parentId: newParentId, updatedAt: new Date().toISOString() }
        : page
    )));
  }, [setDocPages]);

  const addDocComment = useCallback((pageId, text) => {
    if (!text?.trim()) return;
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
  }, [currentUser, setDocPages]);

  const deleteDocComment = useCallback((pageId, commentId) => {
    setDocPages((prev) => prev.map((page) => (
      page.id === pageId
        ? {
            ...page,
            comments: (page.comments || []).filter((comment) => comment.id !== commentId),
          }
        : page
    )));
  }, [setDocPages]);

  return {
    createSpace,
    updateSpace,
    deleteSpace,
    createDocPage,
    updateDocPage,
    deleteDocPage,
    moveDocPage,
    addDocComment,
    deleteDocComment,
  };
}
