import React, { memo, useMemo } from "react";
import { FaBug, FaExternalLinkAlt, FaFlask, FaTimesCircle } from "react-icons/fa";
import { requestNavigate, requestOpenTask } from "../../../../shared/components/appNavigation";
import { taskKey } from "../../../../shared/utils/helpers";
import { computeRunStats } from "../../utils/releaseMetrics";
import { formatDateTime } from "../../utils/releaseUtils";
import { ReadinessRing, TaskStatusChip } from "../ReleaseBadges";
import DetailCard, { SMALL_BTN_SECONDARY } from "./DetailCard";

const RUN_STATUS = {
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "in-progress": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  aborted: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

function SummaryStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-slate-500/[0.05] px-3 py-2 dark:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function OpenBugsCard({ bugs }) {
  return (
    <DetailCard title="Open bugs in scope" subtitle="Linked bugs and defects that are not done">
      {bugs.length === 0 ? (
        <p className="text-sm text-slate-500">No open bugs linked to this release.</p>
      ) : (
        <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
          {bugs.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-2">
              <FaBug className="h-3 w-3 flex-shrink-0 text-red-500" />
              <span className="w-28 flex-shrink-0 font-mono text-xs text-slate-500">{taskKey(task.id)}</span>
              <button type="button" onClick={() => requestOpenTask(task)} className="flex-1 truncate text-left text-sm text-slate-800 hover:text-blue-600 hover:underline dark:hover:text-blue-400">
                {task.title}
              </button>
              <TaskStatusChip status={task.status} />
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}

function QualityTab({ metrics, testCases }) {
  const { quality, runs } = metrics;
  const caseTitle = useMemo(() => new Map((testCases || []).map((testCase) => [testCase.id, testCase.title || testCase.name])), [testCases]);
  const bugs = metrics.linkedTasks.filter((task) => (task.type === "bug" || task.type === "defect") && task.status !== "done");

  if (runs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-slate-300/80 bg-white/100 px-6 py-10 text-center dark:border-[#2a3044] dark:bg-[#1a1f2e]" data-testid="release-quality-empty">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-300">
            <FaFlask className="h-4 w-4" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No test runs for this release</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create a test run or plan in Tests and pick this release to see pass rate and failures here.
          </p>
          <button type="button" onClick={() => requestNavigate("tests")} className={`${SMALL_BTN_SECONDARY} mt-4`}>
            <FaExternalLinkAlt className="h-2.5 w-2.5" /> Open Tests
          </button>
        </div>
        <OpenBugsCard bugs={bugs} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DetailCard title="Test results" subtitle="Latest result per test case across all runs for this release">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ReadinessRing score={quality.passRate ?? 0} size={72} stroke={7} />
            <div>
              <div className="text-xs text-slate-500">Pass rate</div>
              <div className="text-sm font-semibold text-slate-900">{quality.passRate === null ? "Not executed" : `${quality.passRate}%`}</div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryStat label="Passed" value={quality.passed} tone="text-emerald-600 dark:text-emerald-400" />
            <SummaryStat label="Failed" value={quality.failed} tone={quality.failed ? "text-red-600 dark:text-red-400" : undefined} />
            <SummaryStat label="Skipped" value={quality.skipped} />
            <SummaryStat label="Runs" value={quality.runCount} />
          </div>
        </div>
      </DetailCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Failed cases" subtitle={quality.failedCases.length ? `${quality.failedCases.length} failing` : "All executed cases pass"}>
          {quality.failedCases.length === 0 ? (
            <p className="text-sm text-slate-500">No failing test cases.</p>
          ) : (
            <ul className="space-y-2">
              {quality.failedCases.map((result) => (
                <li key={`${result.runId}-${result.caseId}`} className="flex items-start gap-2 text-sm">
                  <FaTimesCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-slate-800">{caseTitle.get(result.caseId) || result.caseId}</span>
                    <span className="block truncate text-xs text-slate-500">{result.runName || "Run"}{(result.comment || result.actualResult || result.notes) ? ` · ${result.comment || result.actualResult || result.notes}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title="Latest runs">
          <ul className="space-y-3">
            {runs.slice(0, 6).map((run) => {
              const stats = computeRunStats(run);
              const total = Math.max(1, stats.total);
              return (
                <li key={run.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">{run.name || `Run ${String(run.id).slice(-6)}`}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${RUN_STATUS[run.status] || RUN_STATUS["in-progress"]}`}>{run.status || "in-progress"}</span>
                  </div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-500/10">
                    <span className="bg-emerald-500" style={{ width: `${(stats.passed / total) * 100}%` }} />
                    <span className="bg-red-500" style={{ width: `${(stats.failed / total) * 100}%` }} />
                    <span className="bg-orange-500" style={{ width: `${((stats.blocked + stats.retest) / total) * 100}%` }} />
                    <span className="bg-amber-400" style={{ width: `${(stats.skipped / total) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>{stats.passed} passed · {stats.failed} failed{stats.blocked + stats.retest ? ` · ${stats.blocked + stats.retest} blocked/retest` : ""} · {stats.untested} untested</span>
                    <span>{formatDateTime(run.createdAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </DetailCard>
      </div>

      <OpenBugsCard bugs={bugs} />
    </div>
  );
}

export default memo(QualityTab);
