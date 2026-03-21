import React, { useState } from "react";
import { isBefore, addDays, parseISO, isValid, format, differenceInDays } from "date-fns";
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
  bug: "text-red-500 bg-red-50",
  defect: "text-orange-500 bg-orange-50",
  userstory: "text-blue-500 bg-blue-50",
  investigation: "text-purple-500 bg-purple-50",
  task: "text-green-500 bg-green-50",
  feature: "text-cyan-500 bg-cyan-50",
  epic: "text-violet-500 bg-violet-50",
  test: "text-teal-500 bg-teal-50",
  testset: "text-indigo-500 bg-indigo-50",
  testexecution: "text-lime-600 bg-lime-50",
  precondition: "text-sky-500 bg-sky-50",
};

const PRIORITY_BORDER = {
  critical: "border-l-red-500",
  high: "border-l-orange-400",
  medium: "border-l-yellow-400",
  low: "border-l-green-400",
};

const PRIORITY_DOT = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

function getInitials(name) {
  if (!name || name === "unassigned") return "?";
  return name.charAt(0).toUpperCase();
}

function getAvatarColor(name) {
  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-pink-500", "bg-indigo-500"];
  if (!name) return colors[0];
  return colors[name.charCodeAt(0) % colors.length];
}

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
  const { epics, labels } = useApp();
  const [showSubtasks, setShowSubtasks] = useState(false);

  const taskType = task.type || "task";
  const typeColor = TYPE_COLOR[taskType] || TYPE_COLOR.task;
  const typeIcon = TYPE_ICON[taskType] || TYPE_ICON.task;
  const priorityKey = (task.priority || "medium").toLowerCase();
  const borderClass = priorityColorsOpen ? (PRIORITY_BORDER[priorityKey] || "border-l-slate-300") : "border-l-slate-200";

  const epic = epics?.find((e) => e.id === task.epicId);
  const taskLabels = (task.labels || [])
    .map((id) => labels?.find((l) => l.id === id))
    .filter(Boolean);

  const dueDateStatus = getDueDateStatus(task.dueDate);

  // Aging: days since last status change (only for non-done tasks)
  const agingDays = (() => {
    if (task.status === "done" || !task.statusChangedAt) return 0;
    try { return differenceInDays(new Date(), parseISO(task.statusChangedAt)); }
    catch { return 0; }
  })();
  const dueDateText = task.dueDate
    ? (() => {
        try { return format(parseISO(task.dueDate), "MMM d"); } catch { return task.dueDate; }
      })()
    : null;

  const completedSubtasks = (task.subtasks || []).filter((s) => s.done).length;
  const totalSubtasks = (task.subtasks || []).length;

  return (
    <div className={`group relative bg-white dark:bg-[#1c2030] rounded-lg border border-slate-200 dark:border-[#2a3044] border-l-4 ${borderClass} shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 dark:hover:bg-[#202540] ${compact ? "p-2.5" : "p-3"}`}
      onClick={(e) => {
        if (e.target.closest("button")) return;
        if (onClick) onClick();
      }}
    >
      {/* Top row: type + priority dot + task id */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${typeColor} flex-shrink-0`}>
          {typeIcon}
        </span>

        {taskIdsOpen && (
          <span className="text-xs text-slate-400 font-mono">
            {task.id?.startsWith("b") ? "BL" : "CY"}-{task.id}
          </span>
        )}

        <div className="flex-1" />

        {priorityColorsOpen && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priorityKey] || "bg-slate-300"}`} title={task.priority} />
        )}

        {/* Aging indicator */}
        {agingDays >= 3 && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${agingDays >= 7 ? "bg-red-500" : "bg-orange-400"}`}
            title={`No status change for ${agingDays} day${agingDays !== 1 ? "s" : ""}`}
          />
        )}
      </div>

      {/* Epic badge */}
      {epic && (
        <div className="mb-1.5">
          <span
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: epic.color + "22", color: epic.color }}
          >
            <FaRocket className="w-2.5 h-2.5" />
            {epic.title}
          </span>
        </div>
      )}

      {/* Title */}
      <div className={`font-medium text-slate-800 dark:text-slate-200 leading-snug ${compact ? "text-xs" : "text-sm"} mb-2 line-clamp-2`}>
        {task.title}
      </div>

      {/* Labels */}
      {taskLabels.length > 0 && allBadgesOpen && (
        <div className="flex flex-wrap gap-1 mb-2">
          {taskLabels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: label.color + "22", color: label.color, border: `1px solid ${label.color}44` }}
            >
              {label.name}
            </span>
          ))}
          {taskLabels.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">+{taskLabels.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: due date + story points + assignee */}
      <div className="flex items-center gap-2 mt-1">
        {/* Due date */}
        {dueDateText && (
          <span className={`text-xs flex items-center gap-0.5 ${
            dueDateStatus === "overdue" ? "text-red-600 font-semibold" :
            dueDateStatus === "soon" ? "text-orange-500" :
            "text-slate-400"
          }`}>
            {dueDateStatus === "overdue" && "⚠ "}
            {dueDateText}
          </span>
        )}

        {/* Story points */}
        {task.storyPoint != null && task.storyPoint !== "" && (
          <span className="text-xs bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
            {task.storyPoint}
          </span>
        )}

        <div className="flex-1" />

        {/* Subtask toggle */}
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

        {/* Assignee avatar */}
        {task.assignedTo && task.assignedTo !== "unassigned" && (
          <div
            className={`w-5 h-5 rounded-full ${getAvatarColor(task.assignedTo)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
            title={task.assignedTo}
          >
            {getInitials(task.assignedTo)}
          </div>
        )}
      </div>

      {/* Subtask list */}
      {showSubtasks && totalSubtasks > 0 && (
        <div className="mt-2 border-t border-slate-100 dark:border-[#232838] pt-2 space-y-1">
          {(task.subtasks || []).map((sub) => (
            <div key={sub.id} className={`text-xs flex items-center gap-1.5 ${sub.done ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-400"}`}>
              <div className={`w-3 h-3 rounded-sm border flex-shrink-0 ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300"}`} />
              {sub.title}
            </div>
          ))}
        </div>
      )}

      {/* Overdue stripe */}
      {dueDateStatus === "overdue" && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-red-500 border-r-red-500 rounded-tr-lg" />
      )}
    </div>
  );
}
