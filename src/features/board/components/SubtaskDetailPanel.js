import React, { useState, useEffect } from "react";
import { Listbox } from "@headlessui/react";
import { FaTimes, FaChevronDown, FaArrowLeft } from "react-icons/fa";
import {
  TYPE_OPTIONS, SUBTASK_STATUS_OPTIONS as STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "../constants/taskOptions";
import { useApp } from "../../../shared/context/AppContext";

function MiniSelect({ value, options, onChange, renderValue, renderOption }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors focus:outline-none w-full">
          <span className="flex-1 text-left">{renderValue(value)}</span>
          <FaChevronDown className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
        </Listbox.Button>
        <Listbox.Options className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
          {options.map((opt) => (
            <Listbox.Option
              key={opt.value ?? opt}
              value={opt.value ?? opt}
              className={({ active }) =>
                `flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" : "text-slate-700 dark:text-slate-300"}`
              }
            >
              {renderOption ? renderOption(opt) : (opt.label ?? opt)}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}

function FieldLabel({ children }) {
  return <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{children}</div>;
}

export default function SubtaskDetailPanel({ subtask, parentTask, open, onClose, onSave, panelWidth = 480 }) {
  const { teamMembers } = useApp();
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("todo");
  const [priority,    setPriority]    = useState("medium");
  const [assignedTo,  setAssignedTo]  = useState("unassigned");
  const [storyPoint,  setStoryPoint]  = useState("");
  const [type,        setType]        = useState("task");
  const [hasChanges,  setHasChanges]  = useState(false);

  useEffect(() => {
    if (!subtask) return;
    setTitle(subtask.title || "");
    setDescription(subtask.description || "");
    setStatus(subtask.status || (subtask.done ? "done" : "todo"));
    setPriority((subtask.priority || "medium").toLowerCase());
    setAssignedTo(subtask.assignedTo || "unassigned");
    setStoryPoint(subtask.storyPoint ?? "");
    setType(subtask.type || "task");
    setHasChanges(false);
  }, [subtask]);

  if (!open || !subtask) return null;

  const changed = () => setHasChanges(true);

  const handleSave = () => {
    onSave({
      ...subtask,
      title,
      description,
      status,
      priority,
      assignedTo,
      storyPoint: storyPoint !== "" ? Number(storyPoint) : undefined,
      type,
      done: status === "done",
    });
    setHasChanges(false);
  };

  const currentStatus  = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
  const currentType    = TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];
  const TypeIcon       = currentType.icon;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-[#1c2030] animate-slide-in-right"
      style={{ borderLeft: "1px solid rgba(148,163,184,0.15)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-[#232838] flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex-shrink-0"
          title="Back to parent task"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs text-slate-400 truncate max-w-[120px]">{parentTask?.title}</span>
          <span className="text-xs text-slate-300 dark:text-slate-600 flex-shrink-0">/</span>
          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 dark:bg-white/10 ${currentType.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")}`}>
            <TypeIcon className={`w-3 h-3 ${currentType.color}`} />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">Subtask</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] rounded transition-colors flex-shrink-0"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-[#232838] flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
        <MiniSelect
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => { setStatus(v); changed(); }}
          renderValue={() => <span className="text-slate-500 dark:text-slate-400">Change status</span>}
          renderOption={(opt) => opt.label}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className="w-full text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
            value={title}
            onChange={(e) => { setTitle(e.target.value); changed(); }}
            placeholder="Subtask title…"
          />
        </div>

        {/* Quick fields grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Priority</FieldLabel>
            <MiniSelect
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={(v) => { setPriority(v); changed(); }}
              renderValue={(v) => { const o = PRIORITY_OPTIONS.find((p) => p.value === v); return o ? <span className={o.color}>{o.label}</span> : v; }}
              renderOption={(opt) => <span className={opt.color}>{opt.label}</span>}
            />
          </div>
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <MiniSelect
              value={assignedTo}
              options={teamMembers.filter(m => m.value !== "").map(m => ({ value: m.value, label: m.label }))}
              onChange={(v) => { setAssignedTo(v); changed(); }}
              renderValue={(v) => <span className="capitalize">{v}</span>}
              renderOption={(opt) => <span className="capitalize">{opt.label}</span>}
            />
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <MiniSelect
              value={type}
              options={TYPE_OPTIONS}
              onChange={(v) => { setType(v); changed(); }}
              renderValue={(v) => {
                const o = TYPE_OPTIONS.find((t) => t.value === v);
                if (!o) return v;
                const I = o.icon;
                return <span className="flex items-center gap-1"><I className={`w-3 h-3 ${o.color}`} />{o.label}</span>;
              }}
              renderOption={(opt) => { const I = opt.icon; return <><I className={`w-3 h-3 flex-shrink-0 ${opt.color}`} />{opt.label}</>; }}
            />
          </div>
          <div>
            <FieldLabel>Story Points</FieldLabel>
            <input
              type="number"
              min="0"
              className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="–"
              value={storyPoint}
              onChange={(e) => { setStoryPoint(e.target.value); changed(); }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#232838] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
            rows={5}
            placeholder="Add a description…"
            value={description}
            onChange={(e) => { setDescription(e.target.value); changed(); }}
          />
        </div>
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 dark:border-[#232838] flex-shrink-0">
          <button
            onClick={() => { onClose(); }}
            className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
