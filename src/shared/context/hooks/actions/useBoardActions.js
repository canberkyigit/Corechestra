import { useCallback } from "react";
import { generateId } from "../../../utils/helpers";
import { DEFAULT_COLUMNS } from "../../AppSeeds";

export function useBoardActions({
  currentProjectId,
  currentUser,
  activeTasks,
  perProjectBacklog,
  perProjectSprint,
  perProjectPlannedSprints,
  projects,
  epics,
  archivedTasks,
  archivedProjects,
  archivedEpics,
  sprint,
  backlogSections,
  setActiveTasks,
  setBacklogSections,
  setPerProjectBacklog,
  setArchivedTasks,
  setArchivedProjects,
  setArchivedEpics,
  setSprint,
  setPerProjectCompletedSprints,
  setPerProjectPlannedSprints,
  setProjects,
  setProjectColumns,
  setPerProjectBoardSettings,
  setEpics,
  setLabels,
  setRetrospectiveItems,
  setNotesList,
  setPokerHistory,
  setBoardSettings,
  setPerProjectBacklog: setPerProjectBacklogMap,
  setPerProjectCompletedSprints: setCompletedSprintMap,
  logActivity,
  addNotification,
}) {
  const updateActiveTask = useCallback((updatedTask, logMsg) => {
    setActiveTasks((prev) => {
      const prevTask = prev.find((task) => task.id === updatedTask.id);
      if (prevTask) {
        if (prevTask.status !== updatedTask.status) {
          const statusLabels = {
            todo: "To Do",
            inprogress: "In Progress",
            review: "Review",
            awaiting: "Awaiting",
            blocked: "Blocked",
            done: "Done",
          };
          const label = statusLabels[updatedTask.status] || updatedTask.status;
          addNotification({
            type: updatedTask.status === "done"
              ? "status_done"
              : updatedTask.status === "blocked"
                ? "status_blocked"
                : "status_change",
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            text: `"${updatedTask.title}" moved to ${label}`,
          });
        }
        if (prevTask.assignedTo !== updatedTask.assignedTo && updatedTask.assignedTo) {
          addNotification({
            type: "assignment",
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            text: `You were assigned to "${updatedTask.title}"`,
          });
        }
      }
      return prev.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    });
    if (logMsg) logActivity(updatedTask.id, logMsg);
  }, [addNotification, logActivity, setActiveTasks]);

  const createTask = useCallback((taskData, sprintValue) => {
    const newTask = {
      ...taskData,
      id: generateId(),
      status: "todo",
      statusChangedAt: new Date().toISOString(),
      subtasks: taskData.subtasks || [],
      comments: [],
      activityLog: [],
      labels: taskData.labels || [],
      watchers: [],
      epicId: taskData.epicId || null,
      projectId: currentProjectId,
    };
    if (sprintValue === "active") {
      setActiveTasks((prev) => [...prev, newTask]);
    } else if (sprintValue?.startsWith("backlog-")) {
      const backlogId = parseInt(sprintValue.replace("backlog-", ""), 10);
      setBacklogSections((prev) =>
        prev.map((section) => (
          section.id === backlogId
            ? { ...section, tasks: [...section.tasks, newTask] }
            : section
        ))
      );
    } else {
      setActiveTasks((prev) => [...prev, newTask]);
    }
    logActivity(newTask.id, "created task");
    addNotification({
      type: "task_created",
      taskId: newTask.id,
      taskTitle: newTask.title,
      text: `"${newTask.title}" created`,
    });
    return newTask;
  }, [addNotification, currentProjectId, logActivity, setActiveTasks, setBacklogSections]);

  const deleteTask = useCallback((taskId) => {
    const task = activeTasks.find((item) => item.id === taskId)
      || Object.values(perProjectBacklog)
        .flatMap((sections) => sections.flatMap((section) => section.tasks))
        .find((item) => item.id === taskId);
    setActiveTasks((prev) => prev.filter((item) => item.id !== taskId));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [projectId, sections] of Object.entries(prev)) {
        next[projectId] = sections.map((section) => ({
          ...section,
          tasks: section.tasks.filter((item) => item.id !== taskId),
        }));
      }
      return next;
    });
    if (task) {
      setArchivedTasks((prev) => [{ ...task, archivedAt: new Date().toISOString() }, ...prev]);
      addNotification({
        type: "task_archived",
        taskId,
        taskTitle: task.title,
        text: `"${task.title}" moved to archive`,
      });
    }
  }, [activeTasks, addNotification, perProjectBacklog, setActiveTasks, setArchivedTasks, setPerProjectBacklog]);

  const restoreTask = useCallback((taskId) => {
    const task = archivedTasks.find((item) => item.id === taskId);
    if (!task) return;
    const { archivedAt, ...restored } = task;
    setArchivedTasks((prev) => prev.filter((item) => item.id !== taskId));
    setActiveTasks((prev) => [...prev, { ...restored, status: "todo" }]);
    addNotification({
      type: "task_restored",
      taskId,
      taskTitle: restored.title,
      text: `"${restored.title}" restored from archive`,
    });
  }, [addNotification, archivedTasks, setActiveTasks, setArchivedTasks]);

  const permanentDeleteTask = useCallback((taskId) => {
    const task = archivedTasks.find((item) => item.id === taskId);
    setArchivedTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (task) {
      addNotification({
        type: "task_deleted",
        taskId,
        taskTitle: task.title,
        text: `"${task.title}" permanently deleted`,
      });
    }
  }, [addNotification, archivedTasks, setArchivedTasks]);

  const emptyArchive = useCallback(() => {
    const count = archivedTasks.length + archivedProjects.length + archivedEpics.length;
    setArchivedTasks([]);
    setArchivedProjects([]);
    setArchivedEpics([]);
    addNotification({ type: "archive_emptied", text: `Archive emptied (${count} items removed)` });
  }, [addNotification, archivedEpics.length, archivedProjects.length, archivedTasks.length, setArchivedEpics, setArchivedProjects, setArchivedTasks]);

  const updateBacklogTask = useCallback((updatedTask) => {
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [projectId, sections] of Object.entries(prev)) {
        next[projectId] = sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((task) => (
            task.id === updatedTask.id ? updatedTask : task
          )),
        }));
      }
      return next;
    });
    setActiveTasks((prev) => prev.map((task) => (
      task.id === updatedTask.id ? updatedTask : task
    )));
  }, [setActiveTasks, setPerProjectBacklog]);

  const startSprint = useCallback((sprintData) => {
    setSprint({ ...sprintData, status: "active" });
    logActivity("sprint", "started sprint", { name: sprintData.name });
    addNotification({ type: "sprint_started", text: `Sprint "${sprintData.name}" started` });
  }, [addNotification, logActivity, setSprint]);

  const completeSprint = useCallback((moveToBacklogSectionId) => {
    const projectTasks = activeTasks.filter((task) => (
      (task.projectId || "proj-1") === currentProjectId
    ));
    const incomplete = projectTasks.filter((task) => task.status !== "done");
    const done = projectTasks.filter((task) => task.status === "done");

    if (moveToBacklogSectionId && incomplete.length > 0) {
      setBacklogSections((prev) =>
        prev.map((section) => (
          section.id === moveToBacklogSectionId
            ? { ...section, tasks: [...section.tasks, ...incomplete] }
            : section
        ))
      );
    }

    if (done.length > 0) {
      setArchivedTasks((prev) => [
        ...done.map((task) => ({ ...task, archivedAt: new Date().toISOString() })),
        ...prev,
      ]);
    }

    setActiveTasks((prev) => prev.filter((task) => (
      (task.projectId || "proj-1") !== currentProjectId
    )));

    const currentSprint = perProjectSprint[currentProjectId];
    if (currentSprint) {
      const totalPoints = projectTasks.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const completedPoints = done.reduce((sum, task) => sum + (Number(task.storyPoint) || 0), 0);
      const snapshot = {
        id: `cs-${Date.now()}`,
        name: currentSprint.name || "Sprint",
        goal: currentSprint.goal || "",
        startDate: currentSprint.startDate || "",
        endDate: currentSprint.endDate || "",
        completedAt: new Date().toISOString(),
        totalTasks: projectTasks.length,
        doneTasks: done.length,
        totalPoints,
        completedPoints,
        completionRate: projectTasks.length > 0
          ? Math.round((done.length / projectTasks.length) * 100)
          : 0,
      };
      setCompletedSprintMap((prev) => ({
        ...prev,
        [currentProjectId]: [snapshot, ...(prev[currentProjectId] || [])],
      }));
    }

    setSprint((prev) => ({ ...prev, status: "completed" }));
    logActivity("sprint", "completed sprint");
    addNotification({
      type: "sprint_completed",
      text: `Sprint completed — ${done.length}/${projectTasks.length} tasks done`,
    });
  }, [
    activeTasks,
    addNotification,
    currentProjectId,
    logActivity,
    perProjectSprint,
    setActiveTasks,
    setArchivedTasks,
    setBacklogSections,
    setCompletedSprintMap,
    setSprint,
  ]);

  const updateSprint = useCallback((patch) => {
    setSprint((prev) => ({ ...prev, ...patch }));
  }, [setSprint]);

  const createPlannedSprint = useCallback((data) => {
    const sectionId = Date.now();
    const newSprint = {
      id: `ps-${sectionId}`,
      name: data.name,
      goal: data.goal || "",
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
      status: "planned",
      backlogSectionId: sectionId,
    };
    setBacklogSections((prev) => [
      ...prev,
      { id: sectionId, title: data.name, tasks: [] },
    ]);
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), newSprint],
    }));
  }, [currentProjectId, setBacklogSections, setPerProjectPlannedSprints]);

  const deletePlannedSprint = useCallback((sprintId) => {
    const sprintToDelete = (perProjectPlannedSprints[currentProjectId] || [])
      .find((item) => item.id === sprintId);
    if (sprintToDelete?.backlogSectionId) {
      setBacklogSections((prev) => prev.filter((section) => (
        section.id !== sprintToDelete.backlogSectionId
      )));
    }
    setPerProjectPlannedSprints((prev) => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter((item) => item.id !== sprintId),
    }));
  }, [currentProjectId, perProjectPlannedSprints, setBacklogSections, setPerProjectPlannedSprints]);

  const createEpic = useCallback((epicData) => {
    const newEpic = { ...epicData, id: `epic-${Date.now()}`, projectId: currentProjectId };
    setEpics((prev) => [...prev, newEpic]);
    addNotification({ type: "epic_created", text: `Epic "${epicData.title}" created` });
  }, [addNotification, currentProjectId, setEpics]);

  const updateEpic = useCallback((updatedEpic) => {
    setEpics((prev) => prev.map((epic) => (
      epic.id === updatedEpic.id ? updatedEpic : epic
    )));
  }, [setEpics]);

  const deleteEpic = useCallback((epicId) => {
    const epic = epics.find((item) => item.id === epicId);
    setEpics((prev) => prev.filter((item) => item.id !== epicId));
    const unsetEpic = (tasks) => tasks.map((task) => (
      task.epicId === epicId ? { ...task, epicId: null } : task
    ));
    setActiveTasks((prev) => unsetEpic(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [projectId, sections] of Object.entries(prev)) {
        next[projectId] = sections.map((section) => ({
          ...section,
          tasks: unsetEpic(section.tasks),
        }));
      }
      return next;
    });
    if (epic) {
      addNotification({ type: "epic_deleted", text: `Epic "${epic.title}" deleted` });
    }
  }, [addNotification, epics, setActiveTasks, setEpics, setPerProjectBacklog]);

  const createLabel = useCallback((labelData) => {
    setLabels((prev) => [...prev, { ...labelData, id: `lbl-${Date.now()}` }]);
  }, [setLabels]);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => prev.filter((label) => label.id !== labelId));
    const removeLabel = (tasks) => tasks.map((task) => ({
      ...task,
      labels: (task.labels || []).filter((label) => label !== labelId),
    }));
    setActiveTasks((prev) => removeLabel(prev));
    setPerProjectBacklog((prev) => {
      const next = {};
      for (const [projectId, sections] of Object.entries(prev)) {
        next[projectId] = sections.map((section) => ({
          ...section,
          tasks: removeLabel(section.tasks),
        }));
      }
      return next;
    });
  }, [setActiveTasks, setLabels, setPerProjectBacklog]);

  const setColumnsForCurrentProject = useCallback((updater) => {
    setProjectColumns((prev) => ({
      ...prev,
      [currentProjectId]: updater(prev[currentProjectId] || DEFAULT_COLUMNS),
    }));
  }, [currentProjectId, setProjectColumns]);

  const renameColumn = useCallback((columnId, newTitle) => {
    setColumnsForCurrentProject((cols) => cols.map((column) => (
      column.id === columnId ? { ...column, title: newTitle } : column
    )));
  }, [setColumnsForCurrentProject]);

  const createColumn = useCallback((title) => {
    const id = `custom_${Date.now()}`;
    setColumnsForCurrentProject((cols) => [...cols, { id, title, custom: true }]);
  }, [setColumnsForCurrentProject]);

  const deleteColumn = useCallback((columnId) => {
    setColumnsForCurrentProject((cols) => cols.filter((column) => column.id !== columnId));
    setActiveTasks((prev) => prev.map((task) => (
      task.status === columnId ? { ...task, status: "todo" } : task
    )));
  }, [setActiveTasks, setColumnsForCurrentProject]);

  const reorderColumns = useCallback((newCols) => {
    setProjectColumns((prev) => ({ ...prev, [currentProjectId]: newCols }));
  }, [currentProjectId, setProjectColumns]);

  const updateProjectColumns = useCallback((projectId, newCols) => {
    setProjectColumns((prev) => ({ ...prev, [projectId]: newCols }));
  }, [setProjectColumns]);

  const createBacklogSection = useCallback(() => {
    setBacklogSections((prev) => [
      ...prev,
      { id: Date.now(), title: `Backlog ${prev.length + 1}`, tasks: [] },
    ]);
  }, [setBacklogSections]);

  const deleteBacklogSection = useCallback((sectionId) => {
    setBacklogSections((prev) => prev.filter((section) => section.id !== sectionId));
  }, [setBacklogSections]);

  const renameBacklogSection = useCallback((sectionId, newTitle) => {
    setBacklogSections((prev) => prev.map((section) => (
      section.id === sectionId ? { ...section, title: newTitle } : section
    )));
  }, [setBacklogSections]);

  const handleBacklogDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId
      && destination.index === source.index
    ) {
      return;
    }

    const getSectionIdx = (id) => {
      if (!id.startsWith("backlog-")) return null;
      const sectionId = parseInt(id.replace("backlog-", ""), 10);
      return backlogSections.findIndex((section) => section.id === sectionId);
    };

    const srcIdx = getSectionIdx(source.droppableId);
    const dstIdx = getSectionIdx(destination.droppableId);

    let draggedTask = null;
    if (source.droppableId === "active-sprint") {
      draggedTask = activeTasks.find((task) => task.id === draggableId);
    } else if (srcIdx !== null && srcIdx >= 0) {
      draggedTask = backlogSections[srcIdx].tasks.find((task) => task.id === draggableId);
    }
    if (!draggedTask) return;

    if (destination.droppableId === "active-sprint" && srcIdx !== null && srcIdx >= 0) {
      setBacklogSections((prev) => prev.map((section, index) => (
        index !== srcIdx
          ? section
          : { ...section, tasks: section.tasks.filter((task) => task.id !== draggableId) }
      )));
      setActiveTasks((prev) => {
        const newTasks = [...prev];
        newTasks.splice(destination.index, 0, {
          ...draggedTask,
          status: "todo",
          priority: draggedTask.priority || "medium",
        });
        return newTasks;
      });
      return;
    }

    if (destination.droppableId.startsWith("backlog-") && source.droppableId === "active-sprint") {
      setActiveTasks((prev) => prev.filter((task) => task.id !== draggableId));
      setBacklogSections((prev) => prev.map((section, index) => {
        if (index !== dstIdx) return section;
        const newTasks = [...section.tasks];
        newTasks.splice(destination.index, 0, { ...draggedTask, status: "todo" });
        return { ...section, tasks: newTasks };
      }));
      return;
    }

    if (srcIdx !== null && dstIdx !== null && srcIdx !== dstIdx) {
      let taskToMove = null;
      setBacklogSections((prev) => {
        const updated = prev.map((section, index) => {
          if (index === srcIdx) {
            taskToMove = section.tasks.find((task) => task.id === draggableId);
            return { ...section, tasks: section.tasks.filter((task) => task.id !== draggableId) };
          }
          return section;
        });
        return updated.map((section, index) => {
          if (index === dstIdx && taskToMove) {
            const newTasks = [...section.tasks];
            newTasks.splice(destination.index, 0, taskToMove);
            return { ...section, tasks: newTasks };
          }
          return section;
        });
      });
      return;
    }

    if (srcIdx !== null && srcIdx === dstIdx) {
      setBacklogSections((prev) => prev.map((section, index) => {
        if (index !== srcIdx) return section;
        const newTasks = section.tasks.filter((task) => task.id !== draggableId);
        newTasks.splice(destination.index, 0, draggedTask);
        return { ...section, tasks: newTasks };
      }));
      return;
    }

    if (destination.droppableId === "active-sprint" && source.droppableId === "active-sprint") {
      setActiveTasks((prev) => {
        const reordered = prev.filter((task) => task.id !== draggableId);
        reordered.splice(destination.index, 0, draggedTask);
        return reordered;
      });
    }
  }, [activeTasks, backlogSections, setActiveTasks, setBacklogSections]);

  const addRetroItem = useCallback((category) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        { id: Date.now(), text: "", checked: false, score: 0, isEditing: true },
      ],
    }));
  }, [setRetrospectiveItems]);

  const updateRetroItem = useCallback((category, itemId, text) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => (
        item.id === itemId ? { ...item, text, isEditing: false } : item
      )),
    }));
  }, [setRetrospectiveItems]);

  const deleteRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item.id !== itemId),
    }));
  }, [setRetrospectiveItems]);

  const voteRetroItem = useCallback((category, itemId, delta) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => (
        item.id === itemId ? { ...item, score: (item.score || 0) + delta } : item
      )),
    }));
  }, [setRetrospectiveItems]);

  const toggleRetroItem = useCallback((category, itemId) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => (
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )),
    }));
  }, [setRetrospectiveItems]);

  const setRetroItemEditing = useCallback((category, itemId, isEditing) => {
    setRetrospectiveItems((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => (
        item.id === itemId
          ? { ...item, isEditing }
          : { ...item, isEditing: false }
      )),
    }));
  }, [setRetrospectiveItems]);

  const addNote = useCallback((content) => {
    if (!content?.trim()) return;
    setNotesList((prev) => [{ id: Date.now(), content }, ...prev]);
  }, [setNotesList]);

  const deleteNote = useCallback((noteId) => {
    setNotesList((prev) => prev.filter((note) => note.id !== noteId));
  }, [setNotesList]);

  const savePokerResult = useCallback((result) => {
    setPokerHistory((prev) => [
      { ...result, id: Date.now(), date: new Date().toISOString() },
      ...prev,
    ]);
    if (result.taskId && typeof result.estimation === "number") {
      const updateTaskPoints = (tasks) => tasks.map((task) => (
        task.id === result.taskId ? { ...task, storyPoint: result.estimation } : task
      ));
      setActiveTasks((prev) => updateTaskPoints(prev));
      setPerProjectBacklogMap((prev) => {
        const next = {};
        for (const [projectId, sections] of Object.entries(prev)) {
          next[projectId] = sections.map((section) => ({
            ...section,
            tasks: updateTaskPoints(section.tasks),
          }));
        }
        return next;
      });
    }
  }, [setActiveTasks, setPerProjectBacklogMap, setPokerHistory]);

  const updateBoardSettings = useCallback((patch) => {
    setBoardSettings((prev) => ({ ...prev, ...patch }));
    if (patch.boardName !== undefined) {
      setProjects((prev) => prev.map((project) => (
        project.id === currentProjectId ? { ...project, name: patch.boardName } : project
      )));
    }
    if (patch.projectKey !== undefined) {
      setProjects((prev) => prev.map((project) => (
        project.id === currentProjectId ? { ...project, key: patch.projectKey } : project
      )));
    }
  }, [currentProjectId, setBoardSettings, setProjects]);

  return {
    updateActiveTask,
    createTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyArchive,
    updateBacklogTask,
    startSprint,
    completeSprint,
    updateSprint,
    createPlannedSprint,
    deletePlannedSprint,
    createEpic,
    updateEpic,
    deleteEpic,
    createLabel,
    deleteLabel,
    renameColumn,
    createColumn,
    deleteColumn,
    reorderColumns,
    updateProjectColumns,
    createBacklogSection,
    deleteBacklogSection,
    renameBacklogSection,
    handleBacklogDragEnd,
    addRetroItem,
    updateRetroItem,
    deleteRetroItem,
    voteRetroItem,
    toggleRetroItem,
    setRetroItemEditing,
    addNote,
    deleteNote,
    savePokerResult,
    updateBoardSettings,
  };
}
