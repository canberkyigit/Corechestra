import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Mention from "@tiptap/extension-mention";
import Image from "@tiptap/extension-image";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FaPlus, FaChevronRight, FaChevronDown, FaTrash, FaEdit,
  FaSearch, FaBook, FaTimes, FaHome, FaEllipsisH, FaChild,
  FaBold, FaItalic, FaStrikethrough, FaCode, FaListUl, FaListOl,
  FaQuoteLeft, FaMinus, FaImage, FaGripVertical, FaComment,
  FaAt, FaGlobeAmericas,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { formatDistanceToNow } from "date-fns";

// ─── Page Templates ────────────────────────────────────────────────────────────

const PAGE_TEMPLATES = [
  {
    id: "blank", name: "Blank Page", emoji: "📄",
    description: "Start from scratch",
    content: "",
  },
  {
    id: "meeting", name: "Meeting Notes", emoji: "📝",
    description: "Agenda, notes, action items",
    content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:**\n\n## Agenda\n\n1. \n2. \n\n## Notes\n\n## Action Items\n\n- [ ] \n- [ ] \n`,
  },
  {
    id: "rfc", name: "RFC / Proposal", emoji: "💡",
    description: "Request for comments template",
    content: `# RFC: [Title]\n\n## Summary\n\nBrief one-paragraph summary of the proposal.\n\n## Motivation\n\nWhy is this change needed?\n\n## Detailed Design\n\nExplain the design in detail.\n\n## Drawbacks\n\nWhat are the drawbacks of this proposal?\n\n## Alternatives\n\nWhat other designs were considered?\n`,
  },
  {
    id: "howto", name: "How-To Guide", emoji: "🛠️",
    description: "Step-by-step instructions",
    content: `# How To: [Task Name]\n\n## Overview\n\nWhat this guide covers.\n\n## Prerequisites\n\n- Requirement 1\n- Requirement 2\n\n## Steps\n\n### Step 1: \n\n### Step 2: \n\n### Step 3: \n\n## Troubleshooting\n\n| Problem | Solution |\n|---------|----------|\n| | |\n`,
  },
  {
    id: "api", name: "API Reference", emoji: "🔌",
    description: "Endpoints and parameters",
    content: `# API Reference: [Service Name]\n\n## Base URL\n\n\`\`\`\nhttps://api.example.com/v1\n\`\`\`\n\n## Authentication\n\nAll requests require a Bearer token.\n\n## Endpoints\n\n### GET /resource\n\n**Description:** Returns a list of resources.\n\n**Parameters:**\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n| limit | integer | No | Max results |\n\n**Response:**\n\n\`\`\`json\n{\n  "data": [],\n  "total": 0\n}\n\`\`\`\n`,
  },
  {
    id: "runbook", name: "Runbook", emoji: "🚨",
    description: "Incident response & ops procedures",
    content: `# Runbook: [Service / Incident Name]\n\n## Severity\n\n🟡 Medium\n\n## Symptoms\n\n- Symptom 1\n- Symptom 2\n\n## Investigation Steps\n\n1. Check logs: \`kubectl logs ...\`\n2. Check metrics in Grafana\n3. \n\n## Resolution\n\n### Option A — Quick fix\n\n\`\`\`bash\n# command here\n\`\`\`\n\n### Option B — Full restart\n\n## Escalation\n\nIf unresolved after 30 minutes, escalate to @oncall.\n`,
  },
];

// ─── Template Picker Modal ─────────────────────────────────────────────────────

function TemplatePickerModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Choose a Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PAGE_TEMPLATES.map((t) => (
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function buildTree(pages) {
  const map = {};
  pages.forEach((p) => { map[p.id] = { ...p, children: [] }; });
  const roots = [];
  pages.forEach((p) => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.id]);
    } else if (!p.parentId) {
      roots.push(map[p.id]);
    }
  });
  const sortNode = (node) => {
    node.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    node.children.forEach(sortNode);
    return node;
  };
  roots.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  roots.forEach(sortNode);
  return roots;
}

function flattenTree(nodes, result = []) {
  nodes.forEach((n) => { result.push(n); flattenTree(n.children, result); });
  return result;
}

function getBreadcrumb(pageId, pages) {
  const map = {};
  pages.forEach((p) => { map[p.id] = p; });
  const trail = [];
  let cur = map[pageId];
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? map[cur.parentId] : null;
  }
  return trail;
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
        className={`group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm transition-colors ${
          isCombineTarget
            ? "ring-2 ring-blue-400 bg-blue-50/60 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400"
            : isSelected
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
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
    <div className="mx-2 mt-1 p-3 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg">
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

function CreateSpaceModal({ projects, onSave, onClose }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📘");
  const [color, setColor] = useState("#2563eb");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");

  const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), key: key.trim() || name.slice(0, 2).toUpperCase(), description, icon, color, projectId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Create Space</h2>
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
            Create Space
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DocsPage ────────────────────────────────────────────────────────────

export default function DocsPage() {
  const {
    spaces, createSpace, deleteSpace,
    docPages, createDocPage, updateDocPage, deleteDocPage,
    projects, currentUser, users,
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pendingNewPage, setPendingNewPage] = useState(null); // { parentId }
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

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
    createSpace(data);
    setShowCreateSpace(false);
    addToast(`Space "${data.name}" created`, "success");
  }, [createSpace, addToast]);

  // Detect dark mode
  const isDark = document.documentElement.classList.contains("dark");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-[#141720]">

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-[#252b3b]">
          <div className="flex items-center gap-2">
            <FaBook className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Documentation</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowGlobalSearch(true)}
              title="Search all spaces"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FaGlobeAmericas className="w-3 h-3" />
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
        <div className="px-2 pt-2 pb-1 flex flex-col gap-1">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => { setSelectedSpaceId(space.id); setSelectedPageId(null); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedSpaceId === space.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="truncate">{space.icon} {space.name}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        {selectedSpaceId && (
          <div className="px-2 pb-2">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {/* Page tree */}
        <div className="flex-1 overflow-y-auto px-1 pb-2">
          {selectedSpaceId ? (
            <>
              {pageTree.length === 0 && !newPageForm && (
                <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                  No pages yet.{" "}
                  <button
                    onClick={() => { setPendingNewPage({ parentId: null }); setShowTemplatePicker(true); }}
                    className="text-blue-500 hover:underline"
                  >
                    Create one
                  </button>
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
        <div className="border-t border-slate-200 dark:border-[#252b3b] px-2 py-2">
          <button
            onClick={() => setShowCreateSpace(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            <span>Create Space</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {!selectedSpaceId ? (
          // No space selected
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <FaBook className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Welcome to Documentation</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              Select a space from the left panel to browse documentation, or create a new space to get started.
            </p>
            <button
              onClick={() => setShowCreateSpace(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FaPlus className="w-3 h-3" /> Create Space
            </button>
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
          // Page view/edit
          <PageView
            page={selectedPage}
            breadcrumb={breadcrumb}
            selectedSpace={selectedSpace}
            childPages={childPages}
            onSave={handleSave}
            onDelete={() => handleDeletePage(selectedPageId)}
            onAddChild={() => handleAddChild(selectedPageId)}
            onSelectPage={handleSelectPage}
            isDark={isDark}
          />
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTemplatePicker && (
        <TemplatePickerModal
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
        <CreateSpaceModal
          projects={projects}
          onSave={handleCreateSpace}
          onClose={() => setShowCreateSpace(false)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">Delete Page</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to delete this page and all its child pages? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Space Overview ───────────────────────────────────────────────────────────

function SpaceOverview({ space, pages, onSelectPage, onNewPage }) {
  const rootPages = pages.filter((p) => !p.parentId);
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Space header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: space?.color + "22", border: `2px solid ${space?.color}44` }}
        >
          {space?.icon || "📘"}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{space?.name}</h1>
          {space?.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{space.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{pages.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Pages</div>
        </div>
        <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{rootPages.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Root Pages</div>
        </div>
        <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {pages.length > 0 ? relativeTime(
              [...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.updatedAt
            ) : "—"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last Updated</div>
        </div>
      </div>

      {/* Root pages */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pages</h2>
          <button
            onClick={onNewPage}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            <FaPlus className="w-2.5 h-2.5" /> New Page
          </button>
        </div>
        {rootPages.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl">
            <p className="text-sm text-slate-400 mb-3">No pages yet</p>
            <button
              onClick={onNewPage}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create first page
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            {rootPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className="flex items-center gap-3 p-4 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all text-left group"
              >
                <span className="text-2xl">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {page.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Updated {relativeTime(page.updatedAt)}
                  </div>
                </div>
                <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recently updated */}
      {recentPages.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recently Updated</h2>
          <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden">
            {recentPages.map((page, i) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${
                  i < recentPages.length - 1 ? "border-b border-slate-100 dark:border-[#252b3b]" : ""
                }`}
              >
                <span className="text-base">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{page.title}</div>
                  <div className="text-xs text-slate-400">{relativeTime(page.updatedAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Doc Comments ─────────────────────────────────────────────────────────────

function DocComments({ pageId }) {
  const { docPages, addDocComment, deleteDocComment, currentUser } = useApp();
  const [text, setText] = useState("");
  const page = docPages.find((p) => p.id === pageId);
  const comments = page?.comments || [];

  const handlePost = () => {
    if (!text.trim()) return;
    addDocComment(pageId, text.trim());
    setText("");
  };

  return (
    <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
      <div className="flex items-center gap-2 mb-5">
        <FaComment className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Comments {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
        </h3>
      </div>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">
                {c.author?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{c.author}</span>
                  <span className="text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.text}</p>
              </div>
              {c.author === currentUser && (
                <button
                  onClick={() => deleteDocComment(pageId, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                >
                  <FaTrash className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">No comments yet. Be the first to comment.</p>
      )}

      {/* New comment input */}
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-1">
          {currentUser?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
            placeholder="Add a comment… (Ctrl+Enter to post)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePost}
              disabled={!text.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Global Search Modal ───────────────────────────────────────────────────────

function GlobalSearchModal({ spaces, docPages, onSelectPage, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return docPages
      .filter((p) => p.title.toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q))
      .slice(0, 20)
      .map((p) => {
        const space = spaces.find((s) => s.id === p.spaceId);
        const idx = (p.content || "").toLowerCase().indexOf(q);
        const snippet = idx >= 0
          ? "…" + p.content.slice(Math.max(0, idx - 40), idx + 80).replace(/[#*`]/g, "") + "…"
          : "";
        return { ...p, spaceName: space?.name, spaceColor: space?.color, snippet };
      });
  }, [query, docPages, spaces]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <FaSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all spaces…"
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {!query.trim() && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Start typing to search pages across all spaces</p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => { onSelectPage(r.spaceId, r.id); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left border-b border-slate-100 dark:border-[#252b3b] last:border-0"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{r.emoji || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</span>
                  {r.spaceName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: (r.spaceColor || "#2563eb") + "22", color: r.spaceColor || "#2563eb" }}>
                      {r.spaceName}
                    </span>
                  )}
                </div>
                {r.snippet && <p className="text-xs text-slate-400 truncate">{r.snippet}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TipTap Toolbar ───────────────────────────────────────────────────────────

function TipTapToolbar({ editor, onImageClick, onAtClick }) {
  if (!editor) return null;

  const Btn = ({ active, onClick, title, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
  const Sep = () => <span className="w-px h-4 bg-slate-200 dark:bg-[#2a3044] mx-1 flex-shrink-0" />;

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50/80 dark:bg-[#1a1f2e]/80 rounded-t-xl overflow-x-auto">
      <Btn active={editor.isActive("bold")}        onClick={() => editor.chain().focus().toggleBold().run()}        title="Bold"><FaBold className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("italic")}      onClick={() => editor.chain().focus().toggleItalic().run()}      title="Italic"><FaItalic className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("strike")}      onClick={() => editor.chain().focus().toggleStrike().run()}      title="Strikethrough"><FaStrikethrough className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("code")}        onClick={() => editor.chain().focus().toggleCode().run()}        title="Inline code"><FaCode className="w-3 h-3" /></Btn>
      <Sep />
      <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><span className="font-bold text-[11px]">H1</span></Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><span className="font-bold text-[11px]">H2</span></Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><span className="font-bold text-[11px]">H3</span></Btn>
      <Sep />
      <Btn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list"><FaListUl className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><FaListOl className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("blockquote")}  onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Blockquote"><FaQuoteLeft className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("codeBlock")}   onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="Code block"><span className="font-mono text-[11px]">{ "```" }</span></Btn>
      <Sep />
      <Btn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><FaMinus className="w-3 h-3" /></Btn>
      <Sep />
      <Btn active={false} onClick={onImageClick} title="Insert image"><FaImage className="w-3 h-3" /></Btn>
      <Btn active={false} onClick={onAtClick} title="Mention someone (@)"><FaAt className="w-3 h-3" /></Btn>
    </div>
  );
}

// ─── Page View ────────────────────────────────────────────────────────────────

function PageView({
  page, breadcrumb, selectedSpace, childPages,
  onSave, onDelete, onAddChild, onSelectPage,
  isDark,
}) {
  const { users } = useApp();
  const [draftContent, setDraftContent] = useState(page.content || "");
  const [draftTitle, setDraftTitle]     = useState(page.title || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [unsaved, setUnsaved]           = useState(false);
  const [mentionDropdown, setMentionDropdown] = useState({ open: false, items: [], rect: null, selectedIndex: 0 });
  const [showImageModal, setShowImageModal]   = useState(false);
  const [imageUrl, setImageUrl]               = useState("");
  const imageFileRef = useRef(null);
  const titleInputRef = useRef(null);
  const mentionCommandRef = useRef(null);
  const mentionItemsRef   = useRef([]);
  const mentionIndexRef   = useRef(0);
  const usersRef = useRef(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, transformPastedText: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Mention.configure({
        HTMLAttributes: { class: "doc-mention" },
        suggestion: {
          items: ({ query }) =>
            (usersRef.current || [])
              .filter((u) => u.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 6),
          render: () => ({
            onStart: (props) => {
              mentionCommandRef.current = props.command;
              mentionItemsRef.current = props.items;
              mentionIndexRef.current = 0;
              setMentionDropdown({ open: true, items: props.items, rect: props.clientRect?.(), selectedIndex: 0 });
            },
            onUpdate: (props) => {
              mentionCommandRef.current = props.command;
              mentionItemsRef.current = props.items;
              setMentionDropdown((d) => ({ ...d, items: props.items, rect: props.clientRect?.() }));
            },
            onKeyDown: ({ event }) => {
              if (event.key === "Escape") { setMentionDropdown((d) => ({ ...d, open: false })); return true; }
              if (event.key === "ArrowDown") {
                mentionIndexRef.current = Math.min(mentionIndexRef.current + 1, mentionItemsRef.current.length - 1);
                setMentionDropdown((d) => ({ ...d, selectedIndex: mentionIndexRef.current }));
                return true;
              }
              if (event.key === "ArrowUp") {
                mentionIndexRef.current = Math.max(mentionIndexRef.current - 1, 0);
                setMentionDropdown((d) => ({ ...d, selectedIndex: mentionIndexRef.current }));
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                const item = mentionItemsRef.current[mentionIndexRef.current];
                if (item) { mentionCommandRef.current?.({ id: item, label: item }); setMentionDropdown((d) => ({ ...d, open: false })); }
                return true;
              }
              return false;
            },
            onExit: () => setMentionDropdown((d) => ({ ...d, open: false })),
          }),
        },
      }),
    ],
    content: draftContent,
    editable: false,
    onUpdate: ({ editor: e }) => {
      if (!e.isEditable) return;
      const md = e.storage.markdown.getMarkdown();
      setDraftContent(md);
      setUnsaved(true);
    },
  });

  const handleInsertImage = (src) => {
    if (!src) return;
    editor?.chain().focus().setImage({ src }).run();
    setShowImageModal(false);
    setImageUrl("");
    setUnsaved(true);
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleInsertImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Sync when navigating to another page
  useEffect(() => {
    setDraftContent(page.content || "");
    setDraftTitle(page.title || "");
    setIsEditing(false);
    setEditingTitle(false);
    setUnsaved(false);
    editor?.commands.setContent(page.content || "", false); // false = don't emit update
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle editable state on editor when isEditing changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing, false); // false = don't emit transaction
    if (isEditing) setTimeout(() => editor.commands.focus("end"), 50);
  }, [isEditing, editor]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // Ctrl+S while editing
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        commitSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const commitSave = () => {
    onSave({ ...page, title: draftTitle.trim() || page.title, content: draftContent, updatedAt: new Date().toISOString() });
    setIsEditing(false);
    setUnsaved(false);
  };

  const handleDiscard = () => {
    const original = page.content || "";
    setDraftContent(original);
    setDraftTitle(page.title || "");
    editor?.commands.setContent(original, false);
    setIsEditing(false);
    setUnsaved(false);
  };

  const handleTitleBlur = () => {
    if (!draftTitle.trim()) { setDraftTitle(page.title); setEditingTitle(false); return; }
    if (draftTitle.trim() !== page.title) {
      onSave({ ...page, title: draftTitle.trim(), updatedAt: new Date().toISOString() });
    }
    setEditingTitle(false);
  };

  if (!page) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 pb-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-5 flex-wrap">
        <FaHome className="w-3 h-3" />
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-500 dark:text-slate-400">{selectedSpace?.name}</span>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            {i < breadcrumb.length - 1 ? (
              <button onClick={() => onSelectPage(crumb.id)} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                {crumb.emoji} {crumb.title}
              </button>
            ) : (
              <span className="text-slate-700 dark:text-slate-300 font-medium">{crumb.emoji} {crumb.title}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-4xl leading-none select-none mt-1">{page.emoji || "📄"}</span>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleBlur();
                  if (e.key === "Escape") { setDraftTitle(page.title); setEditingTitle(false); }
                }}
                className="w-full text-3xl font-bold bg-transparent border-b-2 border-blue-400 text-slate-800 dark:text-white focus:outline-none pb-1"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-3xl font-bold text-slate-800 dark:text-white cursor-text hover:opacity-80 transition-opacity leading-tight"
                title="Click to edit title"
              >
                {page.title}
              </h1>
            )}
          </div>
        </div>
        {/* Page actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
          <button
            onClick={() => { if (isEditing) { handleDiscard(); } else { setIsEditing(true); } }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
              isEditing
                ? "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
          >
            {isEditing ? <><FaTimes className="w-3 h-3" /> Cancel</> : <><FaEdit className="w-3 h-3" /> Edit</>}
          </button>
          <button
            onClick={onAddChild}
            title="Add child page"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <FaChild className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            title="Delete page"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mb-8 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
            {page.author?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="capitalize">{page.author}</span>
        </div>
        <span>Updated {relativeTime(page.updatedAt)}</span>
        <span>Created {relativeTime(page.createdAt)}</span>
        {page.labels?.length > 0 && page.labels.map((lbl) => (
          <span key={lbl} className="px-2 py-0.5 bg-slate-100 dark:bg-[#232838] rounded-full text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {lbl}
          </span>
        ))}
      </div>

      {/* ── Content area (TipTap WYSIWYG) ── */}
      <div className={`docs-tiptap rounded-xl transition-all relative ${isEditing ? "border border-slate-200 dark:border-[#2a3044] ring-1 ring-blue-400/30" : ""}`}>
        {isEditing && (
          <TipTapToolbar
            editor={editor}
            onImageClick={() => setShowImageModal(true)}
            onAtClick={() => editor?.chain().focus().insertContent("@").run()}
          />
        )}
        <div className={isEditing ? "p-4" : ""}>
          <EditorContent editor={editor} />
        </div>

        {/* Mention dropdown */}
        {mentionDropdown.open && mentionDropdown.items.length > 0 && mentionDropdown.rect && (
          <div
            className="fixed z-[100] bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-[160px]"
            style={{ top: mentionDropdown.rect.bottom + 4, left: mentionDropdown.rect.left }}
          >
            {mentionDropdown.items.map((item, i) => (
              <button
                key={item}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === mentionDropdown.selectedIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  mentionCommandRef.current?.({ id: item, label: item });
                  setMentionDropdown((d) => ({ ...d, open: false }));
                }}
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {item[0]?.toUpperCase()}
                </div>
                <span className="capitalize">{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image insert modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Insert Image</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInsertImage(imageUrl); }}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
              </div>
              <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              <button
                onClick={() => imageFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <FaImage className="w-3.5 h-3.5" /> Upload from device
              </button>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowImageModal(false); setImageUrl(""); }} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleInsertImage(imageUrl)} disabled={!imageUrl.trim()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Child pages */}
      {childPages.length > 0 && (
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Child Pages</h3>
          <div className="grid gap-2">
            {childPages.map((child) => (
              <button
                key={child.id}
                onClick={(e) => { e.stopPropagation(); onSelectPage(child.id); }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all text-left group"
              >
                <span className="text-xl">{child.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{child.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated {relativeTime(child.updatedAt)}</div>
                </div>
                <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <DocComments pageId={page.id} />

      {/* ── Floating save bar ── */}
      {unsaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 animate-modal-enter">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Unsaved changes</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">Ctrl+S</span>
          <div className="w-px h-4 bg-slate-200 dark:bg-[#2a3044]" />
          <button
            onClick={handleDiscard}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={commitSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
