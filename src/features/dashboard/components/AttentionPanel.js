import React, { memo, useMemo, useState } from "react";
import { format } from "date-fns";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { parseValidDate, STALE_DAYS } from "../utils/dashboardMetrics";
import { EmptyHint, Panel, TaskRow } from "./DashboardPrimitives";

const LIMIT = 7;

const SIGNAL_TONE = {
  blocked: "text-red-600 dark:text-red-400",
  overdue: "text-amber-700 dark:text-amber-400",
  unassigned: "text-violet-700 dark:text-violet-300",
  stale: "text-slate-500 dark:text-slate-400",
};

function dueLabel(task) {
  const due = parseValidDate(task.dueDate);
  return due ? `Due ${format(due, "MMM d")}` : "Overdue";
}

/**
 * Work that needs a decision today. Signals are ranked by severity
 * (blocked → overdue → unowned urgent → stale); a task appears once, under
 * its most severe signal, in the "All" view.
 */
function AttentionPanel({ stats, onOpenTask }) {
  const groups = useMemo(() => [
    { id: "blocked", label: "Blocked", tasks: stats.byStatus.blocked, meta: () => "Blocked" },
    { id: "overdue", label: "Overdue", tasks: stats.overdue, meta: dueLabel },
    { id: "unassigned", label: "Unassigned", tasks: stats.unassignedUrgent, meta: () => "No owner" },
    { id: "stale", label: "Stale", tasks: stats.stale, meta: () => `Idle ${STALE_DAYS}d+` },
  ], [stats]);

  const all = useMemo(() => {
    const seen = new Set();
    const rows = [];
    groups.forEach((group) => group.tasks.forEach((task) => {
      if (seen.has(task.id)) return;
      seen.add(task.id);
      rows.push({ task, signal: group.id, meta: group.meta(task) });
    }));
    return rows;
  }, [groups]);

  const [filter, setFilter] = useState("all");
  const activeGroup = groups.find((group) => group.id === filter);
  const rows = activeGroup
    ? activeGroup.tasks.map((task) => ({ task, signal: activeGroup.id, meta: activeGroup.meta(task) }))
    : all;
  const signalCount = groups.filter((group) => group.tasks.length).length;

  const chip = (id, label, count) => {
    const isActive = filter === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={isActive}
        disabled={id !== "all" && count === 0}
        onClick={() => setFilter(id)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-default disabled:opacity-40 ${
          isActive
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"
        }`}
      >
        {label}
        <span className="tabular-nums opacity-70">{count}</span>
      </button>
    );
  };

  return (
    <Panel
      title="Needs attention"
      icon={FaExclamationTriangle}
      subtitle={all.length ? `${all.length} item${all.length === 1 ? "" : "s"} across ${signalCount} signal${signalCount === 1 ? "" : "s"}` : "No risks detected"}
      testId="attention-panel"
      className="h-full"
    >
      {all.length === 0 ? (
        <EmptyHint icon={FaCheckCircle} title="All clear">
          Nothing is blocked, overdue, stale or unowned.
        </EmptyHint>
      ) : (
        <>
          <div role="tablist" aria-label="Attention signals" className="mb-2 flex flex-wrap gap-1.5">
            {chip("all", "All", all.length)}
            {groups.map((group) => chip(group.id, group.label, group.tasks.length))}
          </div>
          <div className="-mx-2">
            {rows.slice(0, LIMIT).map(({ task, signal, meta }) => (
              <TaskRow
                key={`${signal}-${task.id}`}
                task={task}
                onOpen={onOpenTask}
                meta={<span className={`font-medium ${SIGNAL_TONE[signal]}`}>{meta}</span>}
              />
            ))}
          </div>
          {rows.length > LIMIT && (
            <p className="mt-1 px-0.5 text-xs text-slate-500 dark:text-slate-400">+{rows.length - LIMIT} more</p>
          )}
        </>
      )}
    </Panel>
  );
}

export default memo(AttentionPanel);
