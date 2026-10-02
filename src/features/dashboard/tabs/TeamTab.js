import React from "react";
import { FaUsers } from "react-icons/fa";
import { Avatar, EmptyHint, Panel, ProgressBar } from "../components/DashboardPrimitives";
import { WorkloadLegend } from "../components/WorkloadPanel";
import { STATUS_KEYS, STATUS_META } from "../utils/dashboardMetrics";

export default function TeamTab({ data, actions }) {
  const { workload } = data;
  const max = Math.max(1, ...workload.map((row) => row.total));
  const contributors = workload.filter((row) => row.key !== "__unassigned__");
  const totalOpen = workload.reduce((sum, row) => sum + row.open, 0);
  const totalPoints = workload.reduce((sum, row) => sum + row.openPoints, 0);
  const avgOpen = contributors.length ? (contributors.reduce((sum, row) => sum + row.open, 0) / contributors.length) : 0;

  return (
    <Panel
      title="Team workload"
      icon={FaUsers}
      subtitle={`${contributors.length} contributors · ${totalOpen} open items · ${totalPoints} open pts`}
      testId="team-table"
    >
      {workload.length === 0 ? (
        <EmptyHint icon={FaUsers} title="No task assignments yet">Assign sprint tasks to see how load is spread across the team.</EmptyHint>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-[0.06em] text-slate-500 dark:border-[#252b3b] dark:bg-[#161a26] dark:text-slate-400">
                  <th scope="col" className="px-4 py-2 font-medium">Member</th>
                  <th scope="col" className="w-[30%] px-4 py-2 font-medium">Distribution</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Open</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Blocked</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Done</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Open pts</th>
                  <th scope="col" className="w-36 px-4 py-2 font-medium">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#252b3b]">
                {workload.map((row) => {
                  const overloaded = row.key !== "__unassigned__" && avgOpen > 0 && row.open >= Math.max(3, avgOpen * 1.5);
                  return (
                    <tr key={row.key} onClick={() => actions.drill(`member:${row.key}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232838]">
                      <td className="px-4 py-2.5">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {row.username
                            ? <Avatar name={row.name} color={row.color} size={26} />
                            : <span className="h-[26px] w-[26px] flex-shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600" aria-hidden="true" />}
                          <span className="min-w-0">
                            <span className={`block truncate font-medium ${row.username ? "text-slate-800 dark:text-slate-100" : "italic text-slate-500 dark:text-slate-400"}`}>{row.name}</span>
                            {row.username && <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">@{row.username}{row.role ? ` · ${row.role}` : ""}</span>}
                          </span>
                          {overloaded && (
                            <span className="ml-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
                              High load
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" style={{ width: `${Math.max(6, (row.total / max) * 100)}%` }}>
                          {STATUS_KEYS.filter((status) => row.byStatus[status] > 0).map((status) => (
                            <div
                              key={status}
                              className="h-full first:rounded-l-full last:rounded-r-full"
                              style={{ width: `${(row.byStatus[status] / row.total) * 100}%`, backgroundColor: STATUS_META[status].hex }}
                              title={`${STATUS_META[status].label}: ${row.byStatus[status]}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{row.open}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${row.blocked ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>{row.blocked}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.done}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.openPoints}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <ProgressBar value={row.pct} color="bg-emerald-500" label={`${row.name} completion`} />
                          <span className="w-9 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{row.pct}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-[#252b3b]"><WorkloadLegend /></div>
        </>
      )}
    </Panel>
  );
}
