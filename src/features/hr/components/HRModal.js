import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes } from "react-icons/fa";

const WIDTHS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl", "2xl": "max-w-2xl" };

/** Shared modal shell for HR dialogs (backdrop, Esc to close, light/dark surfaces). */
export function HRModal({ open, onClose, title, subtitle, size = "md", children, footer, labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const titleId = labelledBy || (title ? `hr-modal-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="hr-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="hr-modal-panel" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`pointer-events-auto w-full ${WIDTHS[size] || WIDTHS.md} bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] max-h-[90vh] flex flex-col`}
              onClick={(event) => event.stopPropagation()}
            >
              {title && (
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-[#2a3044] flex-shrink-0">
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
                    {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                  </div>
                  <button type="button" aria-label="Close" onClick={onClose} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                    <FaTimes className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
              {footer && (
                <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2 flex-shrink-0">{footer}</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const hrInputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
export const hrSecondaryButton = "px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors";
export const hrPrimaryButton = "px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium";
export const hrDangerButton = "px-5 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium";
