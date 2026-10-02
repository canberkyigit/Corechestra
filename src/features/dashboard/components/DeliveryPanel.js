import React, { memo } from "react";
import { format } from "date-fns";
import { FaFlask, FaShippingFast, FaTag } from "react-icons/fa";
import { ReadinessRing, RiskBadge } from "../../releases/components/ReleaseBadges";
import { parseValidDate } from "../utils/dashboardMetrics";
import { Panel, PanelLink } from "./DashboardPrimitives";

function countdown(days) {
  if (days === null || days === undefined) return "No target date";
  if (days === 0) return "Due today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
}

function Stat({ label, value, tone }) {
  const toneClass = tone === "red" ? "text-red-600 dark:text-red-400" : tone === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white";
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <Icon className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {children}
      </p>
      {action}
    </div>
  );
}

/** Cross-module delivery health: next release readiness + test quality + defects. */
function DeliveryPanel({ release, testHealth, openDefects, showReleases, showTests, onOpenReleases, onOpenTests }) {
  const next = release?.kpis?.next || null;
  const nextMetrics = next ? release.metricsById.get(next.id) : null;
  const passRate = testHealth?.passRate;
  const target = parseValidDate(next?.releaseDate);

  return (
    <Panel title="Delivery & quality" icon={FaShippingFast} testId="delivery-panel" className="h-full">
      <div className="space-y-5">
        {showReleases && (
          <div>
            <SectionTitle icon={FaTag} action={onOpenReleases ? <PanelLink onClick={onOpenReleases}>Releases</PanelLink> : null}>Next release</SectionTitle>
            {next ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-[#252b3b]">
                <ReadinessRing score={nextMetrics?.readiness.score ?? 0} size={40} stroke={4} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {next.version}
                    {next.name && <span className="font-normal text-slate-500 dark:text-slate-400"> · {next.name}</span>}
                  </p>
                  <p className={`mt-0.5 text-xs ${release.kpis.nextDays !== null && release.kpis.nextDays < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {target ? `${format(target, "MMM d")} · ` : ""}{countdown(release.kpis.nextDays)}
                  </p>
                </div>
                {nextMetrics && <RiskBadge level={nextMetrics.riskLevel} />}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-[#2a3044] dark:text-slate-400">No upcoming release scheduled.</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="In flight" value={release.kpis.inProgress} />
              <Stat label="At risk" value={release.kpis.atRisk} tone={release.kpis.atRisk ? "red" : undefined} />
              <Stat label="Shipped 90d" value={release.kpis.releasedRecently} />
            </div>
          </div>
        )}

        {showTests && (
          <div className={showReleases ? "border-t border-slate-100 pt-4 dark:border-[#252b3b]" : ""}>
            <SectionTitle icon={FaFlask} action={onOpenTests ? <PanelLink onClick={onOpenTests}>Tests</PanelLink> : null}>Test quality</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Pass rate"
                value={passRate === null || passRate === undefined ? "—" : `${passRate}%`}
                tone={passRate === null || passRate === undefined ? undefined : passRate >= 90 ? "green" : passRate < 70 ? "red" : undefined}
              />
              <Stat label="Failing" value={testHealth?.failed ?? 0} tone={testHealth?.failed ? "red" : undefined} />
              <Stat label="Open cycles" value={testHealth?.openCycles ?? 0} />
            </div>
            {passRate !== null && passRate !== undefined && (
              <div className="mt-3 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" aria-hidden="true">
                <div className="h-full rounded-l-full bg-emerald-500" style={{ width: `${passRate}%` }} />
                <div className="h-full rounded-r-full bg-red-500" style={{ width: `${100 - passRate}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {testHealth?.executed ? `Latest result of ${testHealth.executed} executed case${testHealth.executed === 1 ? "" : "s"}` : "No executed test cases yet"}
              {" · "}
              <span className={openDefects ? "font-medium text-red-600 dark:text-red-400" : ""}>{openDefects} open defect{openDefects === 1 ? "" : "s"}</span>
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default memo(DeliveryPanel);
