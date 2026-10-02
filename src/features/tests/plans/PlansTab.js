import React, { memo, useMemo, useState } from "react";
import {
  FaCalendarAlt, FaChartBar, FaClipboardList, FaClone, FaDatabase, FaExternalLinkAlt, FaFlagCheckered, FaLock,
  FaLockOpen, FaPen, FaPlay, FaPlus, FaRedo, FaSearch, FaTrashAlt,
} from "react-icons/fa";
import { requestNavigate } from "../../../shared/components/appNavigation";
import {
  BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, BTN_SM, BTN_SM_PRIMARY, CARD, CONTROL, ENVIRONMENT_OPTIONS, PLAN_STATUS_META, PLATFORM_OPTIONS,
  RUN_STATUS_META, optionLabel,
} from "../constants/testingConstants";
import OverflowMenu from "../components/OverflowMenu";
import { Avatar, Chip, EmptyState, ResultBar } from "../components/ui";
import { assigneeOf, derivePlanStatus, summarizeRun, summarizeRuns } from "../utils/testingMetrics";
import { daysUntil, formatDate, formatDueLabel, userLabel } from "../utils/testingFormat";

function AvatarStack({ users, usernames }) {
  const shown = usernames.slice(0, 4);
  return (
    <span className="flex -space-x-1">
      {shown.map((username) => (
        <span key={username} className="rounded-full ring-2 ring-white dark:ring-[#1a1f2e]"><Avatar users={users} username={username} size="xs" /></span>
      ))}
      {usernames.length > 4 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-500/15 text-[9px] font-semibold text-slate-600 ring-2 ring-white dark:ring-[#1a1f2e]">+{usernames.length - 4}</span>}
    </span>
  );
}

function CycleRow({ run, ws }) {
  const { users, perms, actions, nav, now } = ws;
  const summary = summarizeRun(run);
  const open = run.status === "in-progress";
  const testers = [...new Set(run.caseIds.map((caseId) => assigneeOf(run, caseId)).filter(Boolean))];
  const days = daysUntil(run.dueDate, now);
  return (
    <li className="group grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_auto] md:items-center" data-testid={`tests-cycle-${run.id}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Chip className={RUN_STATUS_META[run.status]?.chip}>{RUN_STATUS_META[run.status]?.label}</Chip>
          <button type="button" onClick={() => nav.openCycle(run.id)} className="min-w-0 truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-600 focus:outline-none focus-visible:underline dark:hover:text-blue-400">
            {run.name}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <span>{optionLabel(ENVIRONMENT_OPTIONS, run.environment)}</span>
          <span>{optionLabel(PLATFORM_OPTIONS, run.platform)}</span>
          {run.build && <span className="font-mono">{run.build}</span>}
          {open ? (
            <span className={`inline-flex items-center gap-1 ${days !== null && days < 0 ? "font-medium text-red-600 dark:text-red-400" : ""}`}><FaCalendarAlt className="h-2.5 w-2.5" />{formatDueLabel(run.dueDate, now)}</span>
          ) : <span>Closed {formatDate(run.completedAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ResultBar counts={summary} total={summary.total} className="min-w-[120px] flex-1" />
        <span className="w-16 text-right text-xs tabular-nums text-slate-500"><b className="text-slate-900">{summary.progress}%</b> · {summary.total}</span>
        {testers.length > 0 && <span className="hidden lg:inline-flex"><AvatarStack users={users} usernames={testers} /></span>}
      </div>
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => nav.openRunner(run.id)} className={open ? BTN_SM_PRIMARY : BTN_SM} data-testid={`tests-run-${run.id}`}>
          <FaPlay className="h-2.5 w-2.5" /> {open ? "Run" : "Results"}
        </button>
        <OverflowMenu
          label={`Actions for ${run.name}`}
          items={[
            { id: "details", label: "Cycle details", icon: FaClipboardList, onSelect: () => nav.openCycle(run.id) },
            { id: "report", label: "Report", icon: FaChartBar, onSelect: () => nav.update({ tab: "reports", report: `cycle:${run.id}` }, { replace: false }) },
            perms.canEdit && { id: "div", divider: true },
            perms.canEdit && { id: "clone", label: "Clone cycle", icon: FaClone, onSelect: () => actions.cloneCycle(run, "all") },
            perms.canEdit && { id: "rerun", label: "Rerun failed & blocked", icon: FaRedo, onSelect: () => actions.cloneCycle(run, "failed") },
            perms.canEdit && (open
              ? { id: "close", label: "Close cycle", icon: FaLock, onSelect: () => actions.closeCycle(run, summary) }
              : { id: "reopen", label: "Reopen cycle", icon: FaLockOpen, onSelect: () => actions.reopenCycle(run) }),
            perms.canEdit && { id: "div2", divider: true },
            perms.canEdit && { id: "delete", label: "Delete cycle…", icon: FaTrashAlt, danger: true, onSelect: () => actions.deleteCycle(run) },
          ]}
        />
      </div>
    </li>
  );
}

function PlanCard({ plan, runs, allRuns = runs, ws, onEdit, onNewCycle }) {
  const { data, users, perms, actions, now } = ws;
  const summary = useMemo(() => summarizeRuns(allRuns), [allRuns]);
  const status = derivePlanStatus(plan, allRuns);
  const release = plan.releaseId ? data.releaseById.get(plan.releaseId) : null;
  const days = daysUntil(plan.endDate, now);
  return (
    <section className={`${CARD} overflow-hidden`} data-testid={`tests-plan-${plan.id}`} aria-labelledby={`plan-${plan.id}-title`}>
      <header className="flex flex-wrap items-start gap-4 border-b border-slate-200/70 px-4 py-3.5 dark:border-[#252b3b]">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={PLAN_STATUS_META[status]?.chip}>{PLAN_STATUS_META[status]?.label}</Chip>
            <h3 id={`plan-${plan.id}-title`} className="truncate text-base font-semibold text-slate-900">{plan.name}</h3>
            {plan.sample && <span className="rounded bg-slate-500/10 px-1 text-[10px] font-semibold uppercase text-slate-500">Sample</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {release && (
              <button type="button" onClick={() => requestNavigate(`releases?release=${encodeURIComponent(release.id)}`)} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
                <FaFlagCheckered className="h-2.5 w-2.5" /> {release.version}{release.name ? ` · ${release.name}` : ""} <FaExternalLinkAlt className="h-2 w-2" />
              </button>
            )}
            {plan.milestone && <span>Milestone: <b className="font-medium text-slate-700">{plan.milestone}</b></span>}
            {(plan.startDate || plan.endDate) && (
              <span className={days !== null && days < 0 && status !== "completed" ? "text-red-600 dark:text-red-400" : ""}>
                {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">Owner <Avatar users={users} username={plan.owner} size="xs" showName /></span>
          </div>
          {plan.description && <p className="mt-1.5 line-clamp-2 max-w-3xl text-xs text-slate-600">{plan.description}</p>}
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{allRuns.length} cycle{allRuns.length !== 1 ? "s" : ""} · {summary.total} cases</span>
            <span className="tabular-nums"><b className="text-slate-900">{summary.progress}%</b> executed</span>
          </div>
          <ResultBar counts={summary} total={summary.total} height="h-2.5" />
          <div className="mt-1 text-right text-[11px] tabular-nums text-slate-500">{summary.passRate === null ? "No verdicts yet" : `${summary.passRate}% pass rate`}</div>
        </div>
        {perms.canEdit && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onNewCycle(plan)} className={BTN_SM} data-testid={`tests-plan-new-cycle-${plan.id}`}><FaPlus className="h-2.5 w-2.5" /> Cycle</button>
            <OverflowMenu
              label={`Actions for ${plan.name}`}
              items={[
                { id: "edit", label: "Edit plan", icon: FaPen, onSelect: () => onEdit(plan) },
                { id: "div", divider: true },
                { id: "delete", label: "Delete plan…", icon: FaTrashAlt, danger: true, onSelect: () => actions.deletePlan(plan) },
              ]}
            />
          </div>
        )}
      </header>
      {runs.length ? (
        <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
          {runs.map((run) => <CycleRow key={run.id} run={run} ws={ws} />)}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-slate-500">No cycles yet.{perms.canEdit ? " Add a cycle to start executing." : ""}</p>
      )}
    </section>
  );
}

function PlansTab({ ws, onNewPlan, onEditPlan, onNewCycle, onLoadSamples }) {
  const { data, perms, users } = ws;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const q = query.trim().toLowerCase();

  const runsByPlan = useMemo(() => {
    const map = new Map();
    data.runs.forEach((run) => {
      const key = run.planId && data.planById.has(run.planId) ? run.planId : "__none__";
      const list = map.get(key) || [];
      list.push(run);
      map.set(key, list);
    });
    return map;
  }, [data.runs, data.planById]);

  const byStatus = (run) => status === "all" || (status === "active" ? run.status === "in-progress" : run.status !== "in-progress");
  const byQuery = (run) => !q || run.name.toLowerCase().includes(q) || String(run.build).toLowerCase().includes(q) || userLabel(users, run.assignedTester).toLowerCase().includes(q);
  const matchRun = (run) => byStatus(run) && byQuery(run);

  const planBlocks = data.plans
    .map((plan) => {
      const all = runsByPlan.get(plan.id) || [];
      const planStatus = derivePlanStatus(plan, all);
      const planMatches = !q || plan.name.toLowerCase().includes(q) || (plan.milestone || "").toLowerCase().includes(q);
      const runs = all.filter((run) => byStatus(run) && (planMatches || byQuery(run)));
      let show = runs.length > 0;
      if (!show && planMatches) {
        // Plans without matching cycles: active view keeps open plans (to add cycles), "all" keeps everything.
        show = status === "all" || (status === "active" && planStatus !== "completed" && planStatus !== "aborted");
      }
      return { plan, runs, allRuns: all, show };
    })
    .filter((block) => block.show);
  const unplanned = (runsByPlan.get("__none__") || []).filter(matchRun);
  const totals = {
    active: data.runs.filter((run) => run.status === "in-progress").length,
    closed: data.runs.filter((run) => run.status !== "in-progress").length,
    all: data.runs.length,
  };

  if (!data.plans.length && !data.runs.length) {
    return (
      <div className={`${CARD} border-dashed`} data-testid="tests-plans-empty">
        <EmptyState icon={FaClipboardList} title="Plan your testing" description="Test plans group cycles for a release or milestone. Cycles assign cases to testers on an environment and build, with burndown and reports.">
          {perms.canEdit && (
            <>
              <button type="button" onClick={onNewPlan} className={BTN_PRIMARY} data-testid="tests-new-plan-empty"><FaPlus className="h-3 w-3" /> New test plan</button>
              <button type="button" onClick={() => onNewCycle({})} className={BTN_SECONDARY}><FaPlay className="h-2.5 w-2.5" /> New cycle</button>
              {!data.cases.length && <button type="button" onClick={onLoadSamples} className={BTN_SECONDARY}><FaDatabase className="h-3 w-3" /> Load sample data</button>}
            </>
          )}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-plans">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search plans and cycles</span>
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans, cycles, builds" className={`${CONTROL} w-full pl-8`} />
        </label>
        <div role="group" aria-label="Cycle status" className="inline-flex h-9 items-center rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
          {[["active", "Active"], ["closed", "Closed"], ["all", "All"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${status === id ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
              {label} <span className="tabular-nums opacity-60">{totals[id]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {perms.canEdit && (
          <>
            <button type="button" onClick={onNewPlan} className={BTN_SECONDARY} data-testid="tests-new-plan"><FaPlus className="h-3 w-3" /> New plan</button>
            <button type="button" onClick={() => onNewCycle({})} className={BTN_PRIMARY} data-testid="tests-new-cycle-tab"><FaPlay className="h-2.5 w-2.5" /> New cycle</button>
          </>
        )}
      </div>

      {planBlocks.map(({ plan, runs, allRuns }) => (
        <PlanCard key={plan.id} plan={plan} runs={runs} allRuns={allRuns} ws={ws} onEdit={onEditPlan} onNewCycle={(target) => onNewCycle({ planId: target.id })} />
      ))}

      {unplanned.length > 0 && (
        <section className={`${CARD} overflow-hidden`} aria-label="Standalone cycles">
          <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3 dark:border-[#252b3b]">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Standalone cycles</h3>
              <p className="text-xs text-slate-500">Cycles not attached to a test plan</p>
            </div>
            {perms.canEdit && <button type="button" onClick={() => onNewCycle({})} className={BTN_GHOST}><FaPlus className="h-2.5 w-2.5" /> Cycle</button>}
          </header>
          <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
            {unplanned.map((run) => <CycleRow key={run.id} run={run} ws={ws} />)}
          </ul>
        </section>
      )}

      {planBlocks.length === 0 && unplanned.length === 0 && (
        <div className={CARD}><EmptyState compact title="Nothing matches" description="Try another status or search." /></div>
      )}
    </div>
  );
}

export default memo(PlansTab);
