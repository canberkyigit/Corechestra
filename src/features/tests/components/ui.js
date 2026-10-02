import React, { memo, useEffect, useId, useRef } from "react";
import { FaTimes } from "react-icons/fa";
import {
  AUTOMATION_META,
  CARD,
  CASE_STATUS_META,
  PRIORITY_META,
  RESULT_META,
  RESULT_ORDER,
} from "../constants/testingConstants";
import { initials, userLabel } from "../utils/testingFormat";

const CHIP_BASE = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset";

export function Chip({ className = "", children, title }) {
  return <span title={title} className={`${CHIP_BASE} ${className}`}>{children}</span>;
}

export const ResultChip = memo(function ResultChip({ status = "untested", compact = false, title }) {
  const meta = RESULT_META[status] || RESULT_META.untested;
  return (
    <span title={title || meta.label} className={`${CHIP_BASE} ${meta.chip}`} data-status={status}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {compact ? meta.short : meta.label}
    </span>
  );
});

export const PriorityBadge = memo(function PriorityBadge({ priority = "medium", showLabel = true }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`} title={`${meta.label} priority`}>
      <PriorityIcon priority={priority} />
      {showLabel && meta.label}
    </span>
  );
});

/** Jira-like priority glyph (chevrons), colour + shape so it never relies on colour alone. */
export function PriorityIcon({ priority = "medium" }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  const paths = {
    critical: ["M2 9l4-4 4 4", "M2 5.5l4-4 4 4"],
    high: ["M2 8l4-4 4 4"],
    medium: ["M2 4.5h8", "M2 7.5h8"],
    low: ["M2 4l4 4 4-4"],
  }[priority] || ["M2 4.5h8", "M2 7.5h8"];
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 flex-shrink-0 ${meta.text}`} aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

export const CaseStatusChip = memo(function CaseStatusChip({ status = "draft" }) {
  const meta = CASE_STATUS_META[status] || CASE_STATUS_META.draft;
  return <span className={`${CHIP_BASE} ${meta.chip}`}>{meta.label}</span>;
});

export const AutomationChip = memo(function AutomationChip({ automation = "manual" }) {
  const meta = AUTOMATION_META[automation] || AUTOMATION_META.manual;
  return <span className={`${CHIP_BASE} ${meta.chip}`}>{meta.label}</span>;
});

const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];
function toneFor(name) {
  let hash = 0;
  for (let i = 0; i < String(name).length; i += 1) hash = (hash * 31 + String(name).charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export const Avatar = memo(function Avatar({ users, username, size = "sm", showName = false, className = "" }) {
  const name = userLabel(users, username);
  const dims = size === "xs" ? "h-5 w-5 text-[9px]" : size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  if (!username) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
        <span className={`${dims} inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-[#374155]`} aria-hidden="true" />
        {showName && "Unassigned"}
      </span>
    );
  }
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`} title={name}>
      <span className={`${dims} inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${toneFor(username)}`} aria-hidden="true">
        {initials(name)}
      </span>
      {showName && <span className="truncate text-xs text-slate-700">{name}</span>}
      {!showName && <span className="sr-only">{name}</span>}
    </span>
  );
});

/**
 * Stacked result bar with 2px gaps between segments (secondary encoding next
 * to colour). `counts` = { passed, failed, ... }.
 */
export const ResultBar = memo(function ResultBar({ counts, total, height = "h-2", className = "", showLegend = false, label }) {
  const sum = total ?? RESULT_ORDER.reduce((acc, status) => acc + (counts?.[status] || 0), 0);
  const segments = RESULT_ORDER.filter((status) => (counts?.[status] || 0) > 0);
  const aria = label || RESULT_ORDER.filter((status) => counts?.[status]).map((status) => `${counts[status]} ${RESULT_META[status].label.toLowerCase()}`).join(", ") || "No cases";
  return (
    <div className={className}>
      <div role="img" aria-label={aria} className={`flex w-full gap-[2px] overflow-hidden rounded-full ${height} ${sum ? "" : "bg-slate-500/10"}`}>
        {segments.map((status) => (
          <span
            key={status}
            title={`${RESULT_META[status].label}: ${counts[status]}`}
            className={`${RESULT_META[status].bar} first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(counts[status] / Math.max(1, sum)) * 100}%`, minWidth: 3 }}
          />
        ))}
      </div>
      {showLegend && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 tabular-nums">
          {RESULT_ORDER.filter((status) => counts?.[status]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${RESULT_META[status].dot}`} aria-hidden="true" />
              {RESULT_META[status].label} {counts[status]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export function SectionCard({ title, subtitle, actions, children, className = "", bodyClassName = "p-4", id, testId }) {
  return (
    <section className={`${CARD} min-w-0 ${className}`} aria-labelledby={id ? `${id}-title` : undefined} data-testid={testId}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-[#252b3b]">
          <div className="min-w-0">
            {title && <h3 id={id ? `${id}-title` : undefined} className="truncate text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const KPI_TONES = {
  slate: "text-slate-600 bg-slate-500/10 dark:text-slate-300",
  blue: "text-blue-600 bg-blue-500/10 dark:text-blue-300",
  green: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
  amber: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
  red: "text-red-600 bg-red-500/10 dark:text-red-300",
  violet: "text-violet-600 bg-violet-500/10 dark:text-violet-300",
  cyan: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-300",
};

export function KpiCard({ icon: Icon, label, value, sub, tone = "slate", onClick, children, testId }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-white/100 p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e] ${
        onClick ? "transition-colors hover:border-blue-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:border-blue-500/50" : ""
      }`}
    >
      <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${KPI_TONES[tone] || KPI_TONES.slate}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xl font-semibold tabular-nums text-slate-900">{value}</span>
          {children}
        </span>
        {sub && <span className="mt-0.5 block truncate text-xs text-slate-500">{sub}</span>}
      </span>
    </Wrapper>
  );
}

export function EmptyState({ icon: Icon, title, description, children, compact = false, testId }) {
  return (
    <div data-testid={testId} className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </span>
      )}
      {title && <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>}
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Kbd({ children, inverted = false }) {
  if (inverted) {
    return <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-white/40 bg-white/15 px-1 font-mono text-[10px] font-semibold text-white">{children}</kbd>;
  }
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-300/80 bg-slate-500/[0.06] px-1 font-mono text-[10px] font-semibold text-slate-600 dark:border-[#374155] dark:text-slate-300">
      {children}
    </kbd>
  );
}

/**
 * True when `node` is the top-most module overlay (drawers / runner carry
 * `data-tests-overlay`; later in the DOM = on top). Used so Esc closes one
 * layer at a time.
 */
export function isTopOverlay(node) {
  if (!node || typeof document === "undefined") return true;
  const overlays = document.querySelectorAll("[data-tests-overlay]");
  return overlays[overlays.length - 1] === node;
}

/** Locks focus inside `ref` while mounted and restores it on unmount. */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    const previous = document.activeElement;
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKey = (event) => {
      if (event.key !== "Tab" || !node) return;
      const focusable = [...node.querySelectorAll(selector)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("keydown", onKey);
      if (previous && typeof previous.focus === "function") previous.focus({ preventScroll: true });
    };
  }, [ref, active]);
}

/** Accessible modal dialog. Esc closes (captured so drawers underneath stay open). */
export function Modal({ title, subtitle, onClose, children, footer, size = "md", testId, initialFocusRef }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useFocusTrap(panelRef);
  useEffect(() => {
    const target = initialFocusRef?.current || panelRef.current?.querySelector("input, textarea, select, button");
    target?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, initialFocusRef]);
  const width = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size] || "max-w-2xl";
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        className={`animate-modal-enter flex max-h-[94vh] w-full ${width} flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white/100 shadow-2xl dark:border-[#2a3044] dark:bg-[#1a1f2e] sm:rounded-2xl`}
      >
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-[#252b3b]">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-white">
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-slate-500/[0.03] px-5 py-3 dark:border-[#252b3b]">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TagList({ tags = [], max = 3 }) {
  if (!tags.length) return <span className="text-xs text-slate-500">—</span>;
  const shown = tags.slice(0, max);
  return (
    <span className="flex min-w-0 items-center gap-1 overflow-hidden">
      {shown.map((tag) => (
        <span key={tag} className="truncate rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">{tag}</span>
      ))}
      {tags.length > max && <span className="text-[10px] text-slate-500">+{tags.length - max}</span>}
    </span>
  );
}

export function ReadOnlyPill({ children = "Read-only access", testId = "tests-read-only-hint" }) {
  return (
    <span data-testid={testId} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true"><path d="M3.5 5V3.8a2.5 2.5 0 015 0V5M2.5 5h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      {children}
    </span>
  );
}
