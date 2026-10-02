import React from "react";
import { FaChartPie, FaClipboardList, FaLayerGroup, FaPlay, FaShieldAlt, FaTasks } from "react-icons/fa";
import { COUNT_BADGE_CLASS } from "../constants/testingConstants";

export const TESTS_TABS = [
  { key: "queue", label: "Queue", icon: FaTasks },
  { key: "plans", label: "Test Plans", icon: FaLayerGroup },
  { key: "cases", label: "Test Cases", icon: FaClipboardList, needsSuite: true },
  { key: "runs", label: "Test Runs", icon: FaPlay, needsSuite: true },
  { key: "coverage", label: "Coverage", icon: FaShieldAlt },
  { key: "analytics", label: "Analytics", icon: FaChartPie, needsSuite: true },
];

export const SUITE_SCOPED_TABS = TESTS_TABS.filter((tab) => tab.needsSuite).map((tab) => tab.key);

export default function TestsTabBar({ activeTab, counts = {}, onChange }) {
  return (
    <div role="tablist" className="flex items-center gap-1 px-5 pt-4 pb-0 border-b border-slate-200 dark:border-[#252b3b] overflow-x-auto">
      {TESTS_TABS.map(({ key, label, icon: Icon }) => (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === key}
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
            activeTab === key
              ? "border-blue-500 text-blue-600 dark:text-white bg-blue-50 dark:bg-blue-500/5"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c2030]"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
          {counts[key] > 0 && <span className={COUNT_BADGE_CLASS}>{counts[key]}</span>}
        </button>
      ))}
    </div>
  );
}
