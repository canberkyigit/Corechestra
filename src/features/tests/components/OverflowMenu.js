import React, { useEffect, useRef, useState } from "react";
import { FaEllipsisH } from "react-icons/fa";

/**
 * Small accessible dropdown menu.
 * `items`: [{ id, label, icon, onSelect, danger, disabled, divider, hint }]
 */
export default function OverflowMenu({ items, label = "More actions", align = "right", triggerClassName = "", children, testId, menuClassName = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const visible = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    const first = itemRefs.current.find(Boolean);
    first?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onMenuKeyDown = (event) => {
    const focusable = itemRefs.current.filter(Boolean);
    const index = focusable.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      rootRef.current?.querySelector("button")?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusable[(index + 1) % focusable.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusable[(index - 1 + focusable.length) % focusable.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  itemRefs.current = [];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={children ? undefined : label}
        title={label}
        data-testid={testId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={triggerClassName || "h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300/70 bg-white/80 text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:bg-[#1c2030] dark:border-[#2a3044] dark:hover:bg-[#232838] dark:text-slate-300"}
      >
        {children || <FaEllipsisH className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute z-40 mt-1.5 min-w-[230px] ${menuClassName} rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur py-1.5 shadow-lg shadow-slate-900/10 dark:bg-[#1c2030] dark:border-[#2a3044] dark:shadow-black/40 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {visible.map((item) => (item.divider ? (
            <div key={item.id} role="separator" className="my-1 h-px bg-slate-200/80 dark:bg-[#2a3044]" />
          ) : (
            <button
              key={item.id}
              ref={(node) => { if (node && !item.disabled) itemRefs.current.push(node); }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect?.();
              }}
              className={`w-full flex items-center gap-2.5 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                item.danger
                  ? "text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 dark:text-red-400"
                  : "text-slate-700 hover:bg-slate-500/10 focus:bg-slate-500/10 dark:text-slate-200"
              }`}
            >
              {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
              <span className="flex-1">{item.label}</span>
              {item.hint && <span className="text-[11px] text-slate-500">{item.hint}</span>}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}
