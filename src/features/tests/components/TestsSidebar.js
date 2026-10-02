import React, { memo } from "react";
import { FaFlask, FaPlus, FaTrash } from "react-icons/fa";

const STATUS_DOT = {
  completed: "bg-green-500",
  "in-progress": "bg-blue-500",
  aborted: "bg-red-500",
};

const SuiteItem = memo(function SuiteItem({ suite, caseCount, lastStatus, isSelected, readOnly, onSelect, onDelete }) {
  return (
    <div
      className={`w-full flex items-center gap-0.5 rounded-lg transition-colors group ${
        isSelected
          ? "bg-blue-600/20 text-blue-700 dark:text-white"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#232838]"
      }`}
    >
      <button type="button" onClick={() => onSelect(suite.id)} className="flex-1 flex items-center gap-2 px-3 py-2.5 min-w-0 text-left rounded-lg">
        <span className={`flex-1 text-sm font-medium truncate ${isSelected ? "text-blue-700 dark:text-white" : ""}`}>{suite.name}</span>
        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#141720] px-1.5 py-0.5 rounded-full flex-shrink-0">{caseCount}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[lastStatus] || "bg-slate-400 dark:bg-slate-600"}`} title={lastStatus || "no runs"} />
      </button>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onDelete(suite)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 mr-0.5 text-slate-600 dark:text-slate-400 hover:text-red-400 transition-all flex-shrink-0 rounded-lg"
          title="Delete suite"
          aria-label={`Delete suite ${suite.name}`}
        >
          <FaTrash className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
});

export default function TestsSidebar({ projectName, suites, selectedSuiteId, caseCountBySuite, lastRunStatusBySuite, stats, readOnly, onSelectSuite, onNewSuite, onDeleteSuite, mobileOpen = false }) {
  const passRateTone =
    stats.passRate === null ? "text-slate-600 dark:text-slate-400" :
    stats.passRate >= 80 ? "text-green-600 dark:text-green-400" :
    stats.passRate >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  return (
    <aside
      id="tests-suites-panel"
      className={`${mobileOpen ? "flex" : "hidden"} md:flex w-full md:w-[260px] max-h-[55vh] md:max-h-none flex-shrink-0 bg-slate-50 dark:bg-[#1a1f2e] border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#2a3044] flex-col overflow-y-auto`}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-center gap-2">
          <FaFlask className="text-blue-400 w-4 h-4" />
          <span className="text-sm font-bold text-slate-800 dark:text-white">Test Management</span>
        </div>
        {!readOnly && (
          <button type="button" onClick={onNewSuite} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors" title="New Suite">
            <FaPlus className="w-2.5 h-2.5" /> Suite
          </button>
        )}
      </div>

      {projectName && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{projectName}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {suites.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <FaFlask className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-600 dark:text-slate-400">No suites yet.</p>
            {!readOnly && (
              <button type="button" onClick={onNewSuite} className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                Create one
              </button>
            )}
          </div>
        ) : (
          suites.map((suite) => (
            <SuiteItem
              key={suite.id}
              suite={suite}
              caseCount={caseCountBySuite[suite.id] || 0}
              lastStatus={lastRunStatusBySuite[suite.id] || null}
              isSelected={selectedSuiteId === suite.id}
              readOnly={readOnly}
              onSelect={onSelectSuite}
              onDelete={onDeleteSuite}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-[#252b3b] px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Total Cases</span>
          <span className="text-slate-600 dark:text-slate-300 font-semibold">{stats.totalCases}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Active Plans</span>
          <span className="text-slate-600 dark:text-slate-300 font-semibold">{stats.activePlans}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Pass Rate</span>
          <span className={`font-semibold ${passRateTone}`}>{stats.passRate === null ? "—" : `${stats.passRate}%`}</span>
        </div>
      </div>
    </aside>
  );
}
