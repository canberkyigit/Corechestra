import React from "react";
import { FaCheckSquare } from "react-icons/fa";
import {
  TASK_PRIORITY_DOT_STYLES,
  TASK_STATUS_BADGE_STYLES,
  TASK_STATUS_SHORT_LABELS,
  TASK_TYPE_ICON_META,
  TASK_TYPE_LABELS,
} from "../../../../shared/constants/taskMeta";
import { getInitial, getUserColor } from "../../utils/userColors";
import { toStoryPoints } from "../../utils/sprintMetrics";

export const LOAD_TONE_BAR = {
  ok: "bg-emerald-500",
  near: "bg-amber-400",
  over: "bg-red-500",
  idle: "bg-slate-300 dark:bg-slate-600",
};

export const LOAD_TONE_TEXT = {
  ok: "text-emerald-600 dark:text-emerald-400",
  near: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
  idle: "text-slate-500 dark:text-slate-400",
};

/** Bordered surface used by every planning panel. */
export function PlanningCard({ children, className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({ icon: Icon, title, meta, actions, children }) {
  return (
    <div className="border-b border-slate-200 px-4 py-3 dark:border-[#252b3b]">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />}
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {meta && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-400">
            {meta}
          </span>
        )}
        {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function TypeIcon({ type }) {
  const key = String(type || "task").toLowerCase();
  const meta = TASK_TYPE_ICON_META[key] || { icon: FaCheckSquare, color: "text-slate-400" };
  const Icon = meta.icon;
  return (
    <span title={TASK_TYPE_LABELS[key] || key} className="flex-shrink-0">
      <Icon className={`h-3 w-3 ${meta.color}`} aria-hidden="true" />
    </span>
  );
}

export function PriorityDot({ priority }) {
  const key = String(priority || "medium").toLowerCase();
  return (
    <span
      title={`${key.charAt(0).toUpperCase()}${key.slice(1)} priority`}
      className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${TASK_PRIORITY_DOT_STYLES[key] || TASK_PRIORITY_DOT_STYLES.medium}`}
    />
  );
}

export function StatusChip({ status }) {
  const key = String(status || "todo").toLowerCase();
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${TASK_STATUS_BADGE_STYLES[key] || TASK_STATUS_BADGE_STYLES.todo}`}>
      {TASK_STATUS_SHORT_LABELS[key] || key}
    </span>
  );
}

/** Story point pill; an unestimated item renders an amber "—" that can open estimation. */
export function PointsBadge({ points, onEstimate }) {
  const value = toStoryPoints(points);
  if (value === 0) {
    const className = "min-w-[24px] rounded border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-600 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-400";
    if (onEstimate) {
      return (
        <button
          type="button"
          onClick={onEstimate}
          title="Not estimated — open Planning Poker"
          className={`${className} transition-colors hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:hover:bg-amber-900/40`}
        >
          —
        </button>
      );
    }
    return <span title="Not estimated" className={className}>—</span>;
  }
  return (
    <span
      title={`${value} story point${value !== 1 ? "s" : ""}`}
      className="min-w-[24px] rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-slate-600 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-300"
    >
      {value}
    </span>
  );
}

export function Avatar({ name, colorKey, users, color, size = "sm" }) {
  const sizeClass = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[11px]";
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeClass}`}
      style={{ backgroundColor: color || getUserColor(colorKey || name, users) }}
      title={name}
    >
      {getInitial(name)}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      {Icon && (
        <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-[#232838] dark:text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-[240px] text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

export function Checkbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(node) => { if (node) node.indeterminate = indeterminate; }}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500/50 dark:border-slate-600"
    />
  );
}

export function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white py-0 pl-2.5 pr-7 text-xs font-medium text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl({ label, value, onChange, options }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[#2a3044] dark:bg-[#141720]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
              active
                ? "bg-white text-slate-800 shadow-sm dark:bg-[#232838] dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
