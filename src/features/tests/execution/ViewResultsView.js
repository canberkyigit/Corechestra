import React, { useMemo } from "react";
import { FaCheckCircle, FaClipboardList, FaMinusCircle, FaTimesCircle } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { formatTestDate, getRunResultMap, summarizeRun } from "../utils/testingOperations";
import { PriorityBadge, RunStatusChip, StatusChip } from "../components/TestingPrimitives";

const ROW_TONE = {
  passed: "bg-green-50 dark:bg-green-900/10",
  failed: "bg-red-50 dark:bg-red-900/10",
  skipped: "bg-yellow-50 dark:bg-yellow-900/10",
};

function SummaryChip({ icon, value, label, tone }) {
  return (
    <div data-testid={`summary-${label.toLowerCase()}`} className={`flex items-center gap-2 px-4 py-2 border rounded-xl ${tone}`}>
      {icon}
      <span className="font-bold text-lg">{value}</span>
      <span className="text-slate-500 dark:text-slate-400 text-sm">{label}</span>
    </div>
  );
}

/** Read-only results of a run. `cases` must already be the run's scoped cases. */
export default function ViewResultsView({ run, cases, onBack }) {
  const resultMap = useMemo(() => getRunResultMap(run), [run]);
  const summary = useMemo(() => summarizeRun(run, cases), [run, cases]);
  const finishedAt = run.completedAt || run.abortedAt;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-slate-800 dark:text-white font-semibold">{run.name}</h3>
            <RunStatusChip status={run.status} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {finishedAt ? formatTestDate(finishedAt) : `Started ${formatTestDate(run.createdAt)}`}
          </p>
        </div>
        <button type="button" onClick={onBack} className="px-3 py-1.5 bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm rounded-lg transition-colors">
          ← Back to Runs
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SummaryChip icon={<FaCheckCircle className="w-4 h-4" />} value={summary.passed} label="Passed" tone="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" />
        <SummaryChip icon={<FaTimesCircle className="w-4 h-4" />} value={summary.failed} label="Failed" tone="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" />
        <SummaryChip icon={<FaMinusCircle className="w-4 h-4" />} value={summary.skipped} label="Skipped" tone="bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400" />
        <SummaryChip icon={<FaClipboardList className="w-4 h-4" />} value={summary.untested} label="Untested" tone="bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-300" />
      </div>

      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_200px] text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-2.5 border-b border-slate-200 dark:border-[#252b3b]">
          <span>Test Case</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-[200px]">Execution Notes</span>
        </div>
        {cases.length === 0 && (
          <p className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">No cases in this run's scope.</p>
        )}
        <div className="divide-y divide-slate-200 dark:divide-[#252b3b]">
          {cases.map((testCase) => {
            const result = resultMap[testCase.id];
            const status = result?.status || "untested";
            return (
              <div key={testCase.id} className={`grid grid-cols-[1fr_auto_200px] items-center px-4 py-3 gap-4 ${ROW_TONE[status] || ""}`}>
                <div>
                  <p className="text-sm text-slate-800 dark:text-white">{testCase.title}</p>
                  <PriorityBadge priority={testCase.priority} />
                  {result?.bugTaskId && (
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">Linked bug: {taskKey(result.bugTaskId)}</p>
                  )}
                </div>
                <div className="w-24 flex justify-center">
                  <StatusChip status={status} />
                </div>
                <div className="w-[200px]">
                  {result?.notes || result?.actualResult ? (
                    <div className="space-y-1">
                      {result?.notes && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{result.notes}</p>}
                      {result?.actualResult && <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">Actual: {result.actualResult}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
