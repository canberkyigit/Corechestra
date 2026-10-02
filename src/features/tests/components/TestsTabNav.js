import React, { memo, useRef } from "react";
import {
  FaBug, FaChartPie, FaClipboardList, FaFileAlt, FaFolderOpen, FaProjectDiagram, FaUserCheck,
} from "react-icons/fa";
import { TESTS_TABS } from "../constants/testingConstants";

const ICONS = {
  overview: FaChartPie,
  repository: FaFolderOpen,
  plans: FaClipboardList,
  executions: FaUserCheck,
  traceability: FaProjectDiagram,
  defects: FaBug,
  reports: FaFileAlt,
};

/** Underlined module tabs (roving tabindex, ←/→/Home/End). */
function TestsTabNav({ activeTab, counts = {}, onChange }) {
  const refs = useRef({});
  const onKeyDown = (event) => {
    const index = TESTS_TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;
    if (event.key === "ArrowRight") next = TESTS_TABS[(index + 1) % TESTS_TABS.length];
    if (event.key === "ArrowLeft") next = TESTS_TABS[(index - 1 + TESTS_TABS.length) % TESTS_TABS.length];
    if (event.key === "Home") next = TESTS_TABS[0];
    if (event.key === "End") next = TESTS_TABS[TESTS_TABS.length - 1];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <nav aria-label="Test management sections" className="-mx-4 border-b border-slate-200/80 px-4 dark:border-[#252b3b] md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
      <div role="tablist" aria-label="Test management sections" onKeyDown={onKeyDown} className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
        {TESTS_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const selected = tab.id === activeTab;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              ref={(node) => { refs.current[tab.id] = node; }}
              type="button"
              role="tab"
              id={`tests-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="tests-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`relative inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
                selected ? "text-blue-600 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
              {tab.label}
              {count !== undefined && count !== null && count !== 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                  tab.id === "defects" ? "bg-red-500/10 text-red-600 dark:text-red-400" : tab.id === "executions" ? "bg-blue-500/10 text-blue-600 dark:text-blue-300" : "bg-slate-500/10 text-slate-600"
                }`}
                >
                  {count}
                </span>
              )}
              {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(TestsTabNav);
