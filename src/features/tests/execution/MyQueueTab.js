import React, { memo, useMemo, useState } from "react";
import { FaCalendarAlt, FaCheckCircle, FaPlay, FaUserCheck } from "react-icons/fa";
import {
  BTN_PRIMARY, BTN_SM, CARD, ENVIRONMENT_OPTIONS, PLATFORM_OPTIONS, optionLabel,
} from "../constants/testingConstants";
import { EmptyState, KpiCard, PriorityBadge, ResultBar, ResultChip } from "../components/ui";
import { buildMyQueue, summarizeRun } from "../utils/testingMetrics";
import { daysUntil, formatDueLabel, formatEstimate, userLabel } from "../utils/testingFormat";

/** "My queue": my untested / retest executions grouped by cycle, soonest due first. */
function MyQueueTab({ ws }) {
  const { data, currentUser, users, nav, now } = ws;
  const [who, setWho] = useState(currentUser || "");
  const queue = useMemo(() => buildMyQueue(data.runs, who), [data.runs, who]);
  const openTotal = queue.reduce((sum, group) => sum + group.open.length, 0);
  const doneTotal = queue.reduce((sum, group) => sum + group.done, 0);
  const overdue = queue.filter((group) => group.open.length && daysUntil(group.run.dueDate, now) < 0).length;
  const estimate = queue.reduce((sum, group) => sum + group.open.reduce((acc, item) => acc + (data.caseById.get(item.caseId)?.estimate || 0), 0), 0);
  const testers = useMemo(() => {
    const set = new Set();
    data.runs.forEach((run) => {
      if (run.status !== "in-progress") return;
      Object.values(run.assignments || {}).forEach((user) => user && set.add(user));
      if (run.assignedTester) set.add(run.assignedTester);
    });
    if (currentUser) set.add(currentUser);
    return [...set].sort((a, b) => userLabel(users, a).localeCompare(userLabel(users, b)));
  }, [data.runs, currentUser, users]);

  return (
    <div className="space-y-4" data-testid="tests-queue">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{who === currentUser ? "My execution queue" : `${userLabel(users, who)}'s queue`}</h2>
          <p className="text-sm text-slate-500">Untested and retest cases assigned in open cycles.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Tester
          <select value={who} onChange={(event) => setWho(event.target.value)} className="h-8 rounded-md border border-slate-300/70 bg-white/80 px-2 text-xs text-slate-700 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200" aria-label="Show queue for tester">
            {testers.map((user) => <option key={user} value={user}>{user === currentUser ? `${userLabel(users, user)} (me)` : userLabel(users, user)}</option>)}
          </select>
        </label>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Queue metrics">
        <KpiCard icon={FaUserCheck} label="Open assignments" value={openTotal} sub={`${queue.filter((group) => group.open.length).length} cycles`} tone="blue" />
        <KpiCard icon={FaCheckCircle} label="Done in open cycles" value={doneTotal} sub="Executed by assignee" tone="green" />
        <KpiCard icon={FaCalendarAlt} label="Overdue cycles" value={overdue} sub={overdue ? "Past due with open work" : "Nothing overdue"} tone={overdue ? "red" : "slate"} />
        <KpiCard icon={FaPlay} label="Estimated effort" value={formatEstimate(estimate)} sub="Sum of case estimates" tone="violet" />
      </section>

      {queue.length === 0 ? (
        <div className={CARD}>
          <EmptyState icon={FaCheckCircle} title="Nothing assigned" description={who === currentUser ? "You have no open assignments. New cycles assign cases to testers automatically." : "No open assignments for this tester."} />
        </div>
      ) : (
        queue.map(({ run, items, open }) => {
          const summary = summarizeRun(run);
          const days = daysUntil(run.dueDate, now);
          const plan = run.planId ? data.planById.get(run.planId) : null;
          return (
            <section key={run.id} className={`${CARD} overflow-hidden`} aria-label={run.name} data-testid={`tests-queue-${run.id}`}>
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-[#252b3b]">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{run.name}</h3>
                  <p className="truncate text-xs text-slate-500">
                    {plan ? `${plan.name} · ` : ""}{optionLabel(ENVIRONMENT_OPTIONS, run.environment)} · {optionLabel(PLATFORM_OPTIONS, run.platform)}{run.build ? ` · ${run.build}` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${days !== null && days < 0 ? "text-red-600 dark:text-red-400" : days !== null && days <= 1 ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                  <FaCalendarAlt className="h-2.5 w-2.5" /> {formatDueLabel(run.dueDate, now)}
                </span>
                <div className="flex w-40 items-center gap-2">
                  <ResultBar counts={summary} total={summary.total} className="flex-1" />
                  <span className="text-xs tabular-nums text-slate-500">{summary.progress}%</span>
                </div>
                <span className="text-xs tabular-nums text-slate-500"><b className="text-slate-900">{open.length}</b> open of {items.length}</span>
                {open.length > 0 && (
                  <button type="button" onClick={() => nav.openRunner(run.id, open[0].caseId)} className={BTN_PRIMARY} data-testid={`tests-queue-start-${run.id}`}>
                    <FaPlay className="h-2.5 w-2.5" /> Start
                  </button>
                )}
              </header>
              <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                {items.map((item) => {
                  const testCase = data.caseById.get(item.caseId);
                  return (
                    <li key={item.caseId} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-[76px] flex-shrink-0"><ResultChip status={item.status} /></span>
                      <span className="w-16 flex-shrink-0 font-mono text-[11px] text-slate-500">{testCase?.key || "—"}</span>
                      <button type="button" onClick={() => testCase && nav.openCase(item.caseId)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-800 hover:text-blue-600 dark:hover:text-blue-400">
                        {testCase?.title || "Deleted case"}
                      </button>
                      {testCase && <span className="hidden sm:inline"><PriorityBadge priority={testCase.priority} /></span>}
                      <span className="hidden w-12 text-right text-xs text-slate-500 md:inline">{formatEstimate(testCase?.estimate)}</span>
                      <button type="button" onClick={() => nav.openRunner(run.id, item.caseId)} className={BTN_SM} aria-label={`Run ${testCase?.key || item.caseId}`}>
                        <FaPlay className="h-2 w-2" /> {["untested", "retest"].includes(item.status) ? "Run" : "View"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

export default memo(MyQueueTab);
