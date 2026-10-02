import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBug, FaCheck, FaCheckCircle, FaClipboardList, FaMinusCircle, FaStop, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { INPUT_CLASS } from "../constants/testingConstants";
import { findNextUntestedIndex, getRunResultMap, normalizeTestSteps, summarizeRun } from "../utils/testingOperations";
import { PriorityBadge, StatusChip } from "../components/TestingPrimitives";

/**
 * Step-through executor. `cases` must already be the run's scoped cases.
 * Mount with `key={run.id}` so switching runs resets local drafts.
 */
export default function ExecuteRunView({ run, cases, readOnly = false, canCreateBug = true, onUpdateResult, onCompleteRun, onExit, onCreateBug }) {
  const resultMap = useMemo(() => getRunResultMap(run), [run]);
  const summary = useMemo(() => summarizeRun(run, cases), [run, cases]);
  const [notes, setNotes] = useState({});
  const [actualResults, setActualResults] = useState({});
  const [currentIdx, setCurrentIdx] = useState(() => findNextUntestedIndex(cases, run, -1));

  // Keep the cursor valid when the scoped case list changes (cases loaded later, removed, synced).
  const prevLengthRef = useRef(cases.length);
  useEffect(() => {
    const prevLength = prevLengthRef.current;
    prevLengthRef.current = cases.length;
    if (prevLength === cases.length) return;
    setCurrentIdx((idx) => (prevLength === 0 || idx > cases.length ? findNextUntestedIndex(cases, run, -1) : idx));
  }, [cases, run]);

  if (!cases.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <FaClipboardList className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
        <p className="text-slate-800 dark:text-white font-semibold">No test cases in this run's scope</p>
        <p className="text-sm mt-1 text-center max-w-xs">Add cases under Test Cases, then start a new run.</p>
        <button type="button" onClick={onExit} className="mt-4 px-5 py-2 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
          Back
        </button>
      </div>
    );
  }

  const currentCase = cases[currentIdx];
  if (!currentCase) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <FaCheckCircle className="w-10 h-10 text-green-500 mb-3" />
        <p className="text-slate-800 dark:text-white font-semibold">
          {summary.untested === 0 ? "All cases executed!" : `${summary.untested} case${summary.untested !== 1 ? "s" : ""} still untested`}
        </p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => setCurrentIdx(0)} className="px-5 py-2 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
            Review Cases
          </button>
          {!readOnly && (
            <button type="button" onClick={onCompleteRun} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors">
              Complete Run
            </button>
          )}
          <button type="button" onClick={onExit} className="px-5 py-2 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
            Back
          </button>
        </div>
      </div>
    );
  }

  const currentResult = resultMap[currentCase.id];
  const currentCaseSteps = normalizeTestSteps(currentCase.steps);
  // Drafts fall back to the stored result so re-judging a case keeps earlier notes.
  const noteValue = notes[currentCase.id] ?? currentResult?.notes ?? "";
  const actualValue = actualResults[currentCase.id] ?? currentResult?.actualResult ?? "";

  const handleResult = (status) => {
    onUpdateResult(run.id, currentCase.id, { status, notes: noteValue, actualResult: actualValue });
    const projectedRun = {
      ...run,
      results: [...(run.results || []).filter((item) => item.caseId !== currentCase.id), { caseId: currentCase.id, status }],
    };
    setCurrentIdx(findNextUntestedIndex(cases, projectedRun, currentIdx));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-slate-800 dark:text-white font-semibold">{run.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executed {summary.executed} / {summary.total} cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={onCompleteRun}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 dark:bg-green-600/20 dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-600/30 text-sm rounded-lg transition-colors"
            >
              <FaStop className="w-3 h-3" /> Complete Run
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm rounded-lg transition-colors"
          >
            {readOnly ? "Back" : "Save & Exit"}
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-slate-200 dark:bg-[#232838] rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${summary.progressPercent}%` }} />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {cases.map((testCase, index) => {
          const status = resultMap[testCase.id]?.status || "untested";
          const isActive = index === currentIdx;
          const dotColor = status === "passed" ? "bg-green-500" : status === "failed" ? "bg-red-500" : status === "skipped" ? "bg-yellow-500" : "bg-slate-400 dark:bg-slate-600";
          return (
            <button
              type="button"
              key={testCase.id}
              onClick={() => setCurrentIdx(index)}
              aria-label={`Go to case ${index + 1}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="flex-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5 space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-mono">Case {currentIdx + 1} of {cases.length}</span>
              <PriorityBadge priority={currentCase.priority} />
            </div>
            <h4 className="text-slate-800 dark:text-white font-semibold text-base">{currentCase.title}</h4>
          </div>
          {currentResult && currentResult.status !== "untested" && <StatusChip status={currentResult.status} />}
        </div>

        {currentCase.description && <p className="text-sm text-slate-600 dark:text-slate-400">{currentCase.description}</p>}

        {currentCase.preconditions && (
          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Preconditions</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{currentCase.preconditions}</p>
          </div>
        )}

        {currentCaseSteps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Steps</p>
            <ol className="space-y-2">
              {currentCaseSteps.map((step, index) => (
                <li key={index} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {currentCase.expectedResult && (
          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Expected Result</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{currentCase.expectedResult}</p>
          </div>
        )}

        {currentResult?.bugTaskId && (
          <p className="text-xs text-red-600 dark:text-red-300">Linked bug: {taskKey(currentResult.bugTaskId)}</p>
        )}

        <div>
          <label htmlFor="execute-notes" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
          <textarea
            id="execute-notes"
            value={noteValue}
            disabled={readOnly}
            onChange={(e) => setNotes((prev) => ({ ...prev, [currentCase.id]: e.target.value }))}
            placeholder="Describe what happened, attach error info..."
            rows={2}
            className={`${INPUT_CLASS} resize-none disabled:opacity-60`}
          />
        </div>

        <div>
          <label htmlFor="execute-actual" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Actual Result</label>
          <textarea
            id="execute-actual"
            value={actualValue}
            disabled={readOnly}
            onChange={(e) => setActualResults((prev) => ({ ...prev, [currentCase.id]: e.target.value }))}
            placeholder="What happened during execution?"
            rows={2}
            className={`${INPUT_CLASS} resize-none disabled:opacity-60`}
          />
        </div>

        {!readOnly && (
          <div className="flex gap-2 pt-1 flex-wrap">
            {canCreateBug && (
              <button
                type="button"
                onClick={() => onCreateBug?.(currentCase, run, { notes: noteValue, actualResult: actualValue })}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/20 font-medium rounded-xl transition-colors"
              >
                <FaBug className="w-3.5 h-3.5" /> Create Bug
              </button>
            )}
            <button
              type="button"
              onClick={() => handleResult("passed")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 dark:bg-green-600/20 dark:text-green-400 dark:border-green-500/40 dark:hover:bg-green-600/30 font-medium rounded-xl transition-colors"
            >
              <FaCheck className="w-3.5 h-3.5" /> Pass
            </button>
            <button
              type="button"
              onClick={() => handleResult("failed")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 dark:bg-red-600/20 dark:text-red-400 dark:border-red-500/40 dark:hover:bg-red-600/30 font-medium rounded-xl transition-colors"
            >
              <FaTimes className="w-3.5 h-3.5" /> Fail
            </button>
            <button
              type="button"
              onClick={() => handleResult("skipped")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-400 dark:border-yellow-500/40 dark:hover:bg-yellow-600/30 font-medium rounded-xl transition-colors"
            >
              <FaMinusCircle className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
