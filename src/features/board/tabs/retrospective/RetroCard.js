import React from "react";
import { FaCheck, FaPencilAlt, FaTrash } from "react-icons/fa";

export default function RetroCard({ item, col, onVote, onEdit, onDelete, onToggleResolved, isEditing, editText, setEditText, onSave, onCancel }) {
  const scoreColor =
    item.score > 3 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : item.score < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        : "bg-slate-100 text-slate-600 dark:bg-[#2a3044] dark:text-slate-400";

  return (
    <div className={`group relative bg-white dark:bg-[#1c2030] rounded-xl border ${col.card} shadow-sm p-3 transition-all hover:shadow-md`}>
      {isEditing ? (
        <input
          autoFocus
          aria-label={`${col.label} item`}
          className="w-full text-sm bg-transparent border-b border-blue-400 text-slate-700 dark:text-slate-200 outline-none pb-1 mb-2"
          value={editText}
          placeholder="What happened?"
          onChange={(event) => setEditText(event.target.value)}
          onBlur={onSave}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") { event.preventDefault(); (onCancel || onSave)(); }
          }}
        />
      ) : (
        <p className={`text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-2 pr-16 ${item.checked ? "line-through opacity-40" : ""}`}>
          {item.text || <span className="italic text-slate-400">Empty item</span>}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onVote(1)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${scoreColor}`}
        >
          +1
          {item.score !== 0 && <span className="font-bold">{item.score > 0 ? `+${item.score}` : item.score}</span>}
        </button>
        {item.score !== 0 && (
          <button
            type="button"
            onClick={() => onVote(-1)}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            title="Downvote"
          >
            −1
          </button>
        )}
        {item.checked && (
          <span className="ml-auto text-[10px] font-medium text-green-600 dark:text-green-400">Resolved</span>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onToggleResolved}
          aria-pressed={Boolean(item.checked)}
          className={`p-1 rounded transition-colors ${item.checked ? "text-green-500 bg-green-50 dark:bg-green-900/20" : "text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
          title={item.checked ? "Mark as unresolved" : "Mark as resolved"}
        >
          <FaCheck className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Edit"
        >
          <FaPencilAlt className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete"
        >
          <FaTrash className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
