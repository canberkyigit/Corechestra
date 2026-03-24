import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox } from "@headlessui/react";
import {
  FaTimes, FaTrash, FaCheck, FaPlus, FaChevronDown, FaSearch,
  FaEye, FaEyeSlash, FaClock, FaTag, FaLink,
  FaComment, FaCompress,
  FaPaperclip, FaCloudUploadAlt, FaFileAlt, FaImage,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { taskSchema } from "../schemas";
import CommentSection from "./CommentSection";
import SubtaskDetailPanel from "./SubtaskDetailPanel";
import { format, parseISO } from "date-fns";
import {
  TYPE_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "../constants/taskOptions";

const LINK_RELATIONSHIPS = [
  "relates to", "blocks", "is blocked by", "duplicates", "is duplicated by", "clones", "is cloned by",
];

function FieldLabel({ children }) {
  return <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{children}</div>;
}

function SelectField({ label, value, options, onChange, renderOption, renderValue }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
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
  onOpenPanel,
}) {
  const { epics, labels, deleteTask, logActivity, sprint, teamMembers } = useApp();
  const { addToast } = useToast();

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
  const [linkedItems, setLinkedItems] = useState([]);
  const [inlineSubOpen, setInlineSubOpen] = useState(false);
  const [inlineSubTitle, setInlineSubTitle] = useState("");
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkRelationship, setLinkRelationship] = useState("relates to");
  const [activeTab, setActiveTab] = useState("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openSubtask, setOpenSubtask] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const fmtDate = (d) => { if (!d) return "—"; try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; } };

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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
    setLinkedItems(task.linkedItems || []);
    setAttachments(task.attachments || []);
    setInlineSubOpen(false);
    setInlineSubTitle("");
    setLinkSearchOpen(false);
    setLinkSearch("");
    setHasChanges(false);
    setActiveTab("details");
    setConfirmDelete(false);
    setShowDiscardConfirm(false);
  }, [open, task]);

  // ── Must be before early return (hooks rules) ─────────────────────────────
  const linkSearchResults = useMemo(() => {
    if (!linkSearch.trim()) return [];
    const q = linkSearch.toLowerCase();
    return (allTasks || [])
      .filter((t) => t.id !== task?.id && !linkedItems.some((l) => l.targetId === t.id))
      .filter((t) => t.title.toLowerCase().includes(q) || `cy-${t.id}`.includes(q))
      .slice(0, 8);
  }, [linkSearch, allTasks, task, linkedItems]);

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

  const shouldRender = open && task;

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
    linkedItems,
    attachments,
    comments: task.comments || [],
    ...(isCreate && selectedSprint?.value === "active" && sprint && {
      createdSprintName: sprint.name,
      createdSprintStart: sprint.startDate,
      createdSprintEnd: sprint.endDate,
    }),
  });

  const handleSave = () => {
    if (isCreate) {
      const result = taskSchema.safeParse({ title, description, type, priority, status, assignedTo, dueDate, storyPoint });
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        if (firstIssue.path[0] === "title") setTitleError(true);
        addToast(firstIssue.message, "error");
        return;
      }
    } else if (!title.trim()) {
      setTitleError(true);
      addToast("Title is required", "error");
      return;
    }
    setTitleError(false);
    const updated = buildUpdated();
    if (onTaskUpdate) onTaskUpdate(updated);
    if (!isCreate && task.id) logActivity(task.id, "updated task");
    setHasChanges(false);
    addToast(isCreate ? "Task created" : "Changes saved", isCreate ? "info" : "success");
    if (isCreate) onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setHasChanges(false);
    onClose();
  };

  const handleDelete = () => {
    if (task.id) deleteTask(task.id);
    addToast("Task deleted", "error");
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

  const toggleSubtask = (id) => {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, done: !s.done } : s));
    changed();
  };

  const updateSubtask = (id, updates) => {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    changed();
  };

  const addInlineSub = () => {
    if (!inlineSubTitle.trim()) return;
    setSubtasks((prev) => [...prev, { id: Date.now(), title: inlineSubTitle.trim(), done: false, priority: "medium", storyPoint: "", assignedTo: "unassigned" }]);
    setInlineSubTitle("");
    setInlineSubOpen(false);
    changed();
  };

  const handleAddLink = (targetId) => {
    setLinkedItems((prev) => [...prev, { id: Date.now().toString(), targetId, relationship: linkRelationship }]);
    setLinkSearchOpen(false);
    setLinkSearch("");
    changed();
  };

  const handleRemoveLink = (linkId) => {
    setLinkedItems((prev) => prev.filter((l) => l.id !== linkId));
    changed();
  };

  // ── Attachments ─────────────────────────────────────────────────────────────
  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const processFiles = (files) => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    Array.from(files).forEach((file) => {
      if (file.size > MAX_SIZE) {
        addToast(`File "${file.name}" exceeds 5 MB limit`, "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const newAttachment = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target.result,
          addedAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
        changed();
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAttachmentDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handleAttachmentSelect = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    changed();
  };

  const typeInfo = TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];
  const TypeIcon = typeInfo.icon;

  const currentEpic = epics.find((e) => e.id === epicId);

  const tabs = [
    { id: "details",  label: "Details" },
    { id: "subtasks", label: `Subtasks${subtasks.length > 0 ? ` (${subtasks.length})` : ""}` },
    { id: "links",    label: `Links${linkedItems.length > 0 ? ` (${linkedItems.length})` : ""}` },
    ...(!isCreate ? [
      { id: "comments", label: "Comments" },
      { id: "activity", label: "Activity" },
    ] : []),
    { id: "time",     label: "Time" },
  ];

  const completedSubs = subtasks.filter((s) => s.done).length;

  return (
    <AnimatePresence>
      {shouldRender && (
    <motion.div
      key="modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh] overflow-hidden transition-colors relative"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <SubtaskDetailPanel
          subtask={openSubtask}
          parentTask={task}
          open={!!openSubtask}
          onClose={() => setOpenSubtask(null)}
          onSave={(updated) => {
            const newSubtasks = subtasks.map((s) => s.id === updated.id ? updated : s);
            setSubtasks(newSubtasks);
            setOpenSubtask(updated);
            changed();
          }}
        />
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-[#232838] flex-shrink-0">
          <div className={`flex items-center justify-center w-7 h-7 rounded flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")} dark:bg-white/10`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          {!isCreate && task?.id && (
            <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 bg-slate-100 dark:bg-[#232838] px-1.5 py-0.5 rounded">
              CY-{task.id}
            </span>
          )}
          <input
            className={`flex-1 text-base font-semibold bg-transparent border-none outline-none focus:ring-0 ${titleError ? "text-red-500 placeholder-red-300" : "text-slate-800 dark:text-slate-200 placeholder-slate-300"}`}
            placeholder={titleError ? "Title is required!" : "Task title..."}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); changed(); }}
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
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                onClick={() => setConfirmDelete(true)}
                title="Delete task"
              >
                <FaTrash className="w-3.5 h-3.5" />
              </button>
            )}
            <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] rounded-lg transition-colors" onClick={handleClose}>
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-400">Delete this task permanently?</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700" onClick={handleDelete}>Delete</button>
              <button className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838]" onClick={() => setConfirmDelete(false)}>Cancel</button>
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
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                    className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-[#232838] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
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
                        {epics.map((e) => (
                          <Listbox.Option key={e.id} value={e.id}
                            className={({ active }) => `flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                            <span className="text-slate-700 dark:text-slate-300">{e.title}</span>
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
                    {teamMembers.filter(m => m.value && m.value !== "unassigned").map((member) => (
                      <button
                        key={member.value}
                        onClick={() => toggleWatcher(member.value)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all ${
                          watchers.includes(member.value)
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                            : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                        }`}
                      >
                        {watchers.includes(member.value) ? <FaEye className="w-3 h-3" /> : <FaEyeSlash className="w-3 h-3" />}
                        <span>{member.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Subtasks */}
                <div>
                  <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
                      </span>
                      <button onClick={() => setInlineSubOpen(true)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors">
                        <FaPlus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {subtasks.length > 0 && (
                      <div>
                        {subtasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
                            <button onClick={() => toggleSubtask(sub.id)}
                              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"}`}>
                              {sub.done && <FaCheck className="w-2.5 h-2.5 text-white" />}
                            </button>
                            <button
                              onClick={() => setOpenSubtask(sub)}
                              className={`text-sm flex-1 truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
                            >{sub.title}</button>
                            <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                              onClick={() => { setSubtasks((p) => p.filter((s) => s.id !== sub.id)); changed(); }}>
                              <FaTimes className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {inlineSubOpen ? (
                      <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
                        <input autoFocus
                          className="flex-1 text-sm border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                          placeholder="Subtask title..."
                          value={inlineSubTitle} onChange={(e) => setInlineSubTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addInlineSub(); if (e.key === "Escape") { setInlineSubOpen(false); setInlineSubTitle(""); } }} />
                        <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" onClick={addInlineSub}>Add</button>
                        <button className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600" onClick={() => { setInlineSubOpen(false); setInlineSubTitle(""); }}>✕</button>
                      </div>
                    ) : (
                      <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
                        onClick={() => setInlineSubOpen(true)}>
                        + Add subtask
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Links */}
                <div>
                  <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                      <div className="flex items-center gap-1.5">
                        <FaLink className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Links</span>
                        {linkedItems.length > 0 && <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{linkedItems.length}</span>}
                      </div>
                      <button onClick={() => setLinkSearchOpen((p) => !p)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors">
                        <FaPlus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {linkSearchOpen && (
                      <div className="p-2.5 border-b border-slate-100 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 flex-shrink-0">Link type:</span>
                          <select className="flex-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)}>
                            {LINK_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="relative">
                          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                          <input autoFocus
                            className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                            placeholder="Search tasks by name or CY-..."
                            value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") { setLinkSearchOpen(false); setLinkSearch(""); } }} />
                        </div>
                        {linkSearchResults.length > 0 && (
                          <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] divide-y divide-slate-100 dark:divide-[#2a3044] max-h-32 overflow-y-auto">
                            {linkSearchResults.map((t) => {
                              const tInfo = TYPE_OPTIONS.find((o) => o.value === t.type) || TYPE_OPTIONS[0];
                              const TIcon = tInfo.icon;
                              return (
                                <button key={t.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                                  onClick={() => handleAddLink(t.id)}>
                                  <TIcon className={`w-3 h-3 flex-shrink-0 ${tInfo.color}`} />
                                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{t.id}</span>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <button className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          onClick={() => { setLinkSearchOpen(false); setLinkSearch(""); }}>Cancel</button>
                      </div>
                    )}
                    {Object.keys(linkedByRelationship).length > 0 ? (
                      <div>
                        {Object.entries(linkedByRelationship).map(([rel, items]) => (
                          <div key={rel}>
                            <div className="px-3 py-1.5 text-xs text-slate-400 italic border-b border-slate-50 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#1a1f2e]/30">{rel}</div>
                            {items.map(({ id: linkId, linkedTask }) => {
                              const ltInfo = TYPE_OPTIONS.find((o) => o.value === linkedTask.type) || TYPE_OPTIONS[0];
                              const LTIcon = ltInfo.icon;
                              return (
                                <div key={linkId} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
                                  <LTIcon className={`w-3.5 h-3.5 flex-shrink-0 ${ltInfo.color}`} />
                                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{linkedTask.id}</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{linkedTask.title}</span>
                                  <button className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all" onClick={() => handleRemoveLink(linkId)}>
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
                        <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
                          onClick={() => setLinkSearchOpen(true)}>
                          + Link a related task
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Inline Comments — hidden during task creation */}
                {!isCreate && <div>
                  <FieldLabel>Comments</FieldLabel>
                  <CommentSection
                    key={task.id}
                    savedComments={task.comments || []}
                    allTasks={allTasks}
                    taskTitle={task.title}
                    taskId={task.id}
                    onUpdate={(newComments) => onTaskUpdate?.({ ...buildUpdated(), comments: newComments })}
                  />
                </div>}

                {/* Attachments */}
                <div>
                  <FieldLabel>Attachments {attachments.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 dark:bg-[#2a3044] text-slate-500 dark:text-slate-400 px-1.5 rounded-full normal-case">{attachments.length}</span>}</FieldLabel>
                  <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                    {/* Drop zone */}
                    <div
                      className={`p-3 transition-colors cursor-pointer ${
                        dragOver
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                          : "bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838]"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleAttachmentDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center justify-center py-3 border-2 border-dashed border-slate-200 dark:border-[#2a3044] rounded-lg">
                        <FaCloudUploadAlt className={`w-6 h-6 mb-1.5 ${dragOver ? "text-blue-500" : "text-slate-300 dark:text-slate-600"}`} />
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {dragOver ? "Drop files here" : "Drop files here or click to browse"}
                        </span>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Max 5 MB per file</span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAttachmentSelect}
                      />
                    </div>

                    {/* File list */}
                    {attachments.length > 0 && (
                      <div>
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2.5 px-3 py-2 border-t border-slate-100 dark:border-[#2a3044] hover:bg-slate-50 dark:hover:bg-[#232838] group">
                            {att.type?.startsWith("image/") ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="w-10 h-10 rounded object-cover flex-shrink-0 border border-slate-200 dark:border-[#2a3044]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-slate-100 dark:bg-[#232838] flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-[#2a3044]">
                                <FaFileAlt className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-700 dark:text-slate-300 truncate">{att.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{formatFileSize(att.size)}</div>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                              title="Remove"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-52 flex-shrink-0 border-l border-slate-100 dark:border-[#232838] p-4 space-y-4">
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
                  options={teamMembers.filter(m => m.value !== "").map(m => ({ value: m.value, label: m.label }))}
                  onChange={(v) => { setAssignedTo(v); changed(); }}
                  renderValue={(v) => <span className="capitalize">{v}</span>}
                  renderOption={(opt) => <span className="capitalize">{opt.label}</span>}
                />

                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <input
                    type="date"
                    className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 dark:bg-[#232838]"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); changed(); }}
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
                      {task.createdSprintName && (
                        <div className="font-medium text-slate-600 dark:text-slate-300 text-xs">{task.createdSprintName}</div>
                      )}
                      <div>{fmtDate(task.createdSprintStart)} → {fmtDate(task.createdSprintEnd)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "subtasks" && (
            <div className="p-5">
              {/* Progress */}
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

              {/* Rich table */}
              <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subtasks</span>
                  <button onClick={() => setInlineSubOpen(true)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors">
                    <FaPlus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="grid px-3 py-1.5 bg-slate-50/50 dark:bg-[#1a1f2e]/50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#2a3044]"
                    style={{ gridTemplateColumns: "1fr 42px 36px 30px 60px 18px", gap: "6px" }}>
                    <span>Work</span><span>Pri</span><span className="text-center">SP</span><span /><span>Status</span><span />
                  </div>
                )}

                {subtasks.map((sub) => {
                  const priColors = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
                  const priLabels = { critical: "Crit", high: "High", medium: "Med", low: "Low" };
                  const assigneeColors = { alice: "#3b82f6", bob: "#7c3aed", carol: "#10b981", dave: "#f59e0b" };
                  return (
                    <div key={sub.id} className="grid items-center px-3 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group"
                      style={{ gridTemplateColumns: "1fr 42px 36px 30px 60px 18px", gap: "6px" }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button onClick={() => toggleSubtask(sub.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${sub.done ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600 hover:border-green-400"}`}>
                          {sub.done && <FaCheck className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <button
                          onClick={() => setOpenSubtask(sub)}
                          className={`text-sm truncate text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${sub.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
                        >{sub.title}</button>
                      </div>
                      <select value={sub.priority || "medium"} onChange={(e) => updateSubtask(sub.id, { priority: e.target.value })}
                        className="w-full text-xs font-semibold bg-transparent border-0 focus:outline-none cursor-pointer appearance-none text-center"
                        style={{ color: priColors[sub.priority || "medium"] }} title="Priority">
                        {["critical","high","medium","low"].map((p) => <option key={p} value={p}>{priLabels[p]}</option>)}
                      </select>
                      <input type="number" min="0" value={sub.storyPoint ?? ""} onChange={(e) => updateSubtask(sub.id, { storyPoint: e.target.value })}
                        className="w-full text-xs text-center border border-slate-200 dark:border-[#2a3044] rounded px-0.5 py-0.5 bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="–" title="Story Points" />
                      <div className="flex justify-center">
                        <select value={sub.assignedTo || "unassigned"} onChange={(e) => updateSubtask(sub.id, { assignedTo: e.target.value })} className="sr-only" id={`modal-sub-asgn-${sub.id}`}>
                          <option value="unassigned">–</option>
                          {["alice","bob","carol","dave"].map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                        </select>
                        <label htmlFor={`modal-sub-asgn-${sub.id}`}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                          style={{ backgroundColor: assigneeColors[sub.assignedTo] || "#94a3b8" }}
                          title={sub.assignedTo !== "unassigned" ? sub.assignedTo : "Unassigned"}>
                          {sub.assignedTo && sub.assignedTo !== "unassigned" ? sub.assignedTo.charAt(0).toUpperCase() : "–"}
                        </label>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium text-center leading-tight ${sub.done ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"}`}>
                        {sub.done ? "Done" : "To Do"}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all justify-self-center"
                        onClick={() => { setSubtasks((p) => p.filter((s) => s.id !== sub.id)); changed(); }}>
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}

                {inlineSubOpen ? (
                  <div className="flex gap-2 p-2 border-t border-slate-100 dark:border-[#2a3044]">
                    <input autoFocus
                      className="flex-1 text-sm border border-blue-300 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                      placeholder="Subtask title..."
                      value={inlineSubTitle} onChange={(e) => setInlineSubTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addInlineSub(); if (e.key === "Escape") { setInlineSubOpen(false); setInlineSubTitle(""); } }} />
                    <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" onClick={addInlineSub}>Add</button>
                    <button className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600" onClick={() => { setInlineSubOpen(false); setInlineSubTitle(""); }}>✕</button>
                  </div>
                ) : (
                  <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-t border-slate-100 dark:border-[#2a3044]"
                    onClick={() => setInlineSubOpen(true)}>
                    + Add subtask
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div className="p-5">
              <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
                  <div className="flex items-center gap-1.5">
                    <FaLink className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Linked Items</span>
                    {linkedItems.length > 0 && <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{linkedItems.length}</span>}
                  </div>
                  <button onClick={() => setLinkSearchOpen((p) => !p)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-400 hover:text-slate-600 transition-colors" title="Link a task">
                    <FaPlus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {linkSearchOpen && (
                  <div className="p-2.5 border-b border-slate-100 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 flex-shrink-0">Link type:</span>
                      <select className="flex-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)}>
                        {LINK_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="relative">
                      <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                      <input autoFocus
                        className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                        placeholder="Search tasks by name or CY-..."
                        value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setLinkSearchOpen(false); setLinkSearch(""); } }} />
                    </div>
                    {linkSearchResults.length > 0 && (
                      <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] divide-y divide-slate-100 dark:divide-[#2a3044] max-h-44 overflow-y-auto">
                        {linkSearchResults.map((t) => {
                          const tInfo = TYPE_OPTIONS.find((o) => o.value === t.type) || TYPE_OPTIONS[0];
                          const TIcon = tInfo.icon;
                          return (
                            <button key={t.id} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                              onClick={() => handleAddLink(t.id)}>
                              <TIcon className={`w-3 h-3 flex-shrink-0 ${tInfo.color}`} />
                              <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{t.id}</span>
                              <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {linkSearch.trim() && linkSearchResults.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-2">No matching tasks found</div>
                    )}
                    <button className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      onClick={() => { setLinkSearchOpen(false); setLinkSearch(""); }}>Cancel</button>
                  </div>
                )}

                {Object.keys(linkedByRelationship).length > 0 ? (
                  <div>
                    {Object.entries(linkedByRelationship).map(([rel, items]) => (
                      <div key={rel}>
                        <div className="px-3 py-1.5 text-xs text-slate-400 italic border-b border-slate-50 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#1a1f2e]/30">{rel}</div>
                        {items.map(({ id: linkId, linkedTask }) => {
                          const ltInfo = TYPE_OPTIONS.find((o) => o.value === linkedTask.type) || TYPE_OPTIONS[0];
                          const LTIcon = ltInfo.icon;
                          return (
                            <div key={linkId} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-[#2a3044] last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] group">
                              <LTIcon className={`w-3.5 h-3.5 flex-shrink-0 ${ltInfo.color}`} />
                              <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{linkedTask.id}</span>
                              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{linkedTask.title}</span>
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
                  !linkSearchOpen && (
                    <button className="w-full text-left px-3 py-3 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                      onClick={() => setLinkSearchOpen(true)}>
                      + Link a related task
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="p-5">
              <CommentSection
                key={task.id}
                savedComments={task.comments || []}
                allTasks={allTasks}
                taskTitle={task.title}
                taskId={task.id}
                onUpdate={(newComments) => onTaskUpdate?.({ ...buildUpdated(), comments: newComments })}
              />
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

        {/* Discard confirmation banner */}
        {showDiscardConfirm && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-amber-700 dark:text-amber-400">You have unsaved changes. Discard changes?</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                onClick={handleConfirmDiscard}
              >
                Discard
              </button>
              <button
                className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Keep Editing
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#232838] bg-slate-50/50 dark:bg-[#141720]/50 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {hasChanges && <span className="text-orange-500 font-medium">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors"
              onClick={handleClose}
            >
              {hasChanges ? "Discard" : "Close"}
            </button>
            <button
              className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSave}
            >
              {isCreate ? "Create Task" : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
