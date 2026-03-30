import React, { useState, useEffect, useRef } from "react";
import { isBefore, addDays, parseISO, isValid, format } from "date-fns";
import {
  FaBug, FaExclamationCircle, FaUser, FaSearch, FaCheckSquare,
  FaPlusSquare, FaRocket, FaFlag, FaPlay, FaRegDotCircle,
  FaChevronDown, FaChevronUp, FaList,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";

const TYPE_ICON = {
  bug: <FaBug className="w-3 h-3" />,
  defect: <FaExclamationCircle className="w-3 h-3" />,
  userstory: <FaUser className="w-3 h-3" />,
  investigation: <FaSearch className="w-3 h-3" />,
  task: <FaCheckSquare className="w-3 h-3" />,
  feature: <FaPlusSquare className="w-3 h-3" />,
  epic: <FaRocket className="w-3 h-3" />,
  test: <FaSearch className="w-3 h-3" />,
  testset: <FaFlag className="w-3 h-3" />,
  testexecution: <FaPlay className="w-3 h-3" />,
  precondition: <FaRegDotCircle className="w-3 h-3" />,
};

const TYPE_COLOR = {
  bug:           "text-red-500    bg-red-50    dark:bg-red-900/30",
  defect:        "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
  userstory:     "text-blue-500   bg-blue-50   dark:bg-blue-900/30",
  investigation: "text-purple-500 bg-purple-50 dark:bg-purple-900/30",
  task:          "text-green-500  bg-green-50  dark:bg-green-900/30",
  feature:       "text-cyan-500   bg-cyan-50   dark:bg-cyan-900/30",
  epic:          "text-violet-500 bg-violet-50 dark:bg-violet-900/30",
  test:          "text-teal-500   bg-teal-50   dark:bg-teal-900/30",
  testset:       "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30",
  testexecution: "text-lime-600   bg-lime-50   dark:bg-lime-900/30",
  precondition:  "text-sky-500    bg-sky-50    dark:bg-sky-900/30",
};

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

export default function TaskCard({
  task,
  allBadgesOpen,
  priorityColorsOpen,
  taskIdsOpen,
  subtaskButtonsOpen,
  onClick,
  compact = false,
}) {
  const { epics, labels, users } = useApp();
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const prevStatus = useRef(task.status);

  useEffect(() => {
    if (prevStatus.current !== "done" && task.status === "done") {
      setDoneFlash(true);
      const t = setTimeout(() => setDoneFlash(false), 700);
      prevStatus.current = task.status;
      return () => clearTimeout(t);
    }
    prevStatus.current = task.status;
  }, [task.status]);

  const taskType = task.type || "task";
  const typeColor = TYPE_COLOR[taskType] || TYPE_COLOR.task;
  const typeIcon = TYPE_ICON[taskType] || TYPE_ICON.task;
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityBorderColor = priorityColorsOpen
    ? (PRIORITY_BORDER_COLOR[priorityKey] || "#94a3b8")
    : "#e2e8f0";

  const epic = epics?.find((e) => e.id === task.epicId);

  // Resolve assignee display name + avatar color from users list
  const assignedUser = (task.assignedTo && task.assignedTo !== "unassigned")
    ? users?.find((u) => u.username === task.assignedTo || u.id === task.assignedTo)
    : null;
  const assignedName   = assignedUser?.name || task.assignedTo;
  const assignedInitial = assignedName && assignedName !== "unassigned"
    ? assignedName.charAt(0).toUpperCase()
    : "?";
  const FALLBACK_COLORS = ["#3b82f6","#8b5cf6","#10b981","#ec4899","#6366f1"];
  const assignedBg = assignedUser?.color
    || FALLBACK_COLORS[(task.assignedTo || "").charCodeAt(0) % FALLBACK_COLORS.length];
  const taskLabels = (task.labels || [])
    .map((id) => labels?.find((l) => l.id === id))
    .filter(Boolean);

  const dueDateStatus = getDueDateStatus(task.dueDate);

  const dueDateText = task.dueDate
    ? (() => {
        try { return format(parseISO(task.dueDate), "MMM d"); } catch { return task.dueDate; }
      })()
    : null;

  const completedSubtasks = (task.subtasks || []).filter((s) => s.done).length;
  const totalSubtasks = (task.subtasks || []).length;

  return (
    <div className={`group relative bg-white dark:bg-[#1c2030] rounded-lg border border-slate-200 dark:border-[#2a3044] border-l-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 dark:hover:bg-[#202540] overflow-hidden min-w-0 ${doneFlash ? "animate-task-done" : ""} ${compact ? "p-2.5" : "p-3"}`}
      style={{ borderLeftColor: priorityBorderColor }}
      onClick={(e) => {
        if (e.target.closest("button")) return;
        if (onClick) onClick();
      }}
    >
      {/* Top row: type badge + task id */}
      <div className="flex items-center gap-1.5 mb-2 min-w-0">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${typeColor}`}>
          {typeIcon}
        </span>
        {taskIdsOpen && (
          <span className="text-xs text-slate-400 font-mono truncate flex-shrink min-w-0">
            {task.id?.startsWith("b") ? "BL" : "CY"}-{task.id}
          </span>
        )}
      </div>

      {/* Epic badge */}
      {epic && (
        <div className="mb-1.5 min-w-0 overflow-hidden">
          <span
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium max-w-full"
            style={{ backgroundColor: epic.color + "22", color: epic.color }}
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
              style={{ backgroundColor: label.color + "22", color: label.color, border: `1px solid ${label.color}44` }}
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

      {/* Due date + story points row */}
      {(dueDateText || (task.storyPoint != null && task.storyPoint !== "")) && (
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {dueDateText && (
            <span className={`text-xs flex items-center gap-0.5 flex-shrink-0 ${
              dueDateStatus === "overdue" ? "text-red-600 font-semibold" :
              dueDateStatus === "soon" ? "text-orange-500" :
              "text-slate-400"
            }`}>
              {dueDateStatus === "overdue" && "⚠"}
              {dueDateText}
            </span>
          )}
          {task.storyPoint != null && task.storyPoint !== "" && (
            <span className="text-xs bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              {task.storyPoint}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: subtask toggle (left) + assignee avatar (right) */}
      {(subtaskButtonsOpen && totalSubtasks > 0) || (task.assignedTo && task.assignedTo !== "unassigned") ? (
        <div className="flex items-center mt-1.5 min-w-0">
          {subtaskButtonsOpen && totalSubtasks > 0 && (
            <button
              className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-500 transition-colors"
              onClick={() => setShowSubtasks((v) => !v)}
              title="Toggle subtasks"
            >
              <FaList className="w-3 h-3" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
              {showSubtasks ? <FaChevronUp className="w-2.5 h-2.5" /> : <FaChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
          <div className="flex-1 min-w-0" />
          {task.assignedTo && task.assignedTo !== "unassigned" && (
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: assignedBg }}
              title={assignedName}
            >
              {assignedInitial}
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
          {(task.subtasks || []).map((sub) => (
            <div key={sub.id} className={`text-xs flex items-center gap-1.5 ${sub.done ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-400"}`}>
              <div className={`w-3 h-3 rounded-sm border flex-shrink-0 ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300"}`} />
              {sub.title}
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
