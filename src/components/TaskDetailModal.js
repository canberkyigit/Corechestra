import React, { useState, useEffect, useRef } from "react";
import { Listbox } from "@headlessui/react";
import {
  FaTimes, FaTrash, FaCheck, FaPlus, FaChevronDown,
  FaBug, FaExclamationCircle, FaUser, FaSearch, FaCheckSquare,
  FaPlusSquare, FaRocket, FaFlag, FaPlay, FaRegDotCircle,
  FaEye, FaEyeSlash, FaClock, FaTag,
  FaComment, FaCompress,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { format, parseISO } from "date-fns";

const TYPE_OPTIONS = [
  { value: "task", label: "Task", icon: FaCheckSquare, color: "text-green-500" },
  { value: "bug", label: "Bug", icon: FaBug, color: "text-red-500" },
  { value: "feature", label: "Feature", icon: FaPlusSquare, color: "text-cyan-500" },
  { value: "defect", label: "Defect", icon: FaExclamationCircle, color: "text-orange-500" },
  { value: "userstory", label: "User Story", icon: FaUser, color: "text-blue-500" },
  { value: "investigation", label: "Investigation", icon: FaSearch, color: "text-purple-500" },
  { value: "epic", label: "Epic", icon: FaRocket, color: "text-violet-500" },
  { value: "test", label: "Test", icon: FaSearch, color: "text-teal-500" },
  { value: "testset", label: "Test Set", icon: FaFlag, color: "text-indigo-500" },
  { value: "testexecution", label: "Test Execution", icon: FaPlay, color: "text-lime-600" },
  { value: "precondition", label: "Precondition", icon: FaRegDotCircle, color: "text-sky-500" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "awaiting", label: "Awaiting Customer" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-green-500" },
];

const ASSIGNEE_LIST = ["alice", "bob", "carol", "dave", "unassigned"];

function FieldLabel({ children }) {
  return <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{children}</div>;
}

function SelectField({ label, value, options, onChange, renderOption, renderValue }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
            <span>{renderValue ? renderValue(value) : value}</span>
            <FaChevronDown className="w-3 h-3 text-slate-400" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-48 overflow-auto">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value ?? opt}
                value={opt.value ?? opt}
                className={({ active, selected }) =>
                  `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"} ${selected ? "font-semibold" : ""}`
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

function CommentBox({ taskId }) {
  const { logActivity } = useApp();
  const [text, setText] = useState("");
  const [comments, setComments] = useState([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentions(true);
    } else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\w*$/)) {
      setMentionSearch(val.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name) => {
    const lastAt = text.lastIndexOf("@");
    setText(text.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
  };

  const submit = () => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), text, user: "You", timestamp: new Date().toISOString() };
    setComments((prev) => [entry, ...prev]);
    logActivity(taskId, "commented");
    setText("");
  };

  const filteredMembers = ASSIGNEE_LIST.filter(
    (m) => m !== "unassigned" && m.includes(mentionSearch.toLowerCase())
  );

  return (
    <div>
      <div className="relative">
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
          rows={3}
          placeholder="Add a comment... (use @ to mention)"
          value={text}
          onChange={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); submit(); }
          }}
        />
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute z-20 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 py-1 left-0 min-w-32">
            {filteredMembers.map((m) => (
              <button
                key={m}
                className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-blue-50 capitalize"
                onClick={() => insertMention(m)}
              >
                @{m}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-xs text-slate-400">Ctrl+Enter to submit</span>
        <button
          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          onClick={submit}
        >
          <FaComment className="inline w-3 h-3 mr-1" /> Comment
        </button>
      </div>
      {comments.length > 0 && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.user.charAt(0)}
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-700">{c.user}</span>
                  <span className="text-xs text-slate-400">
                    {(() => { try { return format(parseISO(c.timestamp), "MMM d, HH:mm"); } catch { return ""; } })()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityLog({ task }) {
  const entries = task?.activityLog || [];
  if (entries.length === 0) {
    return <div className="text-xs text-slate-400 text-center py-6">No activity yet</div>;
  }
  return (
    <div className="space-y-2.5">
      {entries.map((e) => (
        <div key={e.id} className="flex gap-2.5 items-start">
          <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
            {e.user?.charAt(0) || "?"}
          </div>
          <div>
            <span className="text-xs text-slate-700 font-medium">{e.user}</span>{" "}
            <span className="text-xs text-slate-500">{e.action}</span>
            <div className="text-xs text-slate-400">
              {e.timestamp ? (() => { try { return format(parseISO(e.timestamp), "MMM d, HH:mm"); } catch { return ""; } })() : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TaskDetailModal({
  open,
  onClose,
  task,
  onTaskUpdate,
  allTasks = [],
  isCreate = false,
  sprintOptions = [],
  selectedSprint,
  setSelectedSprint,
  statusOptions,
  onOpenPanel,
}) {
  const { epics, labels, deleteTask, logActivity } = useApp();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("task");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [dueDate, setDueDate] = useState("");
  const [storyPoint, setStoryPoint] = useState("");
  const [epicId, setEpicId] = useState(null);
  const [taskLabels, setTaskLabels] = useState([]);
  const [timeEstimate, setTimeEstimate] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [watchers, setWatchers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const prevTaskId = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!task || task.id === prevTaskId.current) return;
    prevTaskId.current = task.id ?? null;
    setTitle(task.title || "");
    setDescription(task.description || "");
    setType(task.type || "task");
    setStatus(task.status || "todo");
    setPriority((task.priority || "medium").toLowerCase());
    setAssignedTo(task.assignedTo || "unassigned");
    setDueDate(task.dueDate || "");
    setStoryPoint(task.storyPoint ?? task.storyPoints ?? "");
    setEpicId(task.epicId || null);
    setTaskLabels(task.labels || []);
    setTimeEstimate(task.timeEstimate || 0);
    setTimeSpent(task.timeSpent || 0);
    setWatchers(task.watchers || []);
    setSubtasks(task.subtasks || []);
    setHasChanges(false);
    setActiveTab("details");
    setConfirmDelete(false);
  }, [open, task]);

  if (!open || !task) return null;

  const changed = () => setHasChanges(true);

  const buildUpdated = () => ({
    ...task,
    title,
    description,
    type,
    status,
    priority,
    assignedTo,
    dueDate,
    storyPoint: storyPoint !== "" ? Number(storyPoint) : undefined,
    epicId,
    labels: taskLabels,
    timeEstimate: Number(timeEstimate) || 0,
    timeSpent: Number(timeSpent) || 0,
    watchers,
    subtasks,
  });

  const handleSave = () => {
    if (!title.trim()) return;
    const updated = buildUpdated();
    if (onTaskUpdate) onTaskUpdate(updated);
    if (!isCreate && task.id) logActivity(task.id, "updated task");
    setHasChanges(false);
    if (isCreate) onClose();
  };

  const handleDelete = () => {
    if (task.id) deleteTask(task.id);
    onClose();
  };

  const toggleLabel = (id) => {
    setTaskLabels((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
    changed();
  };

  const toggleWatcher = (name) => {
    setWatchers((prev) => prev.includes(name) ? prev.filter((w) => w !== name) : [...prev, name]);
    changed();
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [...prev, { id: Date.now(), title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle("");
    changed();
  };

  const toggleSubtask = (id) => {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, done: !s.done } : s));
    changed();
  };

  const typeInfo = TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];
  const TypeIcon = typeInfo.icon;

  const currentEpic = epics.find((e) => e.id === epicId);

  const tabs = [
    { id: "details", label: "Details" },
    { id: "subtasks", label: `Subtasks (${subtasks.length})` },
    { id: "comments", label: "Comments" },
    { id: "activity", label: "Activity" },
    { id: "time", label: "Time" },
  ];

  const completedSubs = subtasks.filter((s) => s.done).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-[#232838] flex-shrink-0">
          <div className={`flex items-center justify-center w-7 h-7 rounded flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")}`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          {!isCreate && task?.id && (
            <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
              CY-{task.id}
            </span>
          )}
          <input
            className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none placeholder-slate-300 focus:ring-0"
            placeholder="Task title..."
            value={title}
            onChange={(e) => { setTitle(e.target.value); changed(); }}
          />
          <div className="flex items-center gap-1 ml-auto">
            {!isCreate && onOpenPanel && (
              <button
                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                onClick={() => onOpenPanel(buildUpdated())}
                title="Collapse to side panel"
              >
                <FaCompress className="w-3.5 h-3.5" />
              </button>
            )}
            {!isCreate && (
              <button
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => setConfirmDelete(true)}
                title="Delete task"
              >
                <FaTrash className="w-3.5 h-3.5" />
              </button>
            )}
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" onClick={onClose}>
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-red-700">Delete this task permanently?</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700" onClick={handleDelete}>Delete</button>
              <button className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 dark:border-[#232838] px-5 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors mr-1 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" && (
            <div className="flex gap-0 min-h-0">
              {/* Main */}
              <div className="flex-1 p-5 space-y-4 min-w-0">
                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
                    rows={4}
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); changed(); }}
                  />
                </div>

                {/* Labels */}
                <div>
                  <FieldLabel>Labels</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                          taskLabels.includes(label.id) ? "opacity-100 shadow-sm" : "opacity-40 hover:opacity-70"
                        }`}
                        style={{
                          backgroundColor: taskLabels.includes(label.id) ? label.color + "22" : "transparent",
                          color: label.color,
                          borderColor: label.color + "66",
                        }}
                      >
                        <FaTag className="inline w-2.5 h-2.5 mr-1" />
                        {label.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Epic */}
                <div>
                  <FieldLabel>Epic</FieldLabel>
                  <Listbox value={epicId} onChange={(v) => { setEpicId(v); changed(); }}>
                    <div className="relative">
                      <Listbox.Button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
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
                      <Listbox.Options className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-40 overflow-auto min-w-40">
                        <Listbox.Option value={null} className={({ active }) => `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50" : ""} text-slate-500`}>
                          No Epic
                        </Listbox.Option>
                        {epics.map((e) => (
                          <Listbox.Option key={e.id} value={e.id}
                            className={({ active }) => `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50" : ""}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                            <span className="text-slate-700">{e.title}</span>
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>
                </div>

                {/* Watchers */}
                <div>
                  <FieldLabel>Watchers</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {ASSIGNEE_LIST.filter((a) => a !== "unassigned").map((name) => (
                      <button
                        key={name}
                        onClick={() => toggleWatcher(name)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all ${
                          watchers.includes(name)
                            ? "bg-blue-50 border-blue-300 text-blue-600"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {watchers.includes(name) ? <FaEye className="w-3 h-3" /> : <FaEyeSlash className="w-3 h-3" />}
                        <span className="capitalize">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-52 flex-shrink-0 border-l border-slate-100 p-4 space-y-4">
                <SelectField
                  label="Status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(v) => { setStatus(v); changed(); }}
                  renderValue={(v) => STATUS_OPTIONS.find((o) => o.value === v)?.label || v}
                  renderOption={(opt) => opt.label}
                />

                <SelectField
                  label="Priority"
                  value={priority}
                  options={PRIORITY_OPTIONS}
                  onChange={(v) => { setPriority(v); changed(); }}
                  renderValue={(v) => {
                    const opt = PRIORITY_OPTIONS.find((o) => o.value === v);
                    return opt ? <span className={opt.color}>{opt.label}</span> : v;
                  }}
                  renderOption={(opt) => <span className={opt.color}>{opt.label}</span>}
                />

                <SelectField
                  label="Type"
                  value={type}
                  options={TYPE_OPTIONS}
                  onChange={(v) => { setType(v); changed(); }}
                  renderValue={(v) => {
                    const opt = TYPE_OPTIONS.find((o) => o.value === v);
                    if (!opt) return v;
                    const Icon = opt.icon;
                    return <span className="flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${opt.color}`} />{opt.label}</span>;
                  }}
                  renderOption={(opt) => {
                    const Icon = opt.icon;
                    return <><Icon className={`w-3.5 h-3.5 flex-shrink-0 ${opt.color}`} />{opt.label}</>;
                  }}
                />

                <SelectField
                  label="Assignee"
                  value={assignedTo}
                  options={ASSIGNEE_LIST.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
                  onChange={(v) => { setAssignedTo(v); changed(); }}
                  renderValue={(v) => <span className="capitalize">{v}</span>}
                  renderOption={(opt) => <span className="capitalize">{opt.label}</span>}
                />

                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); changed(); }}
                  />
                </div>

                <div>
                  <FieldLabel>Story Points</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    placeholder="0"
                    value={storyPoint}
                    onChange={(e) => { setStoryPoint(e.target.value); changed(); }}
                  />
                </div>

                {isCreate && sprintOptions.length > 0 && (
                  <div>
                    <FieldLabel>Sprint</FieldLabel>
                    <Listbox value={selectedSprint} onChange={setSelectedSprint}>
                      <div className="relative">
                        <Listbox.Button className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <span className="truncate">{selectedSprint?.label || "Select sprint"}</span>
                          <FaChevronDown className="w-3 h-3 text-slate-400" />
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-40 overflow-auto">
                          {sprintOptions.map((opt) => (
                            <Listbox.Option key={opt.value} value={opt}
                              className={({ active }) => `px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                            >
                              {opt.label}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "subtasks" && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-slate-700 text-sm">Subtasks</h3>
                {subtasks.length > 0 && (
                  <span className="text-xs text-slate-400">{completedSubs}/{subtasks.length} done</span>
                )}
                {subtasks.length > 0 && (
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 mb-4">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <button
                      onClick={() => toggleSubtask(sub.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        sub.done ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-green-400"
                      }`}
                    >
                      {sub.done && <FaCheck className="w-2.5 h-2.5" />}
                    </button>
                    <span className={`flex-1 text-sm ${sub.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {sub.title}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      onClick={() => { setSubtasks((prev) => prev.filter((s) => s.id !== sub.id)); changed(); }}
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
                  placeholder="Add subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
                />
                <button
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={addSubtask}
                >
                  <FaPlus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="p-5">
              <CommentBox taskId={task.id} />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="p-5">
              <ActivityLog task={task} />
            </div>
          )}

          {activeTab === "time" && (
            <div className="p-5 space-y-4">
              <h3 className="font-medium text-slate-700 text-sm flex items-center gap-2">
                <FaClock className="w-4 h-4 text-slate-400" /> Time Tracking
              </h3>

              {/* Progress bar */}
              {(timeEstimate > 0 || timeSpent > 0) && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{timeSpent}h logged</span>
                    <span>{Math.max(0, timeEstimate - timeSpent)}h remaining</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${timeSpent > timeEstimate ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${timeEstimate > 0 ? Math.min(100, (timeSpent / timeEstimate) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Estimate (hours)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={timeEstimate}
                    onChange={(e) => { setTimeEstimate(e.target.value); changed(); }}
                  />
                </div>
                <div>
                  <FieldLabel>Time Spent (hours)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={timeSpent}
                    onChange={(e) => { setTimeSpent(e.target.value); changed(); }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-slate-700">{timeEstimate}h</div>
                    <div className="text-xs text-slate-400">Estimated</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{timeSpent}h</div>
                    <div className="text-xs text-slate-400">Logged</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${timeSpent > timeEstimate ? "text-red-500" : "text-green-500"}`}>
                      {Math.max(0, timeEstimate - timeSpent)}h
                    </div>
                    <div className="text-xs text-slate-400">Remaining</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#232838] bg-slate-50/50 dark:bg-[#141720]/50 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {hasChanges && <span className="text-orange-500 font-medium">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={onClose}
            >
              {hasChanges ? "Discard" : "Close"}
            </button>
            <button
              className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={!title.trim()}
            >
              {isCreate ? "Create Task" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
