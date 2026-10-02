import React, { memo, useState } from "react";
import { FaChevronDown, FaFlask } from "react-icons/fa";
import { STATUS_META } from "../../constants/releaseMeta";
import { isActiveStatus } from "../../utils/releaseModel";
import { describeTargetDate } from "../../utils/releaseUtils";
import {
  EnvPipeline,
  OwnerAvatar,
  ProgressBar,
  ReadinessRing,
  RiskBadge,
  StatusPill,
  TargetDate,
  VersionBadge,
} from "../ReleaseBadges";

const GRID = "grid items-center gap-x-4 grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_112px_124px] lg:grid-cols-[minmax(0,1fr)_112px_124px_164px_72px_32px] xl:grid-cols-[minmax(0,1fr)_112px_124px_168px_44px_172px_72px_32px]";

const GROUP_ORDER = ["code-freeze", "in-progress", "planned", "released", "rolled-back", "cancelled"];

function progressTone(metrics, release) {
  if (!isActiveStatus(release.status)) return release.status === "released" ? "green" : "slate";
  if (metrics.riskLevel === "high") return "red";
  return metrics.work.percent >= 100 ? "green" : "blue";
}

const ReleaseRow = memo(function ReleaseRow({ release, metrics, users, now, selected, onOpen }) {
  const active = isActiveStatus(release.status);
  const rel = describeTargetDate(release.releaseDate, { active, now });
  const work = metrics.work;
  const open = () => onOpen(release.id);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open release ${release.version}${release.name ? ` ${release.name}` : ""}`}
        aria-current={selected ? "true" : undefined}
        data-testid={`release-row-${release.id}`}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        }}
        className={`${GRID} cursor-pointer px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/60 ${
          selected ? "bg-blue-500/[0.06] dark:bg-blue-500/10" : "hover:bg-slate-500/[0.04] dark:hover:bg-white/[0.03]"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <VersionBadge version={release.version} status={release.status} />
            <span className="truncate text-sm font-semibold text-slate-900">{release.name || "Untitled release"}</span>
            {release.sample && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-500/10 dark:text-violet-300" title="Sample data">
                <FaFlask className="w-2 h-2" /> Sample
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {release.description || "No description"}
          </p>
          <p className={`mt-0.5 text-[11px] md:hidden ${rel.tone === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>
            {release.releaseDate ? rel.text : "No target date"} · {work.done}/{work.total} done
          </p>
        </div>
        <div><StatusPill status={release.status} /></div>
        <div className="hidden md:block"><TargetDate date={release.releaseDate} active={active} now={now} /></div>
        <div className="hidden lg:block min-w-0">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 tabular-nums">
            <span>{work.total ? `${work.done}/${work.total} items` : "No items"}</span>
            <span>{work.points ? `${work.pointsDone}/${work.points} SP` : `${work.percent}%`}</span>
          </div>
          <ProgressBar value={work.percent} tone={progressTone(metrics, release)} />
        </div>
        <div className="hidden xl:flex justify-center">
          <ReadinessRing score={metrics.readiness.score} muted={!active && release.status !== "released"} />
        </div>
        <div className="hidden xl:block"><EnvPipeline environments={release.environments} /></div>
        <div className="hidden lg:block"><RiskBadge level={metrics.riskLevel} /></div>
        <div className="hidden lg:flex justify-end"><OwnerAvatar users={users} owner={release.owner} /></div>
      </div>
    </li>
  );
});

function HeaderRow() {
  const cell = "text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500";
  return (
    <div className={`${GRID} px-4 py-2.5 border-b border-slate-200/80 bg-slate-500/[0.03] dark:border-[#252b3b] dark:bg-white/[0.02]`} aria-hidden="true">
      <span className={cell}>Release</span>
      <span className={cell}>Status</span>
      <span className={`${cell} hidden md:block`}>Target</span>
      <span className={`${cell} hidden lg:block`}>Progress</span>
      <span className={`${cell} hidden xl:block text-center`}>Ready</span>
      <span className={`${cell} hidden xl:block`}>Environments</span>
      <span className={`${cell} hidden lg:block`}>Risk</span>
      <span className={`${cell} hidden lg:block text-right`}>Owner</span>
    </div>
  );
}

function ReleaseListView({ releases, metricsById, users, now, selectedId, onOpen, groupByStatus }) {
  const [collapsed, setCollapsed] = useState({});
  const groups = groupByStatus
    ? GROUP_ORDER.map((status) => ({ status, items: releases.filter((release) => release.status === status) })).filter((group) => group.items.length)
    : [{ status: null, items: releases }];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e]" data-testid="release-list-view">
      <HeaderRow />
      {groups.map((group) => {
        const isCollapsed = group.status && collapsed[group.status];
        return (
          <div key={group.status || "all"}>
            {group.status && (
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.status]: !prev[group.status] }))}
                className="flex w-full items-center gap-2 border-b border-slate-200/70 bg-slate-500/[0.025] px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-500/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 dark:border-[#252b3b] dark:bg-white/[0.015] dark:hover:bg-white/[0.03]"
              >
                <FaChevronDown className={`w-2.5 h-2.5 text-slate-500 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                <span className={`w-2 h-2 rounded-full ${STATUS_META[group.status].dot}`} aria-hidden="true" />
                {STATUS_META[group.status].label}
                <span className="font-medium text-slate-500 tabular-nums">{group.items.length}</span>
              </button>
            )}
            {!isCollapsed && (
              <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b] border-b border-slate-200/70 last:border-b-0 dark:border-[#252b3b]">
                {group.items.map((release) => (
                  <ReleaseRow
                    key={release.id}
                    release={release}
                    metrics={metricsById.get(release.id)}
                    users={users}
                    now={now}
                    selected={selectedId === release.id}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ReleaseListView);
