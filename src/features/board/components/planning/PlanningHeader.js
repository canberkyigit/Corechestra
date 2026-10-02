import React, { memo } from "react";
import { FaBullseye, FaCalendarAlt, FaClipboardCheck, FaLayerGroup, FaTachometerAlt } from "react-icons/fa";
import { getLoadTone } from "../../utils/planningMetrics";
import { PlanningCard } from "./PlanningPrimitives";

const PHASE_STYLES = {
  upcoming: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  ended: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:border-[#2a3044]",
};
const PHASE_LABEL = { upcoming: "Upcoming", active: "Active", ended: "Ended" };

const TONE_ICON = {
  slate: "text-slate-600 bg-slate-500/10 dark:text-slate-300",
  blue: "text-blue-600 bg-blue-500/10 dark:text-blue-300",
  green: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
  amber: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
  red: "text-red-600 bg-red-500/10 dark:text-red-300",
};
const LOAD_TO_TONE = { ok: "green", near: "amber", over: "red", idle: "slate" };

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

function KpiCard({ icon: Icon, label, value, sub, tone = "slate", testId }) {
  return (
    <PlanningCard as="div" className="flex min-w-0 items-start gap-3 p-3.5" data-testid={testId}>
      <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{label}</span>
        <span className="mt-0.5 block truncate text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
      </span>
    </PlanningCard>
  );
}

function PlanningHeader({ sprint, timing, committedSP, capacitySP, avgVelocity, scopeCount, readiness }) {
  const loadTone = LOAD_TO_TONE[getLoadTone(committedSP, capacitySP)];
  const delta = avgVelocity !== null ? committedSP - avgVelocity : null;
  const openChecks = readiness.total - readiness.passed;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight text-slate-900 dark:text-slate-100">Sprint planning</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">{sprint?.name || "No active sprint"}</span>
            {(sprint?.startDate || sprint?.endDate) && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <FaCalendarAlt className="h-2.5 w-2.5" />
                  {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                </span>
              </>
            )}
            {timing.workingDays !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>{timing.workingDays} working day{timing.workingDays !== 1 ? "s" : ""}</span>
              </>
            )}
          </p>
        </div>
        {timing.phase && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PHASE_STYLES[timing.phase]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {PHASE_LABEL[timing.phase]} · {timing.label}
          </span>
        )}
      </div>

      <section aria-label="Planning metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={FaLayerGroup}
          label="Committed"
          value={`${committedSP} SP`}
          sub={capacitySP > 0 ? `${Math.round((committedSP / capacitySP) * 100)}% of ${capacitySP} SP capacity` : "No capacity set"}
          tone={loadTone}
          testId="kpi-committed"
        />
        <KpiCard
          icon={FaTachometerAlt}
          label="Avg velocity"
          value={avgVelocity !== null ? `${avgVelocity} SP` : "—"}
          sub={delta === null
            ? "Complete a sprint to forecast"
            : delta === 0
              ? "Commitment matches velocity"
              : `Commitment ${delta > 0 ? "+" : "−"}${Math.abs(delta)} SP vs average`}
          tone={delta !== null && delta > Math.round((avgVelocity || 0) * 0.1) ? "amber" : "blue"}
          testId="kpi-velocity"
        />
        <KpiCard
          icon={FaBullseye}
          label="Scope"
          value={`${scopeCount} item${scopeCount !== 1 ? "s" : ""}`}
          sub={readiness.unestimated > 0 ? `${readiness.unestimated} not estimated` : scopeCount > 0 ? "All estimated" : "Nothing planned yet"}
          tone={readiness.unestimated > 0 ? "amber" : "slate"}
          testId="kpi-scope"
        />
        <KpiCard
          icon={FaClipboardCheck}
          label="Readiness"
          value={`${readiness.passed}/${readiness.total}`}
          sub={openChecks === 0 ? "Ready to start" : `${openChecks} check${openChecks !== 1 ? "s" : ""} open`}
          tone={openChecks === 0 ? "green" : "slate"}
          testId="kpi-readiness"
        />
      </section>
    </div>
  );
}

export default memo(PlanningHeader);
