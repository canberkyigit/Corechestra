import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronRight, FaFolder, FaFolderOpen, FaLayerGroup, FaPen, FaPlus, FaTrashAlt, FaArrowUp, FaArrowDown,
} from "react-icons/fa";
import OverflowMenu from "../components/OverflowMenu";
import { flattenTree } from "../utils/testingTree";
import { DND_CASES, DND_FOLDER, dropZone, hasDragType, readDragData, setDragData } from "./dnd";

const ALL_ID = "__all__";

function RenameInput({ initial, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      type="text"
      aria-label="Folder name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") onSubmit(value);
        if (event.key === "Escape") onCancel();
      }}
      onBlur={() => onSubmit(value)}
      className="h-7 w-full min-w-0 rounded-md border border-blue-400 bg-white/100 px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#141720] dark:text-white"
    />
  );
}

/**
 * Suites → nested folders. Native drag-and-drop: drop a folder before/after/
 * inside another folder, or drop cases onto a folder to move them.
 * Keyboard: ↑/↓ move, →/← expand/collapse, Enter select, F2 rename,
 * Alt+↑/↓ reorder, Delete removes.
 */
function SuiteTree({
  tree, counts, totalCount, selectedId, expanded, onToggle, onExpandAll, onSelect, canEdit,
  onCreateFolder, onRename, onDelete, onMoveFolder, onDropCases,
}) {
  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);
  const [focusedId, setFocusedId] = useState(selectedId || ALL_ID);
  const [renamingId, setRenamingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, zone }
  const rowRefs = useRef({});
  const ids = useMemo(() => [ALL_ID, ...rows.map((row) => row.suite.id)], [rows]);

  useEffect(() => {
    if (selectedId) setFocusedId(selectedId);
  }, [selectedId]);

  const focusRow = (id) => {
    setFocusedId(id);
    rowRefs.current[id]?.focus();
  };

  const siblingsOf = (suite) => (suite.parentId ? tree.childrenById.get(suite.parentId) : tree.roots) || [];

  const reorder = (suite, direction) => {
    const siblings = siblingsOf(suite);
    const index = siblings.findIndex((item) => item.id === suite.id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    onMoveFolder(suite.id, suite.parentId || null, target);
  };

  const onKeyDown = (event) => {
    if (renamingId) return;
    const index = ids.indexOf(focusedId);
    const row = rows.find((item) => item.suite.id === focusedId);
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown") && row && canEdit) {
      event.preventDefault();
      reorder(row.suite, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(ids[Math.min(ids.length - 1, index + 1)]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(ids[Math.max(0, index - 1)]);
        break;
      case "Home":
        event.preventDefault();
        focusRow(ids[0]);
        break;
      case "End":
        event.preventDefault();
        focusRow(ids[ids.length - 1]);
        break;
      case "ArrowRight":
        if (row?.hasChildren) {
          event.preventDefault();
          if (!row.expanded) onToggle(row.suite.id);
          else focusRow((tree.childrenById.get(row.suite.id) || [])[0]?.id || row.suite.id);
        }
        break;
      case "ArrowLeft":
        if (row) {
          event.preventDefault();
          if (row.expanded) onToggle(row.suite.id);
          else if (row.suite.parentId) focusRow(row.suite.parentId);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect(focusedId === ALL_ID ? null : focusedId);
        break;
      case "F2":
        if (row && canEdit) {
          event.preventDefault();
          setRenamingId(row.suite.id);
        }
        break;
      case "Delete":
        if (row && canEdit) {
          event.preventDefault();
          onDelete(row.suite);
        }
        break;
      default:
    }
  };

  const handleDragOver = (event, suite) => {
    if (!canEdit) return;
    const isCases = hasDragType(event, DND_CASES);
    const isFolder = hasDragType(event, DND_FOLDER);
    if (!isCases && !isFolder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const zone = isCases ? "inside" : dropZone(event, event.currentTarget);
    if (dropTarget?.id !== suite.id || dropTarget?.zone !== zone) setDropTarget({ id: suite.id, zone });
  };

  const handleDrop = (event, suite) => {
    if (!canEdit) return;
    event.preventDefault();
    const zone = dropTarget?.id === suite.id ? dropTarget.zone : "inside";
    setDropTarget(null);
    const caseIds = readDragData(event, DND_CASES);
    if (caseIds?.length) {
      onDropCases(caseIds, suite.id);
      return;
    }
    const folderId = readDragData(event, DND_FOLDER);
    if (!folderId || folderId === suite.id) return;
    if (zone === "inside") {
      onMoveFolder(folderId, suite.id, null);
      if (!expanded.has(suite.id)) onToggle(suite.id);
      return;
    }
    const siblings = siblingsOf(suite).filter((item) => item.id !== folderId);
    const index = siblings.findIndex((item) => item.id === suite.id);
    onMoveFolder(folderId, suite.parentId || null, zone === "before" ? index : index + 1);
  };

  const rowBase = "group relative flex h-8 w-full items-center gap-1.5 rounded-md pr-1 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Suites & folders</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onExpandAll} className="inline-flex h-7 items-center rounded-md px-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-500/10 hover:text-slate-800 dark:hover:text-white" title="Expand or collapse all">
            {expanded.size ? "Collapse" : "Expand"}
          </button>
          {canEdit && (
            <button type="button" onClick={() => onCreateFolder(null)} aria-label="New suite" title="New suite" data-testid="tests-new-suite" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-300 dark:hover:text-white">
              <FaPlus className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div role="tree" aria-label="Test suites and folders" onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" data-testid="tests-suite-tree">
        <button
          ref={(node) => { rowRefs.current[ALL_ID] = node; }}
          type="button"
          role="treeitem"
          aria-level={1}
          aria-selected={!selectedId}
          tabIndex={focusedId === ALL_ID ? 0 : -1}
          onClick={() => { setFocusedId(ALL_ID); onSelect(null); }}
          className={`${rowBase} pl-2 ${!selectedId ? "bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-300" : "text-slate-700 hover:bg-slate-500/[0.07]"}`}
        >
          <FaLayerGroup className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
          <span className="flex-1 truncate">All test cases</span>
          <span className="text-[11px] tabular-nums text-slate-500">{totalCount}</span>
        </button>
        {rows.map(({ suite, depth, hasChildren, expanded: isOpen }) => {
          const selected = suite.id === selectedId;
          const target = dropTarget?.id === suite.id ? dropTarget.zone : null;
          const FolderIcon = isOpen ? FaFolderOpen : FaFolder;
          return (
            <div
              key={suite.id}
              ref={(node) => { rowRefs.current[suite.id] = node; }}
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-selected={selected}
              aria-label={`${suite.name}, ${counts.get(suite.id) || 0} cases`}
              tabIndex={focusedId === suite.id ? 0 : -1}
              draggable={canEdit && renamingId !== suite.id}
              onDragStart={(event) => { event.stopPropagation(); setDragData(event, DND_FOLDER, suite.id); }}
              onDragOver={(event) => handleDragOver(event, suite)}
              onDragLeave={() => setDropTarget((prev) => (prev?.id === suite.id ? null : prev))}
              onDrop={(event) => handleDrop(event, suite)}
              onDragEnd={() => setDropTarget(null)}
              onClick={() => { setFocusedId(suite.id); onSelect(suite.id); }}
              onDoubleClick={() => canEdit && setRenamingId(suite.id)}
              data-testid={`tests-folder-${suite.id}`}
              className={`${rowBase} cursor-pointer ${
                selected ? "bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-300" : "text-slate-700 hover:bg-slate-500/[0.07]"
              } ${target === "inside" ? "ring-2 ring-inset ring-blue-500/60 bg-blue-500/10" : ""}`}
              style={{ paddingLeft: 6 + depth * 14 }}
            >
              {target === "before" && <span className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded bg-blue-500" aria-hidden="true" />}
              {target === "after" && <span className="pointer-events-none absolute inset-x-1 -bottom-px h-0.5 rounded bg-blue-500" aria-hidden="true" />}
              <span
                role="presentation"
                onClick={(event) => {
                  if (!hasChildren) return;
                  event.stopPropagation();
                  onToggle(suite.id);
                }}
                className={`inline-flex h-5 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 ${hasChildren ? "hover:text-slate-900 dark:hover:text-white" : "opacity-0"}`}
              >
                <FaChevronRight className={`h-2.5 w-2.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </span>
              <FolderIcon className={`h-3.5 w-3.5 flex-shrink-0 ${depth === 0 ? "text-blue-500 dark:text-blue-400" : "text-amber-500 dark:text-amber-400"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {renamingId === suite.id ? (
                  <RenameInput
                    initial={suite.name}
                    onCancel={() => setRenamingId(null)}
                    onSubmit={(value) => {
                      setRenamingId(null);
                      onRename(suite, value);
                      rowRefs.current[suite.id]?.focus();
                    }}
                  />
                ) : suite.name}
              </span>
              {suite.sample && renamingId !== suite.id && <span className="hidden rounded bg-slate-500/10 px-1 text-[9px] font-semibold uppercase text-slate-500 group-hover:inline">Sample</span>}
              <span className="text-[11px] tabular-nums text-slate-500 group-hover:hidden group-focus-within:hidden">{counts.get(suite.id) || 0}</span>
              {canEdit && (
                <span className="hidden group-hover:inline-flex group-focus-within:inline-flex" onClick={(event) => event.stopPropagation()} role="presentation">
                  <OverflowMenu
                    label={`Actions for ${suite.name}`}
                    triggerClassName="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-500/15 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-white"
                    items={[
                      { id: "new", label: "New sub-folder", icon: FaPlus, onSelect: () => onCreateFolder(suite.id) },
                      { id: "rename", label: "Rename", icon: FaPen, hint: "F2", onSelect: () => setRenamingId(suite.id) },
                      { id: "up", label: "Move up", icon: FaArrowUp, hint: "Alt+↑", onSelect: () => reorder(suite, -1) },
                      { id: "down", label: "Move down", icon: FaArrowDown, hint: "Alt+↓", onSelect: () => reorder(suite, 1) },
                      suite.parentId && { id: "root", label: "Move to top level", icon: FaLayerGroup, onSelect: () => onMoveFolder(suite.id, null, null) },
                      { id: "div", divider: true },
                      { id: "delete", label: "Delete…", icon: FaTrashAlt, danger: true, onSelect: () => onDelete(suite) },
                    ]}
                  />
                </span>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-500">No suites yet.</p>}
      </div>
    </div>
  );
}

export default memo(SuiteTree);
