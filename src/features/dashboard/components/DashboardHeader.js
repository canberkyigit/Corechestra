import React, { memo } from "react";
import { format } from "date-fns";
import { FaDownload, FaMagic, FaPrint } from "react-icons/fa";

export const DASHBOARD_TABS = [
  { id: "maestro", label: "Maestro", icon: FaMagic, accent: true },
  { id: "overview", label: "Overview" },
  { id: "sprint", label: "Sprint" },
  { id: "team", label: "Team" },
  { id: "epics", label: "Epics" },
  { id: "history", label: "History" },
];

const actionClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2a3044] dark:bg-[#1a1f2e] dark:text-slate-300 dark:hover:border-[#3a4054] dark:hover:bg-[#232838] dark:hover:text-white";

function DashboardHeader({ projectName, sprintName, activeTab, onTabChange, onExport, onPrint, exportDisabled, now }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-[0.08em]">Project overview</span>
            {projectName && (
              <>
                <span aria-hidden="true">/</span>
                <span className="truncate text-slate-700 dark:text-slate-200">{projectName}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {format(now, "EEEE, MMMM d")}
            {sprintName ? <> · <span className="text-slate-600 dark:text-slate-300">{sprintName}</span></> : " · No active sprint"}
          </p>
        </div>
        <div className={`no-print flex items-center gap-2 ${activeTab === "maestro" ? "invisible" : ""}`}>
          <button type="button" className={actionClass} onClick={onExport} disabled={exportDisabled} title="Export sprint work items as CSV">
            <FaDownload className="h-3 w-3" aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" className={actionClass} onClick={onPrint} title="Print this dashboard">
            <FaPrint className="h-3 w-3" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="no-print -mb-px flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-[#252b3b]">
        <div role="tablist" className="flex gap-1">
          {DASHBOARD_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            if (tab.accent) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onTabChange(tab.id)}
                  className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                    selected ? "border-indigo-500 dark:border-indigo-400" : "border-transparent"
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-white" aria-hidden="true">
                    <tab.icon className="h-2.5 w-2.5" />
                  </span>
                  <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-blue-400">{tab.label}</span>
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(tab.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                  selected
                    ? "border-blue-600 text-slate-900 dark:border-blue-400 dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

export default memo(DashboardHeader);
