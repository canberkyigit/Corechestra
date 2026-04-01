import React from "react";
import { FaTrash } from "react-icons/fa";

export function BoardBulkActionBar({
  selectedCount,
  bulkStatus,
  setBulkStatus,
  statusOptions,
  onApply,
  onDelete,
  onClear,
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedCount} selected</span>
      <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 focus:outline-none">
        <option value="">Change status…</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button onClick={onApply} disabled={!bulkStatus} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors">
        Apply
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
        <FaTrash className="w-3 h-3" /> Delete
      </button>
      <button onClick={onClear} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-auto">
        Clear selection
      </button>
    </div>
  );
}
