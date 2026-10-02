import React from "react";
import { FaCheck, FaClipboardList } from "react-icons/fa";

export default function ReleaseChecklistCard({ release, readOnly, onToggle }) {
  return (
    <div className="app-surface px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaClipboardList className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-800 dark:text-white font-semibold text-sm">Release Checklist</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {(release.checklist || []).filter((item) => item.completed).length}/{(release.checklist || []).length}
        </span>
      </div>
      <div className="space-y-2">
        {(release.checklist || []).map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            disabled={readOnly}
            aria-pressed={Boolean(item.completed)}
            data-testid={`release-checklist-${item.id}`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left disabled:cursor-default ${
              item.completed
                ? "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20"
                : "bg-slate-50 border-slate-200 dark:bg-[#1c2030] dark:border-[#2a3044]"
            }`}
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
              item.completed
                ? "bg-green-500 border-green-500 text-white"
                : "border-slate-300 dark:border-slate-600"
            }`}>
              {item.completed && <FaCheck className="w-2.5 h-2.5" />}
            </span>
            <span className={`text-sm ${item.completed ? "text-green-700 dark:text-green-300 line-through" : "text-slate-700 dark:text-slate-300"}`}>
              {item.title}
            </span>
          </button>
        ))}
      </div>
      {(release.rollbackPlan || release.monitoringChecks) && (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {release.rollbackPlan && (
            <div className="rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1c2030] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Rollback Plan</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{release.rollbackPlan}</p>
            </div>
          )}
          {release.monitoringChecks && (
            <div className="rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1c2030] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Monitoring Checks</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{release.monitoringChecks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
