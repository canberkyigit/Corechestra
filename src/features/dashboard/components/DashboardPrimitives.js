import React from "react";
import { taskKey } from "../../../shared/utils/helpers";
import { PRIORITY_META, STATUS_META } from "../utils/dashboardMetrics";

/** Card surface shared by every dashboard panel. */
export function Panel({ title, subtitle, icon: Icon, action, children, className = "", bodyClassName = "", testId }) {
  return (
    <section
      data-testid={testId}
      className={`flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 px-4 pb-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function PanelLink({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
    >
      {children}
    </button>
  );
}

export function EmptyHint({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center dark:border-[#2a3044]">
      {Icon && <Icon className="mb-2 h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
      {title && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>}
      {children && <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">{children}</p>}
    </div>
  );
}

export function ProgressBar({ value, color, className = "h-1.5", trackClassName = "bg-slate-100 dark:bg-[#232838]", label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${color && color.startsWith("bg-") ? color : ""}`}
        style={{ width: `${pct}%`, ...(color && !color.startsWith("bg-") ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#0891b2"];

export function avatarColor(name = "", fallback) {
  if (fallback) return fallback;
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name, color, size = 24 }) {
  const initials = String(name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)), backgroundColor: avatarColor(name, color) }}
    >
      {initials}
    </span>
  );
}

export function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || "—", dot: "bg-slate-400" };
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-[#2a3044] dark:text-slate-300">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function PriorityMark({ priority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <span className="h-2 w-2 flex-shrink-0" aria-hidden="true" />;
  return <span className={`h-2 w-2 flex-shrink-0 rounded-full ${meta.dot}`} title={`${meta.label} priority`} aria-label={`${meta.label} priority`} />;
}

/** Clickable task row used by every task list on the dashboard. */
export function TaskRow({ task, onOpen, meta, showAssignee = true }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-[#232838]"
    >
      <PriorityMark priority={task.priority} />
      <span className="w-[86px] flex-shrink-0 truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{taskKey(task.id)}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
        {task.title || "Untitled"}
      </span>
      {meta && <span className="hidden flex-shrink-0 text-[11px] text-slate-500 sm:inline dark:text-slate-400">{meta}</span>}
      {showAssignee && (
        task.assignedTo
          ? <span title={task.assignedTo}><Avatar name={task.assignedTo} size={20} /></span>
          : <span className="h-5 w-5 flex-shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600" title="Unassigned" />
      )}
    </button>
  );
}

/** Small legend chip: colored swatch + text in ink colors. */
export function LegendItem({ color, label, value, dashed = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      {dashed
        ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} aria-hidden="true" />
        : <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />}
      <span>{label}</span>
      {value !== undefined && <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{value}</span>}
    </span>
  );
}
