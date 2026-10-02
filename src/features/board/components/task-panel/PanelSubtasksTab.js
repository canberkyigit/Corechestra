import React from "react";
import { FaCheck, FaPlus, FaTimes } from "react-icons/fa";

/** Simple checklist view for the side panel's "Subtasks" tab. */
export default function PanelSubtasksTab({
  subtasks,
  readOnly,
  inlineSubTitle,
  setInlineSubTitle,
  onAdd,
  onToggle,
  onRemove,
}) {
  const completed = subtasks.filter((subtask) => subtask.done).length;
  const pct = subtasks.length > 0 ? (completed / subtasks.length) * 100 : 0;

  return (
    <div className="p-4">
      {subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
            <span>{completed}/{subtasks.length} done</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-1.5 mb-3">
        {subtasks.length === 0 && (
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No subtasks yet</div>
        )}
        {subtasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] group">
            <button
              type="button"
              onClick={() => onToggle(sub.id)}
              disabled={readOnly}
              className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600"}`}
            >
              {sub.done && <FaCheck className="w-2 h-2 text-white" />}
            </button>
            <span className={`flex-1 text-xs ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{sub.title}</span>
            {!readOnly && (
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-0.5"
                onClick={() => onRemove(sub.id)}
                title="Remove subtask"
              >
                <FaTimes className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            className="flex-1 border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
            placeholder="Add subtask..."
            value={inlineSubTitle}
            onChange={(event) => setInlineSubTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onAdd(); }}
          />
          <button type="button" className="px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700" onClick={onAdd} title="Add subtask">
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}
