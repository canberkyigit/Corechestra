import React from "react";
import { FaCheck, FaPlus, FaTimes } from "react-icons/fa";
import { getUserColor } from "../../utils/userColors";
import { TASK_PRIORITY_HEX } from "../../../../shared/constants/taskMeta";

const PRIORITY_LABELS = { critical: "Crit", high: "High", medium: "Med", low: "Low" };
const GRID = { gridTemplateColumns: "1fr 36px 30px 26px 54px 16px", gap: "6px" };

/** Inline subtask grid in the side panel's Details tab. */
export default function PanelSubtasksTable({
  subtasks,
  projectAssignees,
  users,
  readOnly,
  inlineSubOpen,
  setInlineSubOpen,
  inlineSubTitle,
  setInlineSubTitle,
  onAdd,
  onToggle,
  onUpdate,
  onRemove,
  onOpen,
}) {
  const completed = subtasks.filter((subtask) => subtask.done).length;
  const assigneeOptions = projectAssignees.filter((member) => member.value && member.value !== "unassigned");
  const closeInline = () => { setInlineSubOpen(false); setInlineSubTitle(""); };

  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subtasks</span>
        <div className="flex items-center gap-2">
          {subtasks.length > 0 && (
            <span className={`text-xs font-medium ${completed === subtasks.length ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
              {completed === subtasks.length ? "100% Done" : `${completed}/${subtasks.length}`}
            </span>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setInlineSubOpen(true)}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Add subtask"
            >
              <FaPlus className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {subtasks.length > 0 && (
        <div className="h-1 bg-slate-100 dark:bg-[#1a1f2e]">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${(completed / subtasks.length) * 100}%` }} />
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="grid px-3 py-1.5 bg-slate-50/50 dark:bg-[#1a1f2e]/50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#2a3044]" style={GRID}>
          <span>Work</span>
          <span>Pri</span>
          <span className="text-center">SP</span>
          <span />
          <span>Status</span>
          <span />
        </div>
      )}

      {subtasks.map((sub) => {
        const hasAssignee = sub.assignedTo && sub.assignedTo !== "unassigned";
        const assigneeLabel = hasAssignee
          ? (projectAssignees.find((member) => member.value === sub.assignedTo)?.label || sub.assignedTo)
          : "Unassigned";
        return (
          <div
            key={sub.id}
            className="grid items-center px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group"
            style={GRID}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => onToggle(sub.id)}
                disabled={readOnly}
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"
                }`}
              >
                {sub.done && <FaCheck className="w-2 h-2 text-white" />}
              </button>
              <button
                type="button"
                onClick={() => onOpen(sub)}
                className={`text-xs truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
              >
                {sub.title}
              </button>
            </div>

            <select
              value={sub.priority || "medium"}
              disabled={readOnly}
              onChange={(event) => onUpdate(sub.id, { priority: event.target.value })}
              className="w-full text-[10px] font-semibold bg-transparent border-0 focus:outline-none cursor-pointer appearance-none text-center rounded"
              style={{ color: TASK_PRIORITY_HEX[sub.priority || "medium"] }}
              title="Priority"
            >
              {Object.keys(PRIORITY_LABELS).map((priority) => (
                <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              disabled={readOnly}
              value={sub.storyPoint ?? ""}
              onChange={(event) => onUpdate(sub.id, { storyPoint: event.target.value === "" ? "" : Math.max(0, Number(event.target.value) || 0) })}
              className="w-full text-xs text-center border border-slate-200 dark:border-[#2a3044] rounded px-0.5 py-0.5 bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="–"
              title="Story Points"
            />

            <div className="flex justify-center">
              <select
                value={sub.assignedTo || "unassigned"}
                disabled={readOnly}
                onChange={(event) => onUpdate(sub.id, { assignedTo: event.target.value })}
                className="sr-only"
                id={`sub-asgn-${sub.id}`}
              >
                <option value="unassigned">–</option>
                {assigneeOptions.map((member) => (
                  <option key={member.value} value={member.value}>{member.label}</option>
                ))}
              </select>
              <label
                htmlFor={`sub-asgn-${sub.id}`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all flex-shrink-0"
                style={{ backgroundColor: getUserColor(sub.assignedTo, users) }}
                title={assigneeLabel}
              >
                {hasAssignee ? assigneeLabel.charAt(0).toUpperCase() : "–"}
              </label>
            </div>

            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium text-center leading-tight ${
              sub.done ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
            }`}>
              {sub.done ? "Done" : "To Do"}
            </span>

            {!readOnly ? (
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all justify-self-center"
                onClick={() => onRemove(sub.id)}
                title="Remove subtask"
              >
                <FaTimes className="w-2.5 h-2.5" />
              </button>
            ) : <span />}
          </div>
        );
      })}

      {readOnly ? null : inlineSubOpen ? (
        <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
          <input
            autoFocus
            className="flex-1 text-xs border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
            placeholder="Subtask title..."
            value={inlineSubTitle}
            onChange={(event) => setInlineSubTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
              if (event.key === "Escape") { event.preventDefault(); closeInline(); }
            }}
          />
          <button type="button" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" onClick={onAdd}>Add</button>
          <button type="button" className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600 dark:hover:text-slate-300" onClick={closeInline}>✕</button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
          onClick={() => setInlineSubOpen(true)}
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}
