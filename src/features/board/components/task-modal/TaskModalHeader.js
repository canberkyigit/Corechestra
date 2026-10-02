import React from "react";
import { FaCompress, FaTimes, FaTrash } from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";

export default function TaskModalHeader({
  typeInfo,
  task,
  isCreate,
  title,
  titleError,
  readOnly,
  onTitleChange,
  onOpenPanel,
  onDelete,
  onClose,
}) {
  const TypeIcon = typeInfo.icon;
  return (
    <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-4 border-b app-divider flex-shrink-0 bg-white/70 dark:bg-[#171b28]/70">
      <div className={`flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")} dark:bg-white/10`}>
        <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
      </div>
      {!isCreate && task?.id && (
        <span className="app-meta-pill font-mono">
          {taskKey(task.id)}
        </span>
      )}
      <input
        className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 disabled:cursor-not-allowed ${titleError ? "text-red-500 placeholder-red-300" : "text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600"}`}
        placeholder={titleError ? "Title is required!" : "Task title..."}
        value={title}
        disabled={readOnly}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <div className="flex items-center gap-1 ml-auto">
        {onOpenPanel && (
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            onClick={onOpenPanel}
            title="Collapse to side panel"
          >
            <FaCompress className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            onClick={onDelete}
            title="Delete task"
          >
            <FaTrash className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] rounded-lg transition-colors"
          onClick={onClose}
          title="Close"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
