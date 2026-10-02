import React from "react";

/** Floating @mention suggestion list positioned at the caret rect. */
export default function MentionDropdown({ dropdown, onPick }) {
  if (!dropdown.open || dropdown.items.length === 0 || !dropdown.rect) return null;
  return (
    <div className="fixed z-[100] bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-[160px]" style={{ top: dropdown.rect.bottom + 4, left: dropdown.rect.left }}>
      {dropdown.items.map((item, index) => (
        <button
          key={item.id}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
            index === dropdown.selectedIndex
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
          }`}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(item);
          }}
        >
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {item.label[0]?.toUpperCase()}
          </div>
          <span className="capitalize">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
