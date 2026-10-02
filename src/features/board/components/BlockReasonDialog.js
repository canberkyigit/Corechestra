import React, { useState } from "react";
import { FaBan } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { useEscapeKey } from "../hooks/useEscapeKey";

export default function BlockReasonDialog({ task, onSubmit, onCancel }) {
  const [reason, setReason] = useState("");
  useEscapeKey(onCancel);

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-reason-title"
        className="w-full max-w-md mx-4 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-[#252b3b]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500">
            <FaBan className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 id="block-reason-title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Why is this task blocked?
            </h2>
            {task && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {taskKey(task.id)} · {task.title}
              </p>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          <textarea
            autoFocus
            aria-label="Blocker reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Describe the blocker (waiting on API, missing access, …)"
            className="w-full rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            This project's workflow requires a blocker reason.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim()}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Mark as blocked
          </button>
        </div>
      </div>
    </div>
  );
}
