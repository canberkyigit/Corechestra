import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { matchesTaskQuery } from "../utils/releaseUtils";
import { TaskStatusChip } from "./ReleaseBadges";

export default function TaskSearchPopup({ allTasks, linkedIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allTasks.filter(
      (t) => !linkedIds.includes(t.id) && matchesTaskQuery(t, q)
    ).slice(0, 20);
  }, [allTasks, linkedIds, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="app-surface w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-[#252b3b]">
          <FaSearch className="text-slate-500 dark:text-slate-400 w-3.5 h-3.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or key (CY-123)…"
            className="flex-1 bg-transparent text-slate-700 dark:text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">No tasks found</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => { onAdd(t.id); onClose(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors flex items-center gap-3"
              >
                <TaskStatusChip status={t.status} className="text-xs px-2 py-0.5 rounded font-medium" />
                <span className="font-mono text-slate-500 dark:text-slate-400 text-xs flex-shrink-0">{taskKey(t.id)}</span>
                <span className="text-slate-800 dark:text-slate-200 text-sm truncate flex-1">{t.title}</span>
                {t.storyPoint != null && t.storyPoint !== "" && (
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-mono flex-shrink-0">{t.storyPoint}pt</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
