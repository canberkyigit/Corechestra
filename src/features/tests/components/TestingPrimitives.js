import React, { useEffect, useRef, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaFlag, FaMinusCircle, FaTimes, FaTimesCircle } from "react-icons/fa";
import {
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
  PRIORITY_BG,
  PRIORITY_TEXT,
  RUN_STATUS_CONFIG,
  STATUS_CONFIG,
} from "../constants/testingConstants";

export function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.untested;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {status === "passed" && <FaCheckCircle className="w-2.5 h-2.5" />}
      {status === "failed" && <FaTimesCircle className="w-2.5 h-2.5" />}
      {status === "skipped" && <FaMinusCircle className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

export function RunStatusChip({ status }) {
  const cfg = RUN_STATUS_CONFIG[status] || RUN_STATUS_CONFIG["in-progress"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

export function PlanStatusChip({ status }) {
  const key = PLAN_STATUS_TONE[status] ? status : "draft";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PLAN_STATUS_TONE[key]}`}>
      {PLAN_STATUS_LABEL[key]}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const value = priority || "medium";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_TEXT[value] || "text-slate-500 dark:text-slate-400"} ${PRIORITY_BG[value] || "bg-slate-500/10"}`}>
      <FaFlag className="w-2.5 h-2.5" />
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

export function ModalOverlay({ children, onClose, labelledBy }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="w-full flex justify-center" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ id, icon, title, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b] flex-shrink-0">
      <h2 id={id} className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ModalFooter({ onCancel, onSubmit, submitLabel, submitTone = "primary", submitDisabled = false }) {
  const tone = submitTone === "danger"
    ? "bg-red-600 hover:bg-red-500"
    : "bg-blue-600 hover:bg-blue-500";
  return (
    <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b] flex-shrink-0">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
        Cancel
      </button>
      <button type="button" onClick={onSubmit} disabled={submitDisabled} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tone}`}>
        {submitLabel}
      </button>
    </div>
  );
}

export function LabeledField({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="px-3 py-2 text-sm rounded-lg border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40">
      {message}
    </div>
  );
}

const STAT_ACCENTS = {
  blue: "bg-blue-500/10 border-blue-500/20",
  green: "bg-green-500/10 border-green-500/20",
  purple: "bg-purple-500/10 border-purple-500/20",
  yellow: "bg-yellow-500/10 border-yellow-500/20",
};

export function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${STAT_ACCENTS[accent] || STAT_ACCENTS.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EditableField({ value, isEditing, onStartEdit, onSave, onCancel, className, placeholder, multiline, disabled, ariaLabel }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      committedRef.current = false;
      setDraft(value);
      const timer = setTimeout(() => ref.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isEditing, value]);

  // Enter + the blur caused by unmounting must not save twice.
  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onSave(draft);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !multiline) commit();
    if (event.key === "Escape") {
      committedRef.current = true;
      onCancel();
    }
  };

  if (isEditing) {
    const sharedClass = "bg-white dark:bg-[#141720] border border-blue-500 text-slate-800 dark:text-white rounded-lg px-2 py-1 text-sm focus:outline-none w-full";
    return multiline ? (
      <textarea
        ref={ref}
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        rows={2}
        className={`${sharedClass} resize-none`}
        placeholder={placeholder}
      />
    ) : (
      <input
        ref={ref}
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={sharedClass}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onStartEdit}
      disabled={disabled}
      className={`text-left block w-full ${disabled ? "cursor-default" : "hover:opacity-70 transition-opacity"} ${className}`}
    >
      {value || <span className="italic text-slate-500 dark:text-slate-400">{placeholder}</span>}
    </button>
  );
}

/**
 * Confirmation dialog. `request` = { title, message, confirmLabel, tone, onConfirm } | null.
 */
export function ConfirmDialog({ request, onClose }) {
  if (!request) return null;
  const handleConfirm = () => {
    request.onConfirm?.();
    onClose();
  };
  return (
    <ModalOverlay onClose={onClose} labelledBy="tests-confirm-title">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 pt-5 pb-4 flex gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            request.tone === "primary"
              ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
          }`}>
            <FaExclamationTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 id="tests-confirm-title" className="text-base font-bold text-slate-800 dark:text-white">{request.title}</h2>
            {request.message && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">{request.message}</p>}
          </div>
        </div>
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleConfirm}
          submitLabel={request.confirmLabel || "Confirm"}
          submitTone={request.tone === "primary" ? "primary" : "danger"}
        />
      </div>
    </ModalOverlay>
  );
}
