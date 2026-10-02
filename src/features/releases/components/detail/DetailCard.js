import React from "react";

/** Section card used inside the release detail drawer. */
export default function DetailCard({ title, subtitle, action, children, className = "", bodyClassName = "p-4", testId }) {
  return (
    <section
      data-testid={testId}
      className={`rounded-xl border border-slate-200/80 bg-white/100 dark:border-[#252b3b] dark:bg-[#1a1f2e] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-[#252b3b]">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export const SMALL_BTN = "inline-flex whitespace-nowrap items-center gap-1.5 h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-40 disabled:cursor-not-allowed";
export const SMALL_BTN_SECONDARY = `${SMALL_BTN} border border-slate-300/70 text-slate-700 hover:bg-slate-500/[0.06] dark:border-[#2a3044] dark:text-slate-200 dark:hover:bg-white/[0.04]`;
export const SMALL_BTN_PRIMARY = `${SMALL_BTN} bg-blue-600 text-white hover:bg-blue-500`;
export const SMALL_BTN_GHOST = `${SMALL_BTN} text-slate-600 hover:bg-slate-500/10 dark:text-slate-300`;
export const SMALL_BTN_DANGER = `${SMALL_BTN} text-red-600 hover:bg-red-500/10 dark:text-red-400`;
