import React, { useState, useEffect, useRef, useMemo } from "react";
import { Listbox } from "@headlessui/react";
import {
  FaTimes, FaTrash, FaCheck, FaPlus, FaChevronDown,
  FaBug, FaExclamationCircle, FaUser, FaSearch, FaCheckSquare,
  FaPlusSquare, FaRocket, FaFlag, FaPlay, FaRegDotCircle,
  FaEye, FaEyeSlash, FaExpand, FaLink,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import CommentSection from "./CommentSection";

const TYPE_OPTIONS = [
  { value: "task",          label: "Task",           icon: FaCheckSquare,      color: "text-green-500"  },
  { value: "bug",           label: "Bug",            icon: FaBug,              color: "text-red-500"    },
  { value: "feature",       label: "Feature",        icon: FaPlusSquare,       color: "text-cyan-500"   },
  { value: "defect",        label: "Defect",         icon: FaExclamationCircle,color: "text-orange-500" },
  { value: "userstory",     label: "User Story",     icon: FaUser,             color: "text-blue-500"   },
  { value: "investigation", label: "Investigation",  icon: FaSearch,           color: "text-purple-500" },
  { value: "epic",          label: "Epic",           icon: FaRocket,           color: "text-violet-500" },
  { value: "test",          label: "Test",           icon: FaSearch,           color: "text-teal-500"   },
  { value: "testset",       label: "Test Set",       icon: FaFlag,             color: "text-indigo-500" },
  { value: "testexecution", label: "Test Execution", icon: FaPlay,             color: "text-lime-600"   },
  { value: "precondition",  label: "Precondition",   icon: FaRegDotCircle,     color: "text-sky-500"    },
];

const STATUS_OPTIONS = [
  { value: "todo",      label: "To Do"            },
  { value: "inprogress",label: "In Progress"      },
  { value: "review",    label: "Review"           },
  { value: "awaiting",  label: "Awaiting Customer"},
  { value: "blocked",   label: "Blocked"          },
  { value: "done",      label: "Done"             },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-red-600"    },
  { value: "high",     label: "High",     color: "text-orange-500" },
  { value: "medium",   label: "Medium",   color: "text-yellow-500" },
  { value: "low",      label: "Low",      color: "text-green-500"  },
];

const ASSIGNEE_LIST = ["alice", "bob", "carol", "dave", "unassigned"];

const STATUS_COLORS = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  awaiting:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blocked:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  done:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const LINK_RELATIONSHIPS = [
  "relates to", "blocks", "is blocked by", "duplicates", "is duplicated by", "clones", "is cloned by",
];

function MiniSelect({ value, options, onChange, renderValue, renderOption }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors focus:outline-none">
          {renderValue(value)}
          <FaChevronDown className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
        </Listbox.Button>
        <Listbox.Options className="absolute z-50 mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg py-1 min-w-28 max-h-40 overflow-auto">
          {options.map((opt) => (
            <Listbox.Option key={opt.value ?? opt} value={opt.value ?? opt}
              className={({ active }) =>
                `flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" : "text-slate-700 dark:text-slate-300"}`
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

export default function TaskSidePanel({ task, open, onClose, onTaskUpdate, onOpenModal }) {
  const { epics, labels, deleteTask, logActivity, allTasks } = useApp();
  const { addToast } = useToast();

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [type,         setType]         = useState("task");
  const [status,       setStatus]       = useState("todo");
  const [priority,     setPriority]     = useState("medium");
  const [assignedTo,   setAssignedTo]   = useState("unassigned");
  const [dueDate,      setDueDate]      = useState("");
  const [storyPoint,   setStoryPoint]   = useState("");
  const [epicId,       setEpicId]       = useState(null);
  const [taskLabels,   setTaskLabels]   = useState([]);
  const [watchers,     setWatchers]     = useState([]);
  const [subtasks,     setSubtasks]     = useState([]);
  const [linkedItems,  setLinkedItems]  = useState([]);
  const [hasChanges,   setHasChanges]   = useState(false);
  const [confirmDelete,setConfirmDelete]= useState(false);
  const [activeTab,    setActiveTab]    = useState("details");

  // Subtask inline add
  const [inlineSubOpen,  setInlineSubOpen]  = useState(false);
  const [inlineSubTitle, setInlineSubTitle] = useState("");

  // Linked items
  const [linkSearchOpen,    setLinkSearchOpen]    = useState(false);
  const [linkSearch,        setLinkSearch]        = useState("");
  const [linkRelationship,  setLinkRelationship]  = useState("relates to");


  // Slide animation
  const [isClosing, setIsClosing] = useState(false);

  // Resize
  const [panelWidth, setPanelWidth] = useState(480);
  const isResizingRef = useRef(false);
  const prevId = useRef(null);

  // ── Resize listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      setPanelWidth(Math.max(360, Math.min(900, window.innerWidth - e.clientX)));
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ── Slide-out when open becomes false ───────────────────────────────────────
  useEffect(() => {
    if (!open && task) {
      setIsClosing(true);
      const t = setTimeout(() => setIsClosing(false), 210);
      return () => clearTimeout(t);
    }
    if (open) setIsClosing(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init state from task ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !task) return;
    const isNewTask = task.id !== prevId.current;
    prevId.current = task.id;

    // Always sync action fields so external updates (drag-and-drop, etc.) are reflected
    setStatus(task.status || "todo");
    setPriority((task.priority || "medium").toLowerCase());
    setAssignedTo(task.assignedTo || "unassigned");
    setType(task.type || "task");
    setDueDate(task.dueDate || "");
    setStoryPoint(task.storyPoint ?? "");
    setEpicId(task.epicId || null);
    setTaskLabels(task.labels || []);
    setWatchers(task.watchers || []);
    setSubtasks(task.subtasks || []);
    setLinkedItems(task.linkedItems || []);

    // Only reset text-edit fields and UI state when switching to a different task,
    // so that in-progress title/description edits aren't lost on external updates.
    if (isNewTask) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setHasChanges(false);
      setConfirmDelete(false);
      setActiveTab("details");
      setInlineSubOpen(false);
      setLinkSearchOpen(false);
      setLinkSearch("");
    }
  }, [open, task]);

  const linkSearchResults = useMemo(() => {
    if (!linkSearch.trim()) return [];
    const q = linkSearch.toLowerCase();
    return (allTasks || [])
      .filter((t) => t.id !== task?.id && !linkedItems.some((l) => l.targetId === t.id))
      .filter((t) => t.title.toLowerCase().includes(q) || `cy-${t.id}`.includes(q))
      .slice(0, 8);
  }, [linkSearch, allTasks, task, linkedItems]);

  // Group linked items by relationship
  const linkedByRelationship = useMemo(() => {
    const groups = {};
    linkedItems.forEach((link) => {
      const linkedTask = (allTasks || []).find((t) => t.id === link.targetId);
      if (!linkedTask) return;
      if (!groups[link.relationship]) groups[link.relationship] = [];
      groups[link.relationship].push({ ...link, linkedTask });
    });
    return groups;
  }, [linkedItems, allTasks]);

  if (!open && !isClosing) return null;
  if (!task) return null;

  const changed = () => setHasChanges(true);

  const buildUpdated = () => ({
    ...task,
    title, description, type, status, priority, assignedTo,
    dueDate, storyPoint: storyPoint !== "" ? Number(storyPoint) : undefined,
    epicId, labels: taskLabels, watchers, subtasks, linkedItems,
    comments: task.comments || [],
  });

  // Immediately persist action-field changes without requiring the Save button.
  // patch overrides any stale local-state values captured by buildUpdated().
  const autoSave = (patch) => {
    onTaskUpdate?.({ ...buildUpdated(), ...patch });
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onTaskUpdate?.(buildUpdated());
    if (task.id) logActivity(task.id, "updated task");
    setHasChanges(false);
    addToast("Changes saved", "success");
  };

  const handleDelete = () => {
    if (task.id) deleteTask(task.id);
    addToast("Task deleted", "error");
    onClose();
  };

  const addInlineSub = () => {
    if (!inlineSubTitle.trim()) return;
    const newSub = { id: Date.now(), title: inlineSubTitle.trim(), done: false, priority: "medium", storyPoint: "", assignedTo: "unassigned" };
    const newSubs = [...subtasks, newSub];
    setSubtasks(newSubs);
    setInlineSubTitle("");
    setInlineSubOpen(false);
    autoSave({ subtasks: newSubs });
  };

  const toggleSubtask = (id) => {
    const newSubs = subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s);
    setSubtasks(newSubs);
    autoSave({ subtasks: newSubs });
  };

  const updateSubtask = (id, updates) => {
    const newSubs = subtasks.map((s) => s.id === id ? { ...s, ...updates } : s);
    setSubtasks(newSubs);
    autoSave({ subtasks: newSubs });
  };

  // ── Linked items ────────────────────────────────────────────────────────────
  const handleAddLink = (targetId) => {
    const newLink = { id: Date.now().toString(), targetId, relationship: linkRelationship };
    const newLinkedItems = [...linkedItems, newLink];
    setLinkedItems(newLinkedItems);
    onTaskUpdate?.({ ...buildUpdated(), linkedItems: newLinkedItems });
    setLinkSearchOpen(false);
    setLinkSearch("");
  };

  const handleRemoveLink = (linkId) => {
    const newLinkedItems = linkedItems.filter((l) => l.id !== linkId);
    setLinkedItems(newLinkedItems);
    onTaskUpdate?.({ ...buildUpdated(), linkedItems: newLinkedItems });
  };

  const typeInfo     = TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];
  const TypeIcon     = typeInfo.icon;
  const currentEpic  = epics.find((e) => e.id === epicId);
  const taskLabelObjects = (taskLabels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const completedSubs = subtasks.filter((s) => s.done).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed top-0 right-0 h-full z-40 bg-white dark:bg-[#1c2030] border-l border-slate-200 dark:border-[#2a3044] shadow-2xl flex flex-col ${isClosing ? "animate-slide-out-right" : "animate-slide-in-right"}`}
      style={{ width: panelWidth }}
    >
      {/* ── Resize handle ── */}
      <div
        className="absolute top-0 left-0 h-full w-2 cursor-col-resize z-50 group flex items-stretch"
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
      >
        <div className="w-px h-full bg-slate-200 dark:bg-[#2a3044] group-hover:bg-blue-400 group-hover:w-0.5 transition-all ml-0.5" />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-[#232838] flex-shrink-0 pl-4">
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")}`}>
          <TypeIcon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
        </div>
        <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
          CY-{task.id}
        </span>
        <input
          className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none placeholder-slate-300 dark:placeholder-slate-600 min-w-0"
          placeholder="Task title..."
          value={title}
          onChange={(e) => { setTitle(e.target.value); changed(); }}
        />
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {onOpenModal && (
            <button
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              onClick={() => onOpenModal(buildUpdated())}
              title="Open full view"
            >
              <FaExpand className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            onClick={() => setConfirmDelete(true)}
            title="Delete"
          >
            <FaTrash className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] rounded transition-colors"
            onClick={onClose}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-red-700 dark:text-red-400">Delete this task?</span>
          <div className="flex gap-2">
            <button className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700" onClick={handleDelete}>Delete</button>
            <button className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838]" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Status + key row ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-[#232838] flex-shrink-0 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[status] || STATUS_COLORS.todo}`}>
          {STATUS_OPTIONS.find((o) => o.value === status)?.label || status}
        </span>
        <MiniSelect
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => { setStatus(v); autoSave({ status: v }); }}
          renderValue={() => <span className="text-slate-500 dark:text-slate-400">Change status</span>}
          renderOption={(opt) => opt.label}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-100 dark:border-[#232838] px-4 flex-shrink-0">
        {[
          { id: "details",  label: "Details" },
          { id: "subtasks", label: `Subtasks (${subtasks.length})` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors mr-1 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ DETAILS TAB ═══ */}
        {activeTab === "details" && (
          <div className="p-4 space-y-4">
            {/* Quick fields grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Priority</div>
                <MiniSelect
                  value={priority}
                  options={PRIORITY_OPTIONS}
                  onChange={(v) => { setPriority(v); autoSave({ priority: v }); }}
                  renderValue={(v) => { const o = PRIORITY_OPTIONS.find((p) => p.value === v); return o ? <span className={o.color}>{o.label}</span> : v; }}
                  renderOption={(opt) => <span className={opt.color}>{opt.label}</span>}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Assignee</div>
                <MiniSelect
                  value={assignedTo}
                  options={ASSIGNEE_LIST.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
                  onChange={(v) => { setAssignedTo(v); autoSave({ assignedTo: v }); }}
                  renderValue={(v) => <span className="capitalize">{v}</span>}
                  renderOption={(opt) => <span className="capitalize">{opt.label}</span>}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Type</div>
                <MiniSelect
                  value={type}
                  options={TYPE_OPTIONS}
                  onChange={(v) => { setType(v); autoSave({ type: v }); }}
                  renderValue={(v) => { const o = TYPE_OPTIONS.find((t) => t.value === v); if (!o) return v; const I = o.icon; return <span className="flex items-center gap-1"><I className={`w-3 h-3 ${o.color}`} />{o.label}</span>; }}
                  renderOption={(opt) => { const I = opt.icon; return <><I className={`w-3 h-3 flex-shrink-0 ${opt.color}`} />{opt.label}</>; }}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Story Points</div>
                <input type="number" min="0"
                  className="w-full border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={storyPoint}
                  onChange={(e) => { setStoryPoint(e.target.value); changed(); }}
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Due Date</div>
                <input type="date"
                  className="w-full border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); autoSave({ dueDate: e.target.value }); }}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Epic</div>
                <Listbox value={epicId} onChange={(v) => { setEpicId(v); autoSave({ epicId: v }); }}>
                  <div className="relative">
                    <Listbox.Button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors w-full justify-between focus:outline-none">
                      {currentEpic
                        ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentEpic.color }} />{currentEpic.title}</span>
                        : <span className="text-slate-400">No Epic</span>
                      }
                      <FaChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-50 mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg py-1 w-full max-h-36 overflow-auto">
                      <Listbox.Option value={null} className={({ active }) => `px-2.5 py-1.5 text-xs cursor-pointer text-slate-500 ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>No Epic</Listbox.Option>
                      {epics.map((e) => (
                        <Listbox.Option key={e.id} value={e.id}
                          className={({ active }) => `flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                          <span className="text-slate-700 dark:text-slate-300">{e.title}</span>
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Description</div>
              <textarea
                className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-600"
                rows={3}
                placeholder="Add a description..."
                value={description}
                onChange={(e) => { setDescription(e.target.value); changed(); }}
              />
            </div>

            {/* Labels */}
            {taskLabelObjects.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Labels</div>
                <div className="flex flex-wrap gap-1.5">
                  {taskLabelObjects.map((label) => (
                    <span key={label.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: label.color + "22", color: label.color, border: `1px solid ${label.color}44` }}
                    >{label.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Watchers */}
            <div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Watchers</div>
              <div className="flex flex-wrap gap-1.5">
                {ASSIGNEE_LIST.filter((a) => a !== "unassigned").map((name) => {
                  const watching = watchers.includes(name);
                  return (
                    <button key={name} onClick={() => { setWatchers((p) => watching ? p.filter((w) => w !== name) : [...p, name]); changed(); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${watching ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"}`}
                    >
                      {watching ? <FaEye className="w-2.5 h-2.5" /> : <FaEyeSlash className="w-2.5 h-2.5" />}
                      <span className="capitalize">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Subtasks inline table ── */}
            <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subtasks</span>
                <div className="flex items-center gap-2">
                  {subtasks.length > 0 && (
                    <span className={`text-xs font-medium ${completedSubs === subtasks.length ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                      {completedSubs === subtasks.length ? "100% Done" : `${completedSubs}/${subtasks.length}`}
                    </span>
                  )}
                  <button
                    onClick={() => setInlineSubOpen(true)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Add subtask"
                  >
                    <FaPlus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="h-1 bg-slate-100 dark:bg-[#1a1f2e]">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${(completedSubs / subtasks.length) * 100}%` }} />
                </div>
              )}

              {/* Table header */}
              {subtasks.length > 0 && (
                <div className="grid px-3 py-1.5 bg-slate-50/50 dark:bg-[#1a1f2e]/50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#2a3044]"
                  style={{ gridTemplateColumns: "1fr 36px 30px 26px 54px 16px", gap: "6px" }}>
                  <span>Work</span>
                  <span>Pri</span>
                  <span className="text-center">SP</span>
                  <span />
                  <span>Status</span>
                  <span />
                </div>
              )}

              {/* Rows */}
              {subtasks.map((sub) => {
                const priColors  = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
                const priLabels  = { critical: "Crit", high: "High", medium: "Med", low: "Low" };
                const assigneeColors = { alice: "#3b82f6", bob: "#7c3aed", carol: "#10b981", dave: "#f59e0b" };
                const assigneeInitial = (sub.assignedTo && sub.assignedTo !== "unassigned")
                  ? sub.assignedTo.charAt(0).toUpperCase() : "–";
                return (
                  <div key={sub.id}
                    className="grid items-center px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group"
                    style={{ gridTemplateColumns: "1fr 36px 30px 26px 54px 16px", gap: "6px" }}
                  >
                    {/* Title + checkbox */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        onClick={() => toggleSubtask(sub.id)}
                        className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"
                        }`}
                      >
                        {sub.done && <FaCheck className="w-2 h-2 text-white" />}
                      </button>
                      <span className={`text-xs truncate ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {sub.title}
                      </span>
                    </div>

                    {/* Priority — small select styled as badge */}
                    <select
                      value={sub.priority || "medium"}
                      onChange={(e) => updateSubtask(sub.id, { priority: e.target.value })}
                      className="w-full text-[10px] font-semibold bg-transparent border-0 focus:outline-none cursor-pointer appearance-none text-center rounded"
                      style={{ color: priColors[sub.priority || "medium"] }}
                      title="Priority"
                    >
                      {["critical","high","medium","low"].map((p) => (
                        <option key={p} value={p}>{priLabels[p]}</option>
                      ))}
                    </select>

                    {/* Story Points */}
                    <input
                      type="number" min="0"
                      value={sub.storyPoint ?? ""}
                      onChange={(e) => updateSubtask(sub.id, { storyPoint: e.target.value })}
                      className="w-full text-xs text-center border border-slate-200 dark:border-[#2a3044] rounded px-0.5 py-0.5 bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="–"
                      title="Story Points"
                    />

                    {/* Assignee avatar */}
                    <div className="flex justify-center">
                      <select
                        value={sub.assignedTo || "unassigned"}
                        onChange={(e) => updateSubtask(sub.id, { assignedTo: e.target.value })}
                        className="sr-only"
                        id={`sub-asgn-${sub.id}`}
                      >
                        <option value="unassigned">–</option>
                        {["alice","bob","carol","dave"].map((a) => (
                          <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>
                        ))}
                      </select>
                      <label
                        htmlFor={`sub-asgn-${sub.id}`}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all flex-shrink-0"
                        style={{ backgroundColor: assigneeColors[sub.assignedTo] || "#94a3b8" }}
                        title={sub.assignedTo !== "unassigned" ? sub.assignedTo : "Unassigned"}
                      >
                        {assigneeInitial}
                      </label>
                    </div>

                    {/* Status */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium text-center leading-tight ${
                      sub.done ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                               : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                    }`}>
                      {sub.done ? "Done" : "To Do"}
                    </span>

                    {/* Delete */}
                    <button
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all justify-self-center"
                      onClick={() => { setSubtasks((p) => p.filter((s) => s.id !== sub.id)); changed(); }}
                    >
                      <FaTimes className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}

              {/* Inline add row */}
              {inlineSubOpen ? (
                <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
                  <input
                    autoFocus
                    className="flex-1 text-xs border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                    placeholder="Subtask title..."
                    value={inlineSubTitle}
                    onChange={(e) => setInlineSubTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addInlineSub();
                      if (e.key === "Escape") { setInlineSubOpen(false); setInlineSubTitle(""); }
                    }}
                  />
                  <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" onClick={addInlineSub}>Add</button>
                  <button className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600" onClick={() => { setInlineSubOpen(false); setInlineSubTitle(""); }}>✕</button>
                </div>
              ) : (
                <button
                  className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
                  onClick={() => setInlineSubOpen(true)}
                >
                  + Add subtask
                </button>
              )}
            </div>

            {/* ── Linked Items ── */}
            <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                <div className="flex items-center gap-1.5">
                  <FaLink className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Linked Items</span>
                  {linkedItems.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{linkedItems.length}</span>
                  )}
                </div>
                <button
                  onClick={() => setLinkSearchOpen((p) => !p)}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title="Link a task"
                >
                  <FaPlus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Link search UI */}
              {linkSearchOpen && (
                <div className="p-2.5 border-b border-slate-100 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
                  {/* Relationship selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Link type:</span>
                    <select
                      className="flex-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={linkRelationship}
                      onChange={(e) => setLinkRelationship(e.target.value)}
                    >
                      {LINK_RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {/* Task search */}
                  <div className="relative">
                    <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                    <input
                      autoFocus
                      className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                      placeholder="Search tasks by name or CY-..."
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setLinkSearchOpen(false); setLinkSearch(""); } }}
                    />
                  </div>
                  {linkSearchResults.length > 0 && (
                    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] divide-y divide-slate-100 dark:divide-[#2a3044] max-h-44 overflow-y-auto">
                      {linkSearchResults.map((t) => {
                        const tInfo = TYPE_OPTIONS.find((o) => o.value === t.type) || TYPE_OPTIONS[0];
                        const TIcon = tInfo.icon;
                        return (
                          <button
                            key={t.id}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                            onClick={() => handleAddLink(t.id)}
                          >
                            <TIcon className={`w-3 h-3 flex-shrink-0 ${tInfo.color}`} />
                            <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{t.id}</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[t.status] || STATUS_COLORS.todo}`}>
                              {STATUS_OPTIONS.find((o) => o.value === t.status)?.label || t.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {linkSearch.trim() && linkSearchResults.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">No matching tasks found</div>
                  )}
                  <button
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    onClick={() => { setLinkSearchOpen(false); setLinkSearch(""); }}
                  >Cancel</button>
                </div>
              )}

              {/* Linked items list grouped by relationship */}
              {Object.keys(linkedByRelationship).length > 0 ? (
                <div>
                  {Object.entries(linkedByRelationship).map(([rel, items]) => (
                    <div key={rel}>
                      <div className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 italic border-b border-slate-50 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#1a1f2e]/30">
                        {rel}
                      </div>
                      {items.map(({ id: linkId, linkedTask }) => {
                        const ltInfo = TYPE_OPTIONS.find((o) => o.value === linkedTask.type) || TYPE_OPTIONS[0];
                        const LTIcon = ltInfo.icon;
                        return (
                          <div key={linkId}
                            className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group"
                          >
                            <LTIcon className={`w-3.5 h-3.5 flex-shrink-0 ${ltInfo.color}`} />
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">CY-{linkedTask.id}</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{linkedTask.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[linkedTask.status] || STATUS_COLORS.todo}`}>
                              {STATUS_OPTIONS.find((o) => o.value === linkedTask.status)?.label || linkedTask.status}
                            </span>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                              onClick={() => handleRemoveLink(linkId)}
                              title="Unlink"
                            >
                              <FaTimes className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                !linkSearchOpen && (
                  <button
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                    onClick={() => setLinkSearchOpen(true)}
                  >
                    + Link a related task
                  </button>
                )
              )}
            </div>

            {/* ── Comments ── */}
            <CommentSection
              key={task.id}
              savedComments={task.comments || []}
              allTasks={allTasks}
              onUpdate={(newComments) => onTaskUpdate?.({ ...buildUpdated(), comments: newComments })}
            />
          </div>
        )}

        {/* ═══ SUBTASKS TAB ═══ */}
        {activeTab === "subtasks" && (
          <div className="p-4">
            {subtasks.length > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                  <span>{completedSubs}/{subtasks.length} done</span>
                  <span>{subtasks.length > 0 ? Math.round((completedSubs / subtasks.length) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            <div className="space-y-1.5 mb-3">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] group">
                  <button onClick={() => { toggleSubtask(sub.id); }}
                    className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600"}`}
                  >
                    {sub.done && <FaCheck className="w-2 h-2 text-white" />}
                  </button>
                  <span className={`flex-1 text-xs ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{sub.title}</span>
                  <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-0.5"
                    onClick={() => { setSubtasks((p) => p.filter((s) => s.id !== sub.id)); changed(); }}>
                    <FaTimes className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                placeholder="Add subtask..."
                value={inlineSubTitle}
                onChange={(e) => setInlineSubTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addInlineSub(); }}
              />
              <button className="px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700" onClick={addInlineSub}>
                <FaPlus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-[#232838] bg-slate-50/50 dark:bg-[#141720]/50 flex-shrink-0">
        <div className="text-xs text-orange-500 font-medium">{hasChanges ? "Unsaved changes" : ""}</div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838]" onClick={onClose}>
            Close
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
