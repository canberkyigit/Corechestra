import React, { useMemo } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";

const COVERAGE_TONE = {
  covered: "text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30",
  "at-risk": "text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
  partial: "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
};

export default function CoverageTab({ rows, allTasks }) {
  const taskById = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Requirement Coverage</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Trace requirements to cases, latest executed outcome and linked bugs.</p>
      </div>
      <div className="px-5 py-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaShieldAlt className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No requirement coverage data yet.</p>
            <p className="text-xs mt-1">Link cases to a task or fill in their requirement to trace coverage.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
            <div className="grid grid-cols-[minmax(0,2fr)_120px_120px_120px_120px] gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#252b3b] text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <div>Requirement</div>
              <div>Cases</div>
              <div>Passed</div>
              <div>Failed</div>
              <div>Status</div>
            </div>
            {rows.map((row) => {
              const task = row.linkedTaskId ? taskById.get(row.linkedTaskId) : null;
              return (
                <div key={row.key} className="grid grid-cols-[minmax(0,2fr)_120px_120px_120px_120px] gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#252b3b] last:border-b-0 items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{row.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {task && <span className="text-xs text-blue-600 dark:text-blue-300">{taskKey(task.id)}</span>}
                      {row.linkedBugIds.length > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-300">{row.linkedBugIds.length} linked bug{row.linkedBugIds.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{row.caseCount}</div>
                  <div className="text-sm text-green-600 dark:text-green-300">{row.passedCount}</div>
                  <div className="text-sm text-red-600 dark:text-red-300">{row.failedCount}</div>
                  <div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${COVERAGE_TONE[row.coverageStatus] || COVERAGE_TONE.partial}`}>
                      {row.coverageStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
