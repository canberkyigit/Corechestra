import React from "react";
import { FaChild, FaEdit, FaHome, FaTimes, FaTrash } from "react-icons/fa";
import { relativeTime } from "../../utils/docsTime";

/** Breadcrumb, inline-editable title, page actions and meta pills. */
export default function PageHeaderCard({
  page,
  breadcrumb,
  selectedSpace,
  readOnly,
  isEditing,
  editingTitle,
  draftTitle,
  titleInputRef,
  onDraftTitleChange,
  onStartTitleEdit,
  onTitleCommit,
  onTitleCancel,
  onToggleEdit,
  onAddChild,
  onDelete,
  onSelectPage,
}) {
  return (
    <div className="app-surface p-6 mb-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-5 flex-wrap">
        <FaHome className="w-3 h-3" />
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-500 dark:text-slate-400">{selectedSpace?.name}</span>
        {breadcrumb.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            {index < breadcrumb.length - 1 ? (
              <button onClick={() => onSelectPage(crumb.id)} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                {crumb.emoji} {crumb.title}
              </button>
            ) : (
              <span className="text-slate-700 dark:text-slate-300 font-medium">{crumb.emoji} {crumb.title}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-4xl leading-none select-none mt-1">{page.emoji || "📄"}</span>
        <div className="flex-1 min-w-0">
          {editingTitle && !readOnly ? (
            <input
              ref={titleInputRef}
              type="text"
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
              onBlur={onTitleCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter") onTitleCommit();
                if (event.key === "Escape") onTitleCancel();
              }}
              className="w-full text-3xl font-bold bg-transparent border-b-2 border-blue-400 text-slate-800 dark:text-white focus:outline-none pb-1"
            />
          ) : readOnly ? (
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">
              {page.title}
            </h1>
          ) : (
            <h1 onClick={onStartTitleEdit} className="text-3xl font-bold text-slate-800 dark:text-white cursor-text hover:opacity-80 transition-opacity leading-tight" title="Click to edit title">
              {page.title}
            </h1>
          )}
        </div>
      </div>
      {!readOnly && (
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
        <button
          onClick={onToggleEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          {isEditing ? <><FaTimes className="w-3 h-3" /> Cancel</> : <><FaEdit className="w-3 h-3" /> Edit</>}
        </button>
        <button onClick={onAddChild} title="Add child page" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
          <FaChild className="w-3 h-3" />
        </button>
        <button onClick={onDelete} title="Delete page" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <FaTrash className="w-3 h-3" />
        </button>
      </div>
      )}
    </div>

    <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
      <div className="app-meta-pill">
        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
          {page.author?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="capitalize">{page.author || "Unknown"}</span>
      </div>
      <span className="app-meta-pill">Updated {relativeTime(page.updatedAt)}</span>
      <span className="app-meta-pill">Created {relativeTime(page.createdAt)}</span>
      {page.labels?.length > 0 && page.labels.map((label) => (
        <span key={label} className="app-meta-pill">
          {label}
        </span>
      ))}
    </div>
    </div>
  );
}
