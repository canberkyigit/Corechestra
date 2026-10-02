import React from "react";
import { Listbox } from "@headlessui/react";
import { FaChevronDown, FaEye, FaEyeSlash, FaTag } from "react-icons/fa";
import { FieldLabel } from "./TaskDetailSections";

export function TaskLabelsPicker({ labels, selected, onToggle, readOnly = false }) {
  return (
    <div>
      <FieldLabel>Labels</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {labels.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">No labels defined</span>}
        {labels.map((label) => {
          const isOn = selected.includes(label.id);
          return (
            <button
              type="button"
              key={label.id}
              disabled={readOnly}
              onClick={() => onToggle(label.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                isOn ? "opacity-100 shadow-sm" : "opacity-40 hover:opacity-70"
              } ${readOnly ? "cursor-default" : ""}`}
              style={{
                backgroundColor: isOn ? `${label.color}22` : "transparent",
                color: label.color,
                borderColor: `${label.color}66`,
              }}
            >
              <FaTag className="inline w-2.5 h-2.5 mr-1" />
              {label.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TaskEpicPicker({ epics, value, onChange, readOnly = false }) {
  const currentEpic = epics.find((epic) => epic.id === value);
  return (
    <div>
      <FieldLabel>Epic</FieldLabel>
      <Listbox value={value} onChange={onChange} disabled={readOnly}>
        <div className="relative">
          <Listbox.Button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
            {currentEpic ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentEpic.color }} />
                <span>{currentEpic.title}</span>
              </>
            ) : (
              <span className="text-slate-400">No Epic</span>
            )}
            <FaChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-50 mt-1 bg-white dark:bg-[#1c2030] rounded-lg shadow-lg border border-slate-200 dark:border-[#2a3044] py-1 max-h-40 overflow-auto min-w-40">
            <Listbox.Option value={null} className={({ active }) => `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""} text-slate-500 dark:text-slate-400`}>
              No Epic
            </Listbox.Option>
            {epics.map((epic) => (
              <Listbox.Option
                key={epic.id}
                value={epic.id}
                className={({ active }) => `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                <span className="text-slate-700 dark:text-slate-300">{epic.title}</span>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}

export function TaskWatchersPicker({ members, watchers, onToggle, readOnly = false }) {
  const candidates = members.filter((member) => member.value && member.value !== "unassigned");
  return (
    <div>
      <FieldLabel>Watchers</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {candidates.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">No project members</span>}
        {candidates.map((member) => {
          const watching = watchers.includes(member.value);
          return (
            <button
              type="button"
              key={member.value}
              disabled={readOnly}
              onClick={() => onToggle(member.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all ${
                watching
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                  : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              {watching ? <FaEye className="w-3 h-3" /> : <FaEyeSlash className="w-3 h-3" />}
              <span>{member.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
