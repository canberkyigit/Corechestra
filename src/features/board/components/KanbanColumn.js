import React, { memo, useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { FaPlus, FaTimes, FaInbox, FaChevronLeft, FaQuestionCircle } from "react-icons/fa";
import TaskCard from "./TaskCard";

const COLUMN_COLORS = {
  todo: { dot: "bg-slate-400", header: "text-slate-600 dark:text-slate-300" },
  inprogress: { dot: "bg-blue-500", header: "text-blue-600 dark:text-blue-400" },
  review: { dot: "bg-yellow-500", header: "text-yellow-600 dark:text-yellow-400" },
  awaiting: { dot: "bg-purple-500", header: "text-purple-600 dark:text-purple-400" },
  blocked: { dot: "bg-red-500", header: "text-red-600 dark:text-red-400" },
  done: { dot: "bg-green-500", header: "text-green-600 dark:text-green-400" },
};
const DEFAULT_COLORS = { dot: "bg-slate-400", header: "text-slate-600 dark:text-slate-300" };
const TASKS_PER_PAGE = 20;

/**
 * One Kanban column (or one swimlane cell). Memoized: all callbacks are
 * expected to be stable and receive the column id instead of being bound
 * per render.
 */
function KanbanColumn({
  title,
  tasks,
  columnId,
  droppableId,
  unmapped = false,
  readOnly = false,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  onTaskClick,
  onInlineCreate,
  epicsById,
  labelsById,
  users,
  cardFields,
  isCollapsed,
  onToggleCollapse,
}) {
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");
  const [visibleCount, setVisibleCount] = useState(TASKS_PER_PAGE);

  const colors = unmapped
    ? { dot: "bg-amber-500", header: "text-amber-600 dark:text-amber-400" }
    : COLUMN_COLORS[columnId] || DEFAULT_COLORS;
  const canCreate = Boolean(onInlineCreate) && !unmapped;
  const toggleCollapse = onToggleCollapse ? () => onToggleCollapse(columnId) : null;

  const openInline = () => {
    if (!canCreate) return;
    setInlineOpen(true);
    setInlineTitle("");
  };

  const closeInline = () => {
    setInlineOpen(false);
    setInlineTitle("");
  };

  const handleInlineCreate = () => {
    if (!inlineTitle.trim()) { closeInline(); return; }
    onInlineCreate(columnId, inlineTitle.trim());
    closeInline();
  };

  if (isCollapsed) {
    return (
      <div
        className="flex flex-col h-full min-h-[300px] bg-slate-200/70 dark:bg-[#1a1f2e] rounded-xl border border-slate-300/80 dark:border-[#252b3b] cursor-pointer hover:bg-slate-300/60 dark:hover:bg-[#1e2438] transition-colors overflow-hidden"
        onClick={toggleCollapse || undefined}
        title={`Expand ${title}`}
      >
        <div className="flex flex-col items-center gap-2 py-3 flex-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-[#252b3b] px-1 py-0.5 rounded-full min-w-[16px] text-center">
            {tasks.length}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${colors.header} select-none`}
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`kanban-column-${droppableId || columnId}`}
      className={`flex flex-col h-full min-h-[300px] min-w-0 rounded-xl border ${
        unmapped
          ? "bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
          : "bg-slate-200/70 dark:bg-[#1a1f2e] border-slate-300/80 dark:border-[#252b3b]"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`font-semibold text-xs uppercase tracking-wider truncate flex-1 ${colors.header}`}>
          {title}
        </span>
        {unmapped && (
          <FaQuestionCircle
            className="w-3 h-3 text-amber-500 flex-shrink-0"
            title="Tasks whose status is not part of this project's workflow. Drag them into a column to remap."
          />
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-[#252b3b] px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
          {tasks.length}
        </span>
        {toggleCollapse && (
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            onClick={toggleCollapse}
            title="Collapse column"
          >
            <FaChevronLeft className="w-3 h-3" />
          </button>
        )}
        {canCreate && (
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            onClick={openInline}
            title="Add task"
          >
            <FaPlus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <Droppable droppableId={droppableId || columnId} isDropDisabled={unmapped || readOnly}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 pt-1 transition-all duration-150 min-h-[60px] ${
              snapshot.isDraggingOver
                ? "bg-blue-50 dark:bg-blue-900/25 ring-1 ring-inset ring-blue-200 dark:ring-blue-700/40 rounded-xl"
                : ""
            }`}
          >
            {tasks.length === 0 && !inlineOpen && (
              <div
                className={`flex-1 min-h-[120px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-[#2a3044] rounded-xl transition-all group/empty ${
                  canCreate ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/10" : ""
                }`}
                onClick={openInline}
              >
                <FaInbox className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover/empty:text-blue-400 transition-colors mb-1.5" />
                <span className="text-xs text-slate-400 dark:text-slate-500 group-hover/empty:text-blue-500 transition-colors">
                  {canCreate ? "Drop or add a task" : "Drop a task here"}
                </span>
              </div>
            )}

            {tasks.slice(0, visibleCount).map((task, index) => (
              <Draggable draggableId={String(task.id)} index={index} key={task.id} isDragDisabled={readOnly}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={{
                      ...dragProvided.draggableProps.style,
                      opacity: dragSnapshot.isDragging ? 0.92 : 1,
                      transform: dragSnapshot.isDragging
                        ? `${dragProvided.draggableProps.style?.transform ?? ""} rotate(1.5deg)`
                        : dragProvided.draggableProps.style?.transform,
                    }}
                    className={`transition-shadow duration-150 ${dragSnapshot.isDragging ? "shadow-2xl ring-2 ring-blue-400/50 rounded-lg" : ""}`}
                  >
                    <TaskCard
                      task={task}
                      allBadgesOpen={allBadgesOpen}
                      priorityColorsOpen={priorityColorsOpen}
                      taskIdsOpen={taskIdsOpen}
                      subtaskButtonsOpen={subtaskButtonsOpen}
                      onTaskClick={onTaskClick}
                      epicsById={epicsById}
                      labelsById={labelsById}
                      users={users}
                      cardFields={cardFields}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {tasks.length > visibleCount && (
              <button
                type="button"
                className="w-full text-center py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#232838] rounded-lg transition-colors font-medium"
                onClick={() => setVisibleCount((prev) => prev + TASKS_PER_PAGE)}
              >
                Show {Math.min(TASKS_PER_PAGE, tasks.length - visibleCount)} more task{Math.min(TASKS_PER_PAGE, tasks.length - visibleCount) !== 1 ? "s" : ""} ({tasks.length - visibleCount} remaining)
              </button>
            )}

            {/* Inline create */}
            {inlineOpen && (
              <div className="bg-white dark:bg-[#1c2030] rounded-lg border border-blue-300 dark:border-blue-500 shadow-md p-2.5">
                <textarea
                  autoFocus
                  aria-label={`New task in ${title}`}
                  className="w-full text-sm text-slate-700 dark:text-slate-200 resize-none border-none outline-none bg-transparent placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="What needs to be done?"
                  rows={2}
                  value={inlineTitle}
                  onChange={(event) => setInlineTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleInlineCreate(); }
                    if (event.key === "Escape") { event.preventDefault(); closeInline(); }
                  }}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    onClick={handleInlineCreate}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    onClick={closeInline}
                    title="Cancel"
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
      {canCreate && !inlineOpen && tasks.length > 0 && (
        <button
          type="button"
          className="mx-2 mb-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#252b3b] transition-colors"
          onClick={openInline}
        >
          <FaPlus className="w-3 h-3" /> Create
        </button>
      )}
    </div>
  );
}

export default memo(KanbanColumn);
