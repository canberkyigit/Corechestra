import React, { useState, useMemo } from "react";
import KanbanColumn from "./KanbanColumn";
import { DragDropContext } from "@hello-pangea/dnd";
import { FaLayerGroup, FaTrash, FaArrowRight, FaUserAlt, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useApp } from "../context/AppContext";

export default function KanbanBoard({
  filter,
  member,
  search,
  tasks,
  setTasks,
  idToGlobalIndex,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  onTaskClick,
  columns,
}) {
  const { deleteTask, teamMembers } = useApp();
  const [swimlaneMode, setSwimlaneMode] = useState(false);
  const [collapsedLanes, setCollapsedLanes] = useState(new Set());

  const toggleLane = (assignee) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      next.has(assignee) ? next.delete(assignee) : next.add(assignee);
      return next;
    });
  };

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const boardColumns = columns || [
    { id: "todo", title: "To Do" },
    { id: "inprogress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "awaiting", title: "Awaiting Customer" },
    { id: "blocked", title: "Blocked" },
    { id: "done", title: "Done" },
  ];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesType = !filter || t.type === filter;
      const matchesMember = !member || t.assignedTo === member;
      const matchesSearch = !search || (
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      );
      return matchesType && matchesMember && matchesSearch;
    });
  }, [tasks, filter, member, search]);

  const handleTaskClick = (task) => {
    if (onTaskClick) { onTaskClick(task); return; }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setTasks((prev) => {
      const movedTask = tasks.find((t) => t.id === draggableId);
      if (!movedTask) return prev;
      let newTasks = prev.filter((t) => t.id !== draggableId);

      if (destination.droppableId === source.droppableId) {
        const colTasks = newTasks.filter((t) => t.status === destination.droppableId);
        const rest = newTasks.filter((t) => t.status !== destination.droppableId);
        colTasks.splice(destination.index, 0, movedTask);
        return [...rest, ...colTasks];
      } else {
        const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
        const rest = newTasks.filter((t) => t.status !== destination.droppableId);
        const destColId = destination.droppableId.includes("|")
          ? destination.droppableId.split("|")[0]
          : destination.droppableId;
        destTasks.splice(destination.index, 0, { ...movedTask, status: destColId, statusChangedAt: new Date().toISOString() });
        return [...rest, ...destTasks];
      }
    });
  };

  // Swimlane: group by assignee
  const swimlaneGroups = useMemo(() => {
    if (!swimlaneMode) return null;
    const assignees = [...new Set(filteredTasks.map((t) => t.assignedTo || "unassigned"))];
    return assignees.map((a) => ({
      assignee: a,
      tasks: filteredTasks.filter((t) => (t.assignedTo || "unassigned") === a),
    }));
  }, [swimlaneMode, filteredTasks]);

  // Bulk actions
  const handleBulkMove = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setTasks((prev) => prev.map((t) => selectedIds.has(t.id) ? { ...t, status: bulkStatus } : t));
    setSelectedIds(new Set());
    setBulkStatus("");
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteTask(id));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getColTasks = (colId, tasksArr) =>
    tasksArr.filter((t) => t.status === colId);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar row */}
      <div className="flex items-center gap-3 px-4 py-2 mb-2">
        <button
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors ${
            swimlaneMode
              ? "bg-blue-50 border-blue-300 text-blue-600"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
          onClick={() => setSwimlaneMode((v) => !v)}
        >
          <FaLayerGroup className="w-3.5 h-3.5" />
          Swimlane
        </button>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto bg-blue-600 text-white text-xs rounded-lg px-3 py-1.5 shadow-md">
            <span className="font-medium">{selectedIds.size} selected</span>
            <span className="opacity-50">|</span>
            <select
              className="bg-transparent border-none outline-none text-white text-xs cursor-pointer"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Move to...</option>
              {boardColumns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className="hover:bg-blue-700 rounded px-1.5 py-0.5 flex items-center gap-1" onClick={handleBulkMove} disabled={!bulkStatus}>
              <FaArrowRight className="w-3 h-3" /> Apply
            </button>
            <button className="hover:bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-1" onClick={handleBulkDelete}>
              <FaTrash className="w-3 h-3" /> Delete
            </button>
            <button className="opacity-75 hover:opacity-100" onClick={() => setSelectedIds(new Set())}>✕</button>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {swimlaneMode ? (
          /* Swimlane view */
          <div className="flex-1 overflow-auto px-4">
            {swimlaneGroups.map(({ assignee, tasks: groupTasks }) => {
              const isCollapsed = collapsedLanes.has(assignee);
              const member = teamMembers.find((m) => m.value === assignee);
              const color = member?.color || "#94a3b8";
              const displayName = member?.label || assignee;
              const doneCount = groupTasks.filter((t) => t.status === "done").length;
              return (
                <div key={assignee} className="mb-3">
                  {/* Lane header */}
                  <div
                    className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl cursor-pointer select-none transition-colors hover:bg-slate-100 dark:hover:bg-[#1c2030]"
                    style={{ borderLeft: `3px solid ${color}` }}
                    onClick={() => toggleLane(assignee)}
                  >
                    {isCollapsed
                      ? <FaChevronRight className="w-3 h-3 text-slate-400" />
                      : <FaChevronDown className="w-3 h-3 text-slate-400" />
                    }
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}>
                      {assignee !== "unassigned" ? displayName.charAt(0).toUpperCase() : <FaUserAlt className="w-3 h-3" />}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "22", color }}>
                      {groupTasks.length} task{groupTasks.length !== 1 ? "s" : ""}
                    </span>
                    {doneCount > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        {doneCount} done
                      </span>
                    )}
                  </div>

                  {/* Lane columns */}
                  {!isCollapsed && (
                    <div className="grid gap-4 items-start pl-4"
                      style={{ gridTemplateColumns: `repeat(${boardColumns.length}, minmax(0,1fr))` }}>
                      {boardColumns.map((col) => (
                        <KanbanColumn
                          key={`${assignee}-${col.id}`}
                          title={col.title}
                          tasks={getColTasks(col.id, groupTasks)}
                          columnId={col.id}
                          idToGlobalIndex={idToGlobalIndex}
                          allBadgesOpen={allBadgesOpen}
                          priorityColorsOpen={priorityColorsOpen}
                          taskIdsOpen={taskIdsOpen}
                          subtaskButtonsOpen={subtaskButtonsOpen}
                          onTaskClick={handleTaskClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Normal board view */
          <div className="flex-1 overflow-x-auto px-4 pb-6">
            <div
              className="grid gap-4 h-full"
              style={{ gridTemplateColumns: `repeat(${boardColumns.length}, minmax(210px, 1fr))` }}
            >
              {boardColumns.map((col) => (
                <div key={col.id} className="group flex flex-col">
                  <KanbanColumn
                    title={col.title}
                    tasks={getColTasks(col.id, filteredTasks)}
                    columnId={col.id}
                    idToGlobalIndex={idToGlobalIndex}
                    allBadgesOpen={allBadgesOpen}
                    priorityColorsOpen={priorityColorsOpen}
                    taskIdsOpen={taskIdsOpen}
                    subtaskButtonsOpen={subtaskButtonsOpen}
                    onTaskClick={handleTaskClick}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </DragDropContext>
    </div>
  );
}
