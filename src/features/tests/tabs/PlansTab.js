import React, { memo, useMemo, useState } from "react";
import { FaEdit, FaExclamationTriangle, FaLayerGroup, FaPlay, FaPlus, FaTrash } from "react-icons/fa";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../constants/testingConstants";
import { buildPlanSummary, canStartPlan, formatTestDate } from "../utils/testingOperations";
import { PlanStatusChip } from "../components/TestingPrimitives";
import TestPlanModal from "../modals/TestPlanModal";

function SummaryTile({ label, value, tone = "text-slate-800 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

const PlanCard = memo(function PlanCard({ plan, status, summary, release, ownerName, suiteNameById, readOnly, onEdit, onDelete, onStart, onMoveToDraft, onViewRuns }) {
  const suiteIds = plan.suiteIds || [];
  const startable = canStartPlan(status);
  return (
    <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl p-4 space-y-3" data-testid={`plan-card-${plan.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-slate-800 dark:text-white font-semibold truncate">{plan.name}</h4>
            <PlanStatusChip status={status} />
            {release && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                {release.version}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {ownerName || plan.assignedTester || "Unassigned"} · {plan.environment || "staging"} · {plan.platform || "web"}{plan.buildVersion ? ` · ${plan.buildVersion}` : ""}
            {plan.regressionPack ? ` · pack ${plan.regressionPack}` : ""}
          </p>
          {plan.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{plan.notes}</p>}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => onEdit(plan)} className="p-2 text-slate-500 hover:text-blue-500 rounded-lg transition-colors" title="Edit plan" aria-label={`Edit plan ${plan.name}`}>
              <FaEdit className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(plan)} className="p-2 text-slate-500 hover:text-red-500 rounded-lg transition-colors" title="Delete plan" aria-label={`Delete plan ${plan.name}`}>
              <FaTrash className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryTile label="Suites" value={suiteIds.length} />
        <SummaryTile label="Scoped Cases" value={summary.scopedCaseCount} />
        <SummaryTile label="Runs" value={summary.totalRuns} />
        <SummaryTile label="Progress" value={`${summary.progressPercent}%`} />
        <SummaryTile label="Failures" value={summary.failed} tone="text-red-600 dark:text-red-300" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {suiteIds.length === 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
            <FaExclamationTriangle className="w-3 h-3" /> No suites in scope — edit the plan to add one.
          </span>
        )}
        {suiteIds.map((suiteId) => (
          <span key={suiteId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
            {suiteNameById.get(suiteId) || "Removed suite"}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {plan.dueDate ? `Due ${formatTestDate(plan.dueDate)}` : "No due date"}
        </div>
        <div className="flex items-center gap-2">
          {summary.totalRuns > 0 && (
            <button type="button" onClick={() => onViewRuns(plan)} className={SECONDARY_BUTTON_CLASS}>
              View Runs
            </button>
          )}
          {!readOnly && startable && (
            <button type="button" onClick={() => onStart(plan)} disabled={suiteIds.length === 0} className={PRIMARY_BUTTON_CLASS}>
              <FaPlay className="w-3 h-3" />
              {status === "aborted" ? "Restart Plan" : "Start Plan"}
            </button>
          )}
          {!readOnly && status !== "draft" && (
            <button type="button" onClick={() => onMoveToDraft(plan)} className={SECONDARY_BUTTON_CLASS}>
              Move to Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default function PlansTab({
  plans,
  planStatusById = {},
  projectSuites,
  releases,
  users,
  testCases,
  testRuns,
  currentUser,
  readOnly = false,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onStartPlan,
  onMoveToDraft,
  onViewRuns,
}) {
  const [planModal, setPlanModal] = useState(null);
  const suiteNameById = useMemo(() => new Map(projectSuites.map((suite) => [suite.id, suite.name])), [projectSuites]);
  const releaseById = useMemo(() => new Map(releases.map((release) => [release.id, release])), [releases]);
  const userNameByKey = useMemo(() => new Map(users.map((user) => [user.username || user.id, user.name])), [users]);
  const summaries = useMemo(
    () => Object.fromEntries(plans.map((plan) => [plan.id, buildPlanSummary(plan, testRuns, testCases)])),
    [plans, testCases, testRuns]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#252b3b]">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Test Plans</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plan release scope, owner, environment and execution gates.</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => setPlanModal("new")} className={PRIMARY_BUTTON_CLASS}>
            <FaPlus className="w-3 h-3" /> New Plan
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaLayerGroup className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No test plans yet.</p>
            {!readOnly && (
              <button type="button" onClick={() => setPlanModal("new")} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Create First Plan
              </button>
            )}
          </div>
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              status={planStatusById[plan.id] || plan.status || "draft"}
              summary={summaries[plan.id]}
              release={releaseById.get(plan.releaseId)}
              ownerName={userNameByKey.get(plan.assignedTester || plan.owner)}
              suiteNameById={suiteNameById}
              readOnly={readOnly}
              onEdit={setPlanModal}
              onDelete={onDeletePlan}
              onStart={onStartPlan}
              onMoveToDraft={onMoveToDraft}
              onViewRuns={onViewRuns}
            />
          ))
        )}
      </div>

      {planModal && (
        <TestPlanModal
          initialData={planModal === "new" ? null : planModal}
          projectSuites={projectSuites}
          releases={releases}
          users={users}
          currentUser={currentUser}
          onClose={() => setPlanModal(null)}
          onSave={(data) => {
            if (planModal === "new") onCreatePlan(data);
            else onUpdatePlan(data);
          }}
        />
      )}
    </div>
  );
}
