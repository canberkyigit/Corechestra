import React, { memo } from "react";
import { FaChevronRight } from "react-icons/fa";
import { relativeTime } from "../../utils/docsTime";

const ChildPageItem = memo(function ChildPageItem({ child, onSelectPage }) {
  return (
    <button onClick={(event) => { event.stopPropagation(); onSelectPage(child.id); }} className="app-surface-muted flex items-center gap-3 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all text-left group">
      <span className="text-xl">{child.emoji || "📄"}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{child.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">Updated {relativeTime(child.updatedAt)}</div>
      </div>
      <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
    </button>
  );
});

export default function ChildPagesList({ childPages, onSelectPage }) {
  if (childPages.length === 0) return null;
  return (
    <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
      <h3 className="app-section-title mb-3">Child Pages</h3>
      <div className="grid gap-2">
        {childPages.map((child) => (
          <ChildPageItem key={child.id} child={child} onSelectPage={onSelectPage} />
        ))}
      </div>
    </div>
  );
}
