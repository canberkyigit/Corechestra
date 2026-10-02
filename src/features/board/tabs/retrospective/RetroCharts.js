import React, { useMemo, useState } from "react";
import { buildBurndownSeries, buildVelocityHistory, getSprintTotals } from "../../utils/sprintMetrics";

const CHART_TABS = [
  { key: "burndown", label: "Burndown" },
  { key: "velocity", label: "Velocity" },
];

function StatTiles({ total, done, remaining }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[
        { label: "Total SP", value: total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" },
        { label: "Completed", value: done, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" },
        { label: "Remaining", value: remaining, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30" },
      ].map(({ label, value, color, bg }) => (
        <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Burndown from the persisted daily snapshots (perProjectBurndownSnapshots). */
export function BurndownChart({ activeTasks, snapshots, sprint }) {
  const totals = useMemo(() => getSprintTotals(activeTasks || []), [activeTasks]);
  const series = useMemo(
    () => buildBurndownSeries({ snapshots, sprint, totals }),
    [snapshots, sprint, totals]
  );
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;
  const { points, maxY } = series;

  const W = 500;
  const H = 200;
  const padL = 40;
  const padB = 30;
  const padT = 10;
  const padR = 20;
  const lastIndex = Math.max(points.length - 1, 1);
  const xScale = (index) => padL + ((W - padL - padR) / lastIndex) * index;
  const yScale = (value) => padT + (H - padT - padB) * (1 - value / maxY);
  const idealLine = points.map((point, index) => `${xScale(index)},${yScale(point.ideal)}`).join(" ");
  const actualPoints = points
    .map((point, index) => (point.actual === null ? null : { x: xScale(index), y: yScale(point.actual), point }))
    .filter(Boolean);
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div>
      <StatTiles {...totals} />
      <div className="bg-slate-50 dark:bg-[#232838] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4">
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-400" /><span className="text-slate-500 dark:text-slate-400">Ideal</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-500" /><span className="text-slate-500 dark:text-slate-400">Remaining</span></div>
          <span className="ml-auto font-semibold text-slate-600 dark:text-slate-300">{pct}% complete</span>
        </div>
        {points.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 text-center px-6">
            No burndown data yet — a snapshot is recorded each day the sprint has tasks.
          </div>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-slate-200 dark:text-[#2a3044]" style={{ height: 180 }} role="img" aria-label="Sprint burndown chart">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line key={ratio} x1={padL} x2={W - padR} y1={yScale(maxY * ratio)} y2={yScale(maxY * ratio)} stroke="currentColor" strokeWidth="1" />
              ))}
              {[0, 0.5, 1].map((ratio) => (
                <text key={ratio} x={padL - 5} y={yScale(maxY * ratio) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(maxY * ratio)}</text>
              ))}
              {points.map((point, index) => (index % labelEvery === 0 || index === points.length - 1 ? (
                <text key={point.date} x={xScale(index)} y={H - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">{point.label}</text>
              ) : null))}
              {points.length > 1 && (
                <polyline points={idealLine} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="5,3" />
              )}
              {actualPoints.length > 1 && (
                <polyline points={actualPoints.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              )}
              {actualPoints.map(({ x, y, point }) => (
                <circle key={point.date} cx={x} cy={y} r="3" fill="#3b82f6">
                  <title>{`${point.label}: ${point.actual} SP remaining`}</title>
                </circle>
              ))}
            </svg>
            {!series.hasWindow && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Set sprint start and end dates to see the ideal line across the whole sprint.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Committed vs completed story points of the last completed sprints + current. */
export function VelocityChart({ activeTasks, completedSprints }) {
  const sprints = useMemo(() => {
    const history = buildVelocityHistory(completedSprints || [], 5);
    const current = getSprintTotals(activeTasks || []);
    return [...history, { id: "current", name: "Current", committed: current.total, completed: current.done }];
  }, [activeTasks, completedSprints]);

  const maxVal = Math.max(...sprints.flatMap((sprint) => [sprint.committed, sprint.completed]), 1);
  const barW = 28;
  const gap = 14;
  const groupW = barW * 2 + gap;
  const sprintGap = 30;
  const chartW = sprints.length * (groupW + sprintGap);
  const chartH = 160;
  const padB = 30;
  const completedCount = sprints.length - 1;

  return (
    <div className="bg-slate-50 dark:bg-[#232838] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4">
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-blue-300 dark:bg-blue-700 rounded-sm" /><span className="text-slate-500 dark:text-slate-400">Committed</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-green-400 rounded-sm" /><span className="text-slate-500 dark:text-slate-400">Completed</span></div>
        {completedCount === 0 && (
          <span className="ml-auto text-slate-400 dark:text-slate-500">Complete a sprint to build velocity history</span>
        )}
      </div>
      <svg viewBox={`0 0 ${chartW + 20} ${chartH}`} className="w-full" style={{ height: 150 }} role="img" aria-label="Sprint velocity chart">
        {sprints.map((sprint, index) => {
          const x = 10 + index * (groupW + sprintGap);
          const committedH = (sprint.committed / maxVal) * (chartH - padB - 10);
          const completedH = (sprint.completed / maxVal) * (chartH - padB - 10);
          return (
            <g key={sprint.id || sprint.name}>
              <rect x={x} y={chartH - padB - committedH} width={barW} height={committedH} fill="#93c5fd" rx="3">
                <title>{`${sprint.name}: ${sprint.committed} SP committed`}</title>
              </rect>
              <rect x={x + barW + gap} y={chartH - padB - completedH} width={barW} height={completedH} fill="#4ade80" rx="3">
                <title>{`${sprint.name}: ${sprint.completed} SP completed`}</title>
              </rect>
              <text x={x + barW + gap / 2} y={chartH - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{sprint.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function RetroCharts({ activeTasks, burndownSnapshots, completedSprints, sprint }) {
  const [chartType, setChartType] = useState("burndown");

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {CHART_TABS.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => setChartType(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              chartType === key
                ? "bg-blue-600 text-white shadow"
                : "bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2a3044]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {chartType === "burndown" && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Burndown Chart</h3>
          <BurndownChart activeTasks={activeTasks} snapshots={burndownSnapshots} sprint={sprint} />
        </div>
      )}
      {chartType === "velocity" && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Velocity Chart</h3>
          <VelocityChart activeTasks={activeTasks} completedSprints={completedSprints} />
        </div>
      )}
    </div>
  );
}
