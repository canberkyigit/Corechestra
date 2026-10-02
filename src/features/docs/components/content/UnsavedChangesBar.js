import React from "react";

/** Sticky save / discard bar shown while a doc page has unsaved edits. */
export default function UnsavedChangesBar({ remoteChanged, onDiscard, onSave }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 animate-modal-enter max-w-[calc(100vw-2rem)]">
      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Unsaved changes</span>
      {remoteChanged && (
        <span className="text-xs text-amber-600 dark:text-amber-400" data-testid="docs-remote-change-warning">
          Updated elsewhere — saving overwrites it
        </span>
      )}
      <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">Ctrl+S</span>
      <div className="w-px h-4 bg-slate-200 dark:bg-[#2a3044]" />
      <button onClick={onDiscard} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
        Discard
      </button>
      <button onClick={onSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors">
        Save
      </button>
    </div>
  );
}
