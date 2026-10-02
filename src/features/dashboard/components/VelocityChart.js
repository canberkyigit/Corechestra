import React, { memo, useState } from "react";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import { LegendItem } from "./DashboardPrimitives";

const COMPLETED = "#2563eb";
const HISTORY = "#93c5fd";
const COMMITTED_CLASS = "bg-slate-200/70 dark:bg-[#2a3044]";
const PLOT_H = 132;

/** Committed vs completed story points per sprint, with the rolling average. */
function VelocityChart({ velocity, compact = false }) {
  const [hover, setHover] = useState(null);
  const { bars, average, trend, sprintCount } = velocity;
  const max = Math.max(1, ...bars.map((b) => Math.max(b.done, b.committed)));
  const plotH = compact ? 104 : PLOT_H;
  // Leave room above the tallest bar for its value label.
  const scale = plotH - 16;

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{average ?? "—"}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {average !== null ? `pts avg over ${sprintCount} sprint${sprintCount === 1 ? "" : "s"}` : "Complete a sprint to establish velocity"}
        </span>
        {trend !== null && (
          <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {trend >= 0 ? <FaArrowUp className="h-2.5 w-2.5" aria-hidden="true" /> : <FaArrowDown className="h-2.5 w-2.5" aria-hidden="true" />}
            {Math.abs(trend)}% vs prior sprint
          </span>
        )}
      </div>

      <div className="relative" style={{ height: plotH + 20 }}>
        {average !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-slate-400/80 dark:border-slate-500"
            style={{ bottom: 20 + (average / max) * scale }}
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-x-0 bottom-5 border-t border-slate-200 dark:border-[#2a3044]" aria-hidden="true" />
        <div className="absolute inset-0 flex items-end gap-1.5 pb-5">
          {bars.map((bar, i) => {
            const doneH = bar.done > 0 ? Math.max(3, (bar.done / max) * scale) : 0;
            const committedH = bar.committed > 0 ? (bar.committed / max) * scale : 0;
            const isHover = hover === i;
            return (
              <div
                key={`${bar.id}-${i}`}
                className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{bar.done}</span>
                <div className="relative flex w-full max-w-[28px] items-end justify-center" style={{ height: Math.max(doneH, committedH) }}>
                  {committedH > 0 && <div className={`absolute bottom-0 w-full rounded-t ${COMMITTED_CLASS}`} style={{ height: committedH }} />}
                  <div
                    className="relative w-full rounded-t transition-opacity"
                    style={{ height: doneH, backgroundColor: bar.current ? COMPLETED : HISTORY, opacity: hover === null || isHover ? 1 : 0.6 }}
                  />
                </div>
                <span className={`absolute -bottom-[18px] w-full truncate text-center text-[10px] ${bar.current ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                  {bar.current ? "Current" : bar.name}
                </span>
                {isHover && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{bar.name}</p>
                    <p className="tabular-nums">Completed <span className="font-semibold text-slate-800 dark:text-slate-100">{bar.done} pts</span></p>
                    <p className="tabular-nums">Committed <span className="font-semibold text-slate-800 dark:text-slate-100">{bar.committed} pts</span></p>
                    {!bar.current && <p className="tabular-nums">Task completion {bar.completionRate}%</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <LegendItem color={HISTORY} label="Completed" />
          <LegendItem color={COMPLETED} label="Current sprint" />
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-sm ${COMMITTED_CLASS}`} aria-hidden="true" />
            Committed
          </span>
          {average !== null && <LegendItem color="#94a3b8" label="Average" dashed />}
        </div>
      )}
    </div>
  );
}

export default memo(VelocityChart);
