import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaSearch, FaTimes } from "react-icons/fa";
import { TASK_TYPE_ICON_META } from "../../../../shared/constants/taskMeta";
import { taskKey } from "../../../../shared/utils/helpers";
import { matchesTaskQuery } from "../../utils/releaseUtils";
import { TaskStatusChip } from "../ReleaseBadges";

/** Search-to-link dialog: multi-select project tasks that are not linked yet. */
export default function TaskLinkPopup({ allTasks, linkedIds, onLink, onClose }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const linked = useMemo(() => new Set((linkedIds || []).map(String)), [linkedIds]);
  const results = useMemo(
    () => (allTasks || []).filter((task) => !linked.has(String(task.id)) && task.type !== "epic" && matchesTaskQuery(task, query)).slice(0, 50),
    [allTasks, linked, query]
  );

  const toggle = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 p-4 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Link work items" className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/100 shadow-2xl dark:border-[#2a3044] dark:bg-[#1c2030]">
        <div className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-[#2a3044]">
          <FaSearch className="h-3.5 w-3.5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search work items by title or key (CY-123)"
            aria-label="Search work items"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
          {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No matching work items</li>}
          {results.map((task) => {
            const checked = picked.includes(task.id);
            const meta = TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task;
            const Icon = meta.icon;
            return (
              <li key={task.id} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(task.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm focus:outline-none focus-visible:bg-blue-500/10 ${checked ? "bg-blue-500/[0.07]" : "hover:bg-slate-500/[0.06]"}`}
                >
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-[#3a4258]"}`}>
                    {checked && <FaCheck className="h-2.5 w-2.5" />}
                  </span>
                  <Icon className={`h-3 w-3 flex-shrink-0 ${meta.color}`} />
                  <span className="w-24 flex-shrink-0 font-mono text-xs text-slate-500">{taskKey(task.id)}</span>
                  <span className="flex-1 truncate text-slate-800">{task.title}</span>
                  <TaskStatusChip status={task.status} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500">{picked.length} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-500/10">Cancel</button>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => onLink(picked)}
              className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              Link {picked.length || ""} item{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
