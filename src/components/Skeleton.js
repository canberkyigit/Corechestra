import React from "react";

// ─── Base shimmer block ───────────────────────────────────────────────────────
export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700/50 ${className}`}
    />
  );
}

// ─── Board page skeleton: kanban columns ─────────────────────────────────────
export function BoardSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-4 h-full overflow-x-auto">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="w-72 flex-shrink-0 flex flex-col gap-2">
          {/* Column header */}
          <div className="flex items-center justify-between mb-1">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-5 w-8 rounded-full" />
          </div>
          {/* Cards */}
          {[0, 1, 2, col % 2 === 0 ? 3 : null].filter((x) => x !== null).map((card) => (
            <div
              key={card}
              className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 bg-white dark:bg-[#1c2030] space-y-2"
            >
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
              <div className="flex items-center gap-2 pt-1">
                <SkeletonBlock className="h-4 w-12 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard page skeleton ──────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-2"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-3"
          >
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Table / list area */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-3">
        <SkeletonBlock className="h-4 w-40" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-full flex-shrink-0" />
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Projects page skeleton ───────────────────────────────────────────────────
export function ProjectsSkeleton() {
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
              <SkeletonBlock className="h-4 flex-1" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
            <div className="flex items-center gap-2 pt-1">
              <SkeletonBlock className="h-5 w-16 rounded-full" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reports page skeleton ────────────────────────────────────────────────────
export function ReportsSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <SkeletonBlock className="h-6 w-24" />
        <SkeletonBlock className="h-8 w-36 rounded-lg" />
      </div>
      {/* Top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-2"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-12" />
          </div>
        ))}
      </div>
      {/* Charts */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-3"
        >
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-48 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
