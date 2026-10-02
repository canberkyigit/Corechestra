import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaTrash, FaEye, FaEyeSlash, FaExpand } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { normalizeLinkedItem } from "../../../shared/utils/entityRegistry";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { AppBadge, AppButton, getTaskStatusTone } from "../../../shared/components/AppPrimitives";
import CommentSection from "../../docs/components/CommentSection";
import SubtaskDetailPanel from "./SubtaskDetailPanel";
import { TASK_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useWorkflowGuard } from "../hooks/useWorkflowGuard";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import PanelMiniSelect from "./task-panel/PanelMiniSelect";
import PanelQuickFields from "./task-panel/PanelQuickFields";
import PanelSubtasksTable from "./task-panel/PanelSubtasksTable";
import PanelLinkedItems from "./task-panel/PanelLinkedItems";
import PanelSubtasksTab from "./task-panel/PanelSubtasksTab";
import { usePanelResize } from "./task-panel/usePanelResize";
import TaskAttachments from "./task-shared/TaskAttachments";
import {
  buildLink,
  createSubtask,
  readAttachmentFiles,
  useProjectAssignees,
  useProjectEpics,
  useTaskLinkSearch,
  useTaskStatusOptions,
} from "./task-shared/taskDetailHooks";

const TaskDetailModal = lazy(() => import("./TaskDetailModal"));

/**
 * Resizable right-hand task panel. Action fields (status, priority, assignee,
 * type, due date, epic, subtasks, links, attachments) auto-save; title,
 * description, story points and watchers need Save.
 *
 * "Open full view" calls `onOpenModal(draft, { hasChanges })` when provided;
 * otherwise the panel opens the full TaskDetailModal itself with the unsaved
 * draft applied.
 */
export default function TaskSidePanel({ task, open, onClose, onTaskUpdate, onOpenModal }) {
  const { labels, deleteTask, restoreTask, logActivity, allTasks, users } = useApp();
  const { addToast } = useToast();
  const { canEditTask, canArchiveTask } = useBoardPermissions();
  const readOnly = !canEditTask;
  const { guardStatusChange, dialog: workflowDialog } = useWorkflowGuard();
  const { width, isMobile, startResize } = usePanelResize();

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
  const [attachments, setAttachments] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [inlineSubOpen, setInlineSubOpen] = useState(false);
  const [inlineSubTitle, setInlineSubTitle] = useState("");
  const [openSubtask, setOpenSubtask] = useState(null);
  const [fullView, setFullView] = useState(null);
  const prevId = useRef(null);

  const projectId = task?.projectId;
  const projectAssignees = useProjectAssignees(projectId);
  const projectEpics = useProjectEpics(projectId, epicId);
  const statusOptions = useTaskStatusOptions(projectId, status);
  const links = useTaskLinkSearch({ task, allTasks, linkedItems });
  const { closeLinkSearch } = links;

  const syncActionFields = useCallback((source) => {
    setStatus(source.status || "todo");
    setPriority((source.priority || "medium").toLowerCase());
    setAssignedTo(source.assignedTo || "unassigned");
    setType(source.type || "task");
    setDueDate(source.dueDate || "");
    setStoryPoint(source.storyPoint ?? "");
    setEpicId(source.epicId || null);
    setTaskLabels(source.labels || []);
    setWatchers(source.watchers || []);
    setSubtasks(source.subtasks || []);
    setLinkedItems((source.linkedItems || []).map(normalizeLinkedItem).filter(Boolean));
    setAttachments(source.attachments || []);
  }, []);

  useEffect(() => {
    if (!open || !task) return;
    const isNewTask = task.id !== prevId.current;
    prevId.current = task.id;

    // Always sync action fields so external updates (drag-and-drop, etc.) show.
    syncActionFields(task);

    // Only reset text fields / UI state when switching tasks, so in-progress
    // title/description edits survive external updates.
    if (isNewTask) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setHasChanges(false);
      setConfirmDelete(false);
      setShowDiscardConfirm(false);
      setActiveTab("details");
      setInlineSubOpen(false);
      closeLinkSearch();
    }
  }, [open, task]); // eslint-disable-line react-hooks/exhaustive-deps

  const shouldRender = Boolean(open && task);
  const changed = () => setHasChanges(true);

  const buildUpdated = () => ({
    ...task,
    title, description, type, status, priority, assignedTo,
    dueDate, storyPoint: storyPoint !== "" ? Number(storyPoint) : undefined,
    epicId, labels: taskLabels, watchers, subtasks, linkedItems,
    attachments,
    comments: task.comments || [],
  });

  // Persist action-field changes immediately; `patch` overrides stale state.
  const autoSave = (patch) => {
    if (readOnly) return;
    onTaskUpdate?.({ ...buildUpdated(), ...patch });
  };

  const handleClose = () => {
    if (hasChanges) setShowDiscardConfirm(true);
    else onClose();
  };

  const handleEscape = () => {
    if (confirmDelete) { setConfirmDelete(false); return; }
    if (showDiscardConfirm) { setShowDiscardConfirm(false); return; }
    handleClose();
  };
  useEscapeKey(handleEscape, shouldRender && !openSubtask && !fullView);

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setHasChanges(false);
    onClose();
  };

  const handleSave = () => {
    if (!title.trim() || readOnly) return;
    onTaskUpdate?.(buildUpdated());
    if (task.id) logActivity(task.id, "updated task");
    setHasChanges(false);
    addToast("Changes saved", "success");
  };

  const handleDelete = () => {
    if (!canArchiveTask) return;
    const taskId = task.id;
    const archived = taskId ? deleteTask(taskId) : false;
    addToast("Task moved to archive", "info", archived && restoreTask ? {
      action: { label: "Undo", onClick: () => restoreTask(taskId) },
    } : undefined);
    onClose();
  };

  const handleStatusChange = async (nextStatus) => {
    if (readOnly || nextStatus === status) return;
    const verdict = await guardStatusChange({ ...task, status }, nextStatus);
    if (!verdict.ok) return;
    setStatus(nextStatus);
    autoSave(verdict.patch);
  };

  const addInlineSub = () => {
    if (!inlineSubTitle.trim()) return;
    const nextSubtasks = [...subtasks, createSubtask(inlineSubTitle)];
    setSubtasks(nextSubtasks);
    setInlineSubTitle("");
    setInlineSubOpen(false);
    autoSave({ subtasks: nextSubtasks });
  };

  const toggleSubtask = (id) => {
    const nextSubtasks = subtasks.map((subtask) => (subtask.id === id ? { ...subtask, done: !subtask.done } : subtask));
    setSubtasks(nextSubtasks);
    autoSave({ subtasks: nextSubtasks });
  };

  const updateSubtask = (id, updates) => {
    const nextSubtasks = subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...updates } : subtask));
    setSubtasks(nextSubtasks);
    autoSave({ subtasks: nextSubtasks });
  };

  const removeSubtask = (id) => {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
    changed();
  };

  const handleAddLink = (target) => {
    if (readOnly) return;
    const nextLinks = [...linkedItems, buildLink(target, links.linkRelationship)];
    setLinkedItems(nextLinks);
    autoSave({ linkedItems: nextLinks });
    closeLinkSearch();
  };

  const handleRemoveLink = (linkId) => {
    if (readOnly) return;
    const nextLinks = linkedItems.filter((link) => link.id !== linkId);
    setLinkedItems(nextLinks);
    autoSave({ linkedItems: nextLinks });
  };

  const handleFiles = (files) => {
    if (readOnly) return;
    readAttachmentFiles(files, {
      onAttachment: (attachment) => {
        setAttachments((prev) => {
          const next = [...prev, attachment];
          autoSave({ attachments: next });
          return next;
        });
      },
      onReject: (file) => addToast(`File "${file.name}" exceeds 5 MB limit`, "error"),
    });
  };

  const removeAttachment = (id) => {
    if (readOnly) return;
    const next = attachments.filter((attachment) => attachment.id !== id);
    setAttachments(next);
    autoSave({ attachments: next });
  };

  const openFullView = () => {
    const draft = buildUpdated();
    if (onOpenModal) {
      onOpenModal(draft, { hasChanges });
      return;
    }
    setFullView({ task: draft, hasChanges });
  };

  const typeInfo = TASK_TYPE_OPTIONS.find((option) => option.value === type) || TASK_TYPE_OPTIONS[0];
  const TypeIcon = typeInfo.icon;
  const taskLabelObjects = (taskLabels || []).map((id) => (labels || []).find((label) => label.id === id)).filter(Boolean);
  const statusLabel = statusOptions.find((option) => option.value === status)?.label || status;

  // Built-in full view (used when no onOpenModal handler is supplied).
  if (fullView && open) {
    return (
      <Suspense fallback={null}>
        <TaskDetailModal
          open
          task={fullView.task}
          initialDirty={fullView.hasChanges}
          allTasks={allTasks}
          onTaskUpdate={onTaskUpdate}
          onClose={() => { setFullView(null); onClose(); }}
          onOpenPanel={(draft, meta) => {
            // Back to the panel with the modal's unsaved edits applied.
            setTitle(draft.title || "");
            setDescription(draft.description || "");
            syncActionFields(draft);
            setHasChanges(Boolean(meta?.hasChanges));
            setFullView(null);
          }}
        />
      </Suspense>
    );
  }

  return (
    <>
      <AnimatePresence>
        {shouldRender && (
          <motion.div
            key="task-side-panel-backdrop"
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
        )}
        {shouldRender && (
          <motion.div
            key="task-side-panel"
            role="dialog"
            aria-label={`Task ${taskKey(task.id)}`}
            className="fixed top-0 right-0 h-full z-40 app-surface border-l border-slate-200 dark:border-[#2a3044] shadow-2xl flex flex-col overflow-hidden"
            style={{ width }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <SubtaskDetailPanel
              subtask={openSubtask}
              parentTask={task}
              open={!!openSubtask}
              readOnly={readOnly}
              onClose={() => setOpenSubtask(null)}
              onSave={(updated) => {
                const nextSubtasks = subtasks.map((subtask) => (subtask.id === updated.id ? updated : subtask));
                setSubtasks(nextSubtasks);
                setOpenSubtask(updated);
                autoSave({ subtasks: nextSubtasks });
              }}
            />

            {!isMobile && (
              <div className="absolute top-0 left-0 h-full w-2 cursor-col-resize z-50 group flex items-stretch" onMouseDown={startResize}>
                <div className="w-px h-full bg-slate-200 dark:bg-[#2a3044] group-hover:bg-blue-400 group-hover:w-0.5 transition-all ml-0.5" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b app-divider flex-shrink-0 pl-4 bg-white/70 dark:bg-[#171b28]/70">
              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${typeInfo.color.replace("text-", "bg-").replace("500", "50").replace("600", "50")} dark:bg-white/10`}>
                <TypeIcon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
              </div>
              <span className="app-meta-pill font-mono">{taskKey(task.id)}</span>
              <input
                className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none placeholder-slate-300 dark:placeholder-slate-600 min-w-0 disabled:cursor-not-allowed"
                placeholder="Task title..."
                value={title}
                onChange={(event) => { setTitle(event.target.value); changed(); }}
                disabled={readOnly}
              />
              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  onClick={openFullView}
                  title="Open full view"
                >
                  <FaExpand className="w-3.5 h-3.5" />
                </button>
                {canArchiveTask && (
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    onClick={() => setConfirmDelete(true)}
                    title="Delete"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] rounded transition-colors"
                  onClick={handleClose}
                  title="Close"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>

            {confirmDelete && (
              <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-red-700 dark:text-red-400">Move this task to the archive?</span>
                <div className="flex gap-2">
                  <AppButton size="sm" variant="danger" onClick={handleDelete}>Delete</AppButton>
                  <AppButton size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</AppButton>
                </div>
              </div>
            )}

            {/* Status row */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b app-divider flex-shrink-0 flex-wrap bg-slate-50/65 dark:bg-[#151a27]/80">
              <AppBadge tone={getTaskStatusTone(status)}>{statusLabel}</AppBadge>
              <PanelMiniSelect
                value={status}
                options={statusOptions}
                onChange={handleStatusChange}
                renderValue={() => <span className="text-slate-500 dark:text-slate-400">Change status</span>}
                renderOption={(option) => option.label}
                disabled={readOnly}
              />
              {status === "blocked" && task.blockReason && (
                <span className="text-[11px] text-red-600 dark:text-red-400 truncate max-w-full" title={task.blockReason}>
                  Blocked: {task.blockReason}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b app-divider px-4 flex-shrink-0 bg-slate-50/65 dark:bg-[#151a27]/80">
              {[
                { id: "details", label: "Details" },
                { id: "subtasks", label: `Subtasks (${subtasks.length})` },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors mr-1 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
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
                <div className="p-4 space-y-4">
                  <PanelQuickFields
                    priority={priority}
                    assignedTo={assignedTo}
                    type={type}
                    storyPoint={storyPoint}
                    dueDate={dueDate}
                    epicId={epicId}
                    projectAssignees={projectAssignees}
                    epics={projectEpics}
                    readOnly={readOnly}
                    onPriorityChange={(value) => { setPriority(value); autoSave({ priority: value }); }}
                    onAssigneeChange={(value) => { setAssignedTo(value); autoSave({ assignedTo: value }); }}
                    onTypeChange={(value) => { setType(value); autoSave({ type: value }); }}
                    onStoryPointChange={(value) => { setStoryPoint(value); changed(); }}
                    onDueDateChange={(value) => { setDueDate(value); autoSave({ dueDate: value }); }}
                    onEpicChange={(value) => { setEpicId(value); autoSave({ epicId: value }); }}
                  />

                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Description</div>
                    <textarea
                      className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      rows={3}
                      placeholder="Add a description..."
                      value={description}
                      onChange={(event) => { setDescription(event.target.value); changed(); }}
                      disabled={readOnly}
                    />
                  </div>

                  {taskLabelObjects.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Labels</div>
                      <div className="flex flex-wrap gap-1.5">
                        {taskLabelObjects.map((label) => (
                          <span
                            key={label.id}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${label.color}22`, color: label.color, border: `1px solid ${label.color}44` }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Watchers</div>
                    <div className="flex flex-wrap gap-1.5">
                      {projectAssignees.filter((member) => member.value && member.value !== "unassigned").map((member) => {
                        const watching = watchers.includes(member.value);
                        return (
                          <button
                            type="button"
                            key={member.value}
                            disabled={readOnly}
                            onClick={() => {
                              setWatchers((prev) => (watching ? prev.filter((watcher) => watcher !== member.value) : [...prev, member.value]));
                              changed();
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${watching ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"}`}
                          >
                            {watching ? <FaEye className="w-2.5 h-2.5" /> : <FaEyeSlash className="w-2.5 h-2.5" />}
                            <span>{member.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <PanelSubtasksTable
                    subtasks={subtasks}
                    projectAssignees={projectAssignees}
                    users={users}
                    readOnly={readOnly}
                    inlineSubOpen={inlineSubOpen}
                    setInlineSubOpen={setInlineSubOpen}
                    inlineSubTitle={inlineSubTitle}
                    setInlineSubTitle={setInlineSubTitle}
                    onAdd={addInlineSub}
                    onToggle={toggleSubtask}
                    onUpdate={updateSubtask}
                    onRemove={removeSubtask}
                    onOpen={setOpenSubtask}
                  />

                  <PanelLinkedItems
                    linkedItems={linkedItems}
                    linkSearchOpen={links.linkSearchOpen}
                    setLinkSearchOpen={links.setLinkSearchOpen}
                    linkRelationship={links.linkRelationship}
                    setLinkRelationship={links.setLinkRelationship}
                    linkSearch={links.linkSearch}
                    setLinkSearch={links.setLinkSearch}
                    linkSearchResults={links.linkSearchResults}
                    closeLinkSearch={closeLinkSearch}
                    linkedByRelationship={links.linkedByRelationship}
                    onAddLink={handleAddLink}
                    onRemoveLink={handleRemoveLink}
                    readOnly={readOnly}
                  />

                  <TaskAttachments
                    variant="panel"
                    attachments={attachments}
                    onFiles={handleFiles}
                    onRemove={removeAttachment}
                    readOnly={readOnly}
                  />

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

              {activeTab === "subtasks" && (
                <PanelSubtasksTab
                  subtasks={subtasks}
                  readOnly={readOnly}
                  inlineSubTitle={inlineSubTitle}
                  setInlineSubTitle={setInlineSubTitle}
                  onAdd={addInlineSub}
                  onToggle={toggleSubtask}
                  onRemove={removeSubtask}
                />
              )}
            </div>

            {showDiscardConfirm && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-amber-700 dark:text-amber-400">You have unsaved changes. Discard?</span>
                <div className="flex gap-2">
                  <AppButton size="sm" variant="danger" onClick={handleConfirmDiscard}>Discard</AppButton>
                  <AppButton size="sm" variant="secondary" onClick={() => setShowDiscardConfirm(false)}>Keep Editing</AppButton>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-[#232838] bg-slate-50/50 dark:bg-[#141720]/50 flex-shrink-0">
              <div className="text-xs text-orange-500 font-medium">{hasChanges ? "Unsaved changes" : readOnly ? <span className="text-slate-400">Read-only</span> : ""}</div>
              <div className="flex gap-2">
                <AppButton variant="secondary" size="sm" onClick={handleClose}>
                  Close
                </AppButton>
                <AppButton size="sm" onClick={handleSave} disabled={!title.trim() || readOnly}>
                  Save
                </AppButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {workflowDialog}
    </>
  );
}
