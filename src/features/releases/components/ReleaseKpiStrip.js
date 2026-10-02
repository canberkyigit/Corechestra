import React, { memo } from "react";
import { FaBan, FaCheckCircle, FaExclamationTriangle, FaFlagCheckered, FaRocket } from "react-icons/fa";
import { FaGaugeHigh } from "react-icons/fa6";
import { ReadinessRing } from "./ReleaseBadges";

function KpiCard({ icon: Icon, label, value, sub, tone = "slate", onClick, children, testId }) {
  const toneClass = {
    slate: "text-slate-600 bg-slate-500/10 dark:text-slate-300",
    blue: "text-blue-600 bg-blue-500/10 dark:text-blue-300",
    green: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
    amber: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
    red: "text-red-600 bg-red-500/10 dark:text-red-300",
    cyan: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-300",
  }[tone];
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-white/100 p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e] ${
        onClick ? "transition-colors hover:border-blue-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:border-blue-500/50" : ""
      }`}
    >
      <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xl font-semibold tabular-nums text-slate-900">{value}</span>
          {children}
        </span>
        {sub && <span className="mt-0.5 block truncate text-xs text-slate-500">{sub}</span>}
      </span>
    </Wrapper>
  );
}

function countdown(days) {
  if (days === null || days === undefined) return "";
  if (days === 0) return "Due today";
  if (days > 0) return `in ${days} day${days !== 1 ? "s" : ""}`;
  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
}

function ReleaseKpiStrip({ kpis, onOpenRelease, onFilter }) {
  const next = kpis.next;
  return (
    <section aria-label="Release metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={FaFlagCheckered}
        label="Next release"
        value={next ? next.version : "—"}
        sub={next ? `${next.name ? `${next.name} · ` : ""}${countdown(kpis.nextDays)}` : "Nothing scheduled"}
        tone={kpis.nextDays !== null && kpis.nextDays < 0 ? "red" : "blue"}
        onClick={next ? () => onOpenRelease(next.id) : undefined}
        testId="kpi-next-release"
      />
      <KpiCard
        icon={FaRocket}
        label="In progress"
        value={kpis.inProgress}
        sub={`${kpis.activeCount} active total`}
        tone="cyan"
        onClick={() => onFilter("active")}
      />
      <KpiCard icon={FaCheckCircle} label="Released (90d)" value={kpis.releasedRecently} sub="Shipped to prod" tone="green" onClick={() => onFilter("released")} />
      <KpiCard icon={FaGaugeHigh} label="Avg readiness" value={kpis.avgReadiness === null ? "—" : `${kpis.avgReadiness}%`} sub="Active releases" tone="slate">
        {kpis.avgReadiness !== null && <ReadinessRing score={kpis.avgReadiness} size={22} stroke={3} label={false} />}
      </KpiCard>
      <KpiCard icon={FaExclamationTriangle} label="At risk" value={kpis.atRisk} sub={kpis.atRisk ? "High risk level" : "No high risks"} tone={kpis.atRisk ? "red" : "slate"} />
      <KpiCard icon={FaBan} label="Open blockers" value={kpis.openBlockers} sub="Blocked work items" tone={kpis.openBlockers ? "amber" : "slate"} />
    </section>
  );
}

export default memo(ReleaseKpiStrip);
