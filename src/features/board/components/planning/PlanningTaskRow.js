import React, { memo } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { FaArrowLeft, FaArrowRight, FaGripVertical } from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";
import { getUserDisplayName } from "../../utils/userColors";
import { getAssigneeKey } from "../../utils/planningMetrics";
import { Avatar, Checkbox, PointsBadge, PriorityDot, StatusChip, TypeIcon } from "./PlanningPrimitives";

/**
 * One draggable work item in the Backlog pool (`variant="pool"`) or the
 * sprint scope (`variant="sprint"`). The move button keeps its slot but is
 * only revealed on hover / keyboard focus so the row stays calm while scanning.
 */
function PlanningTaskRow({
  task,
  index,
  variant,
  selected,
  canEdit,
  users,
  onToggleSelect,
  onOpen,
  onMove,
  onEstimate,
}) {
  const isPool = variant === "pool";
  const assigneeKey = getAssigneeKey(task);
  const assigneeName = assigneeKey ? getUserDisplayName(assigneeKey, users) : null;
  const key = taskKey(task.id);

  return (
    <Draggable draggableId={String(task.id)} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-testid={`planning-${variant}-task-${task.id}`}
          className={`group relative flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
            snapshot.isDragging
              ? "border-blue-400 bg-white shadow-lg ring-2 ring-blue-500/20 dark:border-blue-500/60 dark:bg-[#232838]"
              : selected
                ? "border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10"
                : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-[#2a3044] dark:hover:bg-[#1f2433]"
          }`}
        >
          <span
            {...provided.dragHandleProps}
            aria-label={`Drag ${key}`}
            className={`-ml-1 flex w-3 flex-shrink-0 justify-center text-slate-300 dark:text-slate-600 ${canEdit ? "cursor-grab opacity-0 group-hover:opacity-100 focus:opacity-100" : "hidden"}`}
          >
            <FaGripVertical className="h-2.5 w-2.5" />
          </span>
          {canEdit && (
            <Checkbox
              checked={selected}
              onChange={() => onToggleSelect(task.id)}
              label={`Select ${key}`}
            />
          )}
          {isPool ? <TypeIcon type={task.type} /> : <StatusChip status={task.status} />}
          <span className="hidden flex-shrink-0 font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:inline">{key}</span>
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(task)}
              title={task.title}
              className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 hover:text-blue-600 hover:underline focus:outline-none focus-visible:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
            >
              {task.title || "Untitled"}
            </button>
          ) : (
            <span title={task.title} className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
              {task.title || "Untitled"}
            </span>
          )}

          <span className="flex flex-shrink-0 items-center gap-1.5">
            <PriorityDot priority={task.priority} />
            <PointsBadge points={task.storyPoint} onEstimate={onEstimate ? () => onEstimate(task) : undefined} />
            {assigneeName
              ? <Avatar name={assigneeName} colorKey={assigneeKey} users={users} />
              : <span title="Unassigned" className="h-5 w-5 flex-shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600" />}
          </span>

          {canEdit && (
            <button
              type="button"
              onClick={() => onMove(task)}
              title={isPool ? "Add to Sprint" : "Remove from Sprint"}
              className={`flex w-[62px] flex-shrink-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold opacity-0 shadow-sm transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 group-focus-within:opacity-100 group-hover:opacity-100 ${
                isPool
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"
              }`}
            >
              {isPool ? <FaArrowRight className="h-2.5 w-2.5" /> : <FaArrowLeft className="h-2.5 w-2.5" />}
              {isPool ? "Add" : "Remove"}
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default memo(PlanningTaskRow);
