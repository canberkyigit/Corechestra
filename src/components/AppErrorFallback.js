import React from "react";

export default function AppErrorFallback({ error, resetErrorBoundary }) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-slate-100 text-center mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          An unexpected error occurred. Your data is safe — this is a UI issue.
        </p>

        {/* Error details (dev only) */}
        {isDev && error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
              Error Details (dev only)
            </p>
            <p className="text-xs text-red-300 font-mono break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="mt-2 text-[10px] text-slate-500 overflow-auto max-h-32 font-mono">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            onClick={resetErrorBoundary}
          >
            Try Again
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-[#1c2030] hover:bg-[#232838] border border-[#2a3044] text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}
