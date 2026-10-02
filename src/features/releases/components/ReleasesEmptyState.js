import React from "react";
import { FaDatabase, FaPlus, FaRocket } from "react-icons/fa";
import { AppButton } from "../../../shared/components/AppPrimitives";

export default function ReleasesEmptyState({ canManage, filtered, onCreate, onLoadSamples, onClearFilters }) {
  if (filtered) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/100 px-6 py-14 text-center dark:border-[#252b3b] dark:bg-[#1a1f2e]">
        <h3 className="text-sm font-semibold text-slate-900">No releases match your filters</h3>
        <p className="mt-1 text-sm text-slate-500">Try a different search, status or owner.</p>
        <button type="button" onClick={onClearFilters} className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Clear filters</button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/100 px-6 py-16 text-center dark:border-[#2a3044] dark:bg-[#1a1f2e]" data-testid="releases-empty">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <FaRocket className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">Plan your first release</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Track versions from planning to production: scope, readiness, release notes, quality and deployments in one place.
        {!canManage && " Your role can view releases but not create them."}
      </p>
      {canManage && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <AppButton variant="primary" onClick={onLoadSamples} data-testid="releases-load-samples">
            <FaDatabase className="h-3 w-3" /> Load sample releases
          </AppButton>
          <AppButton onClick={onCreate}>
            <FaPlus className="h-3 w-3" /> New release
          </AppButton>
        </div>
      )}
    </div>
  );
}
