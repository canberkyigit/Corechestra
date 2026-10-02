import React, { useMemo } from "react";
import { FaChartPie, FaCheckCircle, FaClipboardList, FaPlay, FaTimesCircle } from "react-icons/fa";
import { buildSuiteAnalytics, formatTestDate } from "../utils/testingOperations";
import { PriorityBadge, StatCard } from "../components/TestingPrimitives";

function TrendRow({ run, summary }) {
  const { passed, failed, skipped } = summary;
  const total = passed + failed + skipped;
  const pct = (value) => (total > 0 ? (value / total) * 100 : 0);
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-xs text-slate-500 dark:text-slate-400 truncate text-right flex-shrink-0" title={run.name}>
        {run.name}
      </div>
      <div className="flex-1 flex h-5 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#232838] gap-px">
        {passed > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${pct(passed)}%` }} title={`${passed} passed`} />}
        {failed > 0 && <div className="bg-red-500 h-full transition-all" style={{ width: `${pct(failed)}%` }} title={`${failed} failed`} />}
        {skipped > 0 && <div className="bg-yellow-500 h-full transition-all" style={{ width: `${pct(skipped)}%` }} title={`${skipped} skipped`} />}
        {total === 0 && <div className="flex-1 bg-slate-100 dark:bg-[#232838]" />}
      </div>
      <div className="w-28 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        <span className="text-green-600 dark:text-green-400">{passed}P</span>
        {" / "}
        <span className="text-red-600 dark:text-red-400">{failed}F</span>
        {" / "}
        <span className="text-yellow-600 dark:text-yellow-400">{skipped}S</span>
      </div>
    </div>
  );
}

export default function AnalyticsTab({ cases, runs }) {
  const analytics = useMemo(() => buildSuiteAnalytics(cases, runs), [cases, runs]);
  const { lastRun, passRate, avgCasesPerRun, completedCount, trend, failureList } = analytics;

  return (
    <div className="p-5 space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value={cases.length} icon={<FaClipboardList className="text-blue-400" />} accent="blue" />
        <StatCard label="Pass Rate" value={`${passRate}%`} sub={lastRun ? "latest completed run" : "no runs yet"} icon={<FaCheckCircle className="text-green-400" />} accent="green" />
        <StatCard
          label="Most Recent Run"
          value={lastRun ? formatTestDate(lastRun.completedAt || lastRun.createdAt, { month: "short", day: "numeric" }) : "—"}
          sub={lastRun?.name || ""}
          icon={<FaPlay className="text-purple-400" />}
          accent="purple"
        />
        <StatCard label="Avg Cases / Run" value={avgCasesPerRun} sub={`${completedCount} completed runs`} icon={<FaChartPie className="text-yellow-400" />} accent="yellow" />
      </div>

      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Pass / Fail Trend (Last 5 Runs)</h3>
        {trend.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No completed runs yet.</p>
        ) : (
          <div className="space-y-3">
            {trend.map(({ run, summary }) => <TrendRow key={run.id} run={run} summary={summary} />)}
            <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-500 inline-block" /> Passed</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Failed</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-yellow-500 inline-block" /> Skipped</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Failure Analysis</h3>
        {failureList.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No failures recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {failureList.map((testCase, index) => (
              <div key={testCase.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-white truncate">{testCase.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last failed: {formatTestDate(testCase.lastFailDate)}</p>
                </div>
                <PriorityBadge priority={testCase.priority} />
                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-600 dark:text-red-400 font-bold flex-shrink-0">
                  <FaTimesCircle className="w-3 h-3" /> {testCase.failCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
