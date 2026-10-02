import React, { useMemo } from "react";
import { FaExclamationTriangle, FaPlay, FaRedo, FaTasks, FaUserCheck } from "react-icons/fa";
import { canStartPlan } from "../utils/testingOperations";
import { PlanStatusChip } from "../components/TestingPrimitives";

export default function QueueTab({ currentUser, plans, planStatusById = {}, runs, suites, releases, readOnly = false, onOpenRun, onRerunFailed, onStartPlan, onOpenPlans }) {
  const suiteNameById = useMemo(() => new Map(suites.map((suite) => [suite.id, suite.name])), [suites]);
  const releaseVersionById = useMemo(() => new Map(releases.map((release) => [release.id, release.version])), [releases]);

  const isMine = (owner) => !currentUser || owner === currentUser;
  const myPlans = plans.filter((plan) => isMine(plan.assignedTester || plan.owner));
  const myRuns = runs.filter((run) => !currentUser || run.assignedTester === currentUser || run.owner === currentUser);
  const activeRuns = myRuns.filter((run) => run.status === "in-progress");
  // Runs that already have a "Rerun Failed" follow-up leave the retest queue.
  const rerunSourceIds = new Set(runs.map((run) => run.rerunOf).filter(Boolean));
  const failedRuns = myRuns.filter((run) => (
    run.status === "completed"
    && !rerunSourceIds.has(run.id)
    && (run.results || []).some((result) => result.status === "failed")
  ));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tester Queue</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assigned plans, active runs and failed retest work in one place.</p>
      </div>
      <div className="px-5 py-4 space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaUserCheck className="w-3.5 h-3.5 text-blue-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Assigned Plans</h4>
          </div>
          {myPlans.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No plans assigned.</p>
          ) : myPlans.map((plan) => {
            const status = planStatusById[plan.id] || plan.status || "draft";
            const startable = !readOnly && canStartPlan(status) && (plan.suiteIds || []).length > 0;
            return (
              <div key={plan.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{plan.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.environment || "staging"} · {plan.platform || "web"}{plan.buildVersion ? ` · ${plan.buildVersion}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PlanStatusChip status={status} />
                    {startable ? (
                      <button type="button" onClick={() => onStartPlan(plan)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                        <FaPlay className="w-2.5 h-2.5" /> Start
                      </button>
                    ) : (
                      <button type="button" onClick={() => onOpenPlans?.()} className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaTasks className="w-3.5 h-3.5 text-green-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Active Runs</h4>
          </div>
          {activeRuns.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No active runs.</p>
          ) : activeRuns.map((run) => (
            <div key={run.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{run.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {suiteNameById.get(run.suiteId) || run.suiteId} · {run.environment || "staging"} · {run.platform || "web"}
                  {run.releaseId ? ` · ${releaseVersionById.get(run.releaseId) || run.releaseId}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => onOpenRun(run.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex-shrink-0">
                Open Run
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="w-3.5 h-3.5 text-red-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Failed Retest Queue</h4>
          </div>
          {failedRuns.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No failed runs waiting for rerun.</p>
          ) : failedRuns.map((run) => {
            const failCount = (run.results || []).filter((result) => result.status === "failed").length;
            return (
              <div key={run.id} className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{run.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{failCount} failed case{failCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => onOpenRun(run.id)} className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                    Results
                  </button>
                  {!readOnly && (
                    <button type="button" onClick={() => onRerunFailed(run)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-[#1c2030] border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                      <FaRedo className="w-3 h-3" />
                      Rerun Failed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
