import React from "react";
import { COLUMNS } from "./retroConstants";
import { getSprintTotals } from "../../utils/sprintMetrics";

export default function RetroStatistics({ retrospectiveItems, activeTasks }) {
  const items = retrospectiveItems || {};
  const tasks = activeTasks || [];
  // Numeric sums: legacy string story points must not be concatenated.
  const { total: totalSP, done: doneSP, remaining } = getSprintTotals(tasks);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {COLUMNS.map((col) => {
          const columnItems = items[col.key] || [];
          const resolved = columnItems.filter((item) => item.checked).length;
          return (
            <div key={col.key} className={`rounded-xl border p-4 ${col.card} bg-white dark:bg-[#1c2030]`}>
              <div className={`text-2xl font-bold ${col.badge.split(" ").find((cls) => cls.startsWith("text-")) || ""}`}>
                {columnItems.length}
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{col.label}</div>
              <div className="text-xs text-slate-400 mt-1">{resolved} resolved</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 mb-6">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Resolution Progress</h4>
        <div className="space-y-3">
          {COLUMNS.map((col) => {
            const columnItems = items[col.key] || [];
            const done = columnItems.filter((item) => item.checked).length;
            const pct = columnItems.length > 0 ? Math.round((done / columnItems.length) * 100) : 0;
            return (
              <div key={col.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className="text-slate-400">{done}/{columnItems.length} ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-[#2a3044] rounded-full overflow-hidden">
                  <div className={`h-full ${col.header} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Sprint Task Statistics</h4>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total", value: tasks.length, color: "text-slate-700 dark:text-slate-200", bg: "bg-slate-50 dark:bg-[#232838] border-slate-200 dark:border-[#2a3044]" },
            { label: "Done", value: tasks.filter((task) => task.status === "done").length, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" },
            { label: "In Progress", value: tasks.filter((task) => task.status === "inprogress").length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" },
            { label: "Blocked", value: tasks.filter((task) => task.status === "blocked").length, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} data-testid={`retro-stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className={`rounded-xl border p-3 text-center ${bg}`}>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 dark:bg-[#232838] rounded-lg p-3 border border-slate-100 dark:border-[#2a3044]" data-testid="retro-story-points">
            <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 text-xs uppercase tracking-wide">Story Points</div>
            {[
              { label: "Total", value: totalSP, color: "text-slate-700 dark:text-slate-200" },
              { label: "Completed", value: doneSP, color: "text-green-600 dark:text-green-400" },
              { label: "Remaining", value: remaining, color: "text-orange-500 dark:text-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between py-0.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs">{label}</span>
                <span className={`font-semibold text-xs ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-[#232838] rounded-lg p-3 border border-slate-100 dark:border-[#2a3044]">
            <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 text-xs uppercase tracking-wide">Priority</div>
            {["critical", "high", "medium", "low"].map((priority) => (
              <div key={priority} className="flex justify-between py-0.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs capitalize">{priority}</span>
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                  {tasks.filter((task) => (task.priority || "").toLowerCase() === priority).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
