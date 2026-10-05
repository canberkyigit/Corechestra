import React, { memo } from "react";
import { FaBullseye, FaComment, FaLayerGroup, FaUsers } from "react-icons/fa";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import { GOAL_LEVEL_META, HEALTH_META, periodLabel } from "../utils/goalModel";
import { HealthPill, TrackBar, relativeDays } from "./StrategyPrimitives";

export function LevelBadge({ level }) {
  const meta = GOAL_LEVEL_META[level] || GOAL_LEVEL_META.company;
  return <span className={`inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${meta.badge}`}>{meta.label}</span>;
}

/** Name of the team / project a goal belongs to. */
export function goalScopeLabel(goal, { teams, projects }) {
  if (goal.level === "team") return (teams || []).find((team) => team.id === goal.teamId)?.name || "No team";
  if (goal.level === "project") return (projects || []).find((project) => project.id === goal.projectId)?.name || "No project";
  return "Company-wide";
}

function GoalCard({ goal, teams, projects, ownerName, parentTitle, onOpen, now, compact = false }) {
  const health = HEALTH_META[goal.healthKey] || HEALTH_META["no-data"];
  const ScopeIcon = goal.level === "team" ? FaUsers : goal.level === "project" ? FaLayerGroup : FaBullseye;
  return (
    <button
      type="button"
      onClick={() => onOpen(goal.id)}
      data-testid="goal-card"
      className="group relative flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 pl-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#252b3b] dark:bg-[#1a1f2e] dark:hover:border-[#3a4054]"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: health.hex }} aria-hidden="true" />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <LevelBadge level={goal.level} />
            <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <ScopeIcon className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{goalScopeLabel(goal, { teams, projects })}</span>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">· {periodLabel(goal.period)}</span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
            {goal.title}
          </h3>
          {parentTitle && !compact && (
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500">Supports</span> {parentTitle}
            </p>
          )}
        </div>
        <HealthPill health={goal.healthKey} />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {(goal.keyResults || []).length} key result{(goal.keyResults || []).length === 1 ? "" : "s"}
            {goal.expected !== null && goal.healthKey !== "done" && <> · expected {goal.expected}%</>}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{goal.progress}%</span>
        </div>
        <TrackBar value={goal.progress} expected={goal.healthKey === "done" ? null : goal.expected} health={goal.healthKey === "no-data" || goal.healthKey === "not-started" ? "on-track" : goal.healthKey} label={`${goal.title} progress`} />
      </div>

      {!compact && (goal.keyResults || []).length > 0 && (
        <ul className="space-y-1.5">
          {goal.keyResults.slice(0, 3).map((kr, index) => (
            <li key={kr.id} className="flex items-center gap-2 text-xs">
              <span className="h-1 w-1 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{kr.title}</span>
              <span className="flex-shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{goal.krProgress[index]}%</span>
            </li>
          ))}
          {goal.keyResults.length > 3 && <li className="pl-3 text-[11px] text-slate-400">+{goal.keyResults.length - 3} more</li>}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-[#232838] dark:text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {goal.ownerId ? <Avatar name={ownerName || goal.ownerId} size={18} /> : <span className="h-[18px] w-[18px] rounded-full border border-dashed border-slate-300 dark:border-slate-600" />}
          <span className="truncate">{ownerName || goal.ownerId || "No owner"}</span>
        </span>
        <span className="inline-flex flex-shrink-0 items-center gap-1">
          <FaComment className="h-2.5 w-2.5" aria-hidden="true" />
          {goal.lastCheckIn ? `Checked in ${relativeDays(goal.lastCheckIn.at, now)}` : "No check-ins yet"}
        </span>
      </div>
    </button>
  );
}

export default memo(GoalCard);
