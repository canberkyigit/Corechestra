import React, { memo, useState, useEffect, useRef } from "react";
import { isBefore, addDays, parseISO, isValid, format } from "date-fns";
import { FaChevronDown, FaChevronUp, FaList, FaBan, FaRocket } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { TASK_TYPE_CHIP_STYLES, TASK_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";
import { findUser, getInitial, getUserColor } from "../utils/userColors";
import { buildCardFieldChips } from "../../../shared/utils/customFields";

// Pre-rendered once at module load (cards are hot; avoid re-creating icons per render).
const TYPE_ICON = Object.fromEntries(
  TASK_TYPE_OPTIONS.map(({ value, icon: Icon }) => [value, <Icon className="w-3 h-3" />])
);

const PRIORITY_BORDER_COLOR = {
  critical: "#ef4444",
  high:     "#fb923c",
  medium:   "#facc15",
  low:      "#4ade80",
};

function getDueDateStatus(dueDateStr) {
  if (!dueDateStr) return null;
  try {
    const date = parseISO(dueDateStr);
    if (!isValid(date)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isBefore(date, today)) return "overdue";
    if (isBefore(date, addDays(today, 3))) return "soon";
    return "ok";
  } catch { return null; }
}

/**
 * Kanban card. Pure presentational component (no store hooks) so React.memo
 * can skip re-renders: lookups (`epicsById`, `labelsById`, `users`) and the
 * click handler must be referentially stable.
 */
function TaskCard({
  task,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  onTaskClick,
  epicsById,
  labelsById,
  users,
  cardFields,
  compact = false,
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const prevStatus = useRef(task.status);

  useEffect(() => {
    if (prevStatus.current !== "done" && task.status === "done") {
      setDoneFlash(true);
      const timer = setTimeout(() => setDoneFlash(false), 700);
      prevStatus.current = task.status;
      return () => clearTimeout(timer);
    }
    prevStatus.current = task.status;
    return undefined;
  }, [task.status]);

  const taskType = task.type || "task";
  const typeColor = TASK_TYPE_CHIP_STYLES[taskType] || TASK_TYPE_CHIP_STYLES.task;
  const typeIcon = TYPE_ICON[taskType] || TYPE_ICON.task;
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityBorderColor = priorityColorsOpen
    ? (PRIORITY_BORDER_COLOR[priorityKey] || "#94a3b8")
    : undefined;

  const epic = task.epicId ? epicsById?.get(task.epicId) : null;

  const hasAssignee = Boolean(task.assignedTo && task.assignedTo !== "unassigned");
  const assignedUser = hasAssignee ? findUser(users, task.assignedTo) : null;
  const assignedName = assignedUser?.name || task.assignedTo;
  const assignedBg = getUserColor(task.assignedTo, users);
  const taskLabels = (task.labels || [])
    .map((id) => labelsById?.get(id))
    .filter(Boolean);

  const dueDateStatus = getDueDateStatus(task.dueDate);
  let dueDateText = null;
  if (task.dueDate) {
    try { dueDateText = format(parseISO(task.dueDate), "MMM d"); } catch { dueDateText = task.dueDate; }
  }

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.done).length;
  const totalSubtasks = subtasks.length;
  const hasStoryPoints = task.storyPoint != null && task.storyPoint !== "";
  const fieldChips = cardFields?.length ? buildCardFieldChips(task, cardFields, { users }) : [];

  return (
    <div
      data-testid={`task-card-${task.id}`}
      className={`group relative bg-white dark:bg-[#1c2030] rounded-lg border border-slate-200 dark:border-[#2a3044] border-l-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 dark:hover:bg-[#202540] overflow-hidden min-w-0 ${priorityColorsOpen ? "" : "border-l-slate-200 dark:border-l-[#2a3044]"} ${doneFlash ? "animate-task-done" : ""} ${compact ? "p-2.5" : "p-3"}`}
      style={priorityBorderColor ? { borderLeftColor: priorityBorderColor } : undefined}
      onClick={(event) => {
        if (event.target.closest("button")) return;
        onTaskClick?.(task);
      }}
    >
      {/* Top row: type badge + task key */}
      <div className="flex items-center gap-1.5 mb-2 min-w-0">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${typeColor}`}>
          {typeIcon}
        </span>
        {taskIdsOpen && (
          <span className="text-xs text-slate-400 font-mono truncate flex-shrink min-w-0">
            {taskKey(task.id)}
          </span>
        )}
        {task.status === "blocked" && task.blockReason && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded flex-shrink-0 max-w-[50%] truncate"
            title={`Blocked: ${task.blockReason}`}
          >
            <FaBan className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{task.blockReason}</span>
          </span>
        )}
      </div>

      {/* Epic badge */}
      {epic && (
        <div className="mb-1.5 min-w-0 overflow-hidden">
          <span
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium max-w-full"
            style={{ backgroundColor: `${epic.color}22`, color: epic.color }}
          >
            <FaRocket className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{epic.title}</span>
          </span>
        </div>
      )}

      {/* Title */}
      <div className={`font-medium text-slate-800 dark:text-slate-200 leading-snug break-words ${compact ? "text-xs" : "text-sm"} mb-2 line-clamp-2`}>
        {task.title}
      </div>

      {/* Labels */}
      {taskLabels.length > 0 && allBadgesOpen && (
        <div className="flex flex-wrap gap-1 mb-2 min-w-0 overflow-hidden">
          {taskLabels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="text-xs px-1.5 py-0.5 rounded-full font-medium truncate max-w-[80px]"
              style={{ backgroundColor: `${label.color}22`, color: label.color, border: `1px solid ${label.color}44` }}
            >
              {label.name}
            </span>
          ))}
          {taskLabels.length > 2 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-500 flex-shrink-0">
              +{taskLabels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Custom fields flagged "show on card" (max 3) */}
      {fieldChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 min-w-0 overflow-hidden" data-testid={`task-card-fields-${task.id}`}>
          {fieldChips.map((chip) => (
            <span
              key={chip.fieldId}
              title={chip.type === "checkbox" ? chip.name : `${chip.name}: ${chip.text}`}
              className={`text-[11px] px-1.5 py-0.5 rounded font-medium truncate max-w-[140px] ${
                chip.color ? "" : "bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]"
              }`}
              style={chip.color ? { backgroundColor: `${chip.color}22`, color: chip.color, border: `1px solid ${chip.color}44` } : undefined}
            >
              {chip.type === "checkbox" ? `✓ ${chip.text}` : chip.text}
            </span>
          ))}
        </div>
      )}

      {/* Due date + story points row */}
      {(dueDateText || hasStoryPoints) && (
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {dueDateText && (
            <span className={`text-xs flex items-center gap-0.5 flex-shrink-0 ${
              dueDateStatus === "overdue" ? "text-red-600 dark:text-red-400 font-semibold"
                : dueDateStatus === "soon" ? "text-orange-500"
                  : "text-slate-400"
            }`}>
              {dueDateStatus === "overdue" && "⚠"}
              {dueDateText}
            </span>
          )}
          {hasStoryPoints && (
            <span className="text-xs bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              {task.storyPoint}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: subtask toggle (left) + assignee avatar (right) */}
      {(subtaskButtonsOpen && totalSubtasks > 0) || hasAssignee ? (
        <div className="flex items-center mt-1.5 min-w-0">
          {subtaskButtonsOpen && totalSubtasks > 0 && (
            <button
              type="button"
              className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-500 transition-colors"
              onClick={() => setShowSubtasks((value) => !value)}
              title="Toggle subtasks"
            >
              <FaList className="w-3 h-3" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
              {showSubtasks ? <FaChevronUp className="w-2.5 h-2.5" /> : <FaChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
          <div className="flex-1 min-w-0" />
          {hasAssignee && (
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: assignedBg }}
              title={assignedName}
            >
              {getInitial(assignedName)}
            </div>
          )}
        </div>
      ) : null}

      {/* Subtask list — smooth accordion */}
      <div
        style={{
          maxHeight: showSubtasks && totalSubtasks > 0 ? totalSubtasks * 28 + 16 : 0,
          opacity: showSubtasks && totalSubtasks > 0 ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
        }}
      >
        <div className="mt-2 border-t border-slate-100 dark:border-[#232838] pt-2 space-y-1">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className={`text-xs flex items-center gap-1.5 ${subtask.done ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-400"}`}>
              <div className={`w-3 h-3 rounded-sm border flex-shrink-0 ${subtask.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600"}`} />
              {subtask.title}
            </div>
          ))}
        </div>
      </div>

      {/* Overdue stripe */}
      {dueDateStatus === "overdue" && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-red-500 border-r-red-500 rounded-tr-lg" />
      )}
    </div>
  );
}

export default memo(TaskCard);
