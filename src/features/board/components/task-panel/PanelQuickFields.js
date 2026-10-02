import React from "react";
import { Listbox } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";
import PanelMiniSelect from "./PanelMiniSelect";
import { TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from "../../../../shared/constants/taskMeta";

const INPUT_CLS = "w-full border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed";

function FieldCaption({ children }) {
  return <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{children}</div>;
}

/** Priority / assignee / type / SP / due date / epic grid of the side panel. */
export default function PanelQuickFields({
  priority,
  assignedTo,
  type,
  storyPoint,
  dueDate,
  epicId,
  projectAssignees,
  epics,
  readOnly,
  onPriorityChange,
  onAssigneeChange,
  onTypeChange,
  onStoryPointChange,
  onDueDateChange,
  onEpicChange,
}) {
  const currentEpic = epics.find((epic) => epic.id === epicId);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <FieldCaption>Priority</FieldCaption>
        <PanelMiniSelect
          value={priority}
          options={TASK_PRIORITY_OPTIONS}
          onChange={onPriorityChange}
          renderValue={(value) => {
            const option = TASK_PRIORITY_OPTIONS.find((item) => item.value === value);
            return option ? <span className={option.color}>{option.label}</span> : value;
          }}
          renderOption={(option) => <span className={option.color}>{option.label}</span>}
          disabled={readOnly}
        />
      </div>
      <div>
        <FieldCaption>Assignee</FieldCaption>
        <PanelMiniSelect
          value={assignedTo}
          options={projectAssignees.map((member) => ({ value: member.value, label: member.label }))}
          onChange={onAssigneeChange}
          renderValue={(value) => <span>{projectAssignees.find((member) => member.value === value)?.label || value}</span>}
          renderOption={(option) => <span>{option.label}</span>}
          disabled={readOnly}
        />
      </div>
      <div>
        <FieldCaption>Type</FieldCaption>
        <PanelMiniSelect
          value={type}
          options={TASK_TYPE_OPTIONS}
          onChange={onTypeChange}
          renderValue={(value) => {
            const option = TASK_TYPE_OPTIONS.find((item) => item.value === value);
            if (!option) return value;
            const Icon = option.icon;
            return <span className="flex items-center gap-1"><Icon className={`w-3 h-3 ${option.color}`} />{option.label}</span>;
          }}
          renderOption={(option) => {
            const Icon = option.icon;
            return <><Icon className={`w-3 h-3 flex-shrink-0 ${option.color}`} />{option.label}</>;
          }}
          disabled={readOnly}
        />
      </div>
      <div>
        <FieldCaption>Story Points</FieldCaption>
        <input
          type="number"
          min="0"
          className={INPUT_CLS}
          value={storyPoint}
          onChange={(event) => onStoryPointChange(event.target.value)}
          placeholder="0"
          disabled={readOnly}
        />
      </div>
      <div>
        <FieldCaption>Due Date</FieldCaption>
        <input
          type="date"
          className={INPUT_CLS}
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
          disabled={readOnly}
        />
      </div>
      <div>
        <FieldCaption>Epic</FieldCaption>
        <Listbox value={epicId} onChange={onEpicChange} disabled={readOnly}>
          <div className="relative">
            <Listbox.Button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors w-full justify-between focus:outline-none disabled:opacity-50">
              {currentEpic
                ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentEpic.color }} />{currentEpic.title}</span>
                : <span className="text-slate-400">No Epic</span>}
              <FaChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </Listbox.Button>
            <Listbox.Options className="absolute z-50 mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg py-1 w-full max-h-36 overflow-auto">
              <Listbox.Option value={null} className={({ active }) => `px-2.5 py-1.5 text-xs cursor-pointer text-slate-500 dark:text-slate-400 ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>No Epic</Listbox.Option>
              {epics.map((epic) => (
                <Listbox.Option
                  key={epic.id}
                  value={epic.id}
                  className={({ active }) => `flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{epic.title}</span>
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>
    </div>
  );
}
