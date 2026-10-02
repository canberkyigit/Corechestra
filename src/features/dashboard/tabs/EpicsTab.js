import React from "react";
import { FaLayerGroup } from "react-icons/fa";
import EpicProgressList from "../components/EpicProgressList";
import { Panel } from "../components/DashboardPrimitives";

export default function EpicsTab({ data, actions }) {
  const { epicRows } = data;
  const idle = epicRows.filter((row) => row.total === 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <EpicProgressList rows={epicRows} onSelect={(epic) => actions.drill(`epic:${epic.id}`)} title="Epics in this sprint" className="" />
      </div>
      <Panel title="Without sprint work" icon={FaLayerGroup} subtitle={`${idle.length} epic${idle.length === 1 ? "" : "s"}`} testId="idle-epics">
        {idle.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Every epic has work in the current sprint.</p>
        ) : (
          <ul className="space-y-2">
            {idle.map((epic) => (
              <li key={epic.id} className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: epic.color || "#94a3b8" }} aria-hidden="true" />
                <span className="truncate">{epic.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
