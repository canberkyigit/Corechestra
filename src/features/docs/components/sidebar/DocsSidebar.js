import React from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { FaBook, FaGlobeAmericas, FaLock, FaPlus, FaSearch } from "react-icons/fa";
import { AppButton, AppEmptyState } from "../../../../shared/components/AppPrimitives";
import { DOCS_READ_ONLY_MESSAGE } from "../../constants/docsMessages";
import TreeNode from "./DocsTreeNode";
import NewPageForm from "./NewPageForm";
import SpaceRow from "./SpaceRow";

/** Left panel of the Docs page: spaces, page search and the draggable page tree. */
export default function DocsSidebar({
  readOnly,
  canEditDocs,
  visibleSpaces,
  hiddenSpaceCount,
  showAllProjectSpaces,
  selectedSpaceId,
  selectedPageId,
  searchQuery,
  isFiltering,
  pageTree,
  expandedIds,
  newPageForm,
  onOpenGlobalSearch,
  onOpenCreateSpace,
  onNewRootPage,
  onSelectSpace,
  onEditSpace,
  onDeleteSpace,
  onToggleShowAllSpaces,
  onSearchChange,
  onDragEnd,
  onSelectPage,
  onAddChild,
  onDeletePage,
  onToggleExpand,
  onNewPageSave,
  onCancelNewPage,
}) {
  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e] overflow-hidden max-h-[42vh] lg:max-h-none">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-center gap-2">
          <FaBook className="w-4 h-4 text-blue-500" />
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
              Documentation
              {readOnly && (
                <span
                  data-testid="docs-read-only-hint"
                  title={DOCS_READ_ONLY_MESSAGE}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200 dark:bg-[#1c2030] dark:text-slate-400 dark:border-[#2a3044]"
                >
                  <FaLock className="w-2 h-2" /> Read-only
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Knowledge base and linked work</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onOpenGlobalSearch}
            title="Search all spaces"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaGlobeAmericas className="w-3 h-3" />
          </button>
          {canEditDocs && (
          <button
            onClick={onOpenCreateSpace}
            title="New space"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
          </button>
          )}
        {selectedSpaceId && canEditDocs && (
          <button
            onClick={onNewRootPage}
            title="New page"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
          </button>
        )}
        </div>
      </div>

      {/* Space selector */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-1.5">
        {visibleSpaces.map((space) => (
          <SpaceRow
            key={space.id}
            space={space}
            isSelected={selectedSpaceId === space.id}
            onSelect={onSelectSpace}
            onEdit={onEditSpace}
            onDelete={onDeleteSpace}
            readOnly={readOnly}
          />
        ))}
        {hiddenSpaceCount > 0 && (
          <button
            type="button"
            onClick={onToggleShowAllSpaces}
            className="text-left px-3 py-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            {showAllProjectSpaces
              ? "Show only this project's spaces"
              : `${hiddenSpaceCount} space${hiddenSpaceCount !== 1 ? "s" : ""} in other projects · Show`}
          </button>
        )}
      </div>

      {selectedSpaceId && (
        <div className="px-3 pb-3">
          <div className="relative">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {/* Page tree */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {selectedSpaceId ? (
          <>
            {pageTree.length === 0 && !newPageForm && !isFiltering && (
              <div className="px-3 py-4">
                <AppEmptyState
                  icon={<FaBook className="w-5 h-5" />}
                  title="This space is still empty"
                  description={readOnly
                    ? "No pages have been published in this space yet."
                    : "Start with a template so onboarding notes, runbooks or RFCs look consistent from the first page."}
                  action={canEditDocs ? (
                    <AppButton size="sm" onClick={onNewRootPage}>
                      <FaPlus className="w-3 h-3" /> Create first page
                    </AppButton>
                  ) : null}
                  className="shadow-none"
                />
              </div>
            )}
            {isFiltering && pageTree.length > 0 && canEditDocs && (
              <p className="px-3 pb-2 text-[11px] text-slate-400 dark:text-slate-500">Drag-and-drop is paused while searching.</p>
            )}
            {isFiltering && pageTree.length === 0 && (
              <p className="px-3 py-4 text-xs text-center text-slate-400 dark:text-slate-500">No pages match "{searchQuery}"</p>
            )}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="dnd-root" type="PAGE" isCombineEnabled>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {pageTree.map((node, index) => (
                      <Draggable key={node.id} draggableId={node.id} index={index} isDragDisabled={isFiltering || readOnly}>
                        {(dragProvided, dragSnapshot) => (
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                            className={dragSnapshot.isDragging ? "opacity-80 shadow-lg rounded-lg" : ""}
                          >
                            <TreeNode
                              node={node}
                              depth={0}
                              selectedPageId={selectedPageId}
                              onSelect={onSelectPage}
                              onAddChild={onAddChild}
                              onDelete={onDeletePage}
                              expandedIds={expandedIds}
                              onToggleExpand={onToggleExpand}
                              dragHandleProps={dragProvided.dragHandleProps}
                              dragDisabled={isFiltering || readOnly}
                              isCombineTarget={!!dragSnapshot.combineTargetFor}
                              readOnly={readOnly}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {newPageForm && canEditDocs && (
              <NewPageForm
                parentId={newPageForm.parentId}
                spaceId={selectedSpaceId}
                onSave={onNewPageSave}
                onCancel={onCancelNewPage}
                templateContent={newPageForm.templateContent}
                templateEmoji={newPageForm.templateEmoji}
              />
            )}
          </>
        ) : (
          <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
            Select a space to view pages
          </div>
        )}
      </div>

      {/* Bottom: Create Space */}
      {canEditDocs && (
      <div className="border-t border-slate-200 dark:border-[#252b3b] px-3 py-3">
        <button
          onClick={onOpenCreateSpace}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-dashed border-slate-200 dark:border-[#2a3044]"
        >
          <FaPlus className="w-3 h-3" />
          <span>Create Space</span>
        </button>
      </div>
      )}
    </aside>
  );
}
