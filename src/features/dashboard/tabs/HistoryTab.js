import React from "react";
import { FaHistory, FaTachometerAlt, FaTrophy } from "react-icons/fa";
import VelocityChart from "../components/VelocityChart";
import { EmptyHint, Panel, ProgressBar } from "../components/DashboardPrimitives";
import { parseValidDate } from "../utils/dashboardMetrics";
import { format } from "date-fns";

function rateTone(rate) {
  if (rate >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
  if (rate >= 50) return { bar: "bg-blue-500", text: "text-slate-700 dark:text-slate-200" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

export default function HistoryTab({ data }) {
  const { velocity, completedSprints } = data;
  const avgRate = completedSprints.length
    ? Math.round(completedSprints.reduce((sum, s) => sum + (Number(s.completionRate) || 0), 0) / completedSprints.length)
    : null;

  return (
    <div className="space-y-4">
      <Panel title="Velocity" icon={FaTachometerAlt} subtitle="Committed vs completed story points, last six sprints" testId="velocity-panel">
        <VelocityChart velocity={velocity} />
      </Panel>

      <Panel
        title="Sprint history"
        icon={FaHistory}
        subtitle={completedSprints.length ? `${completedSprints.length} completed sprint${completedSprints.length === 1 ? "" : "s"} · ${avgRate}% average task completion` : "No completed sprints yet"}
        testId="sprint-history"
      >
        {completedSprints.length === 0 ? (
          <EmptyHint icon={FaTrophy} title="No completed sprints yet">Complete your first sprint to start building a delivery history.</EmptyHint>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-[0.06em] text-slate-500 dark:border-[#252b3b] dark:bg-[#161a26] dark:text-slate-400">
                  <th scope="col" className="px-4 py-2 font-medium">Sprint</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Tasks</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Points</th>
                  <th scope="col" className="w-48 px-4 py-2 font-medium">Completion</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Completed on</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#252b3b]">
                {completedSprints.map((s) => {
                  const rate = Number(s.completionRate) || 0;
                  const tone = rateTone(rate);
                  const completedAt = parseValidDate(s.completedAt);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#232838]">
                      <td className="max-w-0 px-4 py-2.5">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                        {s.goal && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.goal}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{s.doneTasks}/{s.totalTasks}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{s.completedPoints}/{s.totalPoints}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <ProgressBar value={rate} color={tone.bar} label={`${s.name} completion`} />
                          <span className={`w-9 text-right text-xs font-semibold tabular-nums ${tone.text}`}>{rate}%</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{completedAt ? format(completedAt, "MMM d, yyyy") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
