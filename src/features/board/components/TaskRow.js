import React, { memo } from "react";
import { Listbox } from "@headlessui/react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format, isValid } from "date-fns";
import { FaArrowRight, FaBan } from "react-icons/fa";
import { TASK_TYPE_MAP } from "../../../shared/constants/taskMeta";
import { taskKey } from "../../../shared/utils/helpers";

const STATUS_CHIP = {
  todo: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600",
  inprogress: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  awaiting: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  blocked: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  done: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};
const CUSTOM_STATUS_CHIP = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";

const PRIORITY_CHIP = {
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};
const PRIORITIES = ["critical", "high", "medium", "low"];

const OPTIONS_PANEL = "absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] p-1 text-xs shadow-lg ring-1 ring-black/5 focus:outline-none z-50 space-y-1";

const parseDueDate = (value) => {
  if (!value) return null;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
};

/**
 * Backlog / sprint row with inline editors. Memoized; `onUpdate(task, patch)`
 * must be stable — the parent routes it through `updateTask` (and the
 * workflow guard for status changes).
 */
function TaskRow({
  task,
  onUpdate,
  onClick,
  statusOptions = [],
  teamMembers = [],
  readOnly = false,
  showArrow = false,
  onToggleSubtasks,
  isExpanded = false,
}) {
  const { id, title, description, status, storyPoint, dueDate, assignedTo, type, priority } = task;
  const typeInfo = TASK_TYPE_MAP[type] || TASK_TYPE_MAP.task;
  const priorityValue = (priority || "medium").toLowerCase();
  const statusLabel = statusOptions.find((option) => option.value === status)?.label || status;
  const update = (patch) => { if (!readOnly) onUpdate?.(task, patch); };

  return (
    <li className="py-3 flex items-center text-sm gap-6">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="font-medium text-slate-800 dark:text-slate-200 truncate flex items-center">
          {showArrow && (
            <button
              type="button"
              onClick={() => onToggleSubtasks?.(id)}
              className="mr-2 p-1 hover:bg-slate-100 dark:hover:bg-[#232838] rounded transition-colors"
              title={isExpanded ? "Hide subtasks" : "Show subtasks"}
            >
              <FaArrowRight
                className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          <span className={`mr-2 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${typeInfo.color}`}>
            <span className="text-base flex items-center justify-center w-full h-full">{typeInfo.icon}</span>
          </span>
          <span
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
            onClick={() => onClick?.(task)}
          >
            {title}
          </span>
          <span className="ml-3 text-xs text-slate-400 dark:text-slate-500 font-mono align-middle whitespace-nowrap">
            {taskKey(id)}
          </span>
          {status === "blocked" && task.blockReason && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 truncate" title={task.blockReason}>
              <FaBan className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
        {description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{description}</div>
        )}
      </div>

      <div className="flex items-center flex-shrink-0" style={{ minWidth: "520px" }}>
        {/* Status */}
        <div className="w-40 mr-4">
          <Listbox value={status} onChange={(nextStatus) => update({ status: nextStatus })} disabled={readOnly}>
            <div className="relative w-40">
              <Listbox.Button
                className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-left truncate ${STATUS_CHIP[status] || CUSTOM_STATUS_CHIP}`}
              >
                {statusLabel}
              </Listbox.Button>
              <Listbox.Options className={OPTIONS_PANEL}>
                {statusOptions.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-1.5 pl-3 pr-6 rounded-md font-bold border text-xs ${STATUS_CHIP[option.value] || CUSTOM_STATUS_CHIP} ${active ? "ring-2 ring-blue-300 dark:ring-blue-600" : ""}`
                    }
                  >
                    {option.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* Priority */}
        <div className="w-20 mr-4">
          <Listbox value={priorityValue} onChange={(nextPriority) => update({ priority: nextPriority })} disabled={readOnly}>
            <div className="relative w-full">
              <Listbox.Button
                className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-center ${PRIORITY_CHIP[priorityValue] || PRIORITY_CHIP.medium}`}
              >
                {priorityValue.toUpperCase()}
              </Listbox.Button>
              <Listbox.Options className={OPTIONS_PANEL}>
                {PRIORITIES.map((option) => (
                  <Listbox.Option
                    key={option}
                    value={option}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-1.5 pl-3 pr-3 rounded-md font-bold border text-xs transition-all ${PRIORITY_CHIP[option]} ${active ? "ring-2 ring-blue-300 dark:ring-blue-600" : ""}`
                    }
                  >
                    {option.toUpperCase()}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* Story Points */}
        <input
          type="number"
          min={0}
          aria-label="Story points"
          value={storyPoint ?? ""}
          disabled={readOnly}
          onChange={(event) => {
            const raw = event.target.value;
            update({ storyPoint: raw === "" ? "" : Math.max(0, Number(raw) || 0) });
          }}
          className="w-12 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-xs border border-slate-200 dark:border-[#2a3044] font-semibold ml-4 text-center focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 outline-none transition-all"
        />

        {/* Due Date */}
        <div className="ml-4">
          <ReactDatePicker
            selected={parseDueDate(dueDate)}
            onChange={(date) => update({ dueDate: date ? format(date, "yyyy-MM-dd") : "" })}
            dateFormat="dd.MM.yyyy"
            disabled={readOnly}
            className="w-32 px-2 py-0.5 rounded bg-slate-50 dark:bg-[#232838] text-slate-500 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#2a3044] text-center focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 outline-none transition-all"
            popperPlacement="bottom"
            placeholderText="Select date"
            showPopperArrow={false}
          />
        </div>

        {/* Assignee */}
        <div className="ml-4 w-24">
          <Listbox value={assignedTo || "unassigned"} onChange={(nextAssignee) => update({ assignedTo: nextAssignee })} disabled={readOnly}>
            <div className="relative w-24">
              <Listbox.Button className="w-full px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800 font-semibold text-left truncate">
                {assignedTo === "unassigned" || !assignedTo
                  ? "Unassigned"
                  : teamMembers.find((memberOption) => memberOption.value === assignedTo)?.label || assignedTo}
              </Listbox.Button>
              <Listbox.Options className={OPTIONS_PANEL}>
                {teamMembers.filter((memberOption) => memberOption.value).map((memberOption) => (
                  <Listbox.Option
                    key={memberOption.value}
                    value={memberOption.value}
                    className={({ active, selected }) =>
                      `relative cursor-pointer select-none py-1.5 pl-3 pr-3 rounded-md text-blue-700 dark:text-blue-300 ${
                        active ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      } ${selected ? "font-bold bg-blue-100 dark:bg-blue-900/40" : ""}`
                    }
                  >
                    {memberOption.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
      </div>
    </li>
  );
}

export default memo(TaskRow);
