import React from "react";

function SkeletonPulse({ className }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 dark:bg-[#252b3b] ${className}`} />
  );
}

export function SkeletonCard({ compact = false }) {
  return (
    <div className={`bg-white dark:bg-[#1c2030] rounded-lg border border-slate-200 dark:border-[#2a3044] border-l-4 border-l-slate-200 dark:border-l-[#2a3044] shadow-sm ${compact ? "p-2.5" : "p-3"}`}>
      {/* Top row: type badge + id */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <SkeletonPulse className="w-5 h-5 rounded" />
        <SkeletonPulse className="w-12 h-3" />
      </div>
      {/* Title lines */}
      <SkeletonPulse className="h-3.5 w-full mb-1.5" />
      <SkeletonPulse className="h-3.5 w-3/4 mb-3" />
      {/* Bottom row */}
      <div className="flex items-center gap-2 mt-1">
        <SkeletonPulse className="h-3 w-10" />
        <SkeletonPulse className="h-4 w-6 rounded" />
        <div className="flex-1" />
        <SkeletonPulse className="w-5 h-5 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="flex flex-col h-full min-h-[300px] bg-slate-200/70 dark:bg-[#1a1f2e] rounded-xl border border-slate-300/80 dark:border-[#252b3b]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="animate-pulse w-2 h-2 rounded-full bg-slate-300 dark:bg-[#252b3b]" />
        <div className="animate-pulse h-3 w-20 rounded bg-slate-300 dark:bg-[#252b3b]" />
        <div className="ml-auto animate-pulse h-4 w-5 rounded-full bg-slate-300 dark:bg-[#252b3b]" />
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 px-2 pb-2">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Sprint banner skeleton */}
      <div className="animate-pulse h-28 rounded-2xl bg-slate-200 dark:bg-[#1c2030]" />
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="animate-pulse bg-white dark:bg-[#1c2030] rounded-xl p-4 border border-slate-200 dark:border-[#2a3044] space-y-2">
            <div className="h-3 w-12 rounded bg-slate-200 dark:bg-[#252b3b]" />
            <div className="h-7 w-8 rounded bg-slate-300 dark:bg-[#2a3044]" />
          </div>
        ))}
      </div>
      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-pulse h-64 rounded-xl bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044]" />
        <div className="animate-pulse h-64 rounded-xl bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044]" />
      </div>
    </div>
  );
}
