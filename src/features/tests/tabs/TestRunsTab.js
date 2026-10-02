import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FaChartPie, FaCheckCircle, FaMinusCircle, FaPlay, FaPlus, FaRedo, FaStop, FaTimesCircle, FaTrash } from "react-icons/fa";
import { CHIP_CLASS, PRIMARY_BUTTON_CLASS } from "../constants/testingConstants";
import { formatTestDate, getRunScopedCases, sortRunsByCreatedDesc, summarizeRun } from "../utils/testingOperations";
import { RunStatusChip } from "../components/TestingPrimitives";
import ExecuteRunView from "../execution/ExecuteRunView";
import ViewResultsView from "../execution/ViewResultsView";
import NewRunModal from "../modals/NewRunModal";

const PROGRESS_TONE = { completed: "bg-green-500", aborted: "bg-red-500", "in-progress": "bg-blue-500" };

const RunCard = memo(function RunCard({ run, summary, releaseVersion, testerName, readOnly, onExecute, onViewResults, onRerunFailed, onAbort, onDelete }) {
  return (
    <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4 space-y-3" data-testid={`run-card-${run.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{run.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatTestDate(run.createdAt, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {run.rerunOf && <span className={CHIP_CLASS}>Rerun</span>}
            {run.regressionPack && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                Pack: {run.regressionPack}
              </span>
            )}
            {run.releaseId && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                Release: {releaseVersion || run.releaseId}
              </span>
            )}
            {run.environment && <span className={CHIP_CLASS}>{run.environment}</span>}
            {run.platform && <span className={CHIP_CLASS}>{run.platform}</span>}
            {run.buildVersion && <span className={CHIP_CLASS}>Build: {run.buildVersion}</span>}
            {run.assignedTester && <span className={CHIP_CLASS}>Tester: {testerName || run.assignedTester}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RunStatusChip status={run.status} />
          {run.status === "in-progress" && (
            <button type="button" onClick={() => onExecute(run)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
              <FaPlay className="w-2.5 h-2.5" /> {readOnly ? "Open" : "Execute"}
            </button>
          )}
          {run.status !== "in-progress" && (
            <button type="button" onClick={() => onViewResults(run)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-lg transition-colors">
              <FaChartPie className="w-2.5 h-2.5" /> View Results
            </button>
          )}
          {!readOnly && run.status === "completed" && summary.failed > 0 && (
            <button type="button" onClick={() => onRerunFailed(run)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-xs font-medium rounded-lg transition-colors">
              <FaRedo className="w-2.5 h-2.5" /> Rerun Failed
            </button>
          )}
          {!readOnly && run.status === "in-progress" && (
            <button type="button" onClick={() => onAbort(run)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors" title="Abort run" aria-label={`Abort run ${run.name}`}>
              <FaStop className="w-3 h-3" />
            </button>
          )}
          {!readOnly && onDelete && run.status !== "in-progress" && (
            <button type="button" onClick={() => onDelete(run)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors" title="Delete run" aria-label={`Delete run ${run.name}`}>
              <FaTrash className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{summary.executed} / {summary.total} cases executed</span>
          <span>{summary.progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-[#232838] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${PROGRESS_TONE[run.status] || PROGRESS_TONE["in-progress"]}`} style={{ width: `${summary.progressPercent}%` }} />
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><FaCheckCircle className="w-3 h-3" /> {summary.passed} passed</span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><FaTimesCircle className="w-3 h-3" /> {summary.failed} failed</span>
        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><FaMinusCircle className="w-3 h-3" /> {summary.skipped} skipped</span>
      </div>
    </div>
  );
});

export default function TestRunsTab({
  suite,
  cases,
  runs,
  releases,
  users,
  currentUser,
  openRunId,
  readOnly = false,
  canCreateBug = true,
  onConsumeOpenRun,
  onCreateRun,
  onCompleteRun,
  onAbortRun,
  onDeleteRun,
  onUpdateResult,
  onCreateBug,
  onRerunFailed,
}) {
  const [newRunModal, setNewRunModal] = useState(false);
  const [activeView, setActiveView] = useState(null); // { type: "execute" | "results", runId }

  const availablePacks = useMemo(() => [...new Set(cases.flatMap((testCase) => testCase.regressionPacks || []))].sort(), [cases]);
  const sortedRuns = useMemo(() => sortRunsByCreatedDesc(runs), [runs]);
  const scopedCasesByRun = useMemo(
    () => Object.fromEntries(runs.map((run) => [run.id, getRunScopedCases(run, cases)])),
    [cases, runs]
  );
  const summaries = useMemo(
    () => Object.fromEntries(runs.map((run) => [run.id, summarizeRun(run, scopedCasesByRun[run.id])])),
    [runs, scopedCasesByRun]
  );
  const releaseVersionById = useMemo(() => new Map(releases.map((release) => [release.id, release.version])), [releases]);
  const userNameByKey = useMemo(() => new Map(users.map((user) => [user.username || user.id, user.name])), [users]);

  useEffect(() => {
    if (!openRunId) return;
    const targetRun = runs.find((run) => run.id === openRunId);
    if (!targetRun) return;
    setActiveView({ type: targetRun.status === "in-progress" ? "execute" : "results", runId: targetRun.id });
    onConsumeOpenRun?.();
  }, [openRunId, onConsumeOpenRun, runs]);

  const openExecute = useCallback((run) => setActiveView({ type: "execute", runId: run.id }), []);
  const openResults = useCallback((run) => setActiveView({ type: "results", runId: run.id }), []);

  const activeRun = activeView ? runs.find((run) => run.id === activeView.runId) : null;

  if (activeView && activeRun) {
    const scopedCases = scopedCasesByRun[activeRun.id] || [];
    // A run that is no longer in progress (completed/aborted elsewhere) falls back to results.
    if (activeView.type === "execute" && activeRun.status === "in-progress") {
      return (
        <div className="flex flex-col h-full p-5">
          <ExecuteRunView
            key={activeRun.id}
            run={activeRun}
            cases={scopedCases}
            readOnly={readOnly}
            canCreateBug={canCreateBug}
            onUpdateResult={onUpdateResult}
            onCompleteRun={() => onCompleteRun(activeRun, summaries[activeRun.id])}
            onExit={() => setActiveView(null)}
            onCreateBug={onCreateBug}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full p-5 overflow-y-auto">
        <ViewResultsView run={activeRun} cases={scopedCases} onBack={() => setActiveView(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Test Runs</h3>
        {!readOnly && (
          <button type="button" onClick={() => setNewRunModal(true)} className={PRIMARY_BUTTON_CLASS}>
            <FaPlus className="w-3 h-3" /> New Test Run
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {sortedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaPlay className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No test runs yet.</p>
            {!readOnly && (
              <button type="button" onClick={() => setNewRunModal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Start First Run
              </button>
            )}
          </div>
        ) : (
          sortedRuns.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              summary={summaries[run.id]}
              releaseVersion={releaseVersionById.get(run.releaseId)}
              testerName={userNameByKey.get(run.assignedTester)}
              readOnly={readOnly}
              onExecute={openExecute}
              onViewResults={openResults}
              onRerunFailed={onRerunFailed}
              onAbort={onAbortRun}
              onDelete={onDeleteRun}
            />
          ))
        )}
      </div>

      {newRunModal && (
        <NewRunModal
          suite={suite}
          cases={cases}
          availablePacks={availablePacks}
          releases={releases}
          users={users}
          currentUser={currentUser}
          onClose={() => setNewRunModal(false)}
          onCreate={onCreateRun}
        />
      )}
    </div>
  );
}
