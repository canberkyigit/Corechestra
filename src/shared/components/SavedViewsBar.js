import React from "react";
import { FaBookmark, FaSave, FaTrash } from "react-icons/fa";
import { AppBadge, AppButton } from "./AppPrimitives";

export default function SavedViewsBar({
  label = "Saved Views",
  views,
  activeViewId,
  onApplyView,
  onSaveCurrentView,
  onDeleteView,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 md:px-6 py-2 bg-white dark:bg-[#1c2030] border-b border-slate-100 dark:border-[#232838]">
      <AppBadge tone="neutral">
        <FaBookmark className="w-3 h-3" />
        {label}
      </AppBadge>
      <AppButton
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          const name = window.prompt("Save current view as");
          if (name) onSaveCurrentView(name);
        }}
      >
        <FaSave className="w-3 h-3" />
        Save current view
      </AppButton>
      {views.length === 0 ? (
        <span className="text-xs text-slate-400 dark:text-slate-500">No saved views yet</span>
      ) : (
        views.map((view) => (
          <div key={view.id} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onApplyView(view)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeViewId === view.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"
              }`}
            >
              {view.name}
            </button>
            <button
              type="button"
              onClick={() => onDeleteView(view.id)}
              className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
              title={`Delete ${view.name}`}
            >
              <FaTrash className="w-3 h-3" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
