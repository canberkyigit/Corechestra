import React from "react";
import { FaBriefcase } from "react-icons/fa";

export function HRTabNav({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="bg-white dark:bg-[#0e1117] border-b border-slate-200 dark:border-[#2a3044] flex-shrink-0">
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <FaBriefcase className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">Human Resources</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Employee self-service portal</p>
          </div>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
