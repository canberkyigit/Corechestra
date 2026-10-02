import React, { useEffect, useRef, useState } from "react";
import { FaCheck, FaChevronDown } from "react-icons/fa";

/** Click-to-open popover anchored under its trigger. Esc / outside click closes. */
export function Popover({ label, trigger, children, align = "left", className = "", panelClassName = "", testId, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-testid={testId}
        onClick={() => setOpen((value) => !value)}
        className={trigger?.className}
      >
        {trigger?.content || label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
          className={`absolute z-40 mt-1.5 min-w-[220px] rounded-xl border border-slate-200/90 bg-white/100 p-1.5 shadow-lg shadow-slate-900/10 dark:border-[#2a3044] dark:bg-[#1c2030] dark:shadow-black/40 ${align === "right" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

const FACET_TRIGGER = "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50";

/** Multi-select facet filter: [{ value, label, count }]. */
export function FacetMenu({ label, options, selected = [], onChange, testId }) {
  const active = selected.length > 0;
  const toggle = (value) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const summary = active
    ? (selected.length === 1 ? options.find((option) => option.value === selected[0])?.label || selected[0] : `${selected.length} selected`)
    : null;
  return (
    <Popover
      testId={testId}
      ariaLabel={`Filter by ${label}`}
      trigger={{
        className: `${FACET_TRIGGER} ${active
          ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-slate-300/70 bg-white/80 text-slate-700 hover:bg-slate-500/[0.06] dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200"}`,
        content: (
          <>
            {label}
            {summary && <span className="max-w-[120px] truncate font-semibold">: {summary}</span>}
            <FaChevronDown className="h-2 w-2 opacity-60" />
          </>
        ),
      }}
    >
      <div className="max-h-72 overflow-y-auto">
        {options.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">No values</p>}
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(option.value)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-500/10 focus:bg-slate-500/10 focus:outline-none dark:text-slate-200"
            >
              <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-[#374155]"}`}>
                {checked && <FaCheck className="h-2.5 w-2.5" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.count !== undefined && <span className="text-[11px] tabular-nums text-slate-500">{option.count}</span>}
            </button>
          );
        })}
      </div>
      {active && (
        <div className="mt-1 border-t border-slate-200/70 pt-1 dark:border-[#2a3044]">
          <button type="button" onClick={() => onChange([])} className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400">Clear</button>
        </div>
      )}
    </Popover>
  );
}
