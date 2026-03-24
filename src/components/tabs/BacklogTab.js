import React, { useState, useMemo, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaArrowRight, FaTrash, FaPencilAlt, FaSearch } from "react-icons/fa";
import TaskRow from "../common/TaskRow";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

function SubtaskList({ task, onToggle }) {
  return (
    <div className="ml-8 bg-gray-50 dark:bg-[#232838] border-l-2 border-blue-200 dark:border-blue-900 p-3">
      <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Subtasks:</div>
      <ul className="space-y-2">
        {task.subtasks.map((sub) => (
          <li key={sub.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={sub.done}
              onChange={() => onToggle(sub.id)}
              className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${sub.done ? "line-through text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-300"}`}>
              {sub.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BacklogTab({ onTaskClick, onPokerClick, focusSectionId, onFocusHandled }) {
  const {
    activeTasks,
    setActiveTasks,
    backlogSections,
    setBacklogSections,
    idToGlobalIndex,
    handleBacklogDragEnd,
    createBacklogSection,
    deleteBacklogSection,
    renameBacklogSection,
    currentProjectId,
  } = useApp();
  const { addToast } = useToast();

  const projectActiveTasks = activeTasks.filter(
    (t) => (t.projectId || "proj-1") === currentProjectId
  );

  const TASKS_PER_PAGE = 20;
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [activeVisibleCount, setActiveVisibleCount] = useState(TASKS_PER_PAGE);
  const [sectionVisibleCounts, setSectionVisibleCounts] = useState({});

  const sectionRefs = useRef({});
  useEffect(() => {
    if (!focusSectionId) return;
    const el = sectionRefs.current[focusSectionId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      onFocusHandled?.();
    }
  }, [focusSectionId]); // eslint-disable-line

  const toggleSubtasks = (taskId) =>
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

  const toggleSubtask = (task, subId, isActive, sectionIdx) => {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s
    );
    if (isActive) {
      setActiveTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t))
      );
    } else {
      setBacklogSections((prev) =>
        prev.map((s, i) =>
          i !== sectionIdx
            ? s
            : { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t)) }
        )
      );
    }
  };

  // Move a backlog task to the active sprint
  const moveToSprint = (task, sectionId) => {
    setBacklogSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }
      )
    );
    setActiveTasks((prev) => [
      ...prev,
      { ...task, status: "todo", priority: task.priority || "medium", projectId: currentProjectId },
    ]);
    addToast(`"${task.title}" moved to sprint`, "success");
  };

  const filterTask = (task) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return task.title.toLowerCase().includes(q) || (task.description || "").toLowerCase().includes(q);
  };

  const filteredActive = useMemo(() => projectActiveTasks.filter(filterTask), [projectActiveTasks, search]); // eslint-disable-line

  const totalBacklogTasks = backlogSections.reduce((sum, s) => sum + s.tasks.length, 0);
  const isBacklogEmpty = projectActiveTasks.length === 0 && totalBacklogTasks === 0;

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search backlog tasks..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={createBacklogSection}
          className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition-colors"
        >
          + New Backlog Section
        </button>
      </div>

      <DragDropContext onDragEnd={handleBacklogDragEnd}>
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 mt-4 mb-12">
          {/* Active Sprint section */}
          <div>
            <div className="text-lg font-bold text-gray-700 dark:text-slate-200 mb-2 flex items-center gap-2">
              <span>Active Sprint</span>
              <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                ({filteredActive.length}{search ? ` of ${projectActiveTasks.length}` : ""} tasks)
              </span>
            </div>
            <Droppable droppableId="active-sprint">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-white dark:bg-[#1c2030] rounded-lg border-2 shadow-md p-4 mb-4 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                      : "border-gray-300 dark:border-[#2a3044]"
                  }`}
                >
                  {filteredActive.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                      <FaArrowRight className="mx-auto mb-2 text-2xl" />
                      <p>{search ? "No matching tasks" : "Drag tasks here from Backlog"}</p>
                    </div>
                  ) : (
                    <>
                    <ul>
                      {filteredActive.slice(0, activeVisibleCount).map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={projectActiveTasks.indexOf(task)}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-75" : ""}
                            >
                              <TaskRow
                                task={task}
                                setTasks={setActiveTasks}
                                index={idToGlobalIndex[task.id]}
                                onClick={onTaskClick}
                                showArrow
                                onToggleSubtasks={toggleSubtasks}
                                isExpanded={expandedSubtasks[task.id]}
                              />
                              {expandedSubtasks[task.id] && task.subtasks?.length > 0 && (
                                <SubtaskList
                                  task={task}
                                  onToggle={(subId) => toggleSubtask(task, subId, true, null)}
                                />
                              )}
                              {idx !== Math.min(filteredActive.length, activeVisibleCount) - 1 && (
                                <div className="border-b border-gray-200 dark:border-[#232838] -mx-4" />
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </ul>
                    {filteredActive.length > activeVisibleCount && (
                      <button
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
          {backlogSections.map((section, sectionIdx) => {
            const filteredTasks = section.tasks.filter(filterTask);
            const isFocused = focusSectionId === section.id;
            return (
              <div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className={`mt-4 mb-12 rounded-xl transition-all duration-500 ${isFocused ? "ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-[#141720]" : ""}`}
              >
                <div className="text-lg font-bold text-gray-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                  {editingIdx === sectionIdx ? (
                    <input
                      className="px-2 py-1 rounded border border-gray-300 dark:border-[#2a3044] text-lg font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-[#1c2030] focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editingTitle}
                      autoFocus
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        renameBacklogSection(section.id, editingTitle.trim() || section.title);
                        setEditingIdx(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameBacklogSection(section.id, editingTitle.trim() || section.title);
                          setEditingIdx(null);
                        }
                      }}
                      style={{ minWidth: 120 }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        setEditingIdx(sectionIdx);
                        setEditingTitle(section.title);
                      }}
                    >
                      {section.title}
                    </span>
                  )}
                  <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                    ({filteredTasks.length}{search ? ` of ${section.tasks.length}` : ""} tasks)
                  </span>
                  <button
                    className="ml-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#232838] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                    title="Rename"
                    onClick={() => {
                      setEditingIdx(sectionIdx);
                      setEditingTitle(section.title);
                    }}
                  >
                    <FaPencilAlt className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="ml-1 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete section"
                    onClick={() => setDeleteConfirm(section.id)}
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Droppable droppableId={`backlog-${section.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-white dark:bg-[#1c2030] rounded-lg border-2 shadow-md p-4 pb-8 transition-colors ${
                        snapshot.isDraggingOver
                          ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                          : "border-gray-300 dark:border-[#2a3044]"
                      }`}
                    >
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                          <p>{search ? "No matching tasks" : `No tasks in ${section.title.toLowerCase()}`}</p>
                        </div>
                      ) : (() => {
                        const sectionVisibleCount = sectionVisibleCounts[section.id] || TASKS_PER_PAGE;
                        const visibleTasks = filteredTasks.slice(0, sectionVisibleCount);
                        const remaining = filteredTasks.length - sectionVisibleCount;
                        return (
                        <>
                        <ul>
                          {visibleTasks.map((task, idx) => (
                            <Draggable key={task.id} draggableId={task.id} index={section.tasks.indexOf(task)}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? "opacity-75" : ""}
                                >
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1">
                                      <TaskRow
                                        task={task}
                                        setTasks={(updater) =>
                                          setBacklogSections((prev) =>
                                            prev.map((s, i) =>
                                              i !== sectionIdx
                                                ? s
                                                : {
                                                    ...s,
                                                    tasks:
                                                      typeof updater === "function"
                                                        ? updater(s.tasks)
                                                        : updater,
                                                  }
                                            )
                                          )
                                        }
                                        index={idToGlobalIndex[task.id]}
                                        onClick={onTaskClick}
                                        showArrow
                                        onToggleSubtasks={toggleSubtasks}
                                        isExpanded={expandedSubtasks[task.id]}
                                      />
                                    </div>
                                    <button
                                      title="Move to Active Sprint"
                                      onClick={() => moveToSprint(task, section.id)}
                                      className="flex-shrink-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                      <FaArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {expandedSubtasks[task.id] && task.subtasks?.length > 0 && (
                                    <SubtaskList
                                      task={task}
                                      onToggle={(subId) => toggleSubtask(task, subId, false, sectionIdx)}
                                    />
                                  )}
                                  {idx !== visibleTasks.length - 1 && (
                                    <div className="border-b border-gray-200 dark:border-[#232838] mx-0" />
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </ul>
                        {remaining > 0 && (
                          <button
                            className="w-full text-center py-2.5 mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors font-medium"
                            onClick={() => setSectionVisibleCounts((prev) => ({ ...prev, [section.id]: sectionVisibleCount + TASKS_PER_PAGE }))}
                          >
                            Show {Math.min(TASKS_PER_PAGE, remaining)} more task{Math.min(TASKS_PER_PAGE, remaining) !== 1 ? "s" : ""} ({remaining} remaining)
                          </button>
                        )}
                        </>
                        );
                      })()}
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1c2030] rounded-xl shadow-xl p-8 min-w-[320px] flex flex-col items-center gap-4 border border-slate-200 dark:border-[#2a3044]">
            <div className="text-lg font-semibold text-gray-800 dark:text-slate-200">Delete this backlog section?</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">All tasks in this section will be lost.</div>
            <div className="flex gap-4 mt-2">
              <button
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={() => {
                  deleteBacklogSection(deleteConfirm);
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
              <button
                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-[#232838] text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-[#2a3044] transition-colors"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
