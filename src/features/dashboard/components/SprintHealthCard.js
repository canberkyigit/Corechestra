import React, { memo } from "react";
import { format } from "date-fns";
import {
  FaCalendarAlt, FaCheckCircle, FaClock, FaExclamationCircle, FaExclamationTriangle, FaFlagCheckered, FaRocket,
} from "react-icons/fa";
import { EmptyHint, Panel, PanelLink } from "./DashboardPrimitives";

export const HEALTH_META = {
  "on-track":    { label: "On track",    icon: FaCheckCircle,         className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300" },
  "at-risk":     { label: "At risk",     icon: FaExclamationTriangle, className: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300" },
  "off-track":   { label: "Off track",   icon: FaExclamationCircle,   className: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300" },
  "overdue":     { label: "Past end date", icon: FaExclamationCircle, className: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300" },
  "completed":   { label: "Scope complete", icon: FaFlagCheckered,    className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300" },
  "not-started": { label: "Not started", icon: FaClock,               className: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
  "no-dates":    { label: "No schedule", icon: FaCalendarAlt,         className: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300" },
};

export function HealthBadge({ status }) {
  const meta = HEALTH_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span data-testid="sprint-health" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function healthExplanation(health) {
  switch (health.status) {
    case "on-track": return "Completed work is keeping pace with the sprint calendar.";
    case "at-risk": return `Completed work is ${health.gap} percentage points behind elapsed time.`;
    case "off-track": return `Completed work is ${health.gap} percentage points behind elapsed time — consider re-scoping.`;
    case "overdue": return "The sprint end date has passed with work still open.";
    case "completed": return "All committed work is done.";
    case "not-started": return "The sprint has not started yet.";
    default: return "Set start and end dates to track pace against the calendar.";
  }
}

function Meter({ label, value, detail, barClass, marker }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{value}%</span>
          {detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-[#232838]">
        <div className={`h-full rounded-full transition-[width] duration-500 ${barClass}`} style={{ width: `${Math.min(100, value)}%` }} />
        {marker !== undefined && marker !== null && (
          <span
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-slate-700 dark:bg-slate-200"
            style={{ left: `calc(${Math.min(100, marker)}% - 1px)` }}
            title={`Expected by today: ${marker}%`}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function SprintHealthCard({ sprint, health, stats, onOpenBoard }) {
  if (!sprint) {
    return (
      <Panel title="Active sprint" icon={FaRocket} testId="sprint-health-card">
        <EmptyHint icon={FaRocket} title="No active sprint">
          Plan a sprint on the board to track pace, burndown and team load here.
        </EmptyHint>
        {onOpenBoard && <div className="mt-3 text-center"><PanelLink onClick={onOpenBoard}>Open board</PanelLink></div>}
      </Panel>
    );
  }

  const hasTimeline = health.timePct !== undefined;
  const barClass = health.status === "off-track" || health.status === "overdue"
    ? "bg-red-500"
    : health.status === "at-risk" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Panel testId="sprint-health-card" className="h-full" bodyClassName="pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Active sprint</p>
          <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900 dark:text-white">{sprint.name || "Sprint"}</h2>
          {sprint.goal
            ? <p className="mt-1 line-clamp-2 max-w-xl text-[13px] text-slate-600 dark:text-slate-300">{sprint.goal}</p>
            : <p className="mt-1 text-[13px] italic text-slate-400 dark:text-slate-500">No sprint goal set</p>}
        </div>
        <HealthBadge status={health.status} />
      </div>

      <div className="mt-5 space-y-4">
        {hasTimeline && (
          <Meter
            label="Time elapsed"
            value={health.timePct}
            detail={`day ${health.elapsedDays} of ${health.totalDays}`}
            barClass="bg-slate-400 dark:bg-slate-500"
          />
        )}
        <Meter
          label="Work completed"
          value={health.workPct}
          detail={`${health.scopeDone} of ${health.scopeTotal} ${health.unit}`}
          barClass={barClass}
          marker={hasTimeline && health.status !== "not-started" ? health.timePct : null}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{healthExplanation(health)}</p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-[#252b3b]">
        <Fact label="Start" value={health.start ? format(health.start, "MMM d") : "—"} />
        <Fact label="End" value={health.end ? format(health.end, "MMM d") : "No end date set"} />
        <Fact label="Days left" value={health.daysLeft ?? "—"} />
        <Fact label="Scope" value={`${stats.total} items`} />
      </dl>
    </Panel>
  );
}

export default memo(SprintHealthCard);
