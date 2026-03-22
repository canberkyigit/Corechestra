import React, { useState } from "react";
import TaskCard from "./TaskCard";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { FaPlus, FaTimes, FaInbox } from "react-icons/fa";
import { useApp } from "../context/AppContext";

const COLUMN_COLORS = {
  todo: { dot: "bg-slate-400", header: "text-slate-600" },
  inprogress: { dot: "bg-blue-500", header: "text-blue-600" },
  review: { dot: "bg-yellow-500", header: "text-yellow-600" },
  awaiting: { dot: "bg-purple-500", header: "text-purple-600" },
  blocked: { dot: "bg-red-500", header: "text-red-600" },
  done: { dot: "bg-green-500", header: "text-green-600" },
};

export default function KanbanColumn({
  title,
  tasks,
  columnId,
  idToGlobalIndex,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  onTaskClick,
}) {
  const { createTask } = useApp();
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");

  const colors = COLUMN_COLORS[columnId] || { dot: "bg-slate-400", header: "text-slate-600" };

  const handleInlineCreate = () => {
    if (!inlineTitle.trim()) { setInlineOpen(false); return; }
    createTask({ title: inlineTitle.trim(), status: columnId, priority: "medium", type: "task", description: "" }, "active");
    setInlineTitle("");
    setInlineOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] min-w-0 bg-slate-200/70 dark:bg-[#1a1f2e] rounded-xl border border-slate-300/80 dark:border-[#252b3b]">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`font-semibold text-xs uppercase tracking-wider truncate flex-1 ${colors.header} dark:opacity-90`}>
          {title}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-[#252b3b] px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
          {tasks.length}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
          onClick={() => { setInlineOpen(true); setInlineTitle(""); }}
          title="Add task"
        >
          <FaPlus className="w-3 h-3" />
        </button>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 flex flex-col gap-2 rounded-b-xl px-2 pb-2 pt-1 transition-all duration-150 min-h-[60px] ${
              snapshot.isDraggingOver
                ? "bg-blue-50 dark:bg-blue-900/25 ring-1 ring-inset ring-blue-200 dark:ring-blue-700/40 rounded-xl"
                : ""
            }`}
          >
            {tasks.length === 0 && !inlineOpen && (
              <div
                className="flex flex-col items-center justify-center mt-4 py-6 border-2 border-dashed border-slate-200 dark:border-[#2a3044] rounded-xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all group"
                onClick={() => { setInlineOpen(true); setInlineTitle(""); }}
              >
                <FaInbox className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors mb-1.5" />
                <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">Drop or add a task</span>
              </div>
            )}

            {tasks.map((task, idx) => (
              <Draggable draggableId={task.id} index={idx} key={task.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.92 : 1,
                      transform: snapshot.isDragging
                        ? `${provided.draggableProps.style?.transform ?? ""} rotate(1.5deg)`
                        : provided.draggableProps.style?.transform,
                    }}
                    className={`transition-shadow duration-150 ${snapshot.isDragging ? "shadow-2xl ring-2 ring-blue-400/50 rounded-lg" : ""}`}
                  >
                    <TaskCard
                      task={{ ...task, index: idToGlobalIndex ? idToGlobalIndex[task.id] : idx }}
                      allBadgesOpen={allBadgesOpen}
                      priorityColorsOpen={priorityColorsOpen}
                      taskIdsOpen={taskIdsOpen}
                      subtaskButtonsOpen={subtaskButtonsOpen}
                      onClick={() => onTaskClick && onTaskClick(task)}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {/* Inline create */}
            {inlineOpen && (
              <div className="bg-white dark:bg-[#1c2030] rounded-lg border border-blue-300 dark:border-blue-500 shadow-md p-2.5">
                <textarea
                  autoFocus
                  className="w-full text-sm text-slate-700 dark:text-slate-200 resize-none border-none outline-none bg-transparent placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="What needs to be done?"
                  rows={2}
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInlineCreate(); }
                    if (e.key === "Escape") { setInlineOpen(false); setInlineTitle(""); }
                  }}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    onClick={handleInlineCreate}
                  >
                    Create
                  </button>
                  <button
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => { setInlineOpen(false); setInlineTitle(""); }}
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Footer add link */}
      {!inlineOpen && tasks.length > 0 && (
        <button
          className="mx-2 mb-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#252b3b] transition-colors"
          onClick={() => { setInlineOpen(true); setInlineTitle(""); }}
        >
          <FaPlus className="w-3 h-3" /> Create
        </button>
      )}
    </div>
  );
}
