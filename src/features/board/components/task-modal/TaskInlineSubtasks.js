import React from "react";
import { FaCheck, FaPlus, FaTimes } from "react-icons/fa";

/** Compact subtask checklist shown in the modal's Details tab. */
export default function TaskInlineSubtasks({
  subtasks,
  inlineSubOpen,
  setInlineSubOpen,
  inlineSubTitle,
  setInlineSubTitle,
  onAdd,
  onToggle,
  onOpen,
  onRemove,
  readOnly = false,
}) {
  const closeInline = () => { setInlineSubOpen(false); setInlineSubTitle(""); };

  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
        </span>
        {!readOnly && (
          <button type="button" onClick={() => setInlineSubOpen(true)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Add subtask">
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      {subtasks.length > 0 && (
        <div>
          {subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
              <button
                type="button"
                onClick={() => !readOnly && onToggle(sub.id)}
                disabled={readOnly}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"}`}
              >
                {sub.done && <FaCheck className="w-2.5 h-2.5 text-white" />}
              </button>
              <button
                type="button"
                onClick={() => onOpen(sub)}
                className={`text-sm flex-1 truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
              >
                {sub.title}
              </button>
              {!readOnly && (
                <button type="button" className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all" onClick={() => onRemove(sub.id)} title="Remove subtask">
                  <FaTimes className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {readOnly ? null : inlineSubOpen ? (
        <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
          <input
            autoFocus
            className="flex-1 text-sm border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
            placeholder="Subtask title..."
            value={inlineSubTitle}
            onChange={(event) => setInlineSubTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
              if (event.key === "Escape") { event.preventDefault(); closeInline(); }
            }}
          />
          <button type="button" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" onClick={onAdd}>Add</button>
          <button type="button" className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600 dark:hover:text-slate-300" onClick={closeInline}>✕</button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
          onClick={() => setInlineSubOpen(true)}
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}
