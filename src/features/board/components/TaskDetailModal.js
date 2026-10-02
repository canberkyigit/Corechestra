import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { normalizeLinkedItem } from "../../../shared/utils/entityRegistry";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { taskSchema } from "../../../shared/schemas";
import { AppButton } from "../../../shared/components/AppPrimitives";
import SubtaskDetailPanel from "./SubtaskDetailPanel";
import { TASK_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useWorkflowGuard } from "../hooks/useWorkflowGuard";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import {
  ActivityLog,
  FieldLabel,
  TaskInlineComments,
  TaskLinksSection,
  TaskSidebar,
  TaskSubtasksSection,
} from "./task-modal/TaskDetailSections";
import TaskModalHeader from "./task-modal/TaskModalHeader";
import { useFocusTrap } from "../../../shared/hooks/useFocusTrap";
import TaskInlineSubtasks from "./task-modal/TaskInlineSubtasks";
import TaskInlineLinks from "./task-modal/TaskInlineLinks";
import { TaskEpicPicker, TaskLabelsPicker, TaskWatchersPicker } from "./task-modal/TaskModalFields";
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

const fmtDate = (value) => {
  if (!value) return "—";
  try { return format(parseISO(value), "MMM d, yyyy"); } catch { return value; }
};


const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

export default function TaskDetailModal({
  open,
  onClose,
  task,
  onTaskUpdate,
  allTasks = [],
  isCreate = false,
  initialDirty = false,
  sprintOptions = [],
  selectedSprint,
  setSelectedSprint,
  onOpenPanel,
}) {
  const { labels, deleteTask, restoreTask, logActivity, sprint, users } = useApp();
  const { canCreateTask, canEditTask, canArchiveTask } = useBoardPermissions();
  const readOnly = isCreate ? !canCreateTask : !canEditTask;
  const { addToast } = useToast();
  const { guardStatusChange, dialog: workflowDialog } = useWorkflowGuard();

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
  const [inlineSubOpen, setInlineSubOpen] = useState(false);
  const [inlineSubTitle, setInlineSubTitle] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openSubtask, setOpenSubtask] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const projectId = task?.projectId;
  const projectAssignees = useProjectAssignees(projectId);
  const projectEpics = useProjectEpics(projectId, epicId);
  const statusOptions = useTaskStatusOptions(projectId, status);
  const links = useTaskLinkSearch({ task, allTasks, linkedItems });
  const { closeLinkSearch } = links;

  // UNSET = form not initialised for the current open; new tasks have no id (normalised to null),
  // so a fresh `task={{}}` object on every parent render must not re-initialise the form.
  const UNSET = useRef(Symbol("unset")).current;
  const prevTaskId = useRef(UNSET);

  useEffect(() => {
    if (!open) {
      prevTaskId.current = UNSET;
      return;
    }
    if (!task || (task.id ?? null) === prevTaskId.current) return;
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
    closeLinkSearch();
    // Opened from the side panel with unsaved edits → keep them flagged.
    setHasChanges(Boolean(initialDirty));
    setActiveTab("details");
    setConfirmDelete(false);
    setShowDiscardConfirm(false);
  }, [open, task]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const finishSave = (extraPatch = {}) => {
    const updated = { ...buildUpdated(), ...extraPatch };
    const result = onTaskUpdate ? onTaskUpdate(updated) : undefined;
    if (result && result.ok === false) return;
    if (!isCreate && task.id) logActivity(task.id, "updated task");
    setHasChanges(false);
    addToast(isCreate ? "Task created" : "Changes saved", isCreate ? "info" : "success");
    if (isCreate) onClose();
  };

  const handleSave = () => {
    if (readOnly) return;
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
    // Status changes go through the project's workflow rules (may prompt for
    // a blocker reason); unchanged status saves synchronously.
    if (!isCreate && task.status && status !== task.status) {
      guardStatusChange(task, status).then((verdict) => {
        if (verdict.ok) finishSave(verdict.patch);
      });
      return;
    }
    finishSave();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleEscape = useCallback(() => {
    if (confirmDelete) { setConfirmDelete(false); return; }
    if (showDiscardConfirm) { setShowDiscardConfirm(false); return; }
    handleClose();
  }, [confirmDelete, showDiscardConfirm, hasChanges]); // eslint-disable-line react-hooks/exhaustive-deps
  useEscapeKey(handleEscape, Boolean(shouldRender) && !openSubtask);

  const panelRef = useRef(null);
  useFocusTrap(panelRef, Boolean(shouldRender) && Boolean(open) && !openSubtask, { focusContainer: !isCreate });

  // ⌘/Ctrl+Enter saves from anywhere in the dialog (incl. textareas).
  const handlePanelKeyDown = (event) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || event.isComposing) return;
    event.preventDefault();
    handleSave();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setHasChanges(false);
    onClose();
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

  const toggleLabel = (id) => {
    setTaskLabels((prev) => (prev.includes(id) ? prev.filter((labelId) => labelId !== id) : [...prev, id]));
    changed();
  };

  const toggleWatcher = (name) => {
    setWatchers((prev) => (prev.includes(name) ? prev.filter((watcher) => watcher !== name) : [...prev, name]));
    changed();
  };

  const toggleSubtask = (id) => {
    setSubtasks((prev) => prev.map((subtask) => (subtask.id === id ? { ...subtask, done: !subtask.done } : subtask)));
    changed();
  };

  const updateSubtask = (id, updates) => {
    setSubtasks((prev) => prev.map((subtask) => (subtask.id === id ? { ...subtask, ...updates } : subtask)));
    changed();
  };

  const removeSubtask = (id) => {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
    changed();
  };

  const addInlineSub = () => {
    if (!inlineSubTitle.trim()) return;
    setSubtasks((prev) => [...prev, createSubtask(inlineSubTitle)]);
    setInlineSubTitle("");
    setInlineSubOpen(false);
    changed();
  };

  const handleAddLink = (target) => {
    setLinkedItems((prev) => [...prev, buildLink(target, links.linkRelationship)]);
    closeLinkSearch();
    changed();
  };

  const handleRemoveLink = (linkId) => {
    setLinkedItems((prev) => prev.filter((link) => link.id !== linkId));
    changed();
  };

  const handleFiles = (files) => {
    readAttachmentFiles(files, {
      onAttachment: (attachment) => {
        setAttachments((prev) => [...prev, attachment]);
        changed();
      },
      onReject: (file) => addToast(`File "${file.name}" exceeds 5 MB limit`, "error"),
    });
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    changed();
  };

  const typeInfo = TASK_TYPE_OPTIONS.find((option) => option.value === type) || TASK_TYPE_OPTIONS[0];

  const tabs = [
    { id: "details", label: "Details" },
    { id: "subtasks", label: `Subtasks${subtasks.length > 0 ? ` (${subtasks.length})` : ""}` },
    { id: "links", label: `Links${linkedItems.length > 0 ? ` (${linkedItems.length})` : ""}` },
    ...(!isCreate ? [
      { id: "comments", label: "Comments" },
      { id: "activity", label: "Activity" },
    ] : []),
  ];

  const completedSubs = subtasks.filter((subtask) => subtask.done).length;

  return (
    <>
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
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={isCreate ? "Create task" : `Task ${title || ""}`.trim()}
              onKeyDown={handlePanelKeyDown}
              className="app-surface focus:outline-none rounded-t-2xl md:rounded-3xl w-full max-w-5xl md:mx-4 flex flex-col max-h-[92dvh] md:max-h-[90vh] overflow-hidden transition-colors relative"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <SubtaskDetailPanel
                subtask={openSubtask}
                parentTask={task}
                open={!!openSubtask}
                readOnly={readOnly}
                onClose={() => setOpenSubtask(null)}
                onSave={(updated) => {
                  setSubtasks((prev) => prev.map((subtask) => (subtask.id === updated.id ? updated : subtask)));
                  setOpenSubtask(updated);
                  changed();
                }}
              />

              <TaskModalHeader
                typeInfo={typeInfo}
                task={task}
                isCreate={isCreate}
                title={title}
                titleError={titleError}
                readOnly={readOnly}
                onTitleChange={(value) => { setTitle(value); setTitleError(false); changed(); }}
                onOpenPanel={!isCreate && onOpenPanel ? () => onOpenPanel(buildUpdated(), { hasChanges }) : null}
                onDelete={!isCreate && canArchiveTask ? () => setConfirmDelete(true) : null}
                onClose={handleClose}
              />

              {confirmDelete && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-red-700 dark:text-red-400">Move this task to the archive?</span>
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
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-2.5 md:px-3 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors mr-1 whitespace-nowrap ${
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
                  <div className="flex flex-col md:flex-row gap-0 min-h-0">
                    <div className="flex-1 p-5 md:p-6 space-y-5 min-w-0">
                      <div>
                        <FieldLabel>Description</FieldLabel>
                        <textarea
                          className="app-textarea text-sm resize-none"
                          rows={4}
                          placeholder="Add a description..."
                          value={description}
                          disabled={readOnly}
                          onChange={(event) => { setDescription(event.target.value); changed(); }}
                        />
                      </div>

                      <TaskLabelsPicker labels={labels || []} selected={taskLabels} onToggle={toggleLabel} readOnly={readOnly} />
                      <TaskEpicPicker epics={projectEpics} value={epicId} onChange={(value) => { setEpicId(value); changed(); }} readOnly={readOnly} />
                      <TaskWatchersPicker members={projectAssignees} watchers={watchers} onToggle={toggleWatcher} readOnly={readOnly} />

                      <TaskInlineSubtasks
                        subtasks={subtasks}
                        inlineSubOpen={inlineSubOpen}
                        setInlineSubOpen={setInlineSubOpen}
                        inlineSubTitle={inlineSubTitle}
                        setInlineSubTitle={setInlineSubTitle}
                        onAdd={addInlineSub}
                        onToggle={toggleSubtask}
                        onOpen={setOpenSubtask}
                        onRemove={removeSubtask}
                        readOnly={readOnly}
                      />

                      <TaskInlineLinks
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

                      {!isCreate && (
                        <TaskInlineComments
                          task={task}
                          allTasks={allTasks}
                          buildUpdated={buildUpdated}
                          onTaskUpdate={onTaskUpdate}
                        />
                      )}

                      <TaskAttachments
                        attachments={attachments}
                        onFiles={handleFiles}
                        onRemove={removeAttachment}
                        readOnly={readOnly}
                        label={(
                          <FieldLabel>
                            Attachments {attachments.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 dark:bg-[#2a3044] text-slate-500 dark:text-slate-400 px-1.5 rounded-full normal-case">{attachments.length}</span>}
                          </FieldLabel>
                        )}
                      />
                    </div>

                    <TaskSidebar
                      statusOptions={statusOptions}
                      readOnly={readOnly}
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
                    users={users}
                  />
                )}

                {activeTab === "links" && (
                  <TaskLinksSection
                    linkedItems={linkedItems}
                    linkSearchOpen={links.linkSearchOpen}
                    setLinkSearchOpen={links.setLinkSearchOpen}
                    linkRelationship={links.linkRelationship}
                    setLinkRelationship={links.setLinkRelationship}
                    linkSearch={links.linkSearch}
                    setLinkSearch={links.setLinkSearch}
                    linkSearchResults={links.linkSearchResults}
                    handleAddLink={handleAddLink}
                    linkedByRelationship={links.linkedByRelationship}
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

              {showDiscardConfirm && (
                <div role="alert" data-testid="task-discard-confirm" className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <span className="text-sm text-amber-700 dark:text-amber-400">You have unsaved changes. Discard changes?</span>
                  <div className="flex gap-2">
                    <AppButton size="sm" variant="danger" onClick={handleConfirmDiscard}>Discard</AppButton>
                    <AppButton size="sm" variant="secondary" onClick={() => setShowDiscardConfirm(false)}>Keep Editing</AppButton>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t app-divider bg-slate-50/70 dark:bg-[#141720]/60 flex-shrink-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  {hasChanges && <span className="text-orange-500 font-medium">Unsaved changes</span>}
                  {!readOnly && (
                    <span className="hidden md:inline">
                      <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] font-sans">{IS_MAC ? "⌘" : "Ctrl"}</kbd>
                      {" + "}
                      <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] font-sans">Enter</kbd>
                      {isCreate ? " to create" : " to save"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AppButton variant="secondary" onClick={handleClose}>
                    {hasChanges ? "Discard" : "Close"}
                  </AppButton>
                  {readOnly ? (
                    <span className="px-4 py-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#2a3044] rounded-lg cursor-not-allowed" title="You do not have permission to edit tasks">
                      Read-only
                    </span>
                  ) : (
                    <AppButton variant="primary" onClick={handleSave}>
                      {isCreate ? "Create Task" : "Save Changes"}
                    </AppButton>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {workflowDialog}
    </>
  );
}
