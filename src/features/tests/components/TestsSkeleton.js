import React from "react";

const bar = "animate-pulse rounded-md bg-slate-500/10 dark:bg-white/[0.06]";

/** Loading placeholder for the Tests module (header, tabs, KPI row, panels). */
export default function TestsSkeleton() {
  return (
    <div className="h-full overflow-hidden bg-slate-50 dark:bg-[#141720]" data-testid="tests-skeleton" aria-busy="true" aria-label="Loading tests">
      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6 xl:px-8">
        <div className={`${bar} h-3 w-40`} />
        <div className={`${bar} mt-3 h-7 w-56`} />
        <div className="mt-5 flex gap-4 border-b border-slate-200/80 pb-3 dark:border-[#252b3b]">
          {Array.from({ length: 7 }, (_, index) => <div key={index} className={`${bar} h-4 w-20`} />)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className={`${bar} h-[74px] rounded-xl`} />)}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className={`${bar} h-72 rounded-xl lg:col-span-2`} />
          <div className={`${bar} h-72 rounded-xl`} />
        </div>
      </div>
    </div>
  );
}
