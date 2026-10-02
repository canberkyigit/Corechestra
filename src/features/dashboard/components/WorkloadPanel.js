import React, { memo } from "react";
import { FaUsers } from "react-icons/fa";
import { STATUS_KEYS, STATUS_META } from "../utils/dashboardMetrics";
import { Avatar, EmptyHint, LegendItem, Panel, PanelLink } from "./DashboardPrimitives";

function StackedStatusBar({ row, max }) {
  return (
    <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" style={{ width: `${Math.max(8, (row.total / max) * 100)}%` }}>
      {STATUS_KEYS.filter((status) => row.byStatus[status] > 0).map((status) => (
        <div
          key={status}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(row.byStatus[status] / row.total) * 100}%`, backgroundColor: STATUS_META[status].hex }}
          title={`${STATUS_META[status].label}: ${row.byStatus[status]}`}
        />
      ))}
    </div>
  );
}

export function WorkloadLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {STATUS_KEYS.map((status) => <LegendItem key={status} color={STATUS_META[status].hex} label={STATUS_META[status].label} />)}
    </div>
  );
}

/** Team load: one stacked bar per assignee, length relative to the busiest. */
function WorkloadPanel({ rows, onSelectMember, onViewAll, limit = 6 }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  const shown = rows.slice(0, limit);
  return (
    <Panel
      title="Team workload"
      icon={FaUsers}
      subtitle={rows.length ? `${rows.filter((r) => r.key !== "__unassigned__").length} contributors in this sprint` : "No assignments yet"}
      action={onViewAll && rows.length > 0 ? <PanelLink onClick={onViewAll}>Details</PanelLink> : null}
      testId="workload-panel"
      className="h-full"
    >
      {rows.length === 0 ? (
        <EmptyHint icon={FaUsers} title="No work in this sprint">Assign sprint tasks to see how load is spread.</EmptyHint>
      ) : (
        <>
          <ul className="space-y-1">
            {shown.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onSelectMember?.(row)}
                  className="grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md px-1.5 py-1.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-[#232838]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {row.username
                      ? <Avatar name={row.name} color={row.color} size={22} />
                      : <span className="h-[22px] w-[22px] flex-shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600" aria-hidden="true" />}
                    <span className={`truncate text-[13px] ${row.username ? "text-slate-700 dark:text-slate-200" : "italic text-slate-500 dark:text-slate-400"}`}>{row.name}</span>
                  </span>
                  <StackedStatusBar row={row} max={max} />
                  <span className="w-20 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{row.open}</span> open
                    {row.blocked > 0 && <span className="ml-1 text-red-600 dark:text-red-400">· {row.blocked}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rows.length > limit && <p className="mt-1 px-1.5 text-xs text-slate-500 dark:text-slate-400">+{rows.length - limit} more</p>}
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-[#252b3b]"><WorkloadLegend /></div>
        </>
      )}
    </Panel>
  );
}

export default memo(WorkloadPanel);
