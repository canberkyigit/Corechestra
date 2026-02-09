import React, { useState, useEffect } from "react";
import { FaBug, FaExclamationCircle, FaUser, FaSearch, FaCheckSquare, FaPlusSquare, FaChevronDown, FaChevronUp, FaBars } from "react-icons/fa";
import { parse, format, isValid } from "date-fns";

const priorityColors = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-orange-400",
  critical: "bg-red-500",
  Low: "bg-green-400",
  Medium: "bg-yellow-400",
  High: "bg-orange-400",
  Critical: "bg-red-500",
};

const typeMap = {
  bug: { label: "Bug", color: "bg-red-100 text-red-700", icon: <FaBug className="inline mr-1" /> },
  defect: { label: "Defect", color: "bg-orange-100 text-orange-700", icon: <FaExclamationCircle className="inline mr-1" /> },
  userstory: { label: "User Story", color: "bg-blue-100 text-blue-700", icon: <FaUser className="inline mr-1" /> },
  investigation: { label: "Investigation", color: "bg-purple-100 text-purple-700", icon: <FaSearch className="inline mr-1" /> },
  task: { label: "Task", color: "bg-green-100 text-green-700", icon: <FaCheckSquare className="inline mr-1" /> },
  feature: { label: "Feature", color: "bg-cyan-100 text-cyan-700", icon: <FaPlusSquare className="inline mr-1" /> },
};

export default function TaskCard({ task, allBadgesOpen, priorityColorsOpen, taskIdsOpen, subtaskButtonsOpen, onClick }) {
  // Dummy: taskType ekliyorum, gerçek veriyle entegre edilebilir
  const taskType = task.type || "bug";
  const typeInfo = typeMap[taskType] || typeMap["task"];
  const [badgesOpen, setBadgesOpen] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(false);

  useEffect(() => {
    if (typeof allBadgesOpen === 'boolean') setBadgesOpen(allBadgesOpen);
  }, [allBadgesOpen]);

  return (
    <div className="relative flex flex-col items-stretch">
      <div
        className="relative bg-gray-50 rounded-t shadow p-4 border border-gray-200 flex flex-col gap-1 z-10 cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={e => {
          // Badge toggle veya subtask butonuna tıklanmadıysa onClick'i çağır
          if (e.target.closest('button')) return;
          if (onClick) onClick();
        }}
      >
        {/* Priority renk şeridi */}
        {priorityColorsOpen && (
          <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l ${priorityColors[task.priority]}`}></div>
        )}
        {/* Göz ikonu üst ortada, yarısı dışarıda */}
        {subtaskButtonsOpen && (
          <button
            className="absolute left-1/2 -top-3 z-20 -translate-x-1/2 bg-white border border-gray-300 shadow rounded-full p-1 flex items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition-all"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)' }}
            onClick={() => setShowSubtasks(v => !v)}
            aria-label={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
            title={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
            type="button"
          >
            <FaBars className={`w-4 h-4 ${showSubtasks ? 'text-blue-500' : 'text-gray-400'}`} />
          </button>
        )}
        <div className="font-medium text-gray-800 text-center w-full">{task.title}</div>
        <div className="text-xs text-gray-500">{task.description}</div>
        {taskIdsOpen && (
          <div className="mt-1">
            <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs border border-gray-300 font-mono font-semibold block w-fit">
              CY-{typeof task.index === 'number' ? task.index + 1 : '-'}
            </span>
          </div>
        )}
      </div>
      <div className="w-[90%] mx-auto mb-2">
        <div
          className={`transition-all duration-300 overflow-hidden ${badgesOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
          style={{ willChange: 'max-height, opacity' }}
        >
          <div className="flex flex-col w-full">
            {/* Due Date Badge */}
            <span className="block w-full px-2 py-1 bg-gray-100 text-gray-500 text-xs border-x border-b border-gray-200 text-center shadow-sm rounded-t-md">
              {task.dueDate ? (() => {
                const dateObj = typeof task.dueDate === 'string'
                  ? parse(task.dueDate, 'yyyy-MM-dd', new Date())
                  : task.dueDate;
                return isValid(dateObj) ? format(dateObj, 'dd.MM.yyyy') : "-";
              })() : "-"}
            </span>
            {/* Task Type Badge */}
            <span className={`block w-full px-2 py-1 ${typeInfo.color} text-xs border-x border-b border-gray-200 text-center shadow-sm rounded-none`} style={{borderTop: 'none'}}>
              {typeInfo.icon}{typeInfo.label}
            </span>
            {/* Assigned User Badge */}
            <span className="block w-full px-2 py-1 bg-blue-100 text-blue-700 text-xs border-x border-b border-blue-200 text-center shadow-sm rounded-b-md rounded-t-none" style={{borderTop: 'none'}}>
              {task.assignedTo ? (task.assignedTo.charAt(0).toUpperCase() + task.assignedTo.slice(1)) : 'Unassigned'}
            </span>
          </div>
        </div>
        <button
          className="flex items-center justify-center w-full mt-1 p-1 rounded hover:bg-gray-100 transition-colors"
          onClick={() => setBadgesOpen((v) => !v)}
          aria-label={badgesOpen ? 'Badgeleri gizle' : 'Badgeleri göster'}
          type="button"
        >
          {badgesOpen ? (
            <FaChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <FaChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {/* Subtasklar badge'lerin hemen altında, sadece showSubtasks true ise */}
        {showSubtasks && (
          <div className="flex flex-col w-full mt-1 gap-0.5">
            {task.subtasks && task.subtasks.map((sub, i) => (
              <span key={sub.id} className={`block w-full px-2 py-1 text-xs border-x border-b border-gray-200 text-left shadow-sm ${sub.done ? 'bg-green-50 text-green-700 line-through' : 'bg-gray-50 text-gray-700'} ${i === 0 ? 'rounded-t-md' : ''} ${i === task.subtasks.length-1 ? 'rounded-b-md' : ''}`}>
                {sub.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 