import React, { useEffect, useRef } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

export function ChatModal({ title, subtitle, onClose, children, footer, width = "max-w-lg", labelledBy = "chat-modal-title" }) {
  const cardRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const first = cardRef.current?.querySelector("[data-autofocus], input, textarea, select");
    first?.focus?.();
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4 overflow-y-auto"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full ${width} my-8 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-2xl animate-modal-enter`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={labelledBy} className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 pb-5">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ChatConfirmDialog({ title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancelRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div role="alertdialog" aria-modal="true" aria-labelledby="chat-confirm-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#2a3044] dark:bg-[#1c2030]">
        <div className="flex gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
            <FaExclamationTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="chat-confirm-title" className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {message && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <ChatButton variant="secondary" onClick={onCancel}>Cancel</ChatButton>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-testid="chat-confirm"
            className={`h-9 rounded-lg px-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c2030] ${tone === "danger" ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-500" : "bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 disabled:hover:bg-blue-600 shadow-sm",
  secondary: "border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5",
  ghost: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5",
  danger: "bg-red-600 text-white hover:bg-red-500",
  dangerGhost: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10",
};

export function ChatButton({ variant = "primary", size = "md", className = "", children, ...props }) {
  const sizing = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed ${sizing} ${BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const fieldClass = "w-full rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";

export function FieldLabel({ children, htmlFor, hint }) {
  return (
    <label htmlFor={htmlFor} className="block mb-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{children}</span>
      {hint && <span className="ml-1.5 text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
