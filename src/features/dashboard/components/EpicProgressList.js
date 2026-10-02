import React, { memo } from "react";
import { FaLayerGroup } from "react-icons/fa";
import { percent } from "../utils/dashboardMetrics";
import { EmptyHint, Panel, PanelLink, ProgressBar } from "./DashboardPrimitives";

/** Epics ranked by open work, with completion bars in the epic's own color. */
export function buildEpicRows(projectEpics, epicProgress) {
  return projectEpics
    .map((epic) => {
      const entry = epicProgress[epic.id] || { total: 0, done: 0, points: 0, donePoints: 0 };
      return { ...epic, ...entry, pct: percent(entry.done, entry.total) };
    })
    .sort((a, b) => (b.total - b.done) - (a.total - a.done) || b.total - a.total);
}

function EpicProgressList({ rows, limit, onViewAll, onSelect, title = "Epic progress", className = "h-full" }) {
  const withWork = rows.filter((row) => row.total > 0);
  const shown = limit ? withWork.slice(0, limit) : withWork;
  return (
    <Panel
      title={title}
      icon={FaLayerGroup}
      subtitle={rows.length ? `${withWork.length} of ${rows.length} epics have sprint work` : "No epics in this project"}
      action={onViewAll && withWork.length > (limit || 0) ? <PanelLink onClick={onViewAll}>All epics</PanelLink> : null}
      testId="epic-progress"
      className={className}
    >
      {shown.length === 0 ? (
        <EmptyHint icon={FaLayerGroup} title="No epic progress to show">Link sprint tasks to epics to track them here.</EmptyHint>
      ) : (
        <ul className="space-y-3.5">
          {shown.map((epic) => (
            <li key={epic.id}>
              <button
                type="button"
                onClick={() => onSelect?.(epic)}
                className="w-full rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: epic.color || "#94a3b8" }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{epic.title}</span>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {epic.done}/{epic.total}
                    {epic.points > 0 && <span className="hidden sm:inline"> · {epic.donePoints}/{epic.points} pts</span>}
                  </span>
                  <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">{epic.pct}%</span>
                </div>
                <ProgressBar value={epic.pct} color={epic.color || "#94a3b8"} label={`${epic.title} progress`} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default memo(EpicProgressList);
