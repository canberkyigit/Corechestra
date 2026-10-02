import React, { useEffect, useRef } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { useFocusTrap } from "./ui";

/**
 * Confirmation dialog driven by a request object:
 * { title, message, confirmLabel, tone: "danger" | "primary", onConfirm }.
 */
export default function ConfirmDialog({ request, onClose }) {
  const confirmRef = useRef(null);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, Boolean(request));

  useEffect(() => {
    if (!request) return undefined;
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [request, onClose]);

  if (!request) return null;
  const tone = request.tone || "danger";
  const confirm = () => {
    onClose();
    request.onConfirm?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tests-confirm-title"
        aria-describedby="tests-confirm-message"
        className="animate-modal-enter w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/100 p-5 shadow-2xl dark:border-[#2a3044] dark:bg-[#1c2030]"
      >
        <div className="flex gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
            <FaExclamationTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="tests-confirm-title" className="text-base font-semibold text-slate-900">{request.title}</h2>
            {request.message && <p id="tests-confirm-message" className="mt-1 whitespace-pre-line text-sm text-slate-600">{request.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-300/70 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#2a3044] dark:text-slate-200">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            data-testid="tests-confirm"
            className={`h-9 rounded-lg px-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c2030] ${tone === "danger" ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-500" : "bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-500"}`}
          >
            {request.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
