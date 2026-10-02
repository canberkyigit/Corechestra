import React, { useEffect, useRef } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="release-confirm-title"
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/100 p-5 shadow-2xl dark:border-[#2a3044] dark:bg-[#1c2030]"
      >
        <div className="flex gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
            <FaExclamationTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="release-confirm-title" className="text-base font-semibold text-slate-900">{title}</h2>
            {message && <p className="mt-1 text-sm text-slate-600">{message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-300/70 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#2a3044] dark:text-slate-200">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-testid="release-confirm"
            className={`h-9 rounded-lg px-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c2030] ${tone === "danger" ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-500" : "bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
