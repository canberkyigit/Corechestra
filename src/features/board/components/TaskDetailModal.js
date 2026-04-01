import React, { useState, useEffect, useRef, useMemo } from "react";
import { taskKey } from "../../../shared/utils/helpers";
import {
  buildEntityRegistry,
  findLinkableEntities,
  groupLinkedItemsByRelationship,
  normalizeLinkedItem,
} from "../../../shared/utils/entityRegistry";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox } from "@headlessui/react";
import {
  FaTimes, FaTrash, FaCheck, FaPlus, FaChevronDown, FaSearch,
  FaEye, FaEyeSlash, FaTag, FaLink,
  FaCompress,
  FaCloudUploadAlt, FaFileAlt,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { taskSchema } from "../../../shared/schemas";
import { AppButton } from "../../../shared/components/AppPrimitives";
import SubtaskDetailPanel from "./SubtaskDetailPanel";
import { format, parseISO } from "date-fns";
import { TYPE_OPTIONS } from "../constants/taskOptions";
import {
  ActivityLog,
  FieldLabel,
  LINK_RELATIONSHIPS,
  TaskInlineComments,
  TaskLinksSection,
  TaskSidebar,
  TaskSubtasksSection,
} from "./task-modal/TaskDetailSections";

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
  const {
    epics,
    labels,
    deleteTask,
    logActivity,
    sprint,
    teamMembers,
    currentProjectId,
    projects,
    docPages,
    spaces,
    releases,
    testSuites,
    testCases,
    testRuns,
  } = useApp();
  const { role } = useAuth();
  const isViewer = role === "viewer";

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectMemberSet = new Set(currentProject?.memberUsernames || []);
  const projectAssignees = projectMemberSet.size > 0
    ? teamMembers.filter((m) => m.value === "unassigned" || projectMemberSet.has(m.value))
    : teamMembers.filter((m) => m.value !== "");
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
    setWatchers(task.watchers || []);
    setSubtasks(task.subtasks || []);
    setLinkedItems((task.linkedItems || []).map(normalizeLinkedItem).filter(Boolean));
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

  const entityRegistry = useMemo(() => (
    buildEntityRegistry({
      tasks: allTasks,
      docPages,
      spaces,
      releases,
      testSuites,
      testCases,
      testRuns,
    })
  ), [allTasks, docPages, releases, spaces, testCases, testRuns, testSuites]);

  // ── Must be before early return (hooks rules) ─────────────────────────────
  const linkSearchResults = useMemo(() => (
    findLinkableEntities(linkSearch, entityRegistry.entities, {
      sourceRef: task?.id ? { type: "task", id: task.id } : null,
      linkedItems,
    })
  ), [entityRegistry.entities, linkSearch, linkedItems, task]);

  const linkedByRelationship = useMemo(() => {
    return groupLinkedItemsByRelationship(linkedItems, entityRegistry.entityMap);
  }, [entityRegistry.entityMap, linkedItems]);

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
    if (isViewer) return;
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
    const targetEntity = typeof targetId === "object" ? targetId : { type: "task", id: targetId };
    setLinkedItems((prev) => [...prev, {
      id: Date.now().toString(),
      targetType: targetEntity.type || "task",
      targetId: targetEntity.id,
      relationship: linkRelationship,
      createdAt: new Date().toISOString(),
    }]);
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
  ];

  const completedSubs = subtasks.filter((s) => s.done).length;

  return (
    <AnimatePresence>
      {shouldRender && (
    <motion.div
      key="modal-backdrop"
      data-testid="task-detail-modal"
      className="fixed inset-0 z-50 flex items-end md:items-start justify-center md:pt-10 md:pb-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClose}
    >
      <motion.div
        className="app-surface rounded-t-2xl md:rounded-3xl w-full max-w-5xl md:mx-4 flex flex-col max-h-[92dvh] md:max-h-[90vh] overflow-hidden transition-colors relative"
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
        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-4 border-b app-divider flex-shrink-0 bg-white/70 dark:bg-[#171b28]/70">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")} dark:bg-white/10`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          {!isCreate && task?.id && (
            <span className="app-meta-pill font-mono">
              {taskKey(task.id)}
            </span>
          )}
          <input
            className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 ${titleError ? "text-red-500 placeholder-red-300" : "text-slate-800 dark:text-slate-100 placeholder-slate-300"}`}
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
              <AppButton size="sm" variant="danger" onClick={handleDelete}>Delete</AppButton>
              <AppButton size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</AppButton>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b app-divider px-4 md:px-6 flex-shrink-0 overflow-x-auto scrollbar-none bg-slate-50/65 dark:bg-[#151a27]/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-2.5 md:px-3 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors mr-1 whitespace-nowrap ${
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
            <div className="flex flex-col md:flex-row gap-0 min-h-0">
              {/* Main */}
              <div className="flex-1 p-5 md:p-6 space-y-5 min-w-0">
                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    className="app-textarea text-sm resize-none"
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
                    {projectAssignees.filter(m => m.value && m.value !== "unassigned").map((member) => (
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
                                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">{taskKey(t.id)}</span>
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
                                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">{taskKey(linkedTask.id)}</span>
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

                {!isCreate && (
                  <TaskInlineComments
                    task={task}
                    allTasks={allTasks}
                    buildUpdated={buildUpdated}
                    onTaskUpdate={onTaskUpdate}
                  />
                )}

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

              <TaskSidebar
                status={status}
                setStatus={setStatus}
                priority={priority}
                setPriority={setPriority}
                type={type}
                setType={setType}
                projectAssignees={projectAssignees}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                dueDate={dueDate}
                setDueDate={setDueDate}
                storyPoint={storyPoint}
                setStoryPoint={setStoryPoint}
                isCreate={isCreate}
                sprintOptions={sprintOptions}
                selectedSprint={selectedSprint}
                setSelectedSprint={setSelectedSprint}
                sprint={sprint}
                fmtDate={fmtDate}
                task={task}
                changed={changed}
              />
            </div>
          )}

          {activeTab === "subtasks" && (
            <TaskSubtasksSection
              subtasks={subtasks}
              completedSubs={completedSubs}
              inlineSubOpen={inlineSubOpen}
              setInlineSubOpen={setInlineSubOpen}
              inlineSubTitle={inlineSubTitle}
              setInlineSubTitle={setInlineSubTitle}
              addInlineSub={addInlineSub}
              toggleSubtask={toggleSubtask}
              updateSubtask={updateSubtask}
              setOpenSubtask={setOpenSubtask}
              changed={changed}
              setSubtasks={setSubtasks}
              projectAssignees={projectAssignees}
            />
          )}

          {activeTab === "links" && (
            <TaskLinksSection
              linkedItems={linkedItems}
              linkSearchOpen={linkSearchOpen}
              setLinkSearchOpen={setLinkSearchOpen}
              linkRelationship={linkRelationship}
              setLinkRelationship={setLinkRelationship}
              linkSearch={linkSearch}
              setLinkSearch={setLinkSearch}
              linkSearchResults={linkSearchResults}
              handleAddLink={handleAddLink}
              linkedByRelationship={linkedByRelationship}
              handleRemoveLink={handleRemoveLink}
            />
          )}

          {activeTab === "comments" && (
            <div className="p-5">
              <TaskInlineComments task={task} allTasks={allTasks} buildUpdated={buildUpdated} onTaskUpdate={onTaskUpdate} />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="p-5">
              <ActivityLog task={task} />
            </div>
          )}

        </div>

        {/* Discard confirmation banner */}
        {showDiscardConfirm && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-amber-700 dark:text-amber-400">You have unsaved changes. Discard changes?</span>
            <div className="flex gap-2">
              <AppButton size="sm" variant="danger" onClick={handleConfirmDiscard}>Discard</AppButton>
              <AppButton size="sm" variant="secondary" onClick={() => setShowDiscardConfirm(false)}>Keep Editing</AppButton>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t app-divider bg-slate-50/70 dark:bg-[#141720]/60 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {hasChanges && <span className="text-orange-500 font-medium">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <AppButton
              variant="secondary"
              onClick={handleClose}
            >
              {hasChanges ? "Discard" : "Close"}
            </AppButton>
            {isViewer ? (
              <span className="px-4 py-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#2a3044] rounded-lg cursor-not-allowed" title="Viewers cannot edit tasks">
                Read-only
              </span>
            ) : (
              <AppButton onClick={handleSave}>
                {isCreate ? "Create Task" : "Save Changes"}
              </AppButton>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
