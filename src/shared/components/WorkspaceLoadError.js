import React, { useEffect, useState } from "react";

function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/**
 * Blocking screen shown when the initial workspace load fails. Nothing is
 * written until a retry succeeds, so the real data can't be overwritten by
 * an empty local state.
 */
export default function WorkspaceLoadError({ onRetry, retrying = false }) {
  const online = useOnlineStatus();

  return (
    <div
      role="alert"
      className="min-h-screen bg-slate-100 dark:bg-[#080b14] flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z M12 10.5v3m0 2.25h.008" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Couldn&apos;t load your workspace
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
          {online
            ? "The server didn't respond in time. Your data is safe and nothing has been changed."
            : "You appear to be offline. Reconnect and try again — nothing has been changed."}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Editing stays disabled until the workspace loads, so no work can be lost.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onRetry?.()}
            disabled={retrying}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#141720]"
          >
            {retrying && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
            {retrying ? "Retrying…" : "Try again"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
