import React from "react";
import { FaCheckCircle, FaCircle, FaWrench } from "react-icons/fa";
import { AppBadge, AppButton, AppDataCard } from "./AppPrimitives";

export function WorkspaceSetupChecklist({
  setup,
  compact = false,
  onOpenWorkspace,
}) {
  if (!setup) return null;

  return (
    <AppDataCard className={compact ? "p-4" : "p-5 md:p-6"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="app-kicker mb-2">Workspace Setup</div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {setup.isComplete ? "Your workspace is ready to scale" : "Finish product setup before wider rollout"}
          </h3>
          <p className="mt-2 text-sm app-subtle-copy max-w-2xl">
            {setup.completedCount} of {setup.totalCount} foundation steps are complete. Tightening these now makes onboarding,
            permissions and templates feel much more polished for new teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppBadge tone={setup.isComplete ? "green" : "blue"}>
            {setup.percentComplete}% complete
          </AppBadge>
          {onOpenWorkspace && (
            <AppButton variant="secondary" onClick={onOpenWorkspace}>
              <FaWrench className="w-3 h-3" /> Review setup
            </AppButton>
          )}
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? "mt-4" : "mt-5 md:grid-cols-2 xl:grid-cols-3"}`}>
        {setup.checklist.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-3 ${item.completed
              ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-900/10"
              : "border-slate-200 bg-slate-50/80 dark:border-[#2a3044] dark:bg-[#151a27]"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${item.completed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                {item.completed ? <FaCheckCircle className="w-4 h-4" /> : <FaCircle className="w-3 h-3" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</div>
                <div className="mt-1 text-xs app-subtle-copy">{item.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppDataCard>
  );
}
