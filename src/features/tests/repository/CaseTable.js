import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FaGripVertical, FaLink, FaSortDown, FaSortUp } from "react-icons/fa";
import { CASE_COLUMNS, CASE_TYPE_LABELS, VIRTUALIZE_THRESHOLD } from "../constants/testingConstants";
import { AutomationChip, Avatar, CaseStatusChip, PriorityBadge, ResultChip, TagList } from "../components/ui";
import { formatEstimate } from "../utils/testingFormat";
import { DND_CASES, hasDragType, readDragData, setDragData } from "./dnd";

const ROW_HEIGHT = 44;
const COLUMN_TRACK = {
  key: "70px",
  title: "minmax(200px,1fr)",
  priority: "88px",
  type: "104px",
  automation: "108px",
  status: "108px",
  owner: "116px",
  estimate: "70px",
  tags: "140px",
  lastResult: "100px",
  requirements: "50px",
};
const SORTABLE = new Set(["key", "title", "priority", "lastResult", "status", "owner"]);

function Cell({ column, testCase, users, latest, path }) {
  switch (column) {
    case "key":
      return <span className="font-mono text-[11px] font-medium text-slate-500">{testCase.key}</span>;
    case "title":
      return (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-900">{testCase.title}</span>
          {path && <span className="block truncate text-[11px] text-slate-500">{path}</span>}
        </span>
      );
    case "priority":
      return <PriorityBadge priority={testCase.priority} />;
    case "type":
      return <span className="truncate text-xs text-slate-600">{CASE_TYPE_LABELS[testCase.type]}</span>;
    case "automation":
      return <AutomationChip automation={testCase.automation} />;
    case "status":
      return <CaseStatusChip status={testCase.status} />;
    case "owner":
      return <Avatar users={users} username={testCase.owner} showName size="xs" />;
    case "estimate":
      return <span className="text-xs tabular-nums text-slate-600">{formatEstimate(testCase.estimate)}</span>;
    case "tags":
      return <TagList tags={testCase.tags} max={2} />;
    case "lastResult":
      return <ResultChip status={latest?.status || testCase.legacyResult || "untested"} />;
    case "requirements":
      return testCase.requirementIds.length ? (
        <span className="inline-flex items-center gap-1 text-xs tabular-nums text-slate-600" title={`${testCase.requirementIds.length} linked requirements`}>
          <FaLink className="h-2.5 w-2.5 opacity-60" />{testCase.requirementIds.length}
        </span>
      ) : <span className="text-xs text-slate-500">—</span>;
    default:
      return null;
  }
}

/**
 * Repository case grid. Keyboard: ↑/↓ move the active row, Enter opens,
 * Space toggles selection, Shift+↑/↓ extends, Ctrl/⌘+A selects all.
 * Rows virtualize above VIRTUALIZE_THRESHOLD. Drag rows onto a folder to
 * move them, or onto another row to reorder (manual order only).
 */
function CaseTable({
  cases, columns, users, latestMap, pathById, showPath, selectedIds, onToggleSelect, onSelectRange, onSelectAll,
  onOpen, openId, sort, onSort, canEdit, canReorder, onReorder,
}) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropBefore, setDropBefore] = useState(null);
  const anchorRef = useRef(null);
  const virtual = cases.length > VIRTUALIZE_THRESHOLD;
  const template = useMemo(() => `36px ${columns.map((column) => COLUMN_TRACK[column] || "100px").join(" ")}`, [columns]);
  const minWidth = useMemo(() => 36 + columns.reduce((sum, column) => sum + (column === "title" ? 200 : Number.parseInt(COLUMN_TRACK[column], 10) || 100), 0), [columns]);
  const allSelected = cases.length > 0 && cases.every((testCase) => selectedIds.has(testCase.id));
  const someSelected = !allSelected && cases.some((testCase) => selectedIds.has(testCase.id));

  const virtualizer = useVirtualizer({
    count: virtual ? cases.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 14,
  });

  useEffect(() => {
    if (activeIndex >= cases.length) setActiveIndex(Math.max(0, cases.length - 1));
  }, [cases.length, activeIndex]);

  const scrollToIndex = useCallback((index) => {
    if (virtual) virtualizer.scrollToIndex(index, { align: "auto" });
    else containerRef.current?.querySelector(`[data-row-index="${index}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [virtual, virtualizer]);

  const onKeyDown = (event) => {
    if (!cases.length) return;
    if (event.target.tagName === "INPUT" && event.target.type !== "checkbox") return;
    const move = (delta) => {
      event.preventDefault();
      const next = Math.max(0, Math.min(cases.length - 1, activeIndex + delta));
      setActiveIndex(next);
      scrollToIndex(next);
      if (event.shiftKey) {
        if (anchorRef.current === null) anchorRef.current = activeIndex;
        onSelectRange(cases.slice(Math.min(anchorRef.current, next), Math.max(anchorRef.current, next) + 1).map((testCase) => testCase.id));
      } else {
        anchorRef.current = null;
      }
    };
    if (event.key === "ArrowDown" || event.key === "j") move(1);
    else if (event.key === "ArrowUp" || event.key === "k") move(-1);
    else if (event.key === "Home") move(-cases.length);
    else if (event.key === "End") move(cases.length);
    else if (event.key === "Enter") {
      event.preventDefault();
      onOpen(cases[activeIndex].id);
    } else if (event.key === " ") {
      event.preventDefault();
      onToggleSelect(cases[activeIndex].id);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      onSelectAll(true);
    } else if (event.key === "Escape" && selectedIds.size) {
      event.preventDefault();
      onSelectAll(false);
    }
  };

  const handleRowDragStart = (event, testCase) => {
    if (!canEdit) return;
    const ids = selectedIds.has(testCase.id) ? cases.filter((item) => selectedIds.has(item.id)).map((item) => item.id) : [testCase.id];
    setDragData(event, DND_CASES, ids);
  };

  const renderRow = (testCase, index, style) => {
    const selected = selectedIds.has(testCase.id);
    const active = index === activeIndex;
    const isOpen = openId === testCase.id;
    return (
      <div
        key={testCase.id}
        id={`tests-case-row-${testCase.id}`}
        role="row"
        aria-selected={selected}
        aria-rowindex={index + 2}
        data-row-index={index}
        data-testid={`tests-case-row-${testCase.id}`}
        draggable={canEdit}
        onDragStart={(event) => handleRowDragStart(event, testCase)}
        onDragOver={(event) => {
          if (!canReorder || !hasDragType(event, DND_CASES)) return;
          event.preventDefault();
          if (dropBefore !== testCase.id) setDropBefore(testCase.id);
        }}
        onDragLeave={() => setDropBefore((prev) => (prev === testCase.id ? null : prev))}
        onDrop={(event) => {
          if (!canReorder) return;
          event.preventDefault();
          setDropBefore(null);
          const ids = readDragData(event, DND_CASES);
          if (ids?.length && !ids.includes(testCase.id)) onReorder(ids, testCase);
        }}
        onClick={(event) => {
          setActiveIndex(index);
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            onToggleSelect(testCase.id);
            return;
          }
          onOpen(testCase.id);
        }}
        style={{ ...style, gridTemplateColumns: template }}
        className={`group relative grid cursor-pointer items-center border-b border-slate-200/70 px-2 text-left transition-colors dark:border-[#232838] ${
          isOpen ? "bg-blue-500/[0.08]" : selected ? "bg-blue-500/[0.05]" : "hover:bg-slate-500/[0.04]"
        } ${active ? "shadow-[inset_2px_0_0_0_rgb(59,130,246)]" : ""}`}
      >
        {dropBefore === testCase.id && <span className="pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded bg-blue-500" aria-hidden="true" />}
        <span role="gridcell" className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          {canEdit && <FaGripVertical className="h-2.5 w-2.5 flex-shrink-0 cursor-grab text-slate-400 opacity-0 group-hover:opacity-100" aria-hidden="true" />}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(testCase.id)}
            aria-label={`Select ${testCase.key} ${testCase.title}`}
            tabIndex={-1}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </span>
        {columns.map((column) => (
          <span key={column} role="gridcell" className="flex min-w-0 items-center overflow-hidden pr-2">
            <Cell column={column} testCase={testCase} users={users} latest={latestMap.get(testCase.id)} path={showPath ? pathById.get(testCase.suiteId) : null} />
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-label="Test cases"
      aria-multiselectable="true"
      aria-rowcount={cases.length + 1}
      aria-activedescendant={cases[activeIndex] ? `tests-case-row-${cases[activeIndex].id}` : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-testid="tests-case-table"
      className="relative min-h-0 flex-1 overflow-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40"
    >
      <div style={{ minWidth }}>
        <div role="row" aria-rowindex={1} className="sticky top-0 z-10 grid items-center border-b border-slate-200/80 bg-slate-50/95 px-2 backdrop-blur dark:border-[#252b3b] dark:bg-[#161a25]/95" style={{ gridTemplateColumns: template, height: 34 }}>
          <span role="columnheader" className="flex items-center pl-[14px]">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(node) => { if (node) node.indeterminate = someSelected; }}
              onChange={(event) => onSelectAll(event.target.checked)}
              aria-label="Select all visible cases"
              tabIndex={-1}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </span>
          {columns.map((column) => {
            const meta = CASE_COLUMNS.find((item) => item.id === column);
            const sortable = SORTABLE.has(column);
            const active = sort.by === column;
            return (
              <span key={column} role="columnheader" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className="min-w-0 pr-2">
                {sortable ? (
                  <button type="button" tabIndex={-1} onClick={() => onSort(column)} className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}>
                    {meta?.label}
                    {active && (sort.dir === "asc" ? <FaSortUp className="h-2.5 w-2.5" /> : <FaSortDown className="h-2.5 w-2.5" />)}
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{meta?.label}</span>
                )}
              </span>
            );
          })}
        </div>
        {virtual ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((item) => renderRow(cases[item.index], item.index, {
              position: "absolute", top: 0, left: 0, right: 0, height: item.size, transform: `translateY(${item.start}px)`,
            }))}
          </div>
        ) : (
          cases.map((testCase, index) => renderRow(testCase, index, { height: ROW_HEIGHT }))
        )}
      </div>
    </div>
  );
}

export default memo(CaseTable);
