import React, { memo } from "react";
import { FaChartBar } from "react-icons/fa";
import { EmptyState, PanelHeader, PlanningCard } from "./PlanningPrimitives";

const CHART_HEIGHT = 88;

/** Committed vs completed story points of recent sprints, with the average as a guide line. */
function VelocityPanel({ history, avgVelocity, committedSP }) {
  const maxValue = Math.max(
    1,
    committedSP || 0,
    ...history.map((entry) => Math.max(entry.completed, entry.committed))
  );
  const avgTop = avgVelocity ? CHART_HEIGHT - (avgVelocity / maxValue) * CHART_HEIGHT : null;

  return (
    <PlanningCard aria-label="Velocity">
      <PanelHeader
        icon={FaChartBar}
        title="Velocity"
        meta={history.length ? `last ${history.length}` : null}
      />
      <div className="px-4 py-3">
        {history.length === 0 ? (
          <EmptyState title="No velocity data yet" hint="Complete a sprint to start forecasting from real throughput." />
        ) : (
          <>
            <div className="relative" style={{ height: CHART_HEIGHT }}>
              {avgTop !== null && (
                <div
                  className="pointer-events-none absolute inset-x-0 border-t border-dashed border-blue-400/70"
                  style={{ top: avgTop }}
                  title={`Average velocity: ${avgVelocity} SP`}
                />
              )}
              <div className="flex h-full items-end gap-3">
                {history.map((entry) => (
                  <div
                    key={entry.id || entry.name}
                    className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                    title={`${entry.name}: ${entry.completed} of ${entry.committed} SP completed`}
                  >
                    <div
                      className="w-1/2 max-w-[14px] rounded-t bg-slate-200 dark:bg-[#2a3044]"
                      style={{ height: `${Math.max((entry.committed / maxValue) * 100, 3)}%` }}
                    />
                    <div
                      className="w-1/2 max-w-[14px] rounded-t bg-blue-500"
                      style={{ height: `${Math.max((entry.completed / maxValue) * 100, 3)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex gap-3">
              {history.map((entry) => (
                <div key={entry.id || entry.name} className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={entry.name}>{entry.name}</p>
                  <p className="text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{entry.completed}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-[#252b3b] dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-200 dark:bg-[#2a3044]" />Committed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" />Completed</span>
              {avgVelocity !== null && (
                <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-blue-400" />Average</span>
              )}
            </div>
          </>
        )}
      </div>
    </PlanningCard>
  );
}

export default memo(VelocityPanel);
