import React, { memo, useEffect, useMemo, useState } from "react";
import { FaCheck, FaPlus, FaTag, FaTimes } from "react-icons/fa";
import { AppBadge, AppButton } from "../../../shared/components/AppPrimitives";
import { CHANGELOG_TYPE_META } from "../constants/releaseMeta";

const EMPTY_ENTRY_DRAFT = { type: "feature", text: "" };

const ChangelogEntryRow = memo(function ChangelogEntryRow({ entry, meta, onDelete }) {
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2.5 group">
      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${meta.color} opacity-70`} />
      <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed flex-1">{entry.text}</span>
      {onDelete && (
        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-600 dark:text-slate-400 hover:text-red-400 transition-opacity flex-shrink-0 mt-0.5"
          title="Delete entry"
          aria-label="Delete entry"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

/**
 * Changelog grouped by entry type, with an inline "Add Entry" form. Mount with
 * `key={release.id}` so the draft resets when another release is selected.
 * `onAddEntry(draft)` returns true when the entry was recorded;
 * `onDeleteEntry(entryId)` should be stable for the memoized rows.
 */
export default function ReleaseChangelogCard({ changelog, canManage, onAddEntry, onDeleteEntry }) {
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryDraft, setEntryDraft] = useState(EMPTY_ENTRY_DRAFT);

  useEffect(() => {
    if (!canManage) setShowAddEntry(false);
  }, [canManage]);

  const changelogGroups = useMemo(() => {
    const groups = {};
    changelog.forEach((e) => {
      if (!groups[e.type]) groups[e.type] = [];
      groups[e.type].push(e);
    });
    return groups;
  }, [changelog]);

  function submit() {
    if (!entryDraft.text.trim()) return;
    if (onAddEntry(entryDraft)) setEntryDraft(EMPTY_ENTRY_DRAFT);
    setShowAddEntry(false);
  }

  return (
    <div className="app-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-center gap-2">
          <FaTag className="text-slate-400 dark:text-slate-500 w-3.5 h-3.5" />
          <span className="text-slate-800 dark:text-white font-semibold text-sm">Changelog</span>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
            {changelog.length}
          </span>
        </div>
        {canManage && (
          <AppButton
            onClick={() => setShowAddEntry((v) => !v)}
            variant="secondary"
            size="sm"
          >
            <FaPlus className="w-2.5 h-2.5" />
            Add Entry
          </AppButton>
        )}
      </div>

      {/* Add entry form */}
      {showAddEntry && canManage && (
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#1c2030] border-b border-slate-200 dark:border-[#252b3b] flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={entryDraft.type}
              onChange={(e) => setEntryDraft((p) => ({ ...p, type: e.target.value }))}
              className="bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors flex-shrink-0"
            >
              <option value="feature">Feature</option>
              <option value="bugfix">Bug Fix</option>
              <option value="improvement">Improvement</option>
              <option value="breaking">Breaking Change</option>
            </select>
            <input
              type="text"
              value={entryDraft.text}
              onChange={(e) => setEntryDraft((p) => ({ ...p, text: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setShowAddEntry(false); }}
              placeholder="Describe the change..."
              autoFocus
              className="flex-1 bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddEntry(false)}
              className="text-xs text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!entryDraft.text.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <FaCheck className="w-2.5 h-2.5" />
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Changelog entries grouped by type */}
      <div className="px-5 py-4 flex flex-col gap-5">
        {Object.keys(CHANGELOG_TYPE_META).map((type) => {
          const entries = changelogGroups[type];
          if (!entries || entries.length === 0) return null;
          const meta = CHANGELOG_TYPE_META[type];
          const Icon = meta.icon;
          return (
            <div key={type}>
              <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200 dark:border-[#2a3044]`}>
                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                  {meta.label}
                </span>
                <AppBadge tone={meta.tone} className="font-mono">
                  {entries.length}
                </AppBadge>
              </div>
              <div className="flex flex-col gap-1.5">
                {entries.map((entry) => (
                  <ChangelogEntryRow
                    key={entry.id}
                    entry={entry}
                    meta={meta}
                    onDelete={canManage ? onDeleteEntry : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {changelog.length === 0 && (
          <p className="app-subtle-copy text-sm text-center py-4 italic">
            {canManage ? "No changelog entries yet — add one above" : "No changelog entries yet"}
          </p>
        )}
      </div>
    </div>
  );
}
