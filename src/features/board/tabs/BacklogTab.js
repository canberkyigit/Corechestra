import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaArrowRight, FaTrash, FaPencilAlt, FaSearch, FaPlay, FaPlus } from "react-icons/fa";
import TaskRow from "../components/TaskRow";
import { useApp } from "../../../shared/context/AppContext";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import { useToast } from "../../../shared/context/ToastContext";
import { useWorkflowGuard } from "../hooks/useWorkflowGuard";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { AppButton } from "../../../shared/components/AppPrimitives";
import { buildStatusOptions } from "../utils/boardColumns";
import { toFullListIndex } from "../utils/boardDnd";
import { isInProject } from "../../../shared/utils/helpers";

const TASKS_PER_PAGE = 20;

function SubtaskList({ task, onToggle, readOnly }) {
  return (
    <div className="ml-8 bg-slate-50 dark:bg-[#232838] border-l-2 border-blue-200 dark:border-blue-900 p-3">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subtasks:</div>
      <ul className="space-y-2">
        {task.subtasks.map((sub) => (
          <li key={sub.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(sub.done)}
              disabled={readOnly}
              onChange={() => onToggle(task, sub.id)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${sub.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>
              {sub.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const matchesSearch = (task, query) => {
  if (!query) return true;
  return (task.title || "").toLowerCase().includes(query)
    || (task.description || "").toLowerCase().includes(query);
};

export default function BacklogTab({ onTaskClick, onPokerClick, focusSectionId, onFocusHandled }) {
  const {
    activeTasks,
    setActiveTasks,
    backlogSections,
    setBacklogSections,
    updateTask,
    handleBacklogDragEnd,
    createBacklogSection,
    deleteBacklogSection,
    renameBacklogSection,
    currentProjectId,
    teamMembers,
    columns,
  } = useApp();
  const { canEditTask } = useBoardPermissions();
  const readOnly = !canEditTask;
  const { addToast } = useToast();
  const { guardStatusChange, reportResult, dialog } = useWorkflowGuard();

  const projectActiveTasks = useMemo(
    () => (activeTasks || []).filter((task) => isInProject(task, currentProjectId)),
    [activeTasks, currentProjectId]
  );
  const sections = useMemo(() => backlogSections || [], [backlogSections]);
  const statusOptions = useMemo(() => buildStatusOptions(columns), [columns]);

  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [activeVisibleCount, setActiveVisibleCount] = useState(TASKS_PER_PAGE);
  const [sectionVisibleCounts, setSectionVisibleCounts] = useState({});

  useEscapeKey(() => setDeleteConfirm(null), deleteConfirm !== null);

  const sectionRefs = useRef({});
  useEffect(() => {
    if (!focusSectionId) return;
    const el = sectionRefs.current[focusSectionId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView?.({ behavior: "smooth", block: "start" });
      }, 100);
      onFocusHandled?.();
    }
  }, [focusSectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = search.trim().toLowerCase();

  const filteredActive = useMemo(
    () => projectActiveTasks.filter((task) => matchesSearch(task, query)),
    [projectActiveTasks, query]
  );
  const visibleActive = filteredActive.slice(0, activeVisibleCount);

  const sectionViews = useMemo(() => sections.map((section) => {
    const tasks = section.tasks || [];
    const filtered = tasks.filter((task) => matchesSearch(task, query));
    const visibleCount = sectionVisibleCounts[section.id] || TASKS_PER_PAGE;
    return { section, tasks, filtered, visible: filtered.slice(0, visibleCount), visibleCount };
  }), [sections, query, sectionVisibleCounts]);

  const toggleSubtasks = useCallback((taskId) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }, []);

  const handleRowUpdate = useCallback(async (task, patch) => {
    if (readOnly) return;
    let nextPatch = patch;
    if (patch.status && patch.status !== task.status) {
      const verdict = await guardStatusChange(task, patch.status);
      if (!verdict.ok) return;
      nextPatch = { ...patch, ...verdict.patch };
    }
    reportResult(updateTask({ ...task, ...nextPatch }));
  }, [guardStatusChange, readOnly, reportResult, updateTask]);

  const toggleSubtask = useCallback((task, subId) => {
    if (readOnly) return;
    const subtasks = (task.subtasks || []).map((sub) => (sub.id === subId ? { ...sub, done: !sub.done } : sub));
    reportResult(updateTask({ ...task, subtasks }));
  }, [readOnly, reportResult, updateTask]);

  // Move a backlog task to the active sprint
  const moveToSprint = (task, sectionId) => {
    setBacklogSections((prev) =>
      prev.map((section) => (
        section.id !== sectionId ? section : { ...section, tasks: (section.tasks || []).filter((item) => item.id !== task.id) }
      ))
    );
    setActiveTasks((prev) => [
      ...prev,
      { ...task, status: "todo", priority: task.priority || "medium", projectId: currentProjectId },
    ]);
    addToast(`"${task.title}" moved to sprint`, "success");
  };

  // Rendered indices are relative to the filtered + paginated list; convert
  // them to indices in the full list before calling the store action.
  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination || readOnly) return;
    let fullIds;
    let visibleIds;
    if (destination.droppableId === "active-sprint") {
      fullIds = projectActiveTasks.map((task) => task.id);
      visibleIds = visibleActive.map((task) => task.id);
    } else {
      const sectionId = parseInt(destination.droppableId.replace("backlog-", ""), 10);
      const view = sectionViews.find((item) => item.section.id === sectionId);
      if (!view) return;
      fullIds = view.tasks.map((task) => task.id);
      visibleIds = view.visible.map((task) => task.id);
    }
    const draggedId = [...projectActiveTasks, ...sections.flatMap((section) => section.tasks || [])]
      .find((task) => String(task.id) === String(draggableId))?.id ?? draggableId;
    const sourceIds = result.source.droppableId === "active-sprint"
      ? projectActiveTasks.map((task) => task.id)
      : (sectionViews.find((item) => `backlog-${item.section.id}` === result.source.droppableId)?.tasks || []).map((task) => task.id);
    handleBacklogDragEnd({
      ...result,
      draggableId: draggedId,
      source: { ...result.source, index: sourceIds.indexOf(draggedId) },
      destination: {
        ...destination,
        index: toFullListIndex(fullIds, visibleIds, draggedId, destination.index),
      },
    });
  };

  const totalBacklogTasks = sections.reduce((sum, section) => sum + (section.tasks || []).length, 0);
  const isBacklogEmpty = projectActiveTasks.length === 0 && totalBacklogTasks === 0;
  const sectionToDelete = sections.find((section) => section.id === deleteConfirm);

  const renderRow = (task, { isActive, sectionId }) => (
    <>
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <TaskRow
            task={task}
            onUpdate={handleRowUpdate}
            onClick={onTaskClick}
            statusOptions={statusOptions}
            teamMembers={teamMembers}
            readOnly={readOnly}
            showArrow
            onToggleSubtasks={toggleSubtasks}
            isExpanded={Boolean(expandedSubtasks[task.id])}
          />
        </div>
        {onPokerClick && !readOnly && (
          <button
            type="button"
            title="Estimate with Planning Poker"
            onClick={() => onPokerClick(task)}
            className="flex-shrink-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            <FaPlay className="w-3 h-3" />
          </button>
        )}
        {!isActive && !readOnly && (
          <button
            type="button"
            title="Move to Active Sprint"
            onClick={() => moveToSprint(task, sectionId)}
            className="flex-shrink-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FaArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {expandedSubtasks[task.id] && task.subtasks?.length > 0 && (
        <SubtaskList task={task} onToggle={toggleSubtask} readOnly={readOnly} />
      )}
    </>
  );

  if (isBacklogEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-300 dark:text-slate-600">
          <rect x="14" y="8" width="36" height="10" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="10" y="22" width="44" height="10" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="6" y="36" width="52" height="10" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="18" y="12" width="16" height="2" rx="1" fill="currentColor" opacity="0.3" />
          <rect x="16" y="26" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
          <rect x="14" y="40" width="24" height="2" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
        <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300 mt-4">Backlog is empty</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">Tasks moved from the sprint or created here will appear</p>
        {!readOnly && sections.length === 0 && (
          <AppButton variant="primary" size="sm" onClick={createBacklogSection} className="mt-4">
            <FaPlus className="w-3 h-3" /> New Backlog Section
          </AppButton>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Search bar */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto mt-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search backlog tasks..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {!readOnly && (
          <AppButton variant="primary" size="sm" onClick={createBacklogSection} className="flex-shrink-0">
            <FaPlus className="w-3 h-3" /> New Backlog Section
          </AppButton>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 mt-4 mb-12">
          {/* Active Sprint section */}
          <div>
            <div className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
              <span>Active Sprint</span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({filteredActive.length}{search ? ` of ${projectActiveTasks.length}` : ""} tasks)
              </span>
            </div>
            <Droppable droppableId="active-sprint" isDropDisabled={readOnly}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-white dark:bg-[#1c2030] rounded-lg border-2 shadow-md p-4 mb-4 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                      : "border-slate-300 dark:border-[#2a3044]"
                  }`}
                >
                  {filteredActive.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                      <FaArrowRight className="mx-auto mb-2 text-2xl" />
                      <p>{search ? "No matching tasks" : "Drag tasks here from Backlog"}</p>
                    </div>
                  ) : (
                    <>
                      <ul>
                        {visibleActive.map((task, idx) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={idx} isDragDisabled={readOnly}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={dragSnapshot.isDragging ? "opacity-75" : ""}
                              >
                                {renderRow(task, { isActive: true })}
                                {idx !== visibleActive.length - 1 && (
                                  <div className="border-b border-slate-200 dark:border-[#232838] -mx-4" />
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </ul>
                      {filteredActive.length > activeVisibleCount && (
                        <button
                          type="button"
                          className="w-full text-center py-2.5 mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors font-medium"
                          onClick={() => setActiveVisibleCount((prev) => prev + TASKS_PER_PAGE)}
                        >
                          Show {Math.min(TASKS_PER_PAGE, filteredActive.length - activeVisibleCount)} more task{Math.min(TASKS_PER_PAGE, filteredActive.length - activeVisibleCount) !== 1 ? "s" : ""} ({filteredActive.length - activeVisibleCount} remaining)
                        </button>
                      )}
                    </>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Backlog sections */}
          {sectionViews.map(({ section, tasks, filtered, visible, visibleCount }, sectionIdx) => {
            const isFocused = focusSectionId === section.id;
            const remaining = filtered.length - visibleCount;
            return (
              <div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className={`mt-4 mb-12 rounded-xl transition-all duration-500 ${isFocused ? "ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-[#141720]" : ""}`}
              >
                <div className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                  {editingIdx === sectionIdx ? (
                    <input
                      className="px-2 py-1 rounded border border-slate-300 dark:border-[#2a3044] text-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1c2030] focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editingTitle}
                      autoFocus
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => {
                        renameBacklogSection(section.id, editingTitle.trim() || section.title);
                        setEditingIdx(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          renameBacklogSection(section.id, editingTitle.trim() || section.title);
                          setEditingIdx(null);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingIdx(null);
                        }
                      }}
                      style={{ minWidth: 120 }}
                    />
                  ) : (
                    <span
                      className={readOnly ? "" : "cursor-pointer hover:underline"}
                      onClick={() => {
                        if (readOnly) return;
                        setEditingIdx(sectionIdx);
                        setEditingTitle(section.title);
                      }}
                    >
                      {section.title}
                    </span>
                  )}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({filtered.length}{search ? ` of ${tasks.length}` : ""} tasks)
                  </span>
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        className="ml-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Rename"
                        onClick={() => {
                          setEditingIdx(sectionIdx);
                          setEditingTitle(section.title);
                        }}
                      >
                        <FaPencilAlt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="ml-1 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete section"
                        onClick={() => setDeleteConfirm(section.id)}
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <Droppable droppableId={`backlog-${section.id}`} isDropDisabled={readOnly}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-white dark:bg-[#1c2030] rounded-lg border-2 shadow-md p-4 pb-8 transition-colors ${
                        snapshot.isDraggingOver
                          ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                          : "border-slate-300 dark:border-[#2a3044]"
                      }`}
                    >
                      {filtered.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                          <p>{search ? "No matching tasks" : `No tasks in ${section.title.toLowerCase()}`}</p>
                        </div>
                      ) : (
                        <>
                          <ul>
                            {visible.map((task, idx) => (
                              <Draggable key={task.id} draggableId={String(task.id)} index={idx} isDragDisabled={readOnly}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={dragSnapshot.isDragging ? "opacity-75" : ""}
                                  >
                                    {renderRow(task, { isActive: false, sectionId: section.id })}
                                    {idx !== visible.length - 1 && (
                                      <div className="border-b border-slate-200 dark:border-[#232838] mx-0" />
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </ul>
                          {remaining > 0 && (
                            <button
                              type="button"
                              className="w-full text-center py-2.5 mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors font-medium"
                              onClick={() => setSectionVisibleCounts((prev) => ({ ...prev, [section.id]: visibleCount + TASKS_PER_PAGE }))}
                            >
                              Show {Math.min(TASKS_PER_PAGE, remaining)} more task{Math.min(TASKS_PER_PAGE, remaining) !== 1 ? "s" : ""} ({remaining} remaining)
                            </button>
                          )}
                        </>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Delete confirm modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-white dark:bg-[#1c2030] rounded-xl shadow-xl p-8 min-w-[320px] flex flex-col items-center gap-4 border border-slate-200 dark:border-[#2a3044]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Delete this backlog section?</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {(sectionToDelete?.tasks || []).length > 0
                ? `Its ${(sectionToDelete?.tasks || []).length} task(s) will be moved to the archive.`
                : "The section is empty."}
            </div>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={() => {
                  deleteBacklogSection(deleteConfirm);
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </>
  );
}
