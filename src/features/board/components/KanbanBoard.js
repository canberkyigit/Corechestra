import React, { useState, useMemo, useEffect, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { FaUserAlt, FaChevronDown, FaChevronRight } from "react-icons/fa";
import KanbanColumn from "./KanbanColumn";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import { useWorkflowGuard } from "../hooks/useWorkflowGuard";
import { groupTasksByColumn, UNMAPPED_COLUMN_ID } from "../utils/boardColumns";
import {
  buildSwimlanes,
  encodeDroppableId,
  getDropAnchors,
  getLanePatch,
  parseDroppableId,
} from "../utils/boardDnd";

function filterTasks(tasks, { filter, member, search }) {
  const query = (search || "").trim().toLowerCase();
  if (!filter && !member && !query) return tasks;
  return tasks.filter((task) => (
    (!filter || task.type === filter)
    && (!member || task.assignedTo === member)
    && (!query
      || task.title?.toLowerCase().includes(query)
      || (task.description || "").toLowerCase().includes(query))
  ));
}

function useCollapsedColumns(currentProjectId) {
  // Column collapse is a per-browser view preference (localStorage).
  const collapseKey = `boardCollapsedCols_${currentProjectId || "default"}`;
  const readStored = useCallback(() => {
    try {
      const stored = localStorage.getItem(collapseKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  }, [collapseKey]);

  const [collapsedCols, setCollapsedCols] = useState(readStored);

  useEffect(() => { setCollapsedCols(readStored()); }, [readStored]);

  const toggleCol = useCallback((colId) => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      try { localStorage.setItem(collapseKey, JSON.stringify([...next])); } catch { /* ignore quota */ }
      return next;
    });
  }, [collapseKey]);

  return [collapsedCols, toggleCol];
}

export default function KanbanBoard({
  filter,
  member,
  search,
  tasks,
  visibleTasks,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  swimlaneMode = "none",
  onTaskClick,
  columns,
}) {
  const {
    teamMembers,
    currentProjectId,
    epics,
    labels,
    users,
    moveTask,
    createTask,
  } = useApp();
  const { canEditTask, canCreateTask } = useBoardPermissions();
  const { addToast } = useToast();
  const readOnly = !canEditTask;
  const { guardStatusChange, reportResult, dialog } = useWorkflowGuard();
  const [collapsedLanes, setCollapsedLanes] = useState(() => new Set());
  const [collapsedCols, toggleCol] = useCollapsedColumns(currentProjectId);

  const laneMode = swimlaneMode === true ? "assignee" : (swimlaneMode || "none");

  // Filtering happens once upstream (useBoardState); fall back for callers
  // that only pass the unfiltered list.
  const shownTasks = useMemo(
    () => visibleTasks || filterTasks(tasks || [], { filter, member, search }),
    [visibleTasks, tasks, filter, member, search]
  );

  const epicsById = useMemo(() => new Map((epics || []).map((epic) => [epic.id, epic])), [epics]);
  const labelsById = useMemo(() => new Map((labels || []).map((label) => [label.id, label])), [labels]);

  const { columns: boardColumns, groups } = useMemo(
    () => groupTasksByColumn(shownTasks, columns),
    [shownTasks, columns]
  );

  const swimlanes = useMemo(() => (
    buildSwimlanes(shownTasks, laneMode, { teamMembers, epics }).map((lane) => ({
      ...lane,
      groups: groupTasksByColumn(lane.tasks, columns).groups,
    }))
  ), [shownTasks, laneMode, teamMembers, epics, columns]);

  const taskById = useMemo(
    () => new Map(shownTasks.map((task) => [String(task.id), task])),
    [shownTasks]
  );

  const getCellTasks = useCallback((columnId, laneKey) => {
    if (laneKey === null || laneMode === "none") return groups[columnId] || [];
    const lane = swimlanes.find((item) => item.key === laneKey);
    return lane?.groups[columnId] || [];
  }, [groups, laneMode, swimlanes]);

  // Quick-create inherits the context it was typed in: the swimlane's
  // assignee/epic/priority and the active type/member filters, so the new
  // card lands where the user is looking instead of vanishing.
  const handleInlineCreate = useCallback((columnId, title, laneKey = null) => {
    const lanePatch = laneKey != null && laneMode !== "none" ? getLanePatch(laneMode, laneKey) : {};
    const contextPatch = {};
    if (filter) contextPatch.type = filter;
    if (member && !("assignedTo" in lanePatch)) contextPatch.assignedTo = member;
    const created = createTask({
      title,
      status: columnId,
      priority: "medium",
      type: "task",
      description: "",
      ...contextPatch,
      ...lanePatch,
    }, "active");
    const query = (search || "").trim().toLowerCase();
    const hiddenBySearch = Boolean(query) && !title.toLowerCase().includes(query);
    addToast(
      hiddenBySearch ? `"${title}" created (hidden by the current search)` : `"${title}" created`,
      "success",
      created && onTaskClick ? { action: { label: "Open", onClick: () => onTaskClick(created) } } : undefined
    );
  }, [addToast, createTask, filter, laneMode, member, onTaskClick, search]);

  const toggleLane = useCallback((laneKey) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(laneKey)) next.delete(laneKey); else next.add(laneKey);
      return next;
    });
  }, []);

  const onDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || readOnly) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = taskById.get(String(draggableId));
    if (!task) return;
    const dest = parseDroppableId(destination.droppableId);
    const src = parseDroppableId(source.droppableId);
    if (dest.columnId === UNMAPPED_COLUMN_ID) return;

    // Indices are relative to the rendered (filtered + paginated) cell; map
    // them to neighbouring task ids so the move lands in the right place in
    // the unfiltered task array.
    const visibleIds = getCellTasks(dest.columnId, dest.laneKey).map((item) => String(item.id));
    const anchors = getDropAnchors(visibleIds, String(draggableId), destination.index);
    const toId = (value) => (value === null ? null : taskById.get(value)?.id ?? value);

    const lanePatch = laneMode !== "none" && dest.laneKey !== null && dest.laneKey !== src.laneKey
      ? getLanePatch(laneMode, dest.laneKey)
      : {};

    let blockReason;
    if (dest.columnId !== task.status) {
      const verdict = await guardStatusChange(task, dest.columnId);
      if (!verdict.ok) return;
      blockReason = verdict.patch.blockReason;
    }

    reportResult(moveTask(task.id, {
      status: dest.columnId,
      beforeTaskId: toId(anchors.beforeTaskId),
      afterTaskId: toId(anchors.afterTaskId),
      patch: lanePatch,
      blockReason,
    }));
  }, [getCellTasks, guardStatusChange, laneMode, moveTask, readOnly, reportResult, taskById]);

  const columnProps = {
    allBadgesOpen,
    priorityColorsOpen,
    taskIdsOpen,
    subtaskButtonsOpen,
    onTaskClick,
    epicsById,
    labelsById,
    users,
    readOnly,
    onInlineCreate: canCreateTask ? handleInlineCreate : null,
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <DragDropContext onDragEnd={onDragEnd}>
        {laneMode !== "none" ? (
          <div className="flex-1 min-h-0 overflow-auto px-4 pt-4">
            {swimlanes.map((lane) => {
              const isCollapsed = collapsedLanes.has(lane.key);
              const doneCount = lane.tasks.filter((task) => task.status === "done").length;
              return (
                <div key={lane.key} className="mb-3" data-testid={`swimlane-${lane.key}`}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-xl cursor-pointer select-none transition-colors hover:bg-slate-100 dark:hover:bg-[#1c2030] text-left"
                    style={{ borderLeft: `3px solid ${lane.color}` }}
                    onClick={() => toggleLane(lane.key)}
                  >
                    {isCollapsed
                      ? <FaChevronRight className="w-3 h-3 text-slate-400" />
                      : <FaChevronDown className="w-3 h-3 text-slate-400" />}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: lane.color }}
                    >
                      {laneMode === "assignee" && lane.key === "unassigned"
                        ? <FaUserAlt className="w-3 h-3" />
                        : lane.label.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{lane.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${lane.color}22`, color: lane.color }}>
                      {lane.tasks.length} task{lane.tasks.length !== 1 ? "s" : ""}
                    </span>
                    {doneCount > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        {doneCount} done
                      </span>
                    )}
                  </button>

                  {!isCollapsed && (
                    <div
                      className="grid gap-3 items-start pl-2 md:pl-4 overflow-x-auto"
                      style={{ gridTemplateColumns: `repeat(${boardColumns.length}, minmax(150px,1fr))` }}
                    >
                      {boardColumns.map((col) => (
                        <div key={col.id} className="group">
                          <KanbanColumn
                            {...columnProps}
                            title={col.title}
                            columnId={col.id}
                            droppableId={encodeDroppableId(col.id, lane.key)}
                            laneKey={lane.key}
                            unmapped={Boolean(col.unmapped)}
                            tasks={lane.groups[col.id] || []}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto px-4 pt-4 pb-6">
            <div className="flex gap-4 min-h-full items-stretch">
              {boardColumns.map((col) => {
                const isColCollapsed = collapsedCols.has(col.id);
                return (
                  <div key={col.id} className={`group flex flex-col ${isColCollapsed ? "w-11 flex-shrink-0" : "flex-1 min-w-[170px]"}`}>
                    <KanbanColumn
                      {...columnProps}
                      title={col.title}
                      columnId={col.id}
                      droppableId={col.id}
                      unmapped={Boolean(col.unmapped)}
                      tasks={groups[col.id] || []}
                      isCollapsed={isColCollapsed}
                      onToggleCollapse={toggleCol}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DragDropContext>
      {dialog}
    </div>
  );
}
