import React, { memo, useEffect, useRef, useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { FaChevronDown, FaChevronRight, FaEllipsisH, FaGripVertical, FaPlus, FaTrash } from "react-icons/fa";

// Recursive page-tree row. Memoized: callbacks passed in must be stable.
const TreeNode = memo(function TreeNode({ node, depth, selectedPageId, onSelect, onAddChild, onDelete, expandedIds, onToggleExpand, dragHandleProps, dragDisabled, isCombineTarget, readOnly = false }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedPageId === node.id;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div>
      <div
        data-testid={`docs-tree-node-${node.id}`}
        className={`docs-tree-node-surface group flex items-center gap-1 px-2.5 py-1.5 cursor-pointer text-sm transition-all ${
          isCombineTarget
            ? "is-combine-target text-blue-600 dark:text-blue-400"
            : isSelected
            ? "is-selected text-blue-600 dark:text-blue-400"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-label={node.title}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node.id);
          } else if (event.key === "ArrowRight" && hasChildren && !isExpanded) {
            event.preventDefault();
            onToggleExpand(node.id);
          } else if (event.key === "ArrowLeft" && hasChildren && isExpanded) {
            event.preventDefault();
            onToggleExpand(node.id);
          }
        }}
      >
        {/* Drag handle */}
        {readOnly ? (
          <span className="w-4 h-4 flex-shrink-0" {...(dragHandleProps || {})} />
        ) : (
          <span
            {...(dragHandleProps || {})}
            className={`w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-300 dark:text-slate-600 opacity-0 transition-opacity ${dragDisabled ? "cursor-not-allowed" : "group-hover:opacity-100 cursor-grab active:cursor-grabbing"}`}
            title={dragDisabled ? "Clear the search to reorder pages" : "Drag to reorder or nest"}
            onClick={(e) => e.stopPropagation()}
          >
            <FaGripVertical className="w-2.5 h-2.5" />
          </span>
        )}
        {/* Expand/collapse chevron */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={hasChildren ? `${isExpanded ? "Collapse" : "Expand"} ${node.title}` : undefined}
          aria-hidden={hasChildren ? undefined : true}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id); }}
        >
          {hasChildren ? (
            isExpanded ? <FaChevronDown className="w-2.5 h-2.5" /> : <FaChevronRight className="w-2.5 h-2.5" />
          ) : (
            <span className="w-2.5 h-2.5" />
          )}
        </button>

        {/* Emoji + title */}
        <span className="text-sm flex-shrink-0">{node.emoji || "📄"}</span>
        <span className="flex-1 truncate text-xs font-medium" title={node.title}>{node.title}</span>

        {/* Hover actions */}
        {!readOnly && (
        <div className={`items-center gap-0.5 flex-shrink-0 ${showMenu ? "flex" : "flex sm:hidden sm:group-hover:flex sm:group-focus-within:flex"}`}>
          <button
            type="button"
            title="Add child page"
            aria-label={`Add child page to ${node.title}`}
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="p-1 rounded text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaPlus className="w-2.5 h-2.5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title="More options"
              aria-label={`More options for ${node.title}`}
              aria-haspopup="menu"
              aria-expanded={showMenu}
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              onKeyDown={(e) => { if (e.key === "Escape" && showMenu) { e.preventDefault(); e.stopPropagation(); setShowMenu(false); } }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <FaEllipsisH className="w-2.5 h-2.5" />
            </button>
            {showMenu && (
              <div role="menu" className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onAddChild(node.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <FaPlus className="w-3 h-3" /> Add child
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(node.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <FaTrash className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <Droppable droppableId={node.id} type="PAGE" isCombineEnabled>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {node.children.map((child, index) => (
                <Draggable key={child.id} draggableId={child.id} index={index} isDragDisabled={dragDisabled}>
                  {(dragProvided, dragSnapshot) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                      className={dragSnapshot.isDragging ? "opacity-80 shadow-lg rounded-lg" : ""}
                    >
                      <TreeNode
                        node={child}
                        depth={depth + 1}
                        selectedPageId={selectedPageId}
                        onSelect={onSelect}
                        onAddChild={onAddChild}
                        onDelete={onDelete}
                        expandedIds={expandedIds}
                        onToggleExpand={onToggleExpand}
                        dragHandleProps={dragProvided.dragHandleProps}
                        dragDisabled={dragDisabled}
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
      )}
    </div>
  );
});

export default TreeNode;
