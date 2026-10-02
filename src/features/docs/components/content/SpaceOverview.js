import React from "react";
import { FaChevronRight, FaPlus } from "react-icons/fa";
import { relativeTime } from "../../utils/docsTime";

export default function SpaceOverview({ space, pages, onSelectPage, onNewPage, readOnly = false }) {
  const rootPages = pages.filter((page) => !page.parentId);
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="app-surface p-6 mb-8">
        <div className="app-kicker mb-4">Space Overview</div>
        <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${space?.color}22`, border: `2px solid ${space?.color}44` }}
        >
          {space?.icon || "📘"}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">{space?.name}</h1>
          {space?.description && (
            <p className="text-sm app-subtle-copy mt-1.5 max-w-2xl leading-6">{space.description}</p>
          )}
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="app-surface p-5">
          <div className="app-kicker">Total Pages</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{pages.length}</div>
        </div>
        <div className="app-surface p-5">
          <div className="app-kicker">Root Pages</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{rootPages.length}</div>
        </div>
        <div className="app-surface p-5">
          <div className="app-kicker">Last Updated</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {pages.length > 0 ? relativeTime([...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.updatedAt) : "—"}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="app-section-title">Pages</h2>
          {!readOnly && (
            <button onClick={onNewPage} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium">
              <FaPlus className="w-2.5 h-2.5" /> New Page
            </button>
          )}
        </div>
        {rootPages.length === 0 ? (
          <div className="app-surface text-center py-10">
            <p className={`text-sm text-slate-400 ${readOnly ? "" : "mb-3"}`}>No pages yet</p>
            {!readOnly && (
              <button onClick={onNewPage} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Create first page
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {rootPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className="app-surface flex items-center gap-3 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all text-left group"
              >
                <span className="text-2xl">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {page.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated {relativeTime(page.updatedAt)}</div>
                </div>
                <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {recentPages.length > 0 && (
        <div>
          <h2 className="app-section-title mb-3">Recently Updated</h2>
          <div className="app-surface overflow-hidden">
            {recentPages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${
                  index < recentPages.length - 1 ? "border-b border-slate-100 dark:border-[#252b3b]" : ""
                }`}
              >
                <span className="text-base">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{page.title}</div>
                  <div className="text-xs text-slate-400">{relativeTime(page.updatedAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
