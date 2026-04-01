import React from "react";
import { Listbox } from "@headlessui/react";
import { FaCheck, FaChevronDown, FaLink, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";
import { getEntityTypeMeta } from "../../../../shared/constants/entityMeta";
import CommentSection from "../../../docs/components/CommentSection";
import { format, parseISO } from "date-fns";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS } from "../../constants/taskOptions";
import { AppButton } from "../../../../shared/components/AppPrimitives";

export const LINK_RELATIONSHIPS = [
  "relates to", "blocks", "is blocked by", "duplicates", "is duplicated by", "clones", "is cloned by",
];

export function FieldLabel({ children }) {
  return <div className="app-kicker mb-1.5">{children}</div>;
}

export function SelectField({ label, value, options, onChange, renderOption, renderValue }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="app-field w-full flex items-center justify-between text-sm hover:bg-slate-100 dark:hover:bg-[#2a3044]">
            <span>{renderValue ? renderValue(value) : value}</span>
            <FaChevronDown className="w-3 h-3 text-slate-400" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1c2030] rounded-lg shadow-lg border border-slate-200 dark:border-[#2a3044] py-1 max-h-48 overflow-auto">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value ?? opt}
                value={opt.value ?? opt}
                className={({ active, selected }) =>
                  `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" : "text-slate-700 dark:text-slate-300"} ${selected ? "font-semibold" : ""}`
                }
              >
                {renderOption ? renderOption(opt) : (opt.label ?? opt)}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}

export function ActivityLog({ task }) {
  const entries = task?.activityLog || [];
  if (entries.length === 0) {
    return <div className="text-xs text-slate-400 text-center py-6">No activity yet</div>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-2.5 items-start">
          <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
            {entry.user?.charAt(0) || "?"}
          </div>
          <div>
            <span className="text-xs text-slate-700 font-medium">{entry.user}</span>{" "}
            <span className="text-xs text-slate-500">{entry.action}</span>
            <div className="text-xs text-slate-400">
              {entry.timestamp ? (() => { try { return format(parseISO(entry.timestamp), "MMM d, HH:mm"); } catch { return ""; } })() : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskSidebar({
  status,
  setStatus,
  priority,
  setPriority,
  type,
  setType,
  projectAssignees,
  assignedTo,
  setAssignedTo,
  dueDate,
  setDueDate,
  storyPoint,
  setStoryPoint,
  isCreate,
  sprintOptions,
  selectedSprint,
  setSelectedSprint,
  sprint,
  fmtDate,
  task,
  changed,
}) {
  return (
    <div className="w-full md:w-56 flex-shrink-0 border-t md:border-t-0 md:border-l app-divider p-4 md:p-5 space-y-4 bg-slate-50/60 dark:bg-[#171b28]/60">
      <SelectField
        label="Status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(value) => { setStatus(value); changed(); }}
        renderValue={(value) => STATUS_OPTIONS.find((option) => option.value === value)?.label || value}
        renderOption={(option) => option.label}
      />

      <SelectField
        label="Priority"
        value={priority}
        options={PRIORITY_OPTIONS}
        onChange={(value) => { setPriority(value); changed(); }}
        renderValue={(value) => {
          const option = PRIORITY_OPTIONS.find((item) => item.value === value);
          return option ? <span className={option.color}>{option.label}</span> : value;
        }}
        renderOption={(option) => <span className={option.color}>{option.label}</span>}
      />

      <SelectField
        label="Type"
        value={type}
        options={TYPE_OPTIONS}
        onChange={(value) => { setType(value); changed(); }}
        renderValue={(value) => {
          const option = TYPE_OPTIONS.find((item) => item.value === value);
          if (!option) return value;
          const Icon = option.icon;
          return <span className="flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${option.color}`} />{option.label}</span>;
        }}
        renderOption={(option) => {
          const Icon = option.icon;
          return <><Icon className={`w-3.5 h-3.5 flex-shrink-0 ${option.color}`} />{option.label}</>;
        }}
      />

      <SelectField
        label="Assignee"
        value={assignedTo}
        options={projectAssignees.map((member) => ({ value: member.value, label: member.label }))}
        onChange={(value) => { setAssignedTo(value); changed(); }}
        renderValue={(value) => <span>{projectAssignees.find((member) => member.value === value)?.label || value}</span>}
        renderOption={(option) => <span>{option.label}</span>}
      />

      <div>
        <FieldLabel>Due Date</FieldLabel>
        <input
          type="date"
          className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 dark:bg-[#232838]"
          value={dueDate}
          onChange={(event) => { setDueDate(event.target.value); changed(); }}
        />
      </div>

      <div>
        <FieldLabel>Story Points</FieldLabel>
        <input
          type="number"
          min="0"
          className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 dark:bg-[#232838]"
          placeholder="0"
          value={storyPoint}
          onChange={(event) => { setStoryPoint(event.target.value); changed(); }}
        />
      </div>

      {isCreate && sprintOptions.length > 0 && (
        <div>
          <FieldLabel>Sprint</FieldLabel>
          <Listbox value={selectedSprint} onChange={setSelectedSprint}>
            <div className="relative">
          <Listbox.Button className="app-field w-full flex items-center justify-between text-sm">
                <span className="truncate">{selectedSprint?.label || "Select sprint"}</span>
                <FaChevronDown className="w-3 h-3 text-slate-400" />
              </Listbox.Button>
              <Listbox.Options className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-40 overflow-auto">
                {sprintOptions.map((option) => (
                  <Listbox.Option key={option.value} value={option} className={({ active }) => `px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
                    {option.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
          {selectedSprint?.value === "active" && sprint?.startDate && (
            <div className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#232838] border border-slate-100 dark:border-[#2a3044] rounded px-2 py-1">
              {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
            </div>
          )}
        </div>
      )}

      {!isCreate && task?.createdSprintStart && (
        <div>
          <FieldLabel>Created in Sprint</FieldLabel>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#232838] border border-slate-100 dark:border-[#2a3044] rounded-lg px-2.5 py-2 space-y-0.5">
            {task.createdSprintName && <div className="font-medium text-slate-600 dark:text-slate-300 text-xs">{task.createdSprintName}</div>}
            <div>{fmtDate(task.createdSprintStart)} → {fmtDate(task.createdSprintEnd)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskSubtasksSection({
  subtasks,
  completedSubs,
  inlineSubOpen,
  setInlineSubOpen,
  inlineSubTitle,
  setInlineSubTitle,
  addInlineSub,
  toggleSubtask,
  updateSubtask,
  setOpenSubtask,
  changed,
  setSubtasks,
  projectAssignees,
}) {
  const priColors = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
  const priLabels = { critical: "Crit", high: "High", medium: "Med", low: "Low" };
  const assigneeColors = { alice: "#3b82f6", bob: "#7c3aed", carol: "#10b981", dave: "#f59e0b" };

  return (
    <div className="p-5">
      {subtasks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
            <span>{completedSubs}/{subtasks.length} done</span>
            <span>{Math.round((completedSubs / subtasks.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completedSubs / subtasks.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subtasks</span>
          <button onClick={() => setInlineSubOpen(true)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors">
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        </div>

        {subtasks.length > 0 && (
          <div className="grid px-3 py-1.5 bg-slate-50/50 dark:bg-[#1a1f2e]/50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#2a3044]" style={{ gridTemplateColumns: "1fr 42px 36px 30px 60px 18px", gap: "6px" }}>
            <span>Work</span><span>Pri</span><span className="text-center">SP</span><span /><span>Status</span><span />
          </div>
        )}

        {subtasks.map((subtask) => (
          <div key={subtask.id} className="grid items-center px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group" style={{ gridTemplateColumns: "1fr 42px 36px 30px 60px 18px", gap: "6px" }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <button onClick={() => toggleSubtask(subtask.id)} className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${subtask.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"}`}>
                {subtask.done && <FaCheck className="w-2.5 h-2.5 text-white" />}
              </button>
              <button onClick={() => setOpenSubtask(subtask)} className={`text-sm truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${subtask.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{subtask.title}</button>
            </div>
              <select value={subtask.priority || "medium"} onChange={(event) => updateSubtask(subtask.id, { priority: event.target.value })} className="w-full text-xs font-semibold bg-transparent border-0 focus:outline-none cursor-pointer appearance-none text-center" style={{ color: priColors[subtask.priority || "medium"] }} title="Priority">
              {["critical", "high", "medium", "low"].map((priority) => <option key={priority} value={priority}>{priLabels[priority]}</option>)}
            </select>
            <input type="number" min="0" value={subtask.storyPoint ?? ""} onChange={(event) => updateSubtask(subtask.id, { storyPoint: event.target.value })} className="w-full text-xs text-center border border-slate-200 dark:border-[#2a3044] rounded px-0.5 py-0.5 bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="–" title="Story Points" />
            <div className="flex justify-center">
              <select value={subtask.assignedTo || "unassigned"} onChange={(event) => updateSubtask(subtask.id, { assignedTo: event.target.value })} className="sr-only" id={`modal-sub-asgn-${subtask.id}`}>
                <option value="unassigned">–</option>
                {projectAssignees.filter((member) => member.value && member.value !== "unassigned").map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}
              </select>
              <label htmlFor={`modal-sub-asgn-${subtask.id}`} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all" style={{ backgroundColor: assigneeColors[subtask.assignedTo] || "#94a3b8" }} title={subtask.assignedTo && subtask.assignedTo !== "unassigned" ? (projectAssignees.find((member) => member.value === subtask.assignedTo)?.label || subtask.assignedTo) : "Unassigned"}>
                {subtask.assignedTo && subtask.assignedTo !== "unassigned" ? (projectAssignees.find((member) => member.value === subtask.assignedTo)?.label || subtask.assignedTo).charAt(0).toUpperCase() : "–"}
              </label>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium text-center leading-tight ${subtask.done ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"}`}>
              {subtask.done ? "Done" : "To Do"}
            </span>
            <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all justify-self-center" onClick={() => { setSubtasks((prev) => prev.filter((entry) => entry.id !== subtask.id)); changed(); }}>
              <FaTimes className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {inlineSubOpen ? (
          <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
            <input
              autoFocus
              className="flex-1 text-sm border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
              placeholder="Subtask title..."
              value={inlineSubTitle}
              onChange={(event) => setInlineSubTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") addInlineSub(); if (event.key === "Escape") { setInlineSubOpen(false); setInlineSubTitle(""); } }}
            />
            <AppButton size="sm" onClick={addInlineSub}>Add</AppButton>
            <AppButton size="sm" variant="ghost" onClick={() => { setInlineSubOpen(false); setInlineSubTitle(""); }}>✕</AppButton>
          </div>
        ) : (
          <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]" onClick={() => setInlineSubOpen(true)}>
            + Add subtask
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskLinksSection({
  linkedItems,
  linkSearchOpen,
  setLinkSearchOpen,
  linkRelationship,
  setLinkRelationship,
  linkSearch,
  setLinkSearch,
  linkSearchResults,
  handleAddLink,
  linkedByRelationship,
  handleRemoveLink,
}) {
  return (
    <div className="p-5">
      <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
          <div className="flex items-center gap-1.5">
            <FaLink className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Linked Items</span>
            {linkedItems.length > 0 && <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{linkedItems.length}</span>}
          </div>
          <button onClick={() => setLinkSearchOpen((prev) => !prev)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors" title="Link a task">
            <FaPlus className="w-2.5 h-2.5" />
          </button>
        </div>

        {linkSearchOpen && (
          <div className="p-2.5 border-b border-slate-100 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 flex-shrink-0">Link type:</span>
              <select className="flex-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400" value={linkRelationship} onChange={(event) => setLinkRelationship(event.target.value)}>
                {LINK_RELATIONSHIPS.map((relationship) => <option key={relationship} value={relationship}>{relationship}</option>)}
              </select>
            </div>
            <div className="relative">
              <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
              <input
                autoFocus
                className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                placeholder="Search tasks, docs, releases, or tests..."
                value={linkSearch}
                onChange={(event) => setLinkSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") { setLinkSearchOpen(false); setLinkSearch(""); } }}
              />
            </div>
            {linkSearchResults.length > 0 && (
              <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] divide-y divide-slate-100 dark:divide-[#2a3044] max-h-44 overflow-y-auto">
                {linkSearchResults.map((entity) => {
                  const entityMeta = getEntityTypeMeta(entity.type);
                  const EntityIcon = entityMeta.icon;
                  return (
                    <button
                      key={`${entity.type}-${entity.id}`}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                      onClick={() => handleAddLink(entity)}
                    >
                      <EntityIcon className={`w-3 h-3 flex-shrink-0 ${entityMeta.color}`} />
                      <span className={`${entityMeta.badgeClass} text-[10px] flex-shrink-0`}>
                        {entityMeta.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0">{entity.key || taskKey(entity.id)}</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{entity.title}</span>
                      {entity.subtitle && (
                        <span className="hidden md:inline text-[11px] text-slate-400 truncate max-w-32">{entity.subtitle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {linkSearch.trim() && linkSearchResults.length === 0 && <div className="text-xs text-slate-400 text-center py-2">No matching entities found</div>}
            <button className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => { setLinkSearchOpen(false); setLinkSearch(""); }}>Cancel</button>
          </div>
        )}

        {Object.keys(linkedByRelationship).length > 0 ? (
          <div>
            {Object.entries(linkedByRelationship).map(([relationship, items]) => (
              <div key={relationship}>
                <div className="px-3 py-1.5 text-xs text-slate-400 italic border-b border-slate-50 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#1a1f2e]/30">{relationship}</div>
                {items.map(({ id: linkId, linkedEntity }) => {
                  const entityMeta = getEntityTypeMeta(linkedEntity.type);
                  const EntityIcon = entityMeta.icon;
                  return (
                    <div key={linkId} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
                      <EntityIcon className={`w-3.5 h-3.5 flex-shrink-0 ${entityMeta.color}`} />
                      <span className={`${entityMeta.badgeClass} text-[10px] flex-shrink-0`}>
                        {entityMeta.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0">{linkedEntity.key || taskKey(linkedEntity.id)}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{linkedEntity.title}</span>
                      {linkedEntity.subtitle && (
                        <span className="hidden md:inline text-[11px] text-slate-400 truncate max-w-28">{linkedEntity.subtitle}</span>
                      )}
                      <button className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all" onClick={() => handleRemoveLink(linkId)} title="Unlink">
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          !linkSearchOpen && <button className="w-full text-left px-3 py-3 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors" onClick={() => setLinkSearchOpen(true)}>+ Link a related task, doc, release, or test item</button>
        )}
      </div>
    </div>
  );
}

export function TaskInlineComments({ task, allTasks, buildUpdated, onTaskUpdate }) {
  return (
    <div>
      <FieldLabel>Comments</FieldLabel>
      <CommentSection
        key={task.id}
        savedComments={task.comments || []}
        allTasks={allTasks}
        taskTitle={task.title}
        taskId={task.id}
        onUpdate={(newComments) => onTaskUpdate?.({ ...buildUpdated(), comments: newComments })}
      />
    </div>
  );
}
