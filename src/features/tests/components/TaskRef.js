import React from "react";
import { FaBug, FaTimes } from "react-icons/fa";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { TASK_STATUS_SHORT_LABELS, TASK_TYPE_LABELS } from "../../../shared/constants/taskMeta";
import { taskKey } from "../../../shared/utils/helpers";

const STATUS_CHIP = {
  todo: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
  inprogress: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  review: "bg-yellow-500/10 text-yellow-700 ring-yellow-500/25 dark:text-yellow-300",
  awaiting: "bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-300",
  blocked: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
  done: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
};

export function TaskStatusChip({ status }) {
  if (!status) return null;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_CHIP[status] || STATUS_CHIP.todo}`}>
      {TASK_STATUS_SHORT_LABELS[status] || status}
    </span>
  );
}

/** One linked task row: key, title (opens the task side panel), type, status, optional remove. */
export default function TaskRef({ task, id, onRemove, removeLabel = "Unlink", showType = true }) {
  const isBug = task && (task.type === "bug" || task.type === "defect");
  return (
    <li className="group flex items-center gap-2.5 py-2">
      {isBug ? <FaBug className="h-3 w-3 flex-shrink-0 text-red-500" aria-hidden="true" /> : <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" aria-hidden="true" />}
      <span className="w-[92px] flex-shrink-0 truncate font-mono text-[11px] text-slate-500">{taskKey(task?.id ?? id)}</span>
      {task ? (
        <button type="button" onClick={() => requestOpenTask(task)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-800 hover:text-blue-600 hover:underline focus:outline-none focus-visible:underline dark:hover:text-blue-400">
          {task.title}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm italic text-slate-500">Task not found in this project</span>
      )}
      {showType && task && <span className="hidden text-[11px] text-slate-500 sm:inline">{TASK_TYPE_LABELS[task.type] || task.type}</span>}
      {task && <TaskStatusChip status={task.status} />}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${removeLabel} ${taskKey(task?.id ?? id)}`} className="rounded p-1 text-slate-400 opacity-60 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 focus:opacity-100">
          <FaTimes className="h-2.5 w-2.5" />
        </button>
      )}
    </li>
  );
}
