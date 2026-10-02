import React, { useState, useMemo, useCallback, useEffect } from "react";
import { FaBook, FaPlus } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { DocsSkeleton } from "../../../shared/components/Skeleton";
import { AppButton, AppEmptyState } from "../../../shared/components/AppPrimitives";
import { buildTree, getBreadcrumb, planDocsDrag } from "./docsTree";
import { GlobalSearchModal, PageView, SpaceOverview } from "../components/DocsPageContent";
import DocsSidebar from "../components/sidebar/DocsSidebar";
import TemplatePickerModal from "../components/sidebar/TemplatePickerModal";
import SpaceModal from "../components/sidebar/SpaceModal";
import DocsConfirmDialog from "../components/DocsConfirmDialog";
import DocumentContextBar from "../components/DocumentContextBar";
import { DEFAULT_TEMPLATE_REGISTRY } from "../../../shared/constants/defaultTemplates";
import { getDocsBudgetError } from "../utils/imageCompression";
import {
  CYCLE_MOVE_MESSAGE,
  DEFAULT_PAGE_CONTENT,
  DOCS_READ_ONLY_MESSAGE,
} from "../constants/docsMessages";
import { isSpaceVisibleInProject } from "../utils/docsSpaces";
import { useDocsSpaceManagement } from "../hooks/useDocsSpaceManagement";
import { useDocsDeepLink, useUnsavedChangesGuard } from "../hooks/useDocsNavigation";

// Public helpers kept on the page module for existing importers/tests.
export { DOCS_READ_ONLY_MESSAGE } from "../constants/docsMessages";
export { isSpaceVisibleInProject } from "../utils/docsSpaces";

export default function DocsPage() {
  const {
    spaces, createSpace, updateSpace, deleteSpace,
    docPages, createDocPage, updateDocPage, deleteDocPage, reorderDocPages,
    projects, currentProjectId, currentUser, templateRegistry, users, dbReady,
  } = useApp();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const canEditDocs = canPerform("docs:edit");
  const readOnly = !canEditDocs;

  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [newPageForm, setNewPageForm] = useState(null); // { parentId }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // pageId
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pendingNewPage, setPendingNewPage] = useState(null); // { parentId }
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showAllProjectSpaces, setShowAllProjectSpaces] = useState(false);
  const { dirtyRef, handleDirtyChange, confirmDiscardChanges } = useUnsavedChangesGuard();
  const pageTemplates = templateRegistry?.doc?.length ? templateRegistry.doc : DEFAULT_TEMPLATE_REGISTRY.doc;

  // Spaces are scoped to the current project; legacy spaces without a
  // projectId stay visible everywhere.
  const projectSpaces = useMemo(
    () => spaces.filter((space) => isSpaceVisibleInProject(space, currentProjectId)),
    [spaces, currentProjectId]
  );
  const visibleSpaces = showAllProjectSpaces ? spaces : projectSpaces;
  const hiddenSpaceCount = spaces.length - projectSpaces.length;

  // Every mutating handler goes through this guard so keyboard shortcuts,
  // stale modals or programmatic DnD callbacks cannot write for viewers.
  const ensureCanEdit = useCallback(() => {
    if (canEditDocs) return true;
    addToast(DOCS_READ_ONLY_MESSAGE, "error");
    return false;
  }, [addToast, canEditDocs]);

  // Close any open editing surfaces when edit permission is revoked.
  useEffect(() => {
    if (canEditDocs) return;
    setNewPageForm(null);
    setDeleteConfirm(null);
    setShowTemplatePicker(false);
    setPendingNewPage(null);
  }, [canEditDocs]);

  const toggleShowAllSpaces = useCallback(() => setShowAllProjectSpaces((value) => !value), []);

  const spaceManagement = useDocsSpaceManagement({
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
  });

  // Auto-select the first visible space; drop a selection that is no longer visible.
  useEffect(() => {
    if (selectedSpaceId && visibleSpaces.some((space) => space.id === selectedSpaceId)) return;
    if (selectedSpaceId && spaces.some((space) => space.id === selectedSpaceId) && dirtyRef.current) return;
    const next = visibleSpaces[0]?.id || null;
    if (next !== selectedSpaceId) {
      setSelectedSpaceId(next);
      setSelectedPageId(null);
    }
  }, [dirtyRef, selectedSpaceId, spaces, visibleSpaces]);

  // Pages in selected space
  const spacePages = useMemo(
    () => docPages.filter((p) => p.spaceId === selectedSpaceId),
    [docPages, selectedSpaceId]
  );

  // Filtered pages for search
  const isFiltering = searchQuery.trim().length > 0;
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return spacePages;
    const q = searchQuery.toLowerCase();
    return spacePages.filter(
      (p) => (p.title || "").toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q)
    );
  }, [spacePages, searchQuery]);

  // Tree structure
  const pageTree = useMemo(() => buildTree(filteredPages), [filteredPages]);

  // Currently selected page object
  const selectedPage = useMemo(
    () => docPages.find((p) => p.id === selectedPageId) || null,
    [docPages, selectedPageId]
  );

  // The selected page was deleted (locally or by a remote sync) → fall back to the overview.
  useEffect(() => {
    if (!dbReady || !selectedPageId || selectedPage) return;
    setSelectedPageId(null);
    dirtyRef.current = false;
  }, [dbReady, dirtyRef, selectedPage, selectedPageId]);

  // Selects a page and expands its ancestors in the tree.
  const revealPage = useCallback((spaceId, pageId) => {
    setSelectedSpaceId(spaceId);
    setSelectedPageId(pageId);
    const ancestors = getBreadcrumb(pageId, docPages).map((entry) => entry.id).filter((id) => id !== pageId);
    if (ancestors.length) setExpandedIds((prev) => new Set([...prev, ...ancestors]));
  }, [docPages]);

  const openDeepLinkedPage = useCallback((page) => {
    const space = spaces.find((entry) => entry.id === page.spaceId);
    if (space && !isSpaceVisibleInProject(space, currentProjectId)) setShowAllProjectSpaces(true);
    revealPage(page.spaceId, page.id);
  }, [currentProjectId, revealPage, spaces]);

  useDocsDeepLink({ dbReady, docPages, onOpen: openDeepLinkedPage });

  // Children of selected page
  const childPages = useMemo(
    () => docPages.filter((p) => p.parentId === selectedPageId),
    [docPages, selectedPageId]
  );

  // Breadcrumb
  const breadcrumb = useMemo(
    () => (selectedPageId ? getBreadcrumb(selectedPageId, spacePages) : []),
    [selectedPageId, spacePages]
  );

  const selectedSpace = useMemo(
    () => spaces.find((s) => s.id === selectedSpaceId) || null,
    [spaces, selectedSpaceId]
  );

  const selectedPageOwner = useMemo(() => {
    if (!selectedPage?.owner) return null;
    return users.find((user) => user.id === selectedPage.owner || user.username === selectedPage.owner) || null;
  }, [selectedPage, users]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectPage = useCallback((id) => {
    if (id === selectedPageId) return;
    if (!confirmDiscardChanges()) return;
    setSelectedPageId(id);
  }, [confirmDiscardChanges, selectedPageId]);

  const handleSelectSpace = useCallback((spaceId) => {
    if (spaceId === selectedSpaceId && !selectedPageId) return;
    if (!confirmDiscardChanges()) return;
    setSelectedSpaceId(spaceId);
    setSelectedPageId(null);
  }, [confirmDiscardChanges, selectedPageId, selectedSpaceId]);

  const handleAddChild = useCallback((parentId) => {
    if (!ensureCanEdit()) return;
    setPendingNewPage({ parentId });
    setShowTemplatePicker(true);
    setExpandedIds((prev) => new Set([...prev, parentId]));
  }, [ensureCanEdit]);

  const handleNewRootPage = useCallback(() => {
    if (!ensureCanEdit()) return;
    setPendingNewPage({ parentId: null });
    setShowTemplatePicker(true);
  }, [ensureCanEdit]);


  const handleTemplateSelect = useCallback((template) => {
    setShowTemplatePicker(false);
    if (!ensureCanEdit()) {
      setPendingNewPage(null);
      return;
    }
    setNewPageForm({ ...(pendingNewPage || { parentId: null }), templateContent: template.content, templateEmoji: template.emoji });
    setPendingNewPage(null);
  }, [ensureCanEdit, pendingNewPage]);

  const handleNewPageSave = useCallback(({ title, emoji, parentId, spaceId, templateContent }) => {
    if (!ensureCanEdit()) {
      setNewPageForm(null);
      return;
    }
    const now = new Date().toISOString();
    const siblings = docPages.filter((p) => p.spaceId === spaceId && (p.parentId || null) === (parentId || null));
    const position = siblings.length;
    const id = createDocPage({
      spaceId,
      parentId: parentId || null,
      title,
      emoji,
      position,
      author: currentUser,
      content: templateContent !== undefined ? templateContent : DEFAULT_PAGE_CONTENT(title),
      labels: [],
      createdAt: now,
      updatedAt: now,
    });
    setNewPageForm(null);
    if (id && confirmDiscardChanges()) setSelectedPageId(id);
    addToast(`Page "${title}" created`, "success");
  }, [docPages, createDocPage, currentUser, addToast, confirmDiscardChanges, ensureCanEdit]);

  // DnD reordering + nesting. Every change is collected and written in a single
  // batch; position-only changes do not bump `updatedAt`.
  const handleDragEnd = useCallback((result) => {
    if (!result?.destination && !result?.combine) return;
    if (!ensureCanEdit()) return;
    if (isFiltering) return; // tree indices do not match the unfiltered sibling lists
    const plan = planDocsDrag(result, spacePages);
    if (!plan) return;
    if (plan.error || reorderDocPages(plan.updates) === false) {
      addToast(CYCLE_MOVE_MESSAGE, "error");
      return;
    }
    if (plan.expandId) setExpandedIds((prev) => new Set([...prev, plan.expandId]));
    if (plan.kind === "combine") {
      addToast(`Moved "${plan.draggedPage.title}" under "${plan.combinedInto?.title}"`, "success");
    }
  }, [addToast, ensureCanEdit, isFiltering, reorderDocPages, spacePages]);

  const handleDeletePage = useCallback((pageId) => {
    if (!ensureCanEdit()) return;
    setDeleteConfirm(pageId);
  }, [ensureCanEdit]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (!ensureCanEdit()) {
      setDeleteConfirm(null);
      return;
    }
    const page = docPages.find((p) => p.id === deleteConfirm);
    deleteDocPage(deleteConfirm);
    if (selectedPageId === deleteConfirm || (selectedPageId && getBreadcrumb(selectedPageId, docPages).some((p) => p.id === deleteConfirm))) {
      dirtyRef.current = false;
      setSelectedPageId(null);
    }
    setDeleteConfirm(null);
    addToast(`Page "${page?.title}" deleted`, "success");
  }, [addToast, deleteConfirm, deleteDocPage, dirtyRef, docPages, ensureCanEdit, selectedPageId]);

  const handleSave = useCallback((updatedPage) => {
    if (!ensureCanEdit()) return false;
    const budgetError = getDocsBudgetError(spaces, docPages, updatedPage);
    if (budgetError) {
      addToast(budgetError, "error", 6000);
      return false;
    }
    updateDocPage(updatedPage);
    addToast("Page saved", "success");
    return true;
  }, [addToast, docPages, ensureCanEdit, spaces, updateDocPage]);


  // ── Render ────────────────────────────────────────────────────────────────
  if (!dbReady) return <DocsSkeleton />;
  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#141720]">
      <DocsSidebar
        readOnly={readOnly}
        canEditDocs={canEditDocs}
        visibleSpaces={visibleSpaces}
        hiddenSpaceCount={hiddenSpaceCount}
        showAllProjectSpaces={showAllProjectSpaces}
        selectedSpaceId={selectedSpaceId}
        selectedPageId={selectedPageId}
        searchQuery={searchQuery}
        isFiltering={isFiltering}
        pageTree={pageTree}
        expandedIds={expandedIds}
        newPageForm={newPageForm}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        onOpenCreateSpace={spaceManagement.handleOpenCreateSpace}
        onNewRootPage={handleNewRootPage}
        onSelectSpace={handleSelectSpace}
        onEditSpace={spaceManagement.handleEditSpace}
        onDeleteSpace={spaceManagement.handleRequestDeleteSpace}
        onToggleShowAllSpaces={toggleShowAllSpaces}
        onSearchChange={setSearchQuery}
        onDragEnd={handleDragEnd}
        onSelectPage={handleSelectPage}
        onAddChild={handleAddChild}
        onDeletePage={handleDeletePage}
        onToggleExpand={toggleExpand}
        onNewPageSave={handleNewPageSave}
        onCancelNewPage={() => setNewPageForm(null)}
      />

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {!selectedSpaceId ? (
          // No space selected
          <div className="p-6 lg:p-8">
            <AppEmptyState
              icon={<FaBook className="w-7 h-7" />}
              title="Welcome to Documentation"
              description={readOnly
                ? "No documentation spaces are available yet. Spaces created by your team will appear here."
                : "Create a space for onboarding, architecture, runbooks or release notes so knowledge is easier to discover across the workspace."}
              action={canEditDocs ? (
                <AppButton onClick={spaceManagement.handleOpenCreateSpace}>
                  <FaPlus className="w-3 h-3" /> Create first space
                </AppButton>
              ) : null}
            />
          </div>
        ) : !selectedPage ? (
          // Space overview
          <SpaceOverview
            space={selectedSpace}
            pages={spacePages}
            onSelectPage={handleSelectPage}
            onNewPage={handleNewRootPage}
            readOnly={readOnly}
          />
        ) : (
          <div className="flex flex-col h-full min-w-0">
            <DocumentContextBar
              page={selectedPage}
              space={selectedSpace}
              owner={selectedPageOwner}
              childCount={childPages.length}
            />
            <PageView
              page={selectedPage}
              breadcrumb={breadcrumb}
              selectedSpace={selectedSpace}
              childPages={childPages}
              onSave={handleSave}
              onDelete={() => handleDeletePage(selectedPageId)}
              onAddChild={() => handleAddChild(selectedPageId)}
              onSelectPage={handleSelectPage}
              onDirtyChange={handleDirtyChange}
              readOnly={readOnly}
            />
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTemplatePicker && canEditDocs && (
        <TemplatePickerModal
          templates={pageTemplates}
          onSelect={handleTemplateSelect}
          onClose={() => { setShowTemplatePicker(false); setPendingNewPage(null); }}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          spaces={visibleSpaces}
          docPages={docPages.filter((page) => visibleSpaces.some((space) => space.id === page.spaceId))}
          onSelectPage={(spaceId, pageId) => {
            if (pageId !== selectedPageId && !confirmDiscardChanges()) return;
            revealPage(spaceId, pageId);
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {spaceManagement.showCreateSpace && canEditDocs && (
        <SpaceModal
          projects={projects}
          defaultProjectId={currentProjectId}
          onSave={spaceManagement.handleCreateSpace}
          onClose={spaceManagement.closeCreateSpace}
        />
      )}

      {spaceManagement.editingSpace && canEditDocs && (
        <SpaceModal
          initialData={spaceManagement.editingSpace}
          projects={projects}
          onSave={spaceManagement.handleUpdateSpace}
          onClose={spaceManagement.closeEditSpace}
        />
      )}

      {deleteConfirm && canEditDocs && (
        <DocsConfirmDialog title="Delete Page" onConfirm={confirmDelete} onCancel={() => setDeleteConfirm(null)}>
          Are you sure you want to delete this page and all its child pages? This action cannot be undone.
        </DocsConfirmDialog>
      )}

      {spaceManagement.deleteSpaceConfirm && canEditDocs && (
        <DocsConfirmDialog
          title="Delete Space"
          confirmLabel="Delete Space"
          onConfirm={spaceManagement.confirmDeleteSpace}
          onCancel={spaceManagement.cancelDeleteSpace}
        >
          Delete <strong>{spaceManagement.deleteSpaceConfirm.name}</strong> and all pages inside it? This action cannot be undone.
        </DocsConfirmDialog>
      )}
    </div>
  );
}
