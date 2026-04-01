import React from "react";
import { FaCalendarAlt, FaCheckCircle, FaEdit, FaPlay } from "react-icons/fa";

export function BoardSprintBanner({
  sprint,
  sprintDaysLeft,
  projectActiveTasks,
  sprintPct,
  doneTasks,
  isAdmin,
  onOpenSprintModal,
  onOpenFuturePlans,
}) {
  if (!sprint) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1c2030] border-b border-slate-200 dark:border-[#2a3044] px-3 md:px-6 py-2.5 flex flex-wrap items-center gap-2 md:gap-4 transition-colors">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${sprint.status === "active" ? "bg-green-500" : sprint.status === "completed" ? "bg-slate-400" : "bg-yellow-400"}`} />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sprint.name}</span>
        {sprint.status === "active" && sprint.endDate && (
          <span className={`text-xs flex items-center gap-1 ${sprintDaysLeft <= 2 ? "text-red-500 font-semibold" : "text-slate-400 dark:text-slate-500"}`}>
            · {sprintDaysLeft <= 2 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            {sprintDaysLeft} day{sprintDaysLeft !== 1 ? "s" : ""} left
          </span>
        )}
        {sprint.goal && (
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline truncate max-w-xs">· {sprint.goal}</span>
        )}
      </div>

      {projectActiveTasks.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-24 h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${sprintPct}%` }} />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{doneTasks}/{projectActiveTasks.length}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isAdmin && sprint.status !== "active" && (
          <button className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors" onClick={() => onOpenSprintModal("start")}>
            <FaPlay className="w-2.5 h-2.5" /> Start Sprint
          </button>
        )}
        {sprint.status === "active" && (
          <>
            {isAdmin && (
              <button className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors" onClick={() => onOpenSprintModal("edit")}>
                <FaEdit className="w-2.5 h-2.5" /> Edit Sprint
              </button>
            )}
            {isAdmin && (
              <button className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 dark:bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors" onClick={() => onOpenSprintModal("complete")}>
                <FaCheckCircle className="w-2.5 h-2.5" /> Complete Sprint
              </button>
            )}
            {isAdmin && (
              <button className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors" onClick={onOpenFuturePlans}>
                <FaCalendarAlt className="w-2.5 h-2.5" /> Plan a future sprint
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
