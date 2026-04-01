import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FaPlus, FaChevronRight, FaChevronDown, FaTrash, FaEdit,
  FaSearch, FaBook, FaTimes, FaEllipsisH, FaGripVertical, FaGlobeAmericas,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { DocsSkeleton } from "../../../shared/components/Skeleton";
import { AppButton, AppEmptyState } from "../../../shared/components/AppPrimitives";
import { buildTree, getBreadcrumb } from "./docsTree";
import { GlobalSearchModal, PageView, SpaceOverview } from "../components/DocsPageContent";
import { DEFAULT_TEMPLATE_REGISTRY } from "../../../shared/constants/defaultTemplates";

// ─── Template Picker Modal ─────────────────────────────────────────────────────

function TemplatePickerModal({ onSelect, onClose, templates }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Choose a Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left group"
            >
              <span className="text-2xl">{t.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const TEMPLATE_CONTENT = (title) => `# ${title}

Write your content here...

## Overview

Describe what this page covers.

## Details

Add more details below.
`;

// ─── TreeNode component ───────────────────────────────────────────────────────

function TreeNode({ node, depth, selectedPageId, onSelect, onAddChild, onDelete, expandedIds, onToggleExpand, dragHandleProps, isDraggingActive, isCombineTarget }) {
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
      >
        {/* Drag handle */}
        <span
          {...(dragHandleProps || {})}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <FaGripVertical className="w-2.5 h-2.5" />
        </span>
        {/* Expand/collapse chevron */}
        <button
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
        <span className="flex-1 truncate text-xs font-medium">{node.title}</span>

        {/* Hover actions */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            title="Add child page"
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="p-1 rounded text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaPlus className="w-2.5 h-2.5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              title="More options"
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <FaEllipsisH className="w-2.5 h-2.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onAddChild(node.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <FaPlus className="w-3 h-3" /> Add child
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(node.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <FaTrash className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <Droppable droppableId={node.id} type="PAGE" isCombineEnabled>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {node.children.map((child, index) => (
                <Draggable key={child.id} draggableId={child.id} index={index}>
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
                        isDraggingActive={isDraggingActive}
                        isCombineTarget={!!dragSnapshot.combineTargetFor}
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
}

// ─── New Page Form ────────────────────────────────────────────────────────────

function NewPageForm({ parentId, spaceId, onSave, onCancel, templateContent, templateEmoji }) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(templateEmoji || "📄");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), emoji, parentId, spaceId, templateContent });
  };

  return (
    <div className="mx-2 mt-1 p-3 app-surface-muted shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-10 text-center text-lg bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-md py-1"
          maxLength={2}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Page title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          className="flex-1 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}

// ─── Create Space Modal ───────────────────────────────────────────────────────

function SpaceModal({ initialData = null, projects, onSave, onClose }) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "📘");
  const [color, setColor] = useState(initialData?.color || "#2563eb");
  const [projectId, setProjectId] = useState(initialData?.projectId || projects[0]?.id || "");

  const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(initialData || {}),
      name: name.trim(),
      key: initialData?.key || name.slice(0, 2).toUpperCase(),
      description: description.trim(),
      icon,
      color,
      projectId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{isEdit ? "Edit Space" : "Create Space"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-14 text-center text-xl bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Space Name *</label>
              <input
                type="text"
                placeholder="e.g. Engineering Docs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
            <textarea
              placeholder="What is this space for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-blue-400 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-200 dark:border-[#2a3044]">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isEdit ? "Save Changes" : "Create Space"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpaceRow({ space, isSelected, onSelect, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const onMouseDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showMenu]);

  return (
    <div
      className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20 shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
      }`}
    >
      <button
        onClick={onSelect}
        onDoubleClick={onEdit}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        title={space.description || space.name}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: space.color }}
        />
        <span className="truncate">{space.icon} {space.name}</span>
      </button>
      <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setShowMenu((value) => !value);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          title="Space actions"
        >
          <FaEllipsisH className="w-2.5 h-2.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <FaEdit className="w-3 h-3" /> Edit space
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <FaTrash className="w-3 h-3" /> Delete space
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main DocsPage ────────────────────────────────────────────────────────────

export default function DocsPage() {
  const {
    spaces, createSpace, updateSpace, deleteSpace,
    docPages, createDocPage, updateDocPage, deleteDocPage,
    projects, currentUser, templateRegistry, users, dbReady,
  } = useApp();
  const { addToast } = useToast();

  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [newPageForm, setNewPageForm] = useState(null); // { parentId }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // pageId
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pendingNewPage, setPendingNewPage] = useState(null); // { parentId }
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [deleteSpaceConfirm, setDeleteSpaceConfirm] = useState(null);
  const pageTemplates = templateRegistry?.doc?.length ? templateRegistry.doc : DEFAULT_TEMPLATE_REGISTRY.doc;

  // Auto-select first space
  useEffect(() => {
    if (spaces.length > 0 && !selectedSpaceId) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, selectedSpaceId]);

  // Pages in selected space
  const spacePages = useMemo(
    () => docPages.filter((p) => p.spaceId === selectedSpaceId),
    [docPages, selectedSpaceId]
  );

  // Filtered pages for search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return spacePages;
    const q = searchQuery.toLowerCase();
    return spacePages.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q)
    );
  }, [spacePages, searchQuery]);

  // Tree structure
  const pageTree = useMemo(() => buildTree(filteredPages), [filteredPages]);

  // Currently selected page object
  const selectedPage = useMemo(
    () => docPages.find((p) => p.id === selectedPageId) || null,
    [docPages, selectedPageId]
  );

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
    setSelectedPageId(id);
  }, []);

  const handleAddChild = useCallback((parentId) => {
    setPendingNewPage({ parentId });
    setShowTemplatePicker(true);
    setExpandedIds((prev) => new Set([...prev, parentId]));
  }, []);

  const handleTemplateSelect = useCallback((template) => {
    setShowTemplatePicker(false);
    setNewPageForm({ ...(pendingNewPage || { parentId: null }), templateContent: template.content, templateEmoji: template.emoji });
    setPendingNewPage(null);
  }, [pendingNewPage]);

  const handleNewPageSave = useCallback(({ title, emoji, parentId, spaceId, templateContent }) => {
    const now = new Date().toISOString();
    const siblings = docPages.filter((p) => p.spaceId === spaceId && p.parentId === parentId);
    const position = siblings.length;
    const id = createDocPage({
      spaceId,
      parentId: parentId || null,
      title,
      emoji,
      position,
      author: currentUser,
      content: templateContent !== undefined ? templateContent : TEMPLATE_CONTENT(title),
      labels: [],
      createdAt: now,
      updatedAt: now,
    });
    setNewPageForm(null);
    if (id) setSelectedPageId(id);
    addToast(`Page "${title}" created`, "success");
  }, [docPages, createDocPage, currentUser, addToast]);

  // DnD reordering + nesting
  const handleDragEnd = useCallback((result) => {
    const { draggableId, destination, source, combine } = result;

    const reindexSiblings = (parentId) => {
      docPages
        .filter((p) => p.spaceId === selectedSpaceId && p.id !== draggableId &&
          (parentId === null ? !p.parentId : p.parentId === parentId))
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .forEach((p, idx) => updateDocPage({ ...p, position: idx }));
    };

    // ── Combine: drop ON an item → make it a child ──────────────────────────
    if (combine) {
      const targetId = combine.draggableId;
      if (targetId === draggableId) return; // can't nest under itself
      const draggedPage = docPages.find((p) => p.id === draggableId);
      if (!draggedPage) return;
      const targetChildren = docPages
        .filter((p) => p.spaceId === selectedSpaceId && p.parentId === targetId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      updateDocPage({ ...draggedPage, parentId: targetId, position: targetChildren.length });
      const oldParentId = source.droppableId === "dnd-root" ? null : source.droppableId;
      reindexSiblings(oldParentId);
      setExpandedIds((prev) => new Set([...prev, targetId]));
      addToast(`Moved "${draggedPage.title}" under "${docPages.find((p) => p.id === targetId)?.title}"`, "success");
      return;
    }

    // ── Reorder: drop in gap between items ───────────────────────────────────
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newParentId = destination.droppableId === "dnd-root" ? null : destination.droppableId;
    const destSiblings = docPages
      .filter((p) => p.spaceId === selectedSpaceId && (newParentId === null ? !p.parentId : p.parentId === newParentId))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const withoutDragged = destSiblings.filter((p) => p.id !== draggableId);
    const draggedPage = docPages.find((p) => p.id === draggableId);
    withoutDragged.splice(destination.index, 0, draggedPage);
    withoutDragged.forEach((p, idx) => updateDocPage({ ...p, position: idx, parentId: newParentId }));

    if (newParentId) setExpandedIds((prev) => new Set([...prev, newParentId]));

    if (source.droppableId !== destination.droppableId) {
      const oldParentId = source.droppableId === "dnd-root" ? null : source.droppableId;
      reindexSiblings(oldParentId);
    }
  }, [docPages, selectedSpaceId, updateDocPage, addToast]);

  const handleDeletePage = useCallback((pageId) => {
    setDeleteConfirm(pageId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    const page = docPages.find((p) => p.id === deleteConfirm);
    deleteDocPage(deleteConfirm);
    if (selectedPageId === deleteConfirm) setSelectedPageId(null);
    setDeleteConfirm(null);
    addToast(`Page "${page?.title}" deleted`, "success");
  }, [deleteConfirm, docPages, deleteDocPage, selectedPageId, addToast]);

  const handleSave = useCallback((updatedPage) => {
    updateDocPage(updatedPage);
    addToast("Page saved", "success");
  }, [updateDocPage, addToast]);

  const handleCreateSpace = useCallback((data) => {
    const id = createSpace(data);
    setShowCreateSpace(false);
    setSelectedSpaceId(id || null);
    setSelectedPageId(null);
    addToast(`Space "${data.name}" created`, "success");
  }, [createSpace, addToast]);

  const handleUpdateSpace = useCallback((data) => {
    updateSpace(data);
    setEditingSpace(null);
    addToast(`Space "${data.name}" updated`, "success");
  }, [updateSpace, addToast]);

  const confirmDeleteSpace = useCallback(() => {
    if (!deleteSpaceConfirm) return;
    const nextSpaces = spaces.filter((space) => space.id !== deleteSpaceConfirm.id);
    deleteSpace(deleteSpaceConfirm.id);
    if (selectedSpaceId === deleteSpaceConfirm.id) {
      setSelectedSpaceId(nextSpaces[0]?.id || null);
      setSelectedPageId(null);
    }
    setDeleteSpaceConfirm(null);
    addToast(`Space "${deleteSpaceConfirm.name}" deleted`, "info");
  }, [addToast, deleteSpace, deleteSpaceConfirm, selectedSpaceId, spaces]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!dbReady) return <DocsSkeleton />;
  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#141720]">

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e] overflow-hidden max-h-[42vh] lg:max-h-none">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <div className="flex items-center gap-2">
            <FaBook className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white block">Documentation</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Knowledge base and linked work</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowGlobalSearch(true)}
              title="Search all spaces"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FaGlobeAmericas className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowCreateSpace(true)}
              title="New space"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
            </button>
          {selectedSpaceId && (
            <button
              onClick={() => { setPendingNewPage({ parentId: null }); setShowTemplatePicker(true); }}
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
          {spaces.map((space) => (
            <SpaceRow
              key={space.id}
              space={space}
              isSelected={selectedSpaceId === space.id}
              onSelect={() => { setSelectedSpaceId(space.id); setSelectedPageId(null); }}
              onEdit={() => setEditingSpace(space)}
              onDelete={() => setDeleteSpaceConfirm(space)}
            />
          ))}
        </div>

        {selectedSpaceId && (
          <div className="px-3 pb-3">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {/* Page tree */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-3">
          {selectedSpaceId ? (
            <>
              {pageTree.length === 0 && !newPageForm && (
                <div className="px-3 py-4">
                  <AppEmptyState
                    icon={<FaBook className="w-5 h-5" />}
                    title="This space is still empty"
                    description="Start with a template so onboarding notes, runbooks or RFCs look consistent from the first page."
                    action={(
                      <AppButton size="sm" onClick={() => { setPendingNewPage({ parentId: null }); setShowTemplatePicker(true); }}>
                        <FaPlus className="w-3 h-3" /> Create first page
                      </AppButton>
                    )}
                    className="shadow-none"
                  />
                </div>
              )}
              <DragDropContext
                onDragStart={() => setIsDraggingActive(true)}
                onDragEnd={(result) => { setIsDraggingActive(false); handleDragEnd(result); }}
              >
                <Droppable droppableId="dnd-root" type="PAGE" isCombineEnabled>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {pageTree.map((node, index) => (
                        <Draggable key={node.id} draggableId={node.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                              className={dragSnapshot.isDragging ? "opacity-80 shadow-lg rounded-lg" : ""}
                            >
                              <TreeNode
                                node={node}
                                depth={0}
                                selectedPageId={selectedPageId}
                                onSelect={handleSelectPage}
                                onAddChild={handleAddChild}
                                onDelete={handleDeletePage}
                                expandedIds={expandedIds}
                                onToggleExpand={toggleExpand}
                                dragHandleProps={dragProvided.dragHandleProps}
                                isDraggingActive={isDraggingActive}
                                isCombineTarget={!!dragSnapshot.combineTargetFor}
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
              {newPageForm && (
                <NewPageForm
                  parentId={newPageForm.parentId}
                  spaceId={selectedSpaceId}
                  onSave={handleNewPageSave}
                  onCancel={() => setNewPageForm(null)}
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
        <div className="border-t border-slate-200 dark:border-[#252b3b] px-3 py-3">
          <button
            onClick={() => setShowCreateSpace(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-dashed border-slate-200 dark:border-[#2a3044]"
          >
            <FaPlus className="w-3 h-3" />
            <span>Create Space</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {!selectedSpaceId ? (
          // No space selected
          <div className="p-6 lg:p-8">
            <AppEmptyState
              icon={<FaBook className="w-7 h-7" />}
              title="Welcome to Documentation"
              description="Create a space for onboarding, architecture, runbooks or release notes so knowledge is easier to discover across the workspace."
              action={(
                <AppButton onClick={() => setShowCreateSpace(true)}>
                  <FaPlus className="w-3 h-3" /> Create first space
                </AppButton>
              )}
            />
          </div>
        ) : !selectedPageId ? (
          // Space overview
          <SpaceOverview
            space={selectedSpace}
            pages={spacePages}
            onSelectPage={handleSelectPage}
            onNewPage={() => { setPendingNewPage({ parentId: null }); setShowTemplatePicker(true); }}
          />
        ) : (
          <div className="flex flex-col h-full min-w-0">
            <div className="px-6 pt-5">
              <div className="app-surface px-5 py-4">
                <div className="app-kicker mb-3">Document Context</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="app-meta-pill">
                  Owner: {selectedPageOwner?.name || selectedPage?.owner || "Unassigned"}
                  </span>
                  <span className="app-meta-pill">
                  Space owner: {selectedSpace?.owner || "Unassigned"}
                  </span>
                  {selectedPage?.updatedAt && (
                    <span className="app-meta-pill">
                      Updated {new Date(selectedPage.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  )}
                  <span className="app-meta-pill">
                    {childPages.length} child page{childPages.length !== 1 ? "s" : ""}
                  </span>
                  <span className="app-meta-pill">
                    {(selectedPage?.comments || []).length} comment{(selectedPage?.comments || []).length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
            <PageView
              page={selectedPage}
              breadcrumb={breadcrumb}
              selectedSpace={selectedSpace}
              childPages={childPages}
              onSave={handleSave}
              onDelete={() => handleDeletePage(selectedPageId)}
              onAddChild={() => handleAddChild(selectedPageId)}
              onSelectPage={handleSelectPage}
            />
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTemplatePicker && (
        <TemplatePickerModal
          templates={pageTemplates}
          onSelect={handleTemplateSelect}
          onClose={() => { setShowTemplatePicker(false); setPendingNewPage(null); }}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          spaces={spaces}
          docPages={docPages}
          onSelectPage={(spaceId, pageId) => {
            setSelectedSpaceId(spaceId);
            setSelectedPageId(pageId);
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {showCreateSpace && (
        <SpaceModal
          projects={projects}
          onSave={handleCreateSpace}
          onClose={() => setShowCreateSpace(false)}
        />
      )}

      {editingSpace && (
        <SpaceModal
          initialData={editingSpace}
          projects={projects}
          onSave={handleUpdateSpace}
          onClose={() => setEditingSpace(null)}
        />
      )}

      {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="app-surface w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">Delete Page</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to delete this page and all its child pages? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <AppButton
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </AppButton>
              <AppButton
                variant="danger"
                onClick={confirmDelete}
              >
                Delete
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {deleteSpaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="app-surface w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">Delete Space</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Delete <strong>{deleteSpaceConfirm.name}</strong> and all pages inside it? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <AppButton
                variant="secondary"
                onClick={() => setDeleteSpaceConfirm(null)}
              >
                Cancel
              </AppButton>
              <AppButton
                variant="danger"
                onClick={confirmDeleteSpace}
              >
                Delete Space
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
