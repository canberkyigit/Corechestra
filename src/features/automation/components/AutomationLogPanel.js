import React, { useMemo, useState } from "react";
import { FaHistory } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { TRIGGER_BY_TYPE } from "../../../shared/automation/automationMeta";
import { StatusDot, relativeTime } from "./automationControls";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "problems", label: "Problems" },
];

export default function AutomationLogPanel({ entries, onOpenTask, onClear, canClear }) {
  const [filter, setFilter] = useState("all");
  const visible = useMemo(() => (
    filter === "problems" ? entries.filter((entry) => entry.status !== "success") : entries
  ).slice(0, 40), [entries, filter]);

  return (
    <section aria-label="Automation run log" className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2a3044] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <FaHistory className="h-3.5 w-3.5 text-slate-400" /> Run log
        </h3>
        <div className="flex items-center gap-1">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-md px-2 py-1 text-xs font-medium ${filter === item.id
                ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#232838]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {filter === "problems" ? "No failed runs." : "Rules have not run yet. Runs appear here as work changes."}
        </p>
      ) : (
        <ol className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto dark:divide-[#252b3b]">
          {visible.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusDot status={entry.status} />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{entry.ruleName}</span>
                <span className="ml-auto flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{relativeTime(entry.at)}</span>
              </div>
              <p className="mt-0.5 pl-4 text-xs text-slate-500 dark:text-slate-400">{entry.message}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 pl-4 text-[11px] text-slate-400 dark:text-slate-500">
                <span>{entry.trigger === "manual" ? "Run manually" : TRIGGER_BY_TYPE[entry.trigger]?.label || entry.trigger}</span>
                {entry.taskId && (
                  <button type="button" onClick={() => onOpenTask(entry.taskId)} className="font-mono text-blue-600 hover:underline dark:text-blue-400">
                    {taskKey(entry.taskId)}
                  </button>
                )}
                {entry.depth > 0 && <span>chained ×{entry.depth}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {canClear && entries.length > 0 && (
        <div className="border-t border-slate-200 dark:border-[#2a3044] px-4 py-2 text-right">
          <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-red-500">Clear log</button>
        </div>
      )}
    </section>
  );
}
