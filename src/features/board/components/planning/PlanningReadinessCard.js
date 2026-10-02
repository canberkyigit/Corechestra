import React, { memo } from "react";
import { FaCheck, FaClipboardCheck, FaExclamation } from "react-icons/fa";
import { PanelHeader, PlanningCard } from "./PlanningPrimitives";

/** Definition-of-ready style checklist for the sprint commitment. */
function PlanningReadinessCard({ readiness }) {
  const { checks, passed, total } = readiness;
  const allReady = passed === total;
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <PlanningCard aria-label="Planning readiness">
      <PanelHeader
        icon={FaClipboardCheck}
        title="Readiness"
        actions={(
          <span className={`text-xs font-semibold tabular-nums ${allReady ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
            {passed}/{total}
          </span>
        )}
      >
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allReady ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </PanelHeader>
      <ul className="space-y-0.5 px-2 py-2">
        {checks.map((check) => (
          <li key={check.key} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5" data-testid={`readiness-${check.key}`} data-ok={check.ok}>
            <span
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                check.ok
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              {check.ok ? <FaCheck className="h-2 w-2" /> : <FaExclamation className="h-2 w-2" />}
            </span>
            <span className="min-w-0">
              <span className={`block text-xs font-medium ${check.ok ? "text-slate-700 dark:text-slate-200" : "text-slate-800 dark:text-slate-100"}`}>
                {check.label}
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{check.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </PlanningCard>
  );
}

export default memo(PlanningReadinessCard);
