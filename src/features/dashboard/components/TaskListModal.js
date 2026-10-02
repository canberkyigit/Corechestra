import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useEscapeKey } from "../../board/hooks/useEscapeKey";
import { toPoints } from "../utils/dashboardMetrics";
import { StatusPill, TaskRow } from "./DashboardPrimitives";

/** Drill-down list behind every KPI tile, legend row and workload row. */
export default function TaskListModal({ title, tasks, onClose, onOpenTask }) {
  const [query, setQuery] = useState("");
  const dialogRef = useRef(null);
  useEscapeKey(onClose);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => `${task.id} ${task.title} ${task.assignedTo || ""}`.toLowerCase().includes(q));
  }, [tasks, query]);
  const points = tasks.reduce((sum, task) => sum + toPoints(task), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[10vh] backdrop-blur-[1px]" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[75vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-[#2a3044] dark:bg-[#1c2030]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-[#252b3b]">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tasks.length} item{tasks.length === 1 ? "" : "s"}{points ? ` · ${points} pts` : ""}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-[#232838] dark:hover:text-slate-200"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>
        {tasks.length > 6 && (
          <div className="border-b border-slate-100 px-5 py-2.5 dark:border-[#252b3b]">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 dark:border-[#2a3044]">
              <FaSearch className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by key, title or assignee"
                aria-label="Filter tasks"
                className="w-full border-0 bg-transparent p-0 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:!bg-transparent dark:text-slate-200"
              />
            </label>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No tasks</p>
          ) : filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <TaskRow task={task} onOpen={onOpenTask} />
              </div>
              <StatusPill status={task.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
