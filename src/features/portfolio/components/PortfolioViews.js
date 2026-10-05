import React, { memo } from "react";
import { FaExclamationTriangle, FaTag, FaBullseye } from "react-icons/fa";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import { HEALTH_META } from "../../goals/utils/goalModel";
import { HealthPill, ScoreRing, TrackBar, relativeDays } from "../../goals/components/StrategyPrimitives";

export function ProjectMark({ project, size = 36 }) {
  const label = String(project?.key || project?.name || "?").slice(0, 2).toUpperCase();
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), backgroundColor: project?.color || "#2563eb" }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

function releaseLabel(release) {
  if (!release) return null;
  if (release.daysLeft === null) return "No date";
  if (release.daysLeft < 0) return `${Math.abs(release.daysLeft)}d late`;
  if (release.daysLeft === 0) return "Today";
  return `in ${release.daysLeft}d`;
}

/** "4d left", or "ended" once the sprint's end date has passed. */
export function sprintTimeLabel(pace) {
  if (pace.daysLeft === null) return "";
  if (pace.daysLeft === 0 && pace.elapsed >= 100) return "ended";
  return `${pace.daysLeft}d left`;
}

function MiniStat({ label, value, tone }) {
  const toneCls = value > 0 && tone === "red"
    ? "text-red-600 dark:text-red-400"
    : value > 0 && tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-900 dark:text-white";
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-[#141720]">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}

/** One project's health card in the grid view. */
export const PortfolioCard = memo(function PortfolioCard({ row, ownerName, onOpen, now }) {
  const { project, pace, counts, nextRelease, latestUpdate } = row;
  const health = HEALTH_META[row.health] || HEALTH_META["no-data"];
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      data-testid="portfolio-card"
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#252b3b] dark:bg-[#1a1f2e] dark:hover:border-[#3a4054]"
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: health.hex }} aria-hidden="true" />
      <div className="flex items-start gap-3 px-4 pt-5">
        <ProjectMark project={project} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{project.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <HealthPill health={row.health} suffix={row.healthSource === "reported" ? "reported" : null} />
          </div>
        </div>
        <ScoreRing value={row.score} size={46} stroke={4} color={HEALTH_META[row.calculatedHealth]?.hex || "#94a3b8"} label={row.score === null ? "No health score" : `Health score ${row.score}`} />
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-slate-500 dark:text-slate-400">
              {row.sprint?.active ? row.sprint.name : "No active sprint"}
              {row.sprint?.active && pace.daysLeft !== null && <> · {sprintTimeLabel(pace)}</>}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{row.sprint?.active ? `${pace.progress}%` : "—"}</span>
          </div>
          <TrackBar value={row.sprint?.active ? pace.progress : 0} expected={row.sprint?.active ? pace.elapsed : null} health={row.calculatedHealth === "no-data" ? "on-track" : row.calculatedHealth} label={`${project.name} sprint progress`} />
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <MiniStat label="Open" value={counts.open} />
          <MiniStat label="Overdue" value={counts.overdue} tone="amber" />
          <MiniStat label="Blocked" value={counts.blocked} tone="red" />
          <MiniStat label="Bugs" value={counts.openDefects} tone={counts.urgentDefects ? "red" : undefined} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <FaTag className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
            {nextRelease ? (
              <>
                <span className="truncate font-medium">{nextRelease.version}</span>
                <span className={nextRelease.daysLeft !== null && nextRelease.daysLeft < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}>{releaseLabel(nextRelease)}</span>
                {nextRelease.readiness !== null && <span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">{nextRelease.readiness}% ready</span>}
              </>
            ) : <span className="text-slate-400 dark:text-slate-500">No upcoming release</span>}
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <FaBullseye className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
            {row.goals.length ? (
              <>
                <span>{row.goals.length} goal{row.goals.length === 1 ? "" : "s"}</span>
                <span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">{row.goalProgress}% avg</span>
              </>
            ) : <span className="text-slate-400 dark:text-slate-500">No project goals</span>}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 px-4 py-3 dark:border-[#232838]">
        {latestUpdate ? (
          <div className="flex items-start gap-2">
            <Avatar name={ownerName(latestUpdate.createdBy) || "?"} size={20} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{latestUpdate.summary || `Marked ${HEALTH_META[latestUpdate.health]?.label.toLowerCase()}`}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{ownerName(latestUpdate.createdBy) || "Someone"} · {relativeDays(latestUpdate.createdAt, now)}</p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <FaExclamationTriangle className="h-2.5 w-2.5" aria-hidden="true" /> No status update yet
          </p>
        )}
      </div>
    </button>
  );
});

const TH = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400";
const TD = "px-3 py-3 align-middle text-sm text-slate-700 dark:text-slate-200";

/** Dense table view of every project. */
export const PortfolioTable = memo(function PortfolioTable({ rows, onOpen, now }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e]">
      <table className="w-full min-w-[960px]" data-testid="portfolio-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 dark:border-[#252b3b] dark:bg-[#141720]">
          <tr>
            <th className={TH}>Project</th>
            <th className={TH}>Health</th>
            <th className={`${TH} text-right`}>Score</th>
            <th className={`${TH} w-48`}>Sprint</th>
            <th className={`${TH} text-right`}>Open</th>
            <th className={`${TH} text-right`}>Overdue</th>
            <th className={`${TH} text-right`}>Blocked</th>
            <th className={`${TH} text-right`}>Bugs</th>
            <th className={TH}>Next release</th>
            <th className={`${TH} text-right`}>Goals</th>
            <th className={TH}>Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#232838]">
          {rows.map((row) => (
            <tr key={row.project.id} onClick={() => onOpen(row.project.id)} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#1c2030]">
              <td className={TD}>
                <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(row.project.id); }} className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-lg">
                  <ProjectMark project={row.project} size={28} />
                  <span className="font-medium text-slate-900 dark:text-white">{row.project.name}</span>
                </button>
              </td>
              <td className={TD}><HealthPill health={row.health} suffix={row.healthSource === "reported" ? "reported" : null} /></td>
              <td className={`${TD} text-right tabular-nums`}>{row.score ?? "—"}</td>
              <td className={TD}>
                {row.sprint?.active ? (
                  <div className="flex items-center gap-2">
                    <TrackBar value={row.pace.progress} expected={row.pace.elapsed} health={row.calculatedHealth} className="h-1.5" label={`${row.project.name} sprint progress`} />
                    <span className="w-9 flex-shrink-0 text-right text-xs tabular-nums">{row.pace.progress}%</span>
                  </div>
                ) : <span className="text-xs text-slate-400">No active sprint</span>}
              </td>
              <td className={`${TD} text-right tabular-nums`}>{row.counts.open}</td>
              <td className={`${TD} text-right tabular-nums ${row.counts.overdue ? "font-semibold text-amber-600 dark:text-amber-400" : ""}`}>{row.counts.overdue}</td>
              <td className={`${TD} text-right tabular-nums ${row.counts.blocked ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>{row.counts.blocked}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.counts.openDefects}</td>
              <td className={TD}>
                {row.nextRelease ? (
                  <span className="text-xs"><span className="font-medium">{row.nextRelease.version}</span> <span className="text-slate-500 dark:text-slate-400">{releaseLabel(row.nextRelease)}</span></span>
                ) : <span className="text-xs text-slate-400">—</span>}
              </td>
              <td className={`${TD} text-right tabular-nums`}>{row.goals.length ? `${row.goals.length} · ${row.goalProgress}%` : "—"}</td>
              <td className={`${TD} text-xs text-slate-500 dark:text-slate-400`}>{row.latestUpdate ? relativeDays(row.latestUpdate.createdAt, now) : "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/** Stacked horizontal bar of the health distribution. */
export function HealthDistribution({ counts, total }) {
  const keys = ["on-track", "at-risk", "off-track", "no-data"];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" role="img" aria-label="Health distribution">
        {keys.map((key) => (counts[key] ? (
          <span key={key} className="h-full transition-[width] duration-500" style={{ width: `${(counts[key] / Math.max(1, total)) * 100}%`, backgroundColor: HEALTH_META[key].hex }} />
        ) : null))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {keys.map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: HEALTH_META[key].hex }} aria-hidden="true" />
            {HEALTH_META[key].label}
            <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{counts[key] || 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
