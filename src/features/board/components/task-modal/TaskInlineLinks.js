import React from "react";
import { FaLink, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";
import { getEntityTypeMeta } from "../../../../shared/constants/entityMeta";
import { LINK_RELATIONSHIPS } from "./TaskDetailSections";

/** Compact "Links" box shown in the modal's Details tab. */
export default function TaskInlineLinks({
  linkedItems,
  linkSearchOpen,
  setLinkSearchOpen,
  linkRelationship,
  setLinkRelationship,
  linkSearch,
  setLinkSearch,
  linkSearchResults,
  closeLinkSearch,
  linkedByRelationship,
  onAddLink,
  onRemoveLink,
  readOnly = false,
}) {
  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
        <div className="flex items-center gap-1.5">
          <FaLink className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Links</span>
          {linkedItems.length > 0 && <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{linkedItems.length}</span>}
        </div>
        {!readOnly && (
          <button type="button" onClick={() => setLinkSearchOpen((prev) => !prev)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      {linkSearchOpen && (
        <div className="p-2.5 border-b border-slate-100 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Link type:</span>
            <select
              className="flex-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={linkRelationship}
              onChange={(event) => setLinkRelationship(event.target.value)}
            >
              {LINK_RELATIONSHIPS.map((relationship) => <option key={relationship} value={relationship}>{relationship}</option>)}
            </select>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
            <input
              autoFocus
              className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
              placeholder="Search tasks by name or CY-..."
              value={linkSearch}
              onChange={(event) => setLinkSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeLinkSearch(); } }}
            />
          </div>
          {linkSearchResults.length > 0 && (
            <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] divide-y divide-slate-100 dark:divide-[#2a3044] max-h-32 overflow-y-auto">
              {linkSearchResults.map((entity) => {
                const entityMeta = getEntityTypeMeta(entity.type);
                const EntityIcon = entityMeta.icon;
                return (
                  <button
                    type="button"
                    key={`${entity.type}-${entity.id}`}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                    onClick={() => onAddLink(entity)}
                  >
                    <EntityIcon className={`w-3 h-3 flex-shrink-0 ${entityMeta.color}`} />
                    <span className="text-xs font-mono text-slate-400 flex-shrink-0">{entity.key || taskKey(entity.id)}</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{entity.title}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={closeLinkSearch}>Cancel</button>
        </div>
      )}
      {Object.keys(linkedByRelationship).length > 0 ? (
        <div>
          {Object.entries(linkedByRelationship).map(([relationship, items]) => (
            <div key={relationship}>
              <div className="px-3 py-1.5 text-xs text-slate-400 italic border-b border-slate-50 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#1a1f2e]/30">{relationship}</div>
              {items.map(({ id: linkId, linkedEntity }) => {
                const entityMeta = getEntityTypeMeta(linkedEntity.type);
                const EntityIcon = entityMeta.icon;
                return (
                  <div key={linkId} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
                    <EntityIcon className={`w-3.5 h-3.5 flex-shrink-0 ${entityMeta.color}`} />
                    <span className="text-xs font-mono text-slate-400 flex-shrink-0">{linkedEntity.key || taskKey(linkedEntity.id)}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{linkedEntity.title}</span>
                    {!readOnly && (
                      <button type="button" className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all" onClick={() => onRemoveLink(linkId)} title="Unlink">
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        !linkSearchOpen && !readOnly && (
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
            onClick={() => setLinkSearchOpen(true)}
          >
            + Link a related task
          </button>
        )
      )}
    </div>
  );
}
