import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChartBar, FaClone, FaLock, FaLockOpen, FaPlay, FaPlus, FaRedo, FaSearch, FaTimes, FaTrashAlt,
} from "react-icons/fa";
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_SM, CONTROL_SM, ENVIRONMENT_OPTIONS, PLATFORM_OPTIONS, RUN_STATUS_META, optionLabel,
} from "../constants/testingConstants";
import OverflowMenu from "../components/OverflowMenu";
import { Avatar, Chip, ResultBar, ResultChip, SectionCard, isTopOverlay, useFocusTrap } from "../components/ui";
import { BurndownChart } from "../overview/charts";
import { assigneeOf, cycleBurndown, getResultMap, summarizeRun } from "../utils/testingMetrics";
import { formatDate, formatDateTime, formatDueLabel, userLabel } from "../utils/testingFormat";

function Stat({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-lg bg-slate-500/[0.05] px-3 py-2 dark:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function AddCasesPicker({ cases, existing, onAdd }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return cases.filter((testCase) => !existing.has(testCase.id) && (testCase.title.toLowerCase().includes(q) || testCase.key.toLowerCase().includes(q))).slice(0, 8);
  }, [cases, existing, query]);
  return (
    <div className="relative w-full sm:w-72">
      <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Add cases by title or TC-…" aria-label="Add cases to cycle" className={`${CONTROL_SM} w-full pl-7`} />
      {results.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-slate-200/90 bg-white/100 py-1 shadow-lg dark:border-[#2a3044] dark:bg-[#1c2030]">
          {results.map((testCase) => (
            <li key={testCase.id}>
              <button type="button" onClick={() => { onAdd(testCase.id); setQuery(""); }} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-500/10">
                <FaPlus className="h-2 w-2 text-slate-400" />
                <span className="font-mono text-[11px] text-slate-500">{testCase.key}</span>
                <span className="truncate text-slate-800">{testCase.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cycle workspace: progress, burndown, testers, scope & assignments. */
export default function CycleDetailDrawer({ run, ws, onClose }) {
  const { data, users, perms, actions, nav, now } = ws;
  const canEdit = perms.canEdit;
  const open = run.status === "in-progress";
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const [checked, setChecked] = useState(() => new Set());
  const [filter, setFilter] = useState("all");
  useFocusTrap(panelRef);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || !isTopOverlay(rootRef.current)) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const summary = useMemo(() => summarizeRun(run), [run]);
  const burndown = useMemo(() => cycleBurndown(run, { now }), [run, now]);
  const resultMap = useMemo(() => getResultMap(run), [run]);
  const plan = run.planId ? data.planById.get(run.planId) : null;
  const release = run.releaseId ? data.releaseById.get(run.releaseId) : plan?.releaseId ? data.releaseById.get(plan.releaseId) : null;
  const people = users.filter((user) => user?.username && user.status !== "inactive");

  const rows = useMemo(() => run.caseIds.map((caseId) => ({
    caseId,
    testCase: data.caseById.get(caseId),
    result: resultMap.get(caseId),
    status: resultMap.get(caseId)?.status || "untested",
    assignee: assigneeOf(run, caseId),
  })).filter((row) => (filter === "all" ? true : filter === "open" ? row.status === "untested" || row.status === "retest" : row.status === filter)), [run, data.caseById, resultMap, filter]);

  const testers = useMemo(() => {
    const map = new Map();
    run.caseIds.forEach((caseId) => {
      const user = assigneeOf(run, caseId) || null;
      const entry = map.get(user) || { user, total: 0, done: 0, failed: 0 };
      const status = resultMap.get(caseId)?.status || "untested";
      entry.total += 1;
      if (["passed", "failed", "blocked", "skipped"].includes(status)) entry.done += 1;
      if (status === "failed") entry.failed += 1;
      map.set(user, entry);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [run, resultMap]);

  const reassign = (ids, user) => {
    const assignments = Object.fromEntries(ids.map((id) => [id, user || null]));
    actions.updateCycleScope(run.id, { assignments }, `Reassigned ${ids.length} case${ids.length !== 1 ? "s" : ""}`);
    setChecked(new Set());
  };

  return (
    <div ref={rootRef} data-tests-overlay="" className="absolute inset-0 z-30 flex justify-end" data-testid="tests-cycle-drawer">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] dark:bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tests-cycle-title" className="animate-slide-in-right relative flex h-full w-full flex-col border-l border-slate-200/80 bg-slate-50 shadow-2xl focus:outline-none dark:border-[#252b3b] dark:bg-[#141720] lg:w-[min(1040px,84%)]">
        <header className="flex-shrink-0 border-b border-slate-200/80 bg-white/100 px-4 py-4 dark:border-[#252b3b] dark:bg-[#1a1f2e] md:px-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Chip className={RUN_STATUS_META[run.status]?.chip}>{RUN_STATUS_META[run.status]?.label}</Chip>
                <span>{plan ? plan.name : "Standalone cycle"}</span>
                {release && <span>· Release {release.version}</span>}
              </div>
              <h2 id="tests-cycle-title" className="mt-1 truncate text-lg font-semibold text-slate-900">{run.name}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{optionLabel(ENVIRONMENT_OPTIONS, run.environment)}</span>
                <span>{optionLabel(PLATFORM_OPTIONS, run.platform)}</span>
                {run.build && <span>Build {run.build}</span>}
                <span>{formatDate(run.startDate || run.createdAt)} → {run.dueDate ? formatDate(run.dueDate) : "no due date"}</span>
                {open && run.dueDate && <span className="font-medium">{formatDueLabel(run.dueDate, now)}</span>}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => nav.openRunner(run.id)} className={BTN_PRIMARY} data-testid="tests-cycle-run">
                <FaPlay className="h-2.5 w-2.5" /> {open ? "Run" : "View results"}
              </button>
              <OverflowMenu
                label="Cycle actions"
                items={[
                  { id: "report", label: "Open report", icon: FaChartBar, onSelect: () => { nav.update({ tab: "reports", report: `cycle:${run.id}`, cycle: null }, { replace: false }); } },
                  canEdit && { id: "clone", label: "Clone cycle", icon: FaClone, onSelect: () => actions.cloneCycle(run, "all") },
                  canEdit && { id: "rerun", label: "Rerun failed & blocked", icon: FaRedo, onSelect: () => actions.cloneCycle(run, "failed") },
                  canEdit && (open
                    ? { id: "close", label: "Close cycle", icon: FaLock, onSelect: () => actions.closeCycle(run, summary) }
                    : { id: "reopen", label: "Reopen cycle", icon: FaLockOpen, onSelect: () => actions.reopenCycle(run) }),
                  canEdit && { id: "div", divider: true },
                  canEdit && { id: "delete", label: "Delete cycle…", icon: FaTrashAlt, danger: true, onSelect: () => actions.deleteCycle(run) },
                ]}
              />
              <button type="button" onClick={onClose} aria-label="Close cycle details" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white"><FaTimes className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard title="Progress" className="xl:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Executed" value={`${summary.progress}%`} />
                <Stat label="Pass rate" value={summary.passRate === null ? "—" : `${summary.passRate}%`} tone={summary.passRate !== null && summary.passRate < 80 ? "text-red-600 dark:text-red-400" : "text-slate-900"} />
                <Stat label="Open" value={summary.open} />
              </div>
              <ResultBar counts={summary} total={summary.total} height="h-2.5" className="mt-4" showLegend />
            </SectionCard>
            <SectionCard title="Burndown" subtitle="Remaining unexecuted cases per day" className="xl:col-span-3">
              <BurndownChart burndown={burndown} />
            </SectionCard>
          </div>

          <SectionCard title="Testers" subtitle="Assigned cases and progress" bodyClassName="p-0">
            <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {testers.map((entry) => (
                <li key={entry.user || "none"} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar users={users} username={entry.user} showName className="w-44" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/10"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(entry.done / Math.max(1, entry.total)) * 100}%` }} /></div>
                  <span className="w-28 text-right text-xs tabular-nums text-slate-500"><b className="text-slate-900">{entry.done}</b>/{entry.total} done{entry.failed ? ` · ${entry.failed} failed` : ""}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Cases in scope"
            subtitle={`${run.caseIds.length} cases`}
            bodyClassName="p-0"
            actions={(
              <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter cases" className={CONTROL_SM}>
                <option value="all">All</option>
                <option value="open">Open (untested/retest)</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
                <option value="passed">Passed</option>
              </select>
            )}
          >
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-4 py-2 dark:border-[#252b3b]">
                <AddCasesPicker cases={data.cases} existing={new Set(run.caseIds)} onAdd={(caseId) => actions.updateCycleScope(run.id, { addCaseIds: [caseId] }, "Case added to cycle")} />
                {checked.size > 0 && (
                  <>
                    <span className="text-xs font-medium text-slate-600">{checked.size} selected</span>
                    <OverflowMenu label="Assign selected" align="left" triggerClassName={BTN_SM} items={[...people.map((user) => ({ id: user.username, label: user.name || user.username, onSelect: () => reassign([...checked], user.username) })), { id: "none", label: "Unassigned", onSelect: () => reassign([...checked], null) }]}>
                      <>Assign to…</>
                    </OverflowMenu>
                    <button type="button" onClick={() => { actions.updateCycleScope(run.id, { removeCaseIds: [...checked] }, `Removed ${checked.size} case${checked.size !== 1 ? "s" : ""}`); setChecked(new Set()); }} className={`${BTN_SM} text-red-600 dark:text-red-400`}>Remove</button>
                  </>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.06em] text-slate-500">
                  <tr className="border-b border-slate-200/70 dark:border-[#252b3b]">
                    {canEdit && <th className="w-8 px-4 py-2" aria-label="Select" />}
                    <th className="px-2 py-2 font-semibold">Case</th>
                    <th className="px-2 py-2 font-semibold">Result</th>
                    <th className="px-2 py-2 font-semibold">Assignee</th>
                    <th className="px-2 py-2 font-semibold">Executed</th>
                    <th className="px-2 py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                  {rows.map((row) => (
                    <tr key={row.caseId} className="hover:bg-slate-500/[0.03]">
                      {canEdit && (
                        <td className="px-4 py-2"><input type="checkbox" checked={checked.has(row.caseId)} onChange={() => setChecked((prev) => { const next = new Set(prev); if (next.has(row.caseId)) next.delete(row.caseId); else next.add(row.caseId); return next; })} aria-label={`Select ${row.testCase?.key || row.caseId}`} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></td>
                      )}
                      <td className="max-w-[360px] px-2 py-2">
                        <button type="button" onClick={() => row.testCase && nav.openCase(row.caseId)} className="flex min-w-0 items-baseline gap-2 text-left">
                          <span className="flex-shrink-0 font-mono text-[11px] text-slate-500">{row.testCase?.key || "—"}</span>
                          <span className="truncate text-slate-800 hover:text-blue-600 dark:hover:text-blue-400">{row.testCase?.title || "Deleted case"}</span>
                        </button>
                      </td>
                      <td className="px-2 py-2"><ResultChip status={row.status} /></td>
                      <td className="px-2 py-2">
                        {canEdit && open ? (
                          <select value={row.assignee || ""} onChange={(event) => reassign([row.caseId], event.target.value)} aria-label={`Assignee for ${row.testCase?.key || row.caseId}`} className={`${CONTROL_SM} max-w-[160px]`}>
                            <option value="">Unassigned</option>
                            {people.map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
                            {row.assignee && !people.some((user) => user.username === row.assignee) && <option value={row.assignee}>{row.assignee}</option>}
                          </select>
                        ) : <Avatar users={users} username={row.assignee} showName size="xs" />}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-500">{row.result?.executedAt ? `${userLabel(users, row.result.executedBy)} · ${formatDateTime(row.result.executedAt)}` : "—"}</td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" onClick={() => nav.openRunner(run.id, row.caseId)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">{open ? "Execute" : "View"}</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No cases for this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {canEdit && (
            <SectionCard title="Cycle details">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-slate-500">Environment
                  <select value={run.environment} onChange={(event) => actions.updateCycle(run.id, { environment: event.target.value })} className={`${CONTROL_SM} mt-1 w-full`}>{ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </label>
                <label className="text-xs text-slate-500">Platform
                  <select value={run.platform} onChange={(event) => actions.updateCycle(run.id, { platform: event.target.value })} className={`${CONTROL_SM} mt-1 w-full`}>{PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </label>
                <label className="text-xs text-slate-500">Build
                  <input type="text" defaultValue={run.build} onBlur={(event) => event.target.value !== run.build && actions.updateCycle(run.id, { build: event.target.value, buildVersion: event.target.value })} className={`${CONTROL_SM} mt-1 w-full`} />
                </label>
                <label className="text-xs text-slate-500">Due date
                  <input type="date" value={run.dueDate || ""} onChange={(event) => actions.updateCycle(run.id, { dueDate: event.target.value || null })} className={`${CONTROL_SM} mt-1 w-full`} />
                </label>
              </div>
              {!open && <p className="mt-3 text-xs text-slate-500">Closed {formatDateTime(run.completedAt)}. Reopen the cycle to record more results.</p>}
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={onClose} className={BTN_SECONDARY}>Done</button>
              </div>
            </SectionCard>
          )}
        </div>
      </aside>
    </div>
  );
}
