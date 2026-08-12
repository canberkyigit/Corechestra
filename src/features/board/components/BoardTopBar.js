import React from "react";

export function BoardTopBar({ tabs, activeTab, onTabChange, onCreateTask }) {
  return (
    <div className="flex items-center gap-2 px-3 md:px-6 pt-3 md:pt-4 pb-0 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] transition-colors min-w-0">
      <div className="flex gap-0.5 overflow-x-auto scrollbar-none min-w-0 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-2.5 md:px-4 py-2.5 font-medium text-xs md:text-sm transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button className="flex-shrink-0 mb-1 px-2.5 md:px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 transition-all text-xs md:text-sm flex items-center gap-1" onClick={onCreateTask}>
        <span className="md:hidden">+</span>
        <span className="hidden md:inline">+ Create Task</span>
      </button>
    </div>
  );
}
