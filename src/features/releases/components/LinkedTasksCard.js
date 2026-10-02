import React, { memo, useEffect, useState } from "react";
import { FaChevronDown, FaChevronRight, FaLink, FaPlus, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { TaskStatusChip } from "./ReleaseBadges";
import TaskSearchPopup from "./TaskSearchPopup";

const LinkedTaskRow = memo(function LinkedTaskRow({ task, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1c2030] transition-colors group">
      <TaskStatusChip status={task.status} className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0" />
      <button
        type="button"
        onClick={() => requestOpenTask(task)}
        className="flex items-center gap-2 min-w-0 flex-1 text-left"
        title="Open task"
      >
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{taskKey(task.id)}</span>
        <span className="text-slate-800 dark:text-slate-200 text-sm truncate hover:text-blue-600 dark:hover:text-blue-400">{task.title}</span>
      </button>
      {task.assignedTo && task.assignedTo !== "unassigned" && (
        <span className="text-slate-500 dark:text-slate-400 text-xs flex-shrink-0">{task.assignedTo}</span>
      )}
      {task.storyPoint != null && task.storyPoint !== "" && (
        <span className="text-slate-500 dark:text-slate-400 text-xs font-mono flex-shrink-0 bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
          {task.storyPoint}pt
        </span>
      )}
      {onRemove && (
        <button
          onClick={() => onRemove(task.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-600 dark:text-slate-400 hover:text-red-400 transition-opacity flex-shrink-0"
          title="Unlink task"
          aria-label="Unlink task"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

/**
 * Tasks linked to the selected release plus the "Add Task" picker.
 * `onRemoveTask(taskId)` should be stable for the memoized rows.
 */
export default function LinkedTasksCard({
  linkedTasks, unresolvedTaskCount, linkedIds, allTasks, canManage, onAddTask, onRemoveTask,
}) {
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [showTaskSearch, setShowTaskSearch] = useState(false);

  useEffect(() => {
    if (!canManage) setShowTaskSearch(false);
  }, [canManage]);

  return (
    <>
      <div className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <button
            onClick={() => setTasksExpanded((v) => !v)}
            className="flex items-center gap-2 hover:text-blue-500 transition-colors"
          >
            {tasksExpanded ? <FaChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" /> : <FaChevronRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
            <FaLink className="text-slate-400 dark:text-slate-500 w-3.5 h-3.5" />
            <span className="text-slate-800 dark:text-white font-semibold text-sm">Linked Tasks</span>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
              {linkedTasks.length}
            </span>
          </button>
          {canManage && (
            <button
              onClick={() => setShowTaskSearch(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            >
              <FaPlus className="w-2.5 h-2.5" />
              Add Task
            </button>
          )}
        </div>

        {tasksExpanded && (
          <div className="divide-y divide-slate-200 dark:divide-[#252b3b]">
            {linkedTasks.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-6 italic">
                {canManage ? 'No tasks linked — click "Add Task" to link one' : "No tasks linked"}
              </p>
            ) : (
              linkedTasks.map((task) => (
                <LinkedTaskRow key={task.id} task={task} onRemove={canManage ? onRemoveTask : undefined} />
              ))
            )}
            {unresolvedTaskCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 px-5 py-3">
                {unresolvedTaskCount} linked task{unresolvedTaskCount === 1 ? " is" : "s are"} outside the current project or no longer exist.
              </p>
            )}
          </div>
        )}
      </div>
      {showTaskSearch && canManage && (
        <TaskSearchPopup
          allTasks={allTasks}
          linkedIds={linkedIds}
          onAdd={onAddTask}
          onClose={() => setShowTaskSearch(false)}
        />
      )}
    </>
  );
}
