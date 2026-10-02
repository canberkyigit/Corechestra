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
  const card = "rounded-xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e]";
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="h-3 w-52" />
      </div>
      <div className="flex gap-4 border-b border-slate-200 dark:border-[#252b3b] pb-2">
        {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-4 w-16" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${card} p-4 space-y-2`}>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-14" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`${card} p-4 space-y-4 lg:col-span-5`}>
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-2 w-full rounded-full" />
          <SkeletonBlock className="h-2 w-full rounded-full" />
          <SkeletonBlock className="h-16 w-full rounded-lg" />
        </div>
        <div className={`${card} p-4 space-y-3 lg:col-span-7`}>
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-48 w-full rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} p-4 space-y-3`}>
            <SkeletonBlock className="h-4 w-28" />
            {[0, 1, 2, 3].map((j) => <SkeletonBlock key={j} className="h-3 w-full" />)}
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

// ─── Calendar page skeleton ───────────────────────────────────────────────────
export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <SkeletonBlock className="h-7 w-40" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 flex-shrink-0">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <SkeletonBlock key={d} className="h-6 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-1.5 space-y-1 min-h-[80px]">
            <SkeletonBlock className="h-3 w-5" />
            {i % 5 === 0 && <SkeletonBlock className="h-4 w-full rounded" />}
            {i % 7 === 3 && <SkeletonBlock className="h-4 w-full rounded" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tests page skeleton ──────────────────────────────────────────────────────
export function TestsSkeleton() {
  return (
    <div className="flex h-full gap-0">
      {/* Suites panel */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-[#2a3044] p-4 space-y-3">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="h-8 w-full rounded-lg" />
        {[0,1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
            <SkeletonBlock className="h-4 w-4 rounded flex-shrink-0" />
            <SkeletonBlock className="h-3 flex-1" />
          </div>
        ))}
      </div>
      {/* Cases/Runs panel */}
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-8 w-24 rounded-lg ml-auto" />
        </div>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-3 flex items-center gap-3">
            <SkeletonBlock className="h-5 w-5 rounded flex-shrink-0" />
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Releases page skeleton ───────────────────────────────────────────────────
export function ReleasesSkeleton() {
  return (
    <div className="h-full overflow-hidden bg-slate-50 dark:bg-[#141720]" data-testid="releases-skeleton">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-5 px-4 py-5 md:px-6 xl:px-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-7 w-36" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-9 w-64 rounded-lg" />
          {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />)}
          <div className="flex-1" />
          <SkeletonBlock className="h-9 w-56 rounded-lg" />
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e] p-3.5">
              <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-2.5 w-20" />
                <SkeletonBlock className="h-5 w-14" />
                <SkeletonBlock className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
        {/* List rows */}
        <div className="rounded-xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1a1f2e]">
          <div className="border-b border-slate-100 dark:border-[#252b3b] px-4 py-3">
            <SkeletonBlock className="h-3 w-full max-w-xl" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-100 dark:border-[#252b3b] px-4 py-3.5 last:border-b-0">
              <SkeletonBlock className="h-5 w-16 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-3 w-48" />
                <SkeletonBlock className="h-2.5 w-72 max-w-full" />
              </div>
              <SkeletonBlock className="hidden md:block h-5 w-20 rounded-full" />
              <SkeletonBlock className="hidden lg:block h-2 w-36 rounded-full" />
              <SkeletonBlock className="hidden xl:block h-8 w-8 rounded-full" />
              <SkeletonBlock className="hidden lg:block h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Docs page skeleton ───────────────────────────────────────────────────────
export function DocsSkeleton() {
  return (
    <div className="flex h-full gap-0">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-[#2a3044] p-4 space-y-2">
        <SkeletonBlock className="h-5 w-20" />
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className={`flex items-center gap-2 p-1.5 ${i % 3 === 1 ? "ml-4" : ""}`}>
            <SkeletonBlock className="h-3 w-3 rounded flex-shrink-0" />
            <SkeletonBlock className={`h-3 ${i % 2 === 0 ? "w-28" : "w-20"}`} />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 p-8 max-w-3xl space-y-4">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
        <div className="h-4" />
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
      </div>
    </div>
  );
}

// ─── Archive page skeleton ────────────────────────────────────────────────────
export function ArchiveSkeleton() {
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-8 w-48 rounded-lg" />
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-[#2a3044]">
          <SkeletonBlock className="h-4 w-32" />
        </div>
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0">
            <SkeletonBlock className="h-5 w-5 rounded flex-shrink-0" />
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── For You page skeleton ────────────────────────────────────────────────────
export function ForYouSkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <SkeletonBlock className="h-7 w-40" />
      {[0,1,2].map(section => (
        <div key={section} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4 rounded flex-shrink-0" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
              <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
              <SkeletonBlock className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Activity page skeleton ───────────────────────────────────────────────────
export function ActivitySkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto" data-testid="activity-skeleton">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-6 w-44" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-8 w-20 rounded-xl" />
          ))}
        </div>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1c2030] p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-20 rounded-full" />
            <SkeletonBlock className="h-3.5 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Roadmap page skeleton ────────────────────────────────────────────────────
export function RoadmapSkeleton() {
  return (
    <div className="flex flex-col h-full" data-testid="roadmap-skeleton">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-56" />
        </div>
        <SkeletonBlock className="h-8 w-64 rounded-lg" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <SkeletonBlock className="h-9 w-48 flex-shrink-0" />
            <SkeletonBlock className={`h-6 rounded-full ${["w-1/3", "w-1/2", "w-1/4", "w-2/5", "w-1/3"][i]}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
