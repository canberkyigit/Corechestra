import React from "react";
import { Listbox } from "@headlessui/react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format } from "date-fns";
import { FaArrowRight } from "react-icons/fa";
import { COLUMNS_DATA, STATUS_STYLES, TYPE_MAP } from "../../../shared/constants";
import { getPriorityColor } from "../../../shared/utils/helpers";
import { useApp } from "../../../shared/context/AppContext";

export default function TaskRow({
  task,
  setTasks,
  index,
  onClick,
  showArrow = false,
  onToggleSubtasks,
  isExpanded = false,
}) {
  const { teamMembers } = useApp();
  const { id, title, description, status, storyPoint, dueDate, assignedTo, type, priority } = task;
  const typeInfo = TYPE_MAP[type] || TYPE_MAP["task"];

  return (
    <li className="py-3 flex items-center text-sm gap-6">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="font-medium text-gray-800 truncate flex items-center">
          {showArrow && (
            <button
              onClick={() => onToggleSubtasks && onToggleSubtasks(id)}
              className="mr-2 p-1 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Hide subtasks" : "Show subtasks"}
            >
              <FaArrowRight
                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          <span className={`mr-2 flex items-center justify-center w-7 h-7 rounded-full ${typeInfo.color}`}>
            <span className="text-base flex items-center justify-center w-full h-full">{typeInfo.icon}</span>
          </span>
          <span
            className="cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onClick && onClick(task)}
          >
            {title}
          </span>
          <span className="ml-3 text-xs text-gray-400 font-mono align-middle whitespace-nowrap">
            CY-{typeof index === "number" ? index + 1 : "-"}
          </span>
        </div>
        {description && (
          <div className="text-xs text-gray-500 truncate mt-1">{description}</div>
        )}
      </div>

      <div className="flex items-center flex-shrink-0" style={{ minWidth: "520px" }}>
        {/* Status */}
        <div className="w-40 mr-4">
          <Listbox
            value={status}
            onChange={(newStatus) =>
              setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)))
            }
          >
            <div className="relative w-40">
              <Listbox.Button
                className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-left ${STATUS_STYLES[status]}`}
              >
                {COLUMNS_DATA.find((c) => c.id === status)?.title || status}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50 space-y-1">
                {COLUMNS_DATA.map((col) => (
                  <Listbox.Option
                    key={col.id}
                    value={col.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg font-bold border text-xs ${STATUS_STYLES[col.id]} ${active ? "ring-2 ring-blue-300" : ""} mb-1`
                    }
                  >
                    {col.title}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* Priority */}
        <div className="w-20 mr-4">
          <Listbox
            value={(priority || "medium").toLowerCase()}
            onChange={(newPriority) =>
              setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t)))
            }
          >
            <div className="relative w-full">
              <Listbox.Button
                className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-center ${getPriorityColor(priority)}`}
              >
                {(priority || "medium").toUpperCase()}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-2 text-xs shadow-2xl ring-1 ring-black/10 focus:outline-none z-50">
                {["critical", "high", "medium", "low"].map((opt) => (
                  <Listbox.Option
                    key={opt}
                    value={opt}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg font-bold border text-xs transition-all ${getPriorityColor(opt)} ${active ? "ring-2 ring-blue-300" : ""} mb-2`
                    }
                  >
                    {opt.toUpperCase()}
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
          value={storyPoint}
          onChange={(e) => {
            const val = Math.max(0, parseInt(e.target.value) || 0);
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, storyPoint: val } : t)));
          }}
          className="w-12 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200 font-semibold ml-4 text-center focus:ring-2 focus:ring-blue-300 outline-none transition-all"
        />

        {/* Due Date */}
        <div className="ml-4">
          <ReactDatePicker
            selected={dueDate ? parse(dueDate, "yyyy-MM-dd", new Date()) : null}
            onChange={(date) =>
              setTasks((prev) =>
                prev.map((t) => (t.id === id ? { ...t, dueDate: date ? format(date, "yyyy-MM-dd") : "" } : t))
              )
            }
            dateFormat="dd.MM.yyyy"
            className="w-32 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs border border-gray-200 text-center focus:ring-2 focus:ring-blue-300 outline-none transition-all"
            popperPlacement="bottom"
            placeholderText="Select date"
            showPopperArrow={false}
          />
        </div>

        {/* Assignee */}
        <div className="ml-4 w-24">
          <Listbox
            value={assignedTo}
            onChange={(newAssignedTo) =>
              setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo: newAssignedTo } : t)))
            }
          >
            <div className="relative w-24">
              <Listbox.Button className="w-full px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs border border-blue-200 font-semibold text-left">
                {assignedTo === "unassigned" || !assignedTo
                  ? "Unassigned"
                  : teamMembers.find((m) => m.value === assignedTo)?.label || assignedTo}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-xs shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                {teamMembers.filter((m) => m.value).map((member) => (
                  <Listbox.Option
                    key={member.value}
                    value={member.value}
                    className={({ active, selected }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg ${
                        active ? "bg-blue-50 text-blue-700" : "text-blue-700"
                      } ${selected ? "font-bold bg-blue-100" : ""}`
                    }
                  >
                    {member.label}
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
