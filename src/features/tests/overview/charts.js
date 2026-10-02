import React, { memo, useMemo, useState } from "react";
import { RESULT_META } from "../constants/testingConstants";
import { parseDateOnly } from "../utils/testingFormat";

const TREND_ORDER = ["passed", "failed", "retest", "blocked", "skipped"];

function shortDate(key) {
  const date = parseDateOnly(key);
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : key;
}

function niceMax(value) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((candidate) => candidate * 4 >= value) || pow * 10;
  return step * 4;
}

export function ChartLegend({ statuses = TREND_ORDER, counts }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600" aria-label="Legend">
      {statuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${RESULT_META[status].bar}`} aria-hidden="true" />
          {RESULT_META[status].label}
          {counts && <span className="tabular-nums text-slate-500">{counts[status] || 0}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * 30-day stacked execution columns (passed/failed/retest/blocked/skipped).
 * Hover/focus a day for a tooltip; an sr-only table carries the data.
 */
export const ExecutionTrendChart = memo(function ExecutionTrendChart({ data = [] }) {
  const [active, setActive] = useState(null);
  const width = 640;
  const height = 190;
  const pad = { top: 10, right: 6, bottom: 22, left: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.map((day) => day.total)));
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(16, slot - 4));
  const y = (value) => pad.top + plotH - (value / max) * plotH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const totals = useMemo(() => {
    const sum = {};
    data.forEach((day) => TREND_ORDER.forEach((status) => { sum[status] = (sum[status] || 0) + day[status]; }));
    return sum;
  }, [data]);
  const activeDay = active !== null ? data[active] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ChartLegend counts={totals} />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Executions per day for the last 30 days" onMouseLeave={() => setActive(null)}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-[#252b3b]" strokeWidth="1" strokeDasharray={tick === 0 ? "" : "2 4"} />
            <text x={pad.left - 6} y={y(tick) + 3} textAnchor="end" className="fill-slate-400 text-[10px] dark:fill-slate-500" style={{ fontSize: 10 }}>{Math.round(tick)}</text>
          </g>
        ))}
        {data.map((day, index) => {
          const x = pad.left + index * slot + (slot - barW) / 2;
          let cursor = 0;
          const segments = TREND_ORDER.filter((status) => day[status] > 0);
          return (
            <g key={day.date}>
              {segments.map((status, segIndex) => {
                const value = day[status];
                const y0 = y(cursor);
                cursor += value;
                const y1 = y(cursor);
                const gap = segIndex < segments.length - 1 ? 1.5 : 0;
                const h = Math.max(1, y0 - y1 - gap);
                const isTop = segIndex === segments.length - 1;
                return (
                  <rect
                    key={status}
                    x={x}
                    y={y1 + (isTop ? 0 : gap)}
                    width={barW}
                    height={h}
                    rx={isTop ? Math.min(3, barW / 2) : 0}
                    className={`${RESULT_META[status].fill} transition-opacity ${active !== null && active !== index ? "opacity-40" : ""}`}
                  />
                );
              })}
              {((index % 7 === 0 && data.length - 1 - index >= 4) || index === data.length - 1) && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 10 }}>{shortDate(day.date)}</text>
              )}
              <rect
                x={pad.left + index * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="presentation"
                aria-label={`${shortDate(day.date)}: ${day.total} executions`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="focus:outline-none"
              />
            </g>
          );
        })}
      </svg>
      {activeDay && (
        <div
          className="pointer-events-none absolute top-6 z-10 min-w-[150px] rounded-lg border border-slate-200/90 bg-white/100 px-3 py-2 text-xs shadow-lg dark:border-[#2a3044] dark:bg-[#232838]"
          style={{ left: `clamp(0px, calc(${((active + 0.5) / data.length) * 100}% - 75px), calc(100% - 150px))` }}
          role="status"
        >
          <div className="mb-1 font-semibold text-slate-900">{shortDate(activeDay.date)}</div>
          {TREND_ORDER.map((status) => (
            <div key={status} className="flex items-center justify-between gap-4 tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-slate-600"><span className={`h-2 w-2 rounded-sm ${RESULT_META[status].bar}`} />{RESULT_META[status].label}</span>
              <span className="font-medium text-slate-900">{activeDay[status]}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-slate-200/70 pt-1 font-semibold text-slate-900 dark:border-[#2a3044]"><span>Total</span><span className="tabular-nums">{activeDay.total}</span></div>
        </div>
      )}
      <table className="sr-only">
        <caption>Executions per day</caption>
        <thead><tr><th>Date</th>{TREND_ORDER.map((status) => <th key={status}>{RESULT_META[status].label}</th>)}</tr></thead>
        <tbody>{data.map((day) => <tr key={day.date}><td>{day.date}</td>{TREND_ORDER.map((status) => <td key={status}>{day[status]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
});

/** Donut of latest result per case, with 2px gaps and a centre headline. */
export const StatusDonut = memo(function StatusDonut({ distribution = [], centerValue, centerLabel }) {
  const [active, setActive] = useState(null);
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = total > 0 && distribution.filter((item) => item.count).length > 1 ? 2.5 : 0;
  let offset = 0;
  const activeItem = active ? distribution.find((item) => item.status === active) : null;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 flex-shrink-0" role="img" aria-label={`Latest results: ${distribution.map((item) => `${item.count} ${item.status}`).join(", ")}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-500/10" />
        {total > 0 && distribution.filter((item) => item.count > 0).map((item) => {
          const length = (item.count / total) * circumference;
          const dash = Math.max(0.5, length - gap);
          const el = (
            <circle
              key={item.status}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={active === item.status ? stroke + 4 : stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className={`${RESULT_META[item.status].stroke} cursor-pointer transition-all`}
              onMouseEnter={() => setActive(item.status)}
              onMouseLeave={() => setActive(null)}
            />
          );
          offset += length;
          return el;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 26, fontWeight: 700 }}>
          {activeItem ? activeItem.count : centerValue}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" style={{ fontSize: 11 }}>
          {activeItem ? RESULT_META[activeItem.status].label : centerLabel}
        </text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {distribution.map((item) => (
          <li key={item.status}>
            <button
              type="button"
              onMouseEnter={() => setActive(item.status)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(item.status)}
              onBlur={() => setActive(null)}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-[3px] ${RESULT_META[item.status].bar}`} aria-hidden="true" />
              <span className="flex-1 truncate text-slate-700">{RESULT_META[item.status].label}</span>
              <span className="tabular-nums font-medium text-slate-900">{item.count}</span>
              <span className="w-10 text-right text-xs tabular-nums text-slate-500">{total ? Math.round((item.count / total) * 100) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

/** Line chart for cycle burndown: remaining (solid) vs ideal (dashed). */
export const BurndownChart = memo(function BurndownChart({ burndown }) {
  const { points = [], total = 0 } = burndown || {};
  const [active, setActive] = useState(null);
  const width = 520;
  const height = 170;
  const pad = { top: 12, right: 10, bottom: 22, left: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, total);
  const x = (index) => pad.left + (points.length <= 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value) => pad.top + plotH - (value / max) * plotH;
  const actual = points.map((point, index) => (point.remaining === null ? null : `${x(index)},${y(point.remaining)}`)).filter(Boolean);
  const ideal = points.map((point, index) => `${x(index)},${y(point.ideal)}`);
  const step = Math.max(1, Math.ceil(points.length / 6));
  const activePoint = active !== null ? points[active] : null;
  const lastIndex = points.reduce((acc, point, index) => (point.remaining !== null ? index : acc), -1);
  if (!points.length) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-blue-600 dark:bg-blue-400" />Remaining</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-slate-400" />Ideal</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Cycle burndown" onMouseLeave={() => setActive(null)}>
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line x1={pad.left} x2={width - pad.right} y1={y(max * fraction)} y2={y(max * fraction)} className="stroke-slate-200 dark:stroke-[#252b3b]" strokeDasharray={fraction ? "2 4" : ""} />
            <text x={pad.left - 6} y={y(max * fraction) + 3} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 10 }}>{Math.round(max * fraction)}</text>
          </g>
        ))}
        <polyline points={ideal.join(" ")} fill="none" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeDasharray="4 4" />
        {actual.length > 0 && <polyline points={actual.join(" ")} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => (
          <g key={point.date}>
            {point.remaining !== null && (index === active || index === lastIndex) && (
              <circle cx={x(index)} cy={y(point.remaining)} r="4" className="fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-[#1a1f2e]" strokeWidth="2" />
            )}
            {index % step === 0 && (
              <text x={x(index)} y={height - 6} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 10 }}>{shortDate(point.date)}</text>
            )}
            <rect x={x(index) - plotW / Math.max(2, points.length * 2)} y={pad.top} width={plotW / Math.max(1, points.length)} height={plotH} fill="transparent" onMouseEnter={() => setActive(index)} />
          </g>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + plotH} className="stroke-slate-300 dark:stroke-[#374155]" />}
      </svg>
      {activePoint && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-slate-200/90 bg-white/100 px-2.5 py-1.5 text-xs shadow-md dark:border-[#2a3044] dark:bg-[#232838]" role="status">
          <span className="font-semibold text-slate-900">{shortDate(activePoint.date)}</span>
          <span className="ml-2 text-slate-600">Remaining <b className="tabular-nums text-slate-900">{activePoint.remaining ?? "—"}</b> · Ideal <span className="tabular-nums">{activePoint.ideal}</span></span>
        </div>
      )}
    </div>
  );
});

/** Tiny pass/fail sequence for flaky detection (letters + colour). */
export function SequenceDots({ sequence = [] }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Recent results: ${sequence.join(", ")}`}>
      {sequence.map((status, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index} className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] font-bold text-white ${RESULT_META[status]?.bar || "bg-slate-400"}`} title={RESULT_META[status]?.label}>
          {RESULT_META[status]?.short}
        </span>
      ))}
    </span>
  );
}
