import { useCallback, useEffect, useState } from "react";

/**
 * Create / edit / delete state and guarded handlers for documentation spaces.
 * The page owns selection; this hook only updates it through the passed setters.
 */
export function useDocsSpaceManagement({
  canEditDocs,
  ensureCanEdit,
  confirmDiscardChanges,
  dirtyRef,
  createSpace,
  updateSpace,
  deleteSpace,
  addToast,
  currentProjectId,
  visibleSpaces,
  selectedSpaceId,
  setSelectedSpaceId,
  setSelectedPageId,
  setShowAllProjectSpaces,
}) {
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [deleteSpaceConfirm, setDeleteSpaceConfirm] = useState(null);

  // Close space dialogs when edit permission is revoked.
  useEffect(() => {
    if (canEditDocs) return;
    setShowCreateSpace(false);
    setEditingSpace(null);
    setDeleteSpaceConfirm(null);
  }, [canEditDocs]);

  const handleOpenCreateSpace = useCallback(() => {
    if (!ensureCanEdit()) return;
    setShowCreateSpace(true);
  }, [ensureCanEdit]);

  const handleCreateSpace = useCallback((data) => {
    if (!ensureCanEdit()) {
      setShowCreateSpace(false);
      return;
    }
    if (!confirmDiscardChanges()) return;
    const id = createSpace(data);
    setShowCreateSpace(false);
    if (data.projectId && currentProjectId && data.projectId !== currentProjectId) setShowAllProjectSpaces(true);
    setSelectedSpaceId(id || null);
    setSelectedPageId(null);
    addToast(`Space "${data.name}" created`, "success");
  }, [addToast, confirmDiscardChanges, createSpace, currentProjectId, ensureCanEdit, setSelectedPageId, setSelectedSpaceId, setShowAllProjectSpaces]);

  const handleUpdateSpace = useCallback((data) => {
    setEditingSpace(null);
    if (!ensureCanEdit()) return;
    updateSpace(data);
    addToast(`Space "${data.name}" updated`, "success");
  }, [updateSpace, addToast, ensureCanEdit]);

  const handleEditSpace = useCallback((space) => {
    if (!ensureCanEdit()) return;
    setEditingSpace(space);
  }, [ensureCanEdit]);

  const handleRequestDeleteSpace = useCallback((space) => {
    if (!ensureCanEdit()) return;
    setDeleteSpaceConfirm(space);
  }, [ensureCanEdit]);

  const confirmDeleteSpace = useCallback(() => {
    if (!deleteSpaceConfirm) return;
    if (!ensureCanEdit()) {
      setDeleteSpaceConfirm(null);
      return;
    }
    const nextSpaces = visibleSpaces.filter((space) => space.id !== deleteSpaceConfirm.id);
    deleteSpace(deleteSpaceConfirm.id);
    if (selectedSpaceId === deleteSpaceConfirm.id) {
      dirtyRef.current = false;
      setSelectedSpaceId(nextSpaces[0]?.id || null);
      setSelectedPageId(null);
    }
    setDeleteSpaceConfirm(null);
    addToast(`Space "${deleteSpaceConfirm.name}" deleted`, "info");
  }, [addToast, deleteSpace, deleteSpaceConfirm, dirtyRef, ensureCanEdit, selectedSpaceId, setSelectedPageId, setSelectedSpaceId, visibleSpaces]);

  return {
    showCreateSpace,
    editingSpace,
    deleteSpaceConfirm,
    closeCreateSpace: () => setShowCreateSpace(false),
    closeEditSpace: () => setEditingSpace(null),
    cancelDeleteSpace: () => setDeleteSpaceConfirm(null),
    handleOpenCreateSpace,
    handleCreateSpace,
    handleUpdateSpace,
    handleEditSpace,
    handleRequestDeleteSpace,
    confirmDeleteSpace,
  };
}
