import React, { memo, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { FaChartLine } from "react-icons/fa";
import { buildBurndownModel, parseValidDate } from "../utils/dashboardMetrics";
import { useElementWidth } from "../hooks/useElementWidth";
import { EmptyHint, LegendItem } from "./DashboardPrimitives";

const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 34 };
const ACTUAL = "#2563eb";
const IDEAL = "#94a3b8";

function niceMax(value) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

/** Burndown from real daily snapshots only; honest empty state otherwise. */
function BurndownChart({ tasks, sprint, snapshots }) {
  const [containerRef, width] = useElementWidth(560);
  const [hover, setHover] = useState(null);
  const model = useMemo(() => buildBurndownModel({ tasks, sprint, snapshots }), [tasks, sprint, snapshots]);

  if (model.status === "insufficient") {
    return (
      <div ref={containerRef} data-testid="burndown-insufficient">
        <EmptyHint icon={FaChartLine} title="Not enough data for a burndown yet">
          A snapshot of remaining points is recorded once per day while the app is open
          ({model.snapshotCount} of 2 needed{model.hasSprintDates ? " within this sprint" : ""}).
          {!model.hasSprintDates && " Set sprint start and end dates to scale the chart to the real sprint length."}
        </EmptyHint>
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{model.remaining}</span> of {model.totalPoints} pts remaining
        </p>
      </div>
    );
  }

  const { points, xRange, idealStart, sprintDays, startDate } = model;
  const yMax = niceMax(Math.max(idealStart, ...points.map((p) => p.y), 1));
  const plotW = Math.max(120, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const toX = (d) => PAD.left + (Math.min(Math.max(d, 0), xRange) / xRange) * plotW;
  const toY = (v) => PAD.top + plotH - (v / yMax) * plotH;
  const idealAt = (x) => Math.max(0, idealStart - (idealStart * x) / xRange);
  const dayLabel = (x) => (startDate ? format(addDays(startDate, x), "MMM d") : `Day ${x + 1}`);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x)},${toY(p.y)}`).join(" ");
  const area = `${line} L${toX(points[points.length - 1].x)},${toY(0)} L${toX(points[0].x)},${toY(0)} Z`;
  const yTicks = [0, yMax / 2, yMax];
  const xTicks = xRange <= 1 ? [0, xRange] : [0, Math.round(xRange / 2), xRange];
  const last = points[points.length - 1];
  const active = hover !== null ? points[hover] : null;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(toX(p.x) - x) < Math.abs(toX(points[best].x) - x)) best = i;
    });
    setHover(best);
  };

  return (
    <div ref={containerRef}>
      <div className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Burndown: ${last.y} points remaining of ${idealStart}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          className="block max-w-full"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={toY(tick)} y2={toY(tick)} className="stroke-slate-200 dark:stroke-[#2a3044]" strokeWidth={1} />
              <text x={PAD.left - 8} y={toY(tick)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums dark:fill-slate-500">
                {Math.round(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick, i) => (
            <text
              key={tick}
              x={toX(tick)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-slate-400 text-[10px] dark:fill-slate-500"
            >
              {dayLabel(tick)}
            </text>
          ))}
          <line x1={toX(0)} y1={toY(idealStart)} x2={toX(xRange)} y2={toY(0)} stroke={IDEAL} strokeWidth={1.5} strokeDasharray="5 4" />
          <path d={area} fill={ACTUAL} fillOpacity={0.08} />
          <path d={line} fill="none" stroke={ACTUAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active && (
            <line x1={toX(active.x)} x2={toX(active.x)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1} />
          )}
          {(active ? [active] : [last]).map((p) => (
            <circle key={p.date} cx={toX(p.x)} cy={toY(p.y)} r={4.5} fill={ACTUAL} className="stroke-white dark:stroke-[#1a1f2e]" strokeWidth={2} />
          ))}
          {!active && (
            <text x={toX(last.x)} y={toY(last.y) - 10} textAnchor={toX(last.x) > PAD.left + plotW - 30 ? "end" : "middle"} className="fill-slate-700 text-[11px] font-semibold tabular-nums dark:fill-slate-200">
              {last.y}
            </text>
          )}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-300"
            style={{
              left: Math.min(Math.max(toX(active.x), 70), width - 70),
              top: Math.max(0, toY(active.y) - 12),
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {parseValidDate(active.date) ? format(parseValidDate(active.date), "EEE, MMM d") : active.date}
            </p>
            <p className="mt-0.5 tabular-nums">Remaining <span className="font-semibold text-slate-800 dark:text-slate-100">{active.y} pts</span></p>
            <p className="tabular-nums">Ideal <span className="font-semibold text-slate-800 dark:text-slate-100">{Math.round(idealAt(active.x))} pts</span></p>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <LegendItem color={ACTUAL} label="Remaining" />
        <LegendItem color={IDEAL} label={`Ideal${sprintDays ? ` (${sprintDays} days)` : ""}`} dashed />
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{model.snapshotCount} daily snapshots</span>
      </div>
    </div>
  );
}

export default memo(BurndownChart);
