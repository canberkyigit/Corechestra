import React, { memo, useState } from "react";
import { FaChevronDown, FaChevronRight, FaLock, FaPlus, FaRocket } from "react-icons/fa";
import { AppButton } from "../../../shared/components/AppPrimitives";
import { RELEASES_READ_ONLY_MESSAGE, SIDEBAR_SECTIONS, STATUS_META } from "../constants/releaseMeta";
import { formatDate } from "../utils/releaseUtils";
import { StatusDot } from "./ReleaseBadges";

const ReleaseListItem = memo(function ReleaseListItem({ release, isSelected, colorClass, onSelect }) {
  return (
    <button
      onClick={() => onSelect(release.id)}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors group flex flex-col gap-0.5 ${
        isSelected
          ? "bg-blue-600/20 border border-blue-500/30"
          : "hover:bg-slate-200 dark:hover:bg-[#232838] border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-semibold ${colorClass || "text-slate-700 dark:text-slate-300"}`}>
          {release.version}
        </span>
        <span className="text-slate-400 dark:text-slate-500 text-xs truncate flex-1">{release.name}</span>
      </div>
      {release.releaseDate && (
        <span className="text-slate-600 dark:text-slate-400 text-xs pl-0.5">{formatDate(release.releaseDate)}</span>
      )}
    </button>
  );
});

function ReleaseSidebarSection({ statusKey, label, items, collapsed, selectedId, onToggle, onSelect }) {
  const meta = STATUS_META[statusKey] || STATUS_META.planned;
  return (
    <div>
      <button
        onClick={() => onToggle(statusKey)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors group"
      >
        {collapsed
          ? <FaChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
          : <FaChevronDown className="w-2.5 h-2.5 flex-shrink-0" />}
        <StatusDot status={statusKey} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="ml-auto text-xs bg-slate-100 dark:bg-[#232838] text-slate-400 px-1.5 py-0.5 rounded font-mono">
          {items.length}
        </span>
      </button>
      {!collapsed && items.length > 0 && (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          {items.map((release) => (
            <ReleaseListItem
              key={release.id}
              release={release}
              isSelected={selectedId === release.id}
              colorClass={meta.color}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      {!collapsed && items.length === 0 && (
        <p className="text-slate-600 dark:text-slate-400 text-xs px-7 py-1 italic">None</p>
      )}
    </div>
  );
}

export default function ReleaseSidebar({ grouped, selectedId, onSelect, readOnly, canManage, onCreate }) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (key) => setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className="w-full lg:w-[260px] lg:flex-shrink-0 bg-slate-50 dark:bg-[#1a1f2e] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#252b3b] flex flex-col overflow-hidden max-h-[42vh] lg:max-h-none">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-center gap-2">
          <FaRocket className="text-blue-400 w-4 h-4" />
          <span className="text-slate-800 dark:text-white font-semibold text-sm">Releases</span>
          {readOnly && (
            <span
              data-testid="releases-read-only-hint"
              title={RELEASES_READ_ONLY_MESSAGE}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200 dark:bg-[#1c2030] dark:text-slate-400 dark:border-[#2a3044]"
            >
              <FaLock className="w-2 h-2" /> Read-only
            </span>
          )}
        </div>
        {canManage && (
          <AppButton onClick={onCreate} size="sm">
            <FaPlus className="w-2.5 h-2.5" />
            New
          </AppButton>
        )}
      </div>

      {/* Release list */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-1">
        {SIDEBAR_SECTIONS.map(({ key, label }) => (
          <ReleaseSidebarSection
            key={key}
            statusKey={key}
            label={label}
            items={grouped[key] || []}
            collapsed={collapsedSections[key]}
            selectedId={selectedId}
            onToggle={toggleSection}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}
