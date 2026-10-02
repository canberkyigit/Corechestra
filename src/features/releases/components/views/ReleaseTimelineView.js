import React, { memo, useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, format, startOfMonth } from "date-fns";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { STATUS_META } from "../../constants/releaseMeta";
import { isActiveStatus } from "../../utils/releaseModel";
import { formatDate, parseDate } from "../../utils/releaseUtils";
import { VersionBadge } from "../ReleaseBadges";

const ZOOMS = [
  { id: "quarter", label: "Quarter", months: 3 },
  { id: "half", label: "Half-year", months: 6 },
];

/** Bar span for a release (start → target/released). Null when unscheduled. */
export function releaseSpan(release) {
  const end = parseDate(release.releaseDate) || parseDate(release.releasedAt);
  if (!end) return null;
  let start = parseDate(release.startDate) || parseDate(release.createdAt);
  if (!start || start > end) start = new Date(end.getTime() - 14 * 86400000);
  return { start, end };
}

function pct(date, windowStart, totalDays) {
  return (differenceInCalendarDays(date, windowStart) / totalDays) * 100;
}

const ROW_LABEL = "w-56 flex-shrink-0 sticky left-0 z-10 border-r border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e]";

function ReleaseTimelineView({ releases, metricsById, now, onOpen, zoom = "quarter", onZoomChange }) {
  const zoomDef = ZOOMS.find((item) => item.id === zoom) || ZOOMS[0];
  const [offset, setOffset] = useState(0);
  const lookback = zoomDef.months === 3 ? 1 : 3;
  const windowStart = useMemo(() => addMonths(startOfMonth(now), -lookback + offset), [now, offset, lookback]);
  const windowEnd = useMemo(() => addMonths(windowStart, zoomDef.months), [windowStart, zoomDef.months]);
  const totalDays = Math.max(1, differenceInCalendarDays(windowEnd, windowStart));
  const step = zoomDef.months === 3 ? 1 : 2;

  const months = useMemo(() => {
    const list = [];
    for (let i = 0; i < zoomDef.months; i += 1) {
      const start = addMonths(windowStart, i);
      const end = addMonths(windowStart, i + 1);
      list.push({ key: format(start, "yyyy-MM"), label: format(start, zoomDef.months > 3 ? "MMM" : "MMMM"), year: format(start, "yyyy"), left: pct(start, windowStart, totalDays), width: pct(end, windowStart, totalDays) - pct(start, windowStart, totalDays) });
    }
    return list;
  }, [windowStart, totalDays, zoomDef.months]);

  const { rows, outside, unscheduled } = useMemo(() => {
    const visible = [];
    let outsideCount = 0;
    let unscheduledCount = 0;
    releases.forEach((release) => {
      const span = releaseSpan(release);
      if (!span) {
        unscheduledCount += 1;
        return;
      }
      if (span.end < windowStart || span.start >= windowEnd) {
        outsideCount += 1;
        return;
      }
      visible.push({ release, span });
    });
    visible.sort((a, b) => a.span.start - b.span.start);
    return { rows: visible, outside: outsideCount, unscheduled: unscheduledCount };
  }, [releases, windowStart, windowEnd]);

  const todayLeft = pct(now, windowStart, totalDays);
  const showToday = todayLeft >= 0 && todayLeft <= 100;

  const marker = (date) => {
    const d = parseDate(date);
    if (!d || d < windowStart || d > windowEnd) return null;
    return pct(d, windowStart, totalDays);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e]" data-testid="release-timeline-view">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-2.5 dark:border-[#252b3b]">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOffset((value) => value - step)} aria-label="Earlier" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
            <FaChevronLeft className="w-3 h-3" />
          </button>
          <button type="button" onClick={() => setOffset(0)} className="h-8 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
            Today
          </button>
          <button type="button" onClick={() => setOffset((value) => value + step)} aria-label="Later" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
            <FaChevronRight className="w-3 h-3" />
          </button>
          <span className="ml-2 text-sm font-semibold text-slate-800">
            {format(windowStart, "MMM yyyy")} – {format(addMonths(windowEnd, -1), "MMM yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-px bg-cyan-500" /> Code freeze</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-emerald-500" /> Released</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-red-500" /> Today</span>
          </div>
          <div role="group" aria-label="Zoom" className="inline-flex rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
            {ZOOMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={zoom === item.id}
                onClick={() => onZoomChange(item.id)}
                className={`h-7 rounded-md px-2.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                  zoom === item.id ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Month header */}
          <div className="flex border-b border-slate-200/80 dark:border-[#252b3b]">
            <div className={`${ROW_LABEL} px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500`}>Release</div>
            <div className="relative flex-1 h-14">
              {months.map((month) => (
                <div key={month.key} className="absolute inset-y-0 border-l border-slate-200/80 px-2 pt-1.5 dark:border-[#252b3b]" style={{ left: `${month.left}%`, width: `${month.width}%` }}>
                  <span className="text-xs font-semibold text-slate-700">{month.label}</span>
                  <span className="ml-1 text-[11px] text-slate-500">{month.year}</span>
                </div>
              ))}
              {showToday && (
                <span className="absolute bottom-1.5 z-[2] -translate-x-1/2 rounded-full bg-red-500 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white" style={{ left: `${todayLeft}%` }}>
                  Today
                </span>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {rows.length === 0 && (
              <div className="flex">
                <div className={`${ROW_LABEL} h-24`} />
                <div className="flex-1 flex items-center justify-center text-sm text-slate-500">No releases in this range</div>
              </div>
            )}
            {rows.map(({ release, span }) => {
              const meta = STATUS_META[release.status] || STATUS_META.planned;
              const metrics = metricsById.get(release.id);
              const left = Math.max(0, pct(span.start, windowStart, totalDays));
              const right = Math.min(100, pct(span.end, windowStart, totalDays) + (100 / totalDays));
              const width = Math.max(1.2, right - left);
              const progress = release.status === "released" ? 100 : (metrics?.work.percent ?? 0);
              const freezeAt = marker(release.freezeDate);
              const releasedAt = release.status === "released" || release.status === "rolled-back" ? marker(release.releasedAt || release.releaseDate) : null;
              const label = `${release.version}${release.name ? ` ${release.name}` : ""}: ${formatDate(span.start)} – ${formatDate(span.end)}, ${meta.label}`;
              return (
                <div key={release.id} className="flex border-b border-slate-200/60 last:border-b-0 dark:border-[#252b3b]/80">
                  <div className={`${ROW_LABEL} flex items-center gap-2 px-4 py-2.5 min-w-0`}>
                    <VersionBadge version={release.version} status={release.status} />
                    <span className="truncate text-xs font-medium text-slate-700">{release.name}</span>
                  </div>
                  <div className="relative flex-1 h-12">
                    {months.map((month) => (
                      <div key={month.key} className="absolute inset-y-0 border-l border-slate-200/50 dark:border-[#252b3b]/70" style={{ left: `${month.left}%` }} aria-hidden="true" />
                    ))}
                    <button
                      type="button"
                      onClick={() => onOpen(release.id)}
                      aria-label={label}
                      title={label}
                      className={`group absolute z-[2] top-1/2 -translate-y-1/2 h-6 rounded-md overflow-hidden text-left ring-1 ring-inset ring-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${release.status === "cancelled" ? "opacity-60" : ""}`}
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: `${meta.hex}33` }}
                    >
                      <span className="absolute inset-y-0 left-0" style={{ width: `${progress}%`, backgroundColor: meta.hex, opacity: isActiveStatus(release.status) ? 0.85 : 0.75 }} aria-hidden="true" />
                      <span className="relative z-[1] flex h-full items-center gap-1.5 px-2 text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {release.version}
                        {isActiveStatus(release.status) && <span className="font-medium opacity-75">{progress}%</span>}
                      </span>
                    </button>
                    {freezeAt !== null && (
                      <span className="pointer-events-none absolute z-[3] top-1.5 bottom-1.5 w-0.5 rounded bg-cyan-500" style={{ left: `${freezeAt}%` }} title={`Code freeze ${formatDate(release.freezeDate)}`} aria-hidden="true" />
                    )}
                    {releasedAt !== null && (
                      <span
                        className={`pointer-events-none absolute z-[3] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-white dark:ring-[#1a1f2e] ${release.status === "rolled-back" ? "bg-orange-500" : "bg-emerald-500"}`}
                        style={{ left: `${releasedAt}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {showToday && (
              <div className="pointer-events-none absolute inset-y-0 flex" style={{ left: 0, right: 0 }} aria-hidden="true">
                <div className="w-56 flex-shrink-0" />
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 w-0.5 bg-red-500/80" style={{ left: `${todayLeft}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(outside > 0 || unscheduled > 0) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 px-4 py-2 text-xs text-slate-500 dark:border-[#252b3b]">
          {outside > 0 && <span>{outside} release{outside !== 1 ? "s" : ""} outside this range</span>}
          {unscheduled > 0 && (
            <span className="inline-flex items-center gap-1.5">
              {unscheduled} without a target date
              {releases.filter((release) => !releaseSpan(release)).slice(0, 3).map((release) => (
                <button key={release.id} type="button" onClick={() => onOpen(release.id)} className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
                  <VersionBadge version={release.version} status={release.status} />
                </button>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ReleaseTimelineView);
