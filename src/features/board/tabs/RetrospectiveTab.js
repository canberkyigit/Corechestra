import React, { useState } from "react";
import { FaStickyNote } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useProjectTasks } from "../../../shared/context/hooks/useProjectTasks";
import RetroBoard from "./retrospective/RetroBoard";
import RetroStatistics from "./retrospective/RetroStatistics";
import RetroCharts from "./retrospective/RetroCharts";
import RetroNotes from "./retrospective/RetroNotes";

const SUB_TABS = [
  { key: "retro", label: "Retro Board" },
  { key: "statistics", label: "Statistics" },
  { key: "charts", label: "Charts" },
  { key: "notes", label: "Notes" },
];

export default function RetrospectiveTab() {
  const { retrospectiveItems, burndownSnapshots, completedSprints, sprint } = useApp();
  const { projectActiveTasks } = useProjectTasks();
  const [subTab, setSubTab] = useState("retro");

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 px-4 py-4 overflow-y-auto pb-12">
      <div className="flex items-center gap-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-1 w-fit">
        {SUB_TABS.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              subTab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 ${subTab === "retro" ? "overflow-x-auto" : ""}`}>
        {subTab === "retro" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sprint Retrospective</h2>
            </div>
            <RetroBoard />
          </>
        )}

        {subTab === "statistics" && (
          <>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Statistics & Metrics</h2>
            <RetroStatistics retrospectiveItems={retrospectiveItems} activeTasks={projectActiveTasks} />
          </>
        )}

        {subTab === "charts" && (
          <>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Sprint Charts</h2>
            <RetroCharts
              activeTasks={projectActiveTasks}
              burndownSnapshots={burndownSnapshots}
              completedSprints={completedSprints}
              sprint={sprint}
            />
          </>
        )}

        {subTab === "notes" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FaStickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sprint Notes</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Capture meeting notes, decisions, and action items</p>
              </div>
            </div>
            <RetroNotes />
          </>
        )}
      </div>
    </div>
  );
}
