import React, { memo } from "react";

const TONES = {
  slate: "text-slate-500 dark:text-slate-400",
  red: "text-red-600 dark:text-red-400",
  amber: "text-amber-600 dark:text-amber-400",
  green: "text-emerald-600 dark:text-emerald-400",
};

/**
 * One metric: label, headline number, one line of context. The tile is a
 * button when it drills into a task list.
 */
export function KpiTile({ label, value, sub, subTone = "slate", onClick, testId, children }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e] ${
        onClick ? "transition-colors hover:border-blue-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:border-blue-500/50" : ""
      }`}
    >
      <span className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-slate-900 dark:text-white">{value}</span>
      {children}
      {sub && <span className={`mt-2 truncate text-xs ${TONES[subTone] || TONES.slate}`}>{sub}</span>}
    </Wrapper>
  );
}

function KpiStrip({ stats, onDrill }) {
  const { total, open, done, completionPct, statusCounts, overdueTasks, completedThisWeek, totalPoints, donePoints } = stats;
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiTile
        label="Open work"
        value={open}
        sub={`${total} in sprint · ${totalPoints} pts`}
        onClick={() => onDrill("open")}
        testId="kpi-open"
      />
      <KpiTile
        label="Completed"
        value={`${completionPct}%`}
        sub={`${done} of ${total} items${totalPoints ? ` · ${donePoints} pts` : ""}`}
        subTone={total > 0 && completionPct >= 100 ? "green" : "slate"}
        onClick={() => onDrill("done")}
        testId="kpi-completed"
      />
      <KpiTile
        label="In progress"
        value={statusCounts.inprogress + statusCounts.review}
        sub={`${statusCounts.review} in review`}
        onClick={() => onDrill("active")}
        testId="kpi-in-progress"
      />
      <KpiTile
        label="Blocked"
        value={statusCounts.blocked}
        sub={statusCounts.blocked ? "Needs unblocking" : "Nothing blocked"}
        subTone={statusCounts.blocked ? "red" : "slate"}
        onClick={() => onDrill("blocked")}
        testId="kpi-blocked"
      />
      <KpiTile
        label="Overdue"
        value={overdueTasks}
        sub={overdueTasks ? "Past due date" : "All on schedule"}
        subTone={overdueTasks ? "amber" : "slate"}
        onClick={() => onDrill("overdue")}
        testId="kpi-overdue"
      />
      <KpiTile
        label="Throughput · 7d"
        value={completedThisWeek}
        sub="Items completed"
        testId="kpi-throughput"
      />
    </section>
  );
}

export default memo(KpiStrip);
