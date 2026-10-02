import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft, FaBug, FaChevronLeft, FaChevronRight, FaForward, FaKeyboard, FaLayerGroup, FaLink, FaList,
  FaLock, FaPause, FaPlay, FaSearch, FaTimes,
} from "react-icons/fa";
import {
  BTN_SECONDARY, BTN_SM, CONTROL_SM, ENVIRONMENT_OPTIONS, PLATFORM_OPTIONS, RESULT_META, STEP_RESULT_META,
  STEP_RESULT_ORDER, optionLabel,
} from "../constants/testingConstants";
import { Avatar, Chip, Kbd, PriorityBadge, ResultBar, ResultChip, isTopOverlay } from "../components/ui";
import TaskRef from "../components/TaskRef";
import DefectDialog from "./DefectDialog";
import ShortcutHelp from "./ShortcutHelp";
import { buildDefectDescription, expandCaseSteps, firstFailedStep, suggestOverallStatus } from "../utils/stepResults";
import { assigneeOf, getResultMap, summarizeRun } from "../utils/testingMetrics";
import { formatDuration, relativeTime, userLabel } from "../utils/testingFormat";

const VERDICTS = ["passed", "failed", "blocked", "skipped", "retest"];
const VERDICT_KEYS = { p: "passed", f: "failed", b: "blocked", s: "skipped", r: "retest" };
const AUTO_ADVANCE_KEY = "corechestra_tests_auto_advance";
const STEP_BUTTON_TONE = {
  passed: "bg-emerald-600 text-white",
  failed: "bg-red-600 text-white",
  blocked: "bg-amber-500 text-white",
  skipped: "bg-slate-500 text-white",
  na: "bg-slate-400 text-white dark:bg-slate-600",
};

function readAutoAdvance() {
  try {
    return window.localStorage.getItem(AUTO_ADVANCE_KEY) !== "0";
  } catch {
    return true;
  }
}

function draftFromResult(result) {
  const stepResults = {};
  (result?.stepResults || []).forEach((step) => { stepResults[step.stepId] = { status: step.status || "untested", actual: step.actual || "" }; });
  return {
    stepResults,
    override: null,
    actualResult: result?.actualResult || "",
    comment: result?.comment || "",
    evidence: result?.evidence || [],
  };
}

const isTyping = (target) => {
  const tag = target?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
};

/**
 * Focused execution view for one cycle (Xray / Zephyr style). Per-step
 * verdicts and actual results, auto-suggested overall result, comment,
 * evidence, timer, defect creation and keyboard shortcuts.
 */
export default function ExecutionRunner({ run, ws, initialCaseId, onClose }) {
  const { data, users, perms, actions, currentUser, now } = ws;
  const resultMap = useMemo(() => getResultMap(run), [run]);
  const summary = useMemo(() => summarizeRun(run), [run]);
  const canRecord = perms.canExecute && run.status === "in-progress";
  const statusOf = useCallback((caseId) => resultMap.get(caseId)?.status || "untested", [resultMap]);
  const isOpenCase = useCallback((caseId) => ["untested", "retest"].includes(statusOf(caseId)), [statusOf]);

  const [filter, setFilter] = useState(() => (run.caseIds.some((caseId) => assigneeOf(run, caseId) === currentUser && isOpenCase(caseId)) ? "mine" : "all"));
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [defect, setDefect] = useState(null);
  const [autoAdvance, setAutoAdvanceState] = useState(readAutoAdvance);
  const [drafts, setDrafts] = useState(() => new Map());
  const [currentId, setCurrentId] = useState(() => {
    if (initialCaseId && run.caseIds.includes(initialCaseId)) return initialCaseId;
    return run.caseIds.find((caseId) => assigneeOf(run, caseId) === currentUser && isOpenCase(caseId))
      || run.caseIds.find(isOpenCase)
      || run.caseIds[0]
      || null;
  });
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState("");
  const [actualOpen, setActualOpen] = useState(() => new Set());
  const mainRef = useRef(null);
  const rootRef = useRef(null);
  const listRefs = useRef({});

  const setAutoAdvance = (value) => {
    setAutoAdvanceState(value);
    try { window.localStorage.setItem(AUTO_ADVANCE_KEY, value ? "1" : "0"); } catch { /* ignore */ }
  };

  const listIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return run.caseIds.filter((caseId) => {
      const status = statusOf(caseId);
      if (filter === "open" && !["untested", "retest"].includes(status)) return false;
      if (filter === "mine" && assigneeOf(run, caseId) !== currentUser) return false;
      if (filter === "failed" && !["failed", "blocked"].includes(status)) return false;
      if (!q) return true;
      const testCase = data.caseById.get(caseId);
      return testCase && (testCase.title.toLowerCase().includes(q) || testCase.key.toLowerCase().includes(q));
    });
  }, [run, filter, query, statusOf, currentUser, data.caseById]);

  const testCase = currentId ? data.caseById.get(currentId) : null;
  const stored = currentId ? resultMap.get(currentId) : null;
  const steps = useMemo(() => (testCase ? expandCaseSteps(testCase, data.sharedById) : []), [testCase, data.sharedById]);
  const draft = drafts.get(currentId) || draftFromResult(stored);
  const stepResultList = useMemo(() => steps.map((step) => ({ stepId: step.id, ...(draft.stepResults[step.id] || { status: "untested", actual: "" }) })), [steps, draft.stepResults]);
  const suggested = suggestOverallStatus(steps, stepResultList);
  const selectedVerdict = draft.override || null;

  // Reset the timer on case change.
  useEffect(() => {
    setElapsed(0);
    setPaused(false);
    setEvidenceDraft("");
    setActualOpen(new Set());
    mainRef.current?.scrollTo?.({ top: 0 });
    listRefs.current[currentId]?.scrollIntoView?.({ block: "nearest" });
  }, [currentId]);

  useEffect(() => {
    if (paused || !canRecord) return undefined;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [paused, canRecord, currentId]);

  const updateDraft = useCallback((patch) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const base = prev.get(currentId) || draftFromResult(resultMap.get(currentId));
      next.set(currentId, { ...base, ...(typeof patch === "function" ? patch(base) : patch) });
      return next;
    });
  }, [currentId, resultMap]);

  const setStep = (stepId, patch) => updateDraft((base) => ({
    stepResults: { ...base.stepResults, [stepId]: { ...(base.stepResults[stepId] || { status: "untested", actual: "" }), ...patch } },
  }));

  const passRemaining = () => updateDraft((base) => {
    const stepResults = { ...base.stepResults };
    steps.forEach((step) => {
      if (!stepResults[step.id] || stepResults[step.id].status === "untested") stepResults[step.id] = { status: "passed", actual: stepResults[step.id]?.actual || "" };
    });
    return { stepResults };
  });

  const ordered = run.caseIds;
  const go = useCallback((delta) => {
    const pool = listIds.length ? listIds : ordered;
    const index = pool.indexOf(currentId);
    const nextIndex = index === -1 ? 0 : index + delta;
    if (nextIndex >= 0 && nextIndex < pool.length) setCurrentId(pool[nextIndex]);
  }, [listIds, ordered, currentId]);

  const nextOpen = useCallback((fromId = currentId, skipCurrent = true) => {
    const start = ordered.indexOf(fromId);
    for (let offset = skipCurrent ? 1 : 0; offset <= ordered.length; offset += 1) {
      const candidate = ordered[(start + offset + ordered.length) % ordered.length];
      if (candidate && isOpenCase(candidate) && candidate !== fromId) return candidate;
    }
    return null;
  }, [ordered, currentId, isOpenCase]);

  const buildInput = (status) => ({
    status,
    stepResults: stepResultList.filter((step) => step.status !== "untested" || step.actual),
    actualResult: draft.actualResult,
    comment: draft.comment,
    evidence: draft.evidence,
    durationSec: elapsed,
  });

  const record = (status) => {
    if (!testCase) return;
    if (!canRecord) {
      actions.recordExecution(run, currentId, buildInput(status));
      return;
    }
    const saved = actions.recordExecution(run, currentId, buildInput(status));
    if (!saved) return;
    setDrafts((prev) => {
      const next = new Map(prev);
      next.delete(currentId);
      return next;
    });
    if (autoAdvance && status !== "retest") {
      const target = nextOpen(currentId);
      if (target) setCurrentId(target);
      else setElapsed(0);
    } else {
      setElapsed(0);
    }
  };

  const openDefect = () => {
    if (!testCase) return;
    if (!perms.canCreateDefect) {
      actions.createDefect({ run, testCase, form: {} });
      return;
    }
    const failed = firstFailedStep(steps, stepResultList);
    const stepLabel = failed ? ` — step ${failed.index + 1} failed` : "";
    setDefect({
      failedStepId: failed?.step.id || null,
      title: `[${testCase.key}] ${testCase.title}${stepLabel}`.slice(0, 140),
      description: buildDefectDescription({
        testCase, run, steps, stepResults: stepResultList, failedStepId: failed?.step.id || null, actualResult: draft.actualResult, comment: draft.comment,
      }),
      priority: testCase.priority,
    });
  };

  const submitDefect = (form) => {
    const status = draft.override || suggested || "failed";
    const task = actions.createDefect({ run, testCase, form, execution: buildInput(status === "passed" ? "failed" : status) });
    if (task) {
      setDefect(null);
      setDrafts((prev) => {
        const next = new Map(prev);
        next.delete(currentId);
        return next;
      });
    }
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (event) => {
      if (defect || showHelp) {
        if ((event.key === "?" || (event.key === "/" && event.shiftKey)) && showHelp) setShowHelp(false);
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || !isTopOverlay(rootRef.current)) return;
      if (isTyping(event.target)) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "?" || (key === "/" && event.shiftKey)) {
        event.preventDefault();
        setShowHelp(true);
      } else if (VERDICT_KEYS[key]) {
        event.preventDefault();
        record(VERDICT_KEYS[key]);
      } else if (key === "n" || key === "j" || key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (key === "k" || key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (key === "u") {
        event.preventDefault();
        const target = nextOpen();
        if (target) setCurrentId(target);
      } else if (key === "d") {
        event.preventDefault();
        openDefect();
      } else if (key === " " && event.target?.tagName !== "BUTTON") {
        event.preventDefault();
        setPaused((value) => !value);
      } else if (key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const plan = run.planId ? data.planById.get(run.planId) : null;
  const previousElsewhere = testCase ? data.latestMap.get(testCase.id) : null;
  const attempts = stored?.attempts || [];
  const defects = stored?.defects || [];
  const verdictForDisplay = selectedVerdict || suggested;
  const filterCounts = {
    all: run.caseIds.length,
    open: run.caseIds.filter(isOpenCase).length,
    mine: run.caseIds.filter((caseId) => assigneeOf(run, caseId) === currentUser).length,
    failed: run.caseIds.filter((caseId) => ["failed", "blocked"].includes(statusOf(caseId))).length,
  };
  const position = ordered.indexOf(currentId);

  return (
    <div ref={rootRef} data-tests-overlay="" className="absolute inset-0 z-40 flex flex-col bg-slate-50 dark:bg-[#141720]" role="dialog" aria-modal="true" aria-label={`Execute ${run.name}`} data-testid="tests-runner">
      <header className="flex-shrink-0 border-b border-slate-200/80 bg-white/100 px-3 py-2.5 dark:border-[#252b3b] dark:bg-[#1a1f2e] md:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={onClose} className={`${BTN_SM}`} aria-label="Back to cycles"><FaArrowLeft className="h-2.5 w-2.5" /><span className="hidden sm:inline">Back</span></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-900">{run.name}</h2>
              {run.status !== "in-progress" && <Chip className="bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300"><FaLock className="h-2 w-2" /> Closed</Chip>}
            </div>
            <div className="truncate text-xs text-slate-500">
              {plan ? `${plan.name} · ` : ""}{optionLabel(ENVIRONMENT_OPTIONS, run.environment)} · {optionLabel(PLATFORM_OPTIONS, run.platform)}{run.build ? ` · build ${run.build}` : ""}
            </div>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-72">
            <ResultBar counts={summary} total={summary.total} className="flex-1" />
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-500"><b className="text-slate-900">{summary.executed}</b>/{summary.total} · {summary.progress}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { const target = nextOpen(); if (target) setCurrentId(target); }} disabled={!summary.open} className={BTN_SM} title="Next untested (U)" data-testid="tests-runner-next-untested">
              <FaForward className="h-2.5 w-2.5" /> <span className="hidden md:inline">Next untested</span>
            </button>
            <button type="button" onClick={() => setShowHelp(true)} className={BTN_SM} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)"><FaKeyboard className="h-3 w-3" /></button>
            <button type="button" onClick={() => setShowList((value) => !value)} className={`${BTN_SM} lg:hidden`} aria-expanded={showList} aria-label="Case list"><FaList className="h-3 w-3" /></button>
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white" aria-label="Close runner"><FaTimes className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className={`${showList ? "absolute inset-y-0 left-0 z-20 flex w-[85%] max-w-sm shadow-2xl" : "hidden"} flex-col border-r border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e] lg:static lg:flex lg:w-80 lg:shadow-none xl:w-96`} aria-label="Cases in this cycle">
          <div className="space-y-2 border-b border-slate-200/70 p-2.5 dark:border-[#252b3b]">
            <label className="relative block">
              <span className="sr-only">Search cases in cycle</span>
              <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cases…" className={`${CONTROL_SM} w-full pl-7`} />
            </label>
            <div role="group" aria-label="Case filter" className="grid grid-cols-4 gap-1">
              {[["all", "All"], ["open", "Open"], ["mine", "Mine"], ["failed", "Failed"]].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`h-7 rounded-md text-[11px] font-semibold ${filter === id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300"}`}>
                  {label} <span className="tabular-nums opacity-70">{filterCounts[id]}</span>
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto py-1" data-testid="tests-runner-list">
            {listIds.map((caseId) => {
              const item = data.caseById.get(caseId);
              const status = statusOf(caseId);
              const active = caseId === currentId;
              return (
                <li key={caseId}>
                  <button
                    ref={(node) => { listRefs.current[caseId] = node; }}
                    type="button"
                    onClick={() => { setCurrentId(caseId); setShowList(false); }}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${active ? "bg-blue-500/10 shadow-[inset_3px_0_0_0_rgb(37,99,235)]" : "hover:bg-slate-500/[0.05]"}`}
                  >
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold ${status === "untested" ? "border border-slate-300 text-slate-400 dark:border-[#374155]" : `${RESULT_META[status].bar} text-white`}`} title={RESULT_META[status].label}>
                      {status === "untested" ? "" : RESULT_META[status].short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[10px] text-slate-500">{item?.key || "—"}</span>
                      <span className={`block truncate text-sm ${active ? "font-semibold text-slate-900" : "text-slate-700"}`}>{item?.title || "Deleted case"}</span>
                    </span>
                    <Avatar users={users} username={assigneeOf(run, caseId)} size="xs" />
                  </button>
                </li>
              );
            })}
            {listIds.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">No cases for this filter.</li>}
          </ul>
        </aside>

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          {!testCase ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
              {run.caseIds.length ? "This case was deleted from the repository." : "This cycle has no cases."}
            </div>
          ) : (
            <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 md:px-6">
              {!canRecord && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-sm text-amber-800 dark:text-amber-300" data-testid="tests-runner-readonly">
                  <FaLock className="h-3 w-3" />
                  {run.status !== "in-progress" ? "This cycle is closed. Reopen it to record results." : "Your role can view executions but not record results."}
                </div>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-600">{testCase.key}</span>
                    <PriorityBadge priority={testCase.priority} />
                    <span>· Case {position + 1} of {ordered.length}</span>
                    <span className="inline-flex items-center gap-1">· Assignee <Avatar users={users} username={assigneeOf(run, testCase.id)} size="xs" showName /></span>
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900" data-testid="tests-runner-title">{testCase.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>In this cycle:</span> <ResultChip status={statusOf(testCase.id)} />
                    {stored?.executedAt && <span>by {userLabel(users, stored.executedBy)} {relativeTime(stored.executedAt, now)}</span>}
                    {previousElsewhere && previousElsewhere.runId !== run.id && <span>· Latest elsewhere: <b className={RESULT_META[previousElsewhere.status].text}>{RESULT_META[previousElsewhere.status].label}</b> in {previousElsewhere.runName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => go(-1)} className={BTN_SM} aria-label="Previous case" title="Previous (←)"><FaChevronLeft className="h-2.5 w-2.5" /></button>
                  <button type="button" onClick={() => go(1)} className={BTN_SM} aria-label="Next case" title="Next (→)"><FaChevronRight className="h-2.5 w-2.5" /></button>
                </div>
              </div>

              {testCase.preconditions && (
                <section className="rounded-xl border border-slate-200/80 bg-white/100 px-4 py-3 dark:border-[#252b3b] dark:bg-[#1a1f2e]">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Preconditions</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{testCase.preconditions}</p>
                </section>
              )}

              <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e]" aria-label="Steps">
                <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-2.5 dark:border-[#252b3b]">
                  <h4 className="text-sm font-semibold text-slate-900">Steps <span className="font-normal text-slate-500">({steps.length})</span></h4>
                  {canRecord && steps.length > 0 && <button type="button" onClick={passRemaining} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">Pass remaining steps</button>}
                </header>
                {steps.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500">This case has no steps. {testCase.expectedResult ? `Expected: ${testCase.expectedResult}` : ""}</p>
                ) : (
                  <ol className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                    {steps.map((step, index) => {
                      const result = draft.stepResults[step.id] || { status: "untested", actual: "" };
                      const showActual = result.status === "failed" || result.status === "blocked" || result.actual || actualOpen.has(step.id);
                      return (
                        <li key={step.id} className={`px-4 py-3 ${step.shared ? "bg-indigo-500/[0.03]" : ""} ${result.status === "failed" ? "bg-red-500/[0.04]" : ""}`} data-testid="tests-runner-step">
                          {step.shared?.first && (
                            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300"><FaLayerGroup className="h-2.5 w-2.5" /> Shared steps: {step.shared.name}</div>
                          )}
                          <div className="grid gap-3 md:grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
                            <span className="text-sm font-semibold tabular-nums text-slate-500">{index + 1}</span>
                            <div className="min-w-0">
                              <p className="whitespace-pre-wrap text-sm text-slate-900">{step.action || <i className="text-slate-500">No action</i>}</p>
                              {step.data && <p className="mt-1 inline-block rounded bg-slate-500/10 px-1.5 py-0.5 font-mono text-xs text-slate-700">{step.data}</p>}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Expected</span>
                              <p className="whitespace-pre-wrap text-sm text-slate-700">{step.expected || "—"}</p>
                            </div>
                            <div role="group" aria-label={`Step ${index + 1} result`} className="flex flex-wrap gap-1">
                              {STEP_RESULT_ORDER.map((status) => {
                                const active = result.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={!canRecord}
                                    aria-pressed={active}
                                    onClick={() => setStep(step.id, { status: active ? "untested" : status })}
                                    className={`h-7 min-w-[40px] rounded-md px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? STEP_BUTTON_TONE[status] : "text-slate-600 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:text-slate-300 dark:ring-[#2a3044]"}`}
                                  >
                                    {STEP_RESULT_META[status].short}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {(showActual || canRecord) && (
                            <div className="mt-2 md:ml-[40px]">
                              {showActual ? (
                                <input
                                  type="text"
                                  value={result.actual}
                                  disabled={!canRecord}
                                  onChange={(event) => setStep(step.id, { actual: event.target.value })}
                                  placeholder="Actual result for this step"
                                  aria-label={`Step ${index + 1} actual result`}
                                  className={`${CONTROL_SM} w-full`}
                                />
                              ) : (
                                <button type="button" onClick={() => setActualOpen((prev) => new Set([...prev, step.id]))} className="text-[11px] text-slate-500 hover:text-blue-600">+ Actual result</button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                {testCase.expectedResult && steps.length > 0 && (
                  <div className="border-t border-slate-200/70 px-4 py-2.5 text-sm dark:border-[#252b3b]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Expected result</span>
                    <p className="text-slate-800">{testCase.expectedResult}</p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200/80 bg-white/100 p-4 dark:border-[#252b3b] dark:bg-[#1a1f2e]" aria-label="Overall result">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">Overall result</h4>
                    {suggested && !selectedVerdict && <span className="text-xs text-slate-500">Suggested from steps: <b className={RESULT_META[suggested].text}>{RESULT_META[suggested].label}</b></span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="tabular-nums" aria-live="off">{formatDuration(elapsed)}</span>
                    {canRecord && (
                      <button type="button" onClick={() => setPaused((value) => !value)} className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-500/10" aria-label={paused ? "Resume timer" : "Pause timer"}>
                        {paused ? <FaPlay className="h-2 w-2" /> : <FaPause className="h-2 w-2" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Record verdict">
                  {VERDICTS.map((status) => {
                    const isSuggested = verdictForDisplay === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={!canRecord}
                        onClick={() => record(status)}
                        data-testid={`tests-verdict-${status}`}
                        className={`group flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${isSuggested ? `${RESULT_META[status].solid} shadow-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1a1f2e] ${status === "passed" ? "ring-emerald-500/40" : status === "failed" ? "ring-red-500/40" : "ring-slate-400/40"}` : `${RESULT_META[status].chip} ring-1 ring-inset hover:brightness-95`}`}
                      >
                        {RESULT_META[status].label}
                        <Kbd inverted={isSuggested}>{RESULT_META[status].key?.toUpperCase()}</Kbd>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Actual result</span>
                    <textarea rows={3} value={draft.actualResult} disabled={!canRecord} onChange={(event) => updateDraft({ actualResult: event.target.value })} placeholder="What actually happened" className={`${CONTROL_SM} h-auto w-full py-1.5`} data-testid="tests-runner-actual" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Comment</span>
                    <textarea rows={3} value={draft.comment} disabled={!canRecord} onChange={(event) => updateDraft({ comment: event.target.value })} placeholder="Notes for the team" className={`${CONTROL_SM} h-auto w-full py-1.5`} data-testid="tests-runner-comment" />
                  </label>
                </div>
                <div className="mt-3">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Evidence links</span>
                  <ul className="mb-2 space-y-1">
                    {draft.evidence.map((url) => (
                      <li key={url} className="flex items-center gap-2 text-sm">
                        <FaLink className="h-2.5 w-2.5 text-slate-400" />
                        <a href={url} target="_blank" rel="noreferrer noopener" className="min-w-0 truncate text-blue-600 hover:underline dark:text-blue-400">{url}</a>
                        {canRecord && <button type="button" onClick={() => updateDraft((base) => ({ evidence: base.evidence.filter((item) => item !== url) }))} aria-label={`Remove ${url}`} className="text-slate-400 hover:text-red-500"><FaTimes className="h-2.5 w-2.5" /></button>}
                      </li>
                    ))}
                  </ul>
                  {canRecord && (
                    <form className="flex gap-2" onSubmit={(event) => {
                      event.preventDefault();
                      const value = evidenceDraft.trim();
                      if (!value) return;
                      updateDraft((base) => ({ evidence: [...new Set([...base.evidence, value])] }));
                      setEvidenceDraft("");
                    }}
                    >
                      <input type="url" value={evidenceDraft} onChange={(event) => setEvidenceDraft(event.target.value)} placeholder="https://… screenshot, video or log" aria-label="Evidence URL" className={`${CONTROL_SM} min-w-0 flex-1`} />
                      <button type="submit" className={BTN_SM}>Add</button>
                    </form>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-[#252b3b]">
                  <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Go to the next open case after saving
                  </label>
                  <button
                    type="button"
                    onClick={openDefect}
                    disabled={!perms.canCreateDefect}
                    className={`${BTN_SECONDARY} text-red-600 dark:text-red-400`}
                    data-testid="tests-create-defect"
                    title={perms.canCreateDefect ? "Create defect (D)" : "Your role can't create defects"}
                  >
                    <FaBug className="h-3 w-3" /> Create defect
                  </button>
                </div>
              </section>

              {(defects.length > 0 || attempts.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {defects.length > 0 && (
                    <section className="rounded-xl border border-slate-200/80 bg-white/100 px-4 py-3 dark:border-[#252b3b] dark:bg-[#1a1f2e]">
                      <h4 className="text-sm font-semibold text-slate-900">Linked defects</h4>
                      <ul className="mt-1 divide-y divide-slate-200/70 dark:divide-[#252b3b]" data-testid="tests-runner-defects">
                        {defects.map((id) => <TaskRef key={id} id={id} task={data.taskById.get(String(id))} showType={false} />)}
                      </ul>
                    </section>
                  )}
                  {attempts.length > 0 && (
                    <section className="rounded-xl border border-slate-200/80 bg-white/100 px-4 py-3 dark:border-[#252b3b] dark:bg-[#1a1f2e]">
                      <h4 className="text-sm font-semibold text-slate-900">Earlier attempts in this cycle</h4>
                      <ul className="mt-2 space-y-1.5">
                        {[...attempts].reverse().map((attempt, index) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <li key={index} className="flex items-center gap-2 text-xs text-slate-600">
                            <ResultChip status={attempt.status} />
                            <span>{userLabel(users, attempt.executedBy)}</span>
                            <span className="text-slate-500">{relativeTime(attempt.executedAt, now)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
              <p className="pb-4 text-center text-[11px] text-slate-500">
                <Kbd>P</Kbd> <Kbd>F</Kbd> <Kbd>B</Kbd> <Kbd>S</Kbd> <Kbd>R</Kbd> record · <Kbd>N</Kbd>/<Kbd>←</Kbd> navigate · <Kbd>?</Kbd> all shortcuts
              </p>
            </div>
          )}
        </main>
      </div>

      {defect && (
        <DefectDialog
          initial={defect}
          users={users}
          hasBacklog={Boolean(ws.backlogSections?.length)}
          onClose={() => setDefect(null)}
          onSubmit={submitDefect}
        />
      )}
      {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
