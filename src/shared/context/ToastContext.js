import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

const ToastContext = createContext(null);

const MAX_TOASTS = 4;
const DEFAULT_DURATION = { success: 3000, info: 3500, warning: 5000, error: 6000 };
const ACTION_DURATION = 6000;

function normalizeOptions(type, options) {
  const opts = typeof options === "number" ? { duration: options } : (options || {});
  const action = opts.action && typeof opts.action.onClick === "function" ? opts.action : null;
  const fallback = action ? ACTION_DURATION : (DEFAULT_DURATION[type] ?? 3000);
  return { duration: opts.duration ?? fallback, action };
}

/**
 * Toasts with optional action (e.g. Undo):
 *
 *   addToast("Task archived", "info", { action: { label: "Undo", onClick: restore } });
 *
 * Third argument may also be a plain duration in ms (legacy). Errors and
 * actionable toasts stay longer; hovering or focusing a toast pauses it.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", options) => {
    const id = Date.now() + Math.random();
    const { duration, action } = normalizeOptions(type, options);
    setToasts((prev) => [...prev, { id, message, type, duration, action }].slice(-MAX_TOASTS));
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {}, removeToast: () => {} };
  return ctx;
}

const TYPE_STYLES = {
  success: "border-green-500/40 dark:border-green-500/50",
  error:   "border-red-500/40 dark:border-red-500/50",
  info:    "border-blue-500/40 dark:border-blue-500/50",
  warning: "border-amber-500/50 dark:border-yellow-500/50",
};

const TYPE_TEXT = {
  success: "text-green-700 dark:text-green-400",
  error:   "text-red-700 dark:text-red-400",
  info:    "text-blue-700 dark:text-blue-400",
  warning: "text-amber-700 dark:text-yellow-400",
};

const TYPE_DOT = {
  success: "bg-green-500 dark:bg-green-400",
  error:   "bg-red-500 dark:bg-red-400",
  info:    "bg-blue-500 dark:bg-blue-400",
  warning: "bg-amber-500 dark:bg-yellow-400",
};

function Toast({ toast, onRemove }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (paused || !Number.isFinite(toast.duration) || toast.duration <= 0) return undefined;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => onRemove(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(800, remainingRef.current - (Date.now() - startedAtRef.current));
    };
  }, [onRemove, paused, toast.duration, toast.id]);

  const isError = toast.type === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      role={isError ? "alert" : "status"}
      data-testid="toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-xl border shadow-2xl text-sm font-medium pointer-events-auto max-w-[min(28rem,calc(100vw-2.5rem))] bg-white dark:bg-[#1e293b] ${TYPE_STYLES[toast.type] || TYPE_STYLES.info}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[toast.type] || TYPE_DOT.info}`} aria-hidden="true" />
      <span className={`flex-1 min-w-0 py-0.5 ${TYPE_TEXT[toast.type] || TYPE_TEXT.info}`}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.onClick();
            onRemove(toast.id);
          }}
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {toast.action.label || "Undo"}
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <FaTimes className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}
