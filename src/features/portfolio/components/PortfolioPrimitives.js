import React from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { useEscapeKey } from "../../board/hooks/useEscapeKey";
import { HEALTH_META } from "../utils/healthMeta";

// Building blocks of the Portfolio tab.

/** Field look without a width, for selects that size to their content. */
export const FIELD_CLS =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-200 dark:placeholder-slate-500";
export const INPUT_CLS = `w-full ${FIELD_CLS}`;
export const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50";
export const SECONDARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2a3044] dark:bg-[#1a1f2e] dark:text-slate-200 dark:hover:border-[#3a4054] dark:hover:bg-[#232838]";
export const GHOST_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-400 dark:hover:bg-[#232838] dark:hover:text-slate-100";

export function HealthPill({ health, size = "sm", suffix }) {
  const meta = HEALTH_META[health] || HEALTH_META["no-data"];
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${meta.pill} ${
        size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
      {suffix && <span className="font-normal opacity-70">· {suffix}</span>}
    </span>
  );
}

/** Progress bar with an optional "expected by now" tick. */
export function TrackBar({ value, expected, health, className = "h-2", label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = (HEALTH_META[health] || HEALTH_META["on-track"]).hex;
  return (
    <div className={`relative w-full ${className}`}>
      <div
        className="h-full w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {expected !== null && expected !== undefined && (
        <span
          className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-slate-400/80 dark:bg-slate-500"
          style={{ left: `calc(${Math.max(0, Math.min(100, expected))}% - 1px)` }}
          title={`Expected by now: ${expected}%`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** Circular score / progress gauge. */
export function ScoreRing({ value, size = 44, stroke = 4, color = "#2563eb", label, children }) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-label={label} role="img">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-[#232838]" />
        {value !== null && value !== undefined && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {children ?? (value === null || value === undefined ? "—" : `${pct}`)}
      </span>
    </span>
  );
}

/** Segmented control. `options`: [{ id, label, count? }]. */
export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[#2a3044] dark:bg-[#141720]">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
              selected
                ? "bg-white text-slate-900 shadow-sm dark:bg-[#232838] dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {option.icon && <option.icon className="h-3 w-3" aria-hidden="true" />}
            {option.label}
            {option.count !== undefined && (
              <span className={`rounded px-1 text-[10px] tabular-nums ${selected ? "bg-slate-100 text-slate-600 dark:bg-[#2a3044] dark:text-slate-300" : "text-slate-400"}`}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Right-hand detail drawer. */
export function Drawer({ open, onClose, labelledBy, children, width = "max-w-xl" }) {
  useEscapeKey(onClose, open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`animate-slide-in-right flex h-full w-full ${width} flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-[#2a3044] dark:bg-[#141720]`}
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}

export function DrawerClose({ onClose }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#232838] dark:hover:text-slate-200">
      <FaTimes className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export function StatTile({ label, value, sub, accent, children, onClick, active }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:bg-[#1a1f2e] ${
        active ? "border-blue-400 ring-2 ring-blue-500/20 dark:border-blue-500/60" : "border-slate-200/80 dark:border-[#252b3b]"
      } ${onClick ? "transition-colors hover:border-blue-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:border-blue-500/50" : ""}`}
    >
      {accent && <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent }} aria-hidden="true" />}
      <span className="flex items-center gap-1.5 truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {accent && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
        {label}
      </span>
      <span className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</span>
      {children}
      {sub && <span className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
    </Wrapper>
  );
}

export function relativeDays(iso, now = new Date()) {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = now.getTime() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
