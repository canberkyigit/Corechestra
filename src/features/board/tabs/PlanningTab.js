import React, { useCallback, useMemo, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { FaInfoCircle } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { isInProject } from "../../../shared/utils/helpers";
import { buildVelocityHistory, getAverageVelocity, sumStoryPoints } from "../utils/sprintMetrics";
import {
  buildMemberLoad,
  buildPlanningMembers,
  getPlanningReadiness,
  getSprintTiming,
} from "../utils/planningMetrics";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import PlanningHeader from "../components/planning/PlanningHeader";
import SprintGoalCard from "../components/planning/SprintGoalCard";
import BacklogPoolPanel, { POOL_DROPPABLE_PREFIX } from "../components/planning/BacklogPoolPanel";
import SprintScopePanel, { SPRINT_DROPPABLE_ID } from "../components/planning/SprintScopePanel";
import TeamCapacityPanel from "../components/planning/TeamCapacityPanel";
import PlanningReadinessCard from "../components/planning/PlanningReadinessCard";
import VelocityPanel from "../components/planning/VelocityPanel";

const pluralItems = (count) => `${count} item${count !== 1 ? "s" : ""}`;

const withoutIds = (set, ids) => {
  const next = new Set(set);
  ids.forEach((id) => next.delete(id));
  return next;
};

export default function PlanningTab({ onTaskClick, onPokerClick }) {
  const {
    activeTasks,
    setActiveTasks,
    backlogSections,
    setBacklogSections,
    sprint,
    updateSprint,
    completedSprints,
    users,
    projects,
    currentProjectId,
  } = useApp();
  const { canEditTask } = useBoardPermissions();
  const { addToast } = useToast();

  const [poolSelection, setPoolSelection] = useState(() => new Set());
  const [sprintSelection, setSprintSelection] = useState(() => new Set());

  // Capacity belongs to the current project's sprint, so it is persisted via
  // perProjectSprint -> the Firestore "sprints" domain.
  const capacities = useMemo(() => sprint?.teamCapacities || {}, [sprint?.teamCapacities]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const projectActiveTasks = useMemo(
    () => (activeTasks || []).filter((t) => !currentProjectId || isInProject(t, currentProjectId)),
    [activeTasks, currentProjectId]
  );

  // Backlog tasks NOT already in the sprint, grouped by section.
  const backlogGroups = useMemo(() => {
    const activeIds = new Set((activeTasks || []).map((t) => t.id));
    return (backlogSections || []).map((section) => ({
      ...section,
      tasks: (section.tasks || []).filter((t) => !activeIds.has(t.id)),
    }));
  }, [backlogSections, activeTasks]);

  const committedSP = useMemo(() => sumStoryPoints(projectActiveTasks), [projectActiveTasks]);

  // Real velocity: completed story points of the last completed sprints.
  const avgVelocity = useMemo(() => getAverageVelocity(completedSprints || [], 3), [completedSprints]);
  const velocityHistory = useMemo(() => buildVelocityHistory(completedSprints || [], 6), [completedSprints]);

  const members = useMemo(
    () => buildPlanningMembers(users, projects?.find((p) => p.id === currentProjectId)),
    [users, projects, currentProjectId]
  );
  const memberLoad = useMemo(
    () => buildMemberLoad(members, projectActiveTasks, capacities),
    [members, projectActiveTasks, capacities]
  );
  const capacitySP = useMemo(
    () => memberLoad.rows.reduce((sum, row) => sum + row.capacity, 0),
    [memberLoad]
  );

  const timing = useMemo(() => getSprintTiming(sprint), [sprint]);
  const readiness = useMemo(
    () => getPlanningReadiness({ sprint, tasks: projectActiveTasks, committedSP, capacitySP, avgVelocity }),
    [sprint, projectActiveTasks, committedSP, capacitySP, avgVelocity]
  );

  // ── Capacity ─────────────────────────────────────────────────────────────────
  const handleCapacityChange = useCallback((userId, value) => {
    const capacity = Number(value);
    updateSprint((currentSprint) => ({
      teamCapacities: {
        ...(currentSprint?.teamCapacities || {}),
        [userId]: capacity,
      },
    }));
  }, [updateSprint]);

  const resetCapacities = useCallback(() => {
    const map = {};
    members.forEach((u) => { map[u.id] = 100; });
    updateSprint({ teamCapacities: map });
  }, [members, updateSprint]);

  const handleGoalSave = useCallback((goal) => updateSprint({ goal }), [updateSprint]);

  // ── Moves between backlog and sprint ─────────────────────────────────────────
  const addTasksToSprint = useCallback((tasks) => {
    if (!canEditTask || !tasks?.length) return;
    const ids = new Set(tasks.map((t) => t.id));
    setBacklogSections((prev) => (prev || []).map((s) => ({
      ...s,
      tasks: (s.tasks || []).filter((t) => !ids.has(t.id)),
    })));
    setActiveTasks((prev) => {
      const existing = new Set((prev || []).map((t) => t.id));
      return [
        ...(prev || []),
        ...tasks
          .filter((task) => !existing.has(task.id))
          .map((task) => ({
            ...task,
            status: task.status || "todo",
            priority: task.priority || "medium",
            projectId: currentProjectId,
          })),
      ];
    });
    setPoolSelection((prev) => withoutIds(prev, ids));
    addToast(`Added ${pluralItems(tasks.length)} · ${sumStoryPoints(tasks)} SP to ${sprint?.name || "the sprint"}`, "success");
  }, [addToast, canEditTask, currentProjectId, setActiveTasks, setBacklogSections, sprint?.name]);

  const removeTasksFromSprint = useCallback((tasks, targetSectionId = null) => {
    if (!canEditTask || !tasks?.length) return;
    const ids = new Set(tasks.map((t) => t.id));
    setActiveTasks((prev) => (prev || []).filter((t) => !ids.has(t.id)));
    // Return to the chosen (or first) backlog section — create one if none
    // exists so the task is never dropped.
    setBacklogSections((prev) => {
      if (!prev || prev.length === 0) return [{ id: Date.now(), title: "Backlog", tasks: [...tasks] }];
      const targetIndex = Math.max(0, prev.findIndex((s) => String(s.id) === String(targetSectionId)));
      return prev.map((s, i) => (
        i !== targetIndex ? s : { ...s, tasks: [...(s.tasks || []).filter((t) => !ids.has(t.id)), ...tasks] }
      ));
    });
    setSprintSelection((prev) => withoutIds(prev, ids));
    addToast(`Moved ${pluralItems(tasks.length)} back to the backlog`, "info");
  }, [addToast, canEditTask, setActiveTasks, setBacklogSections]);

  const moveBetweenSections = useCallback((task, fromId, toId) => {
    if (!canEditTask || String(fromId) === String(toId)) return;
    setBacklogSections((prev) => (prev || []).map((s) => {
      if (String(s.id) === String(fromId)) return { ...s, tasks: (s.tasks || []).filter((t) => t.id !== task.id) };
      if (String(s.id) === String(toId)) return { ...s, tasks: [...(s.tasks || []), task] };
      return s;
    }));
  }, [canEditTask, setBacklogSections]);

  const addSingle = useCallback((task) => addTasksToSprint([task]), [addTasksToSprint]);
  const removeSingle = useCallback((task) => removeTasksFromSprint([task]), [removeTasksFromSprint]);

  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !canEditTask) return;
    const fromSprint = source.droppableId === SPRINT_DROPPABLE_ID;
    const toSprint = destination.droppableId === SPRINT_DROPPABLE_ID;
    if (fromSprint && toSprint) return;

    if (fromSprint) {
      const task = projectActiveTasks.find((t) => String(t.id) === draggableId);
      if (task) removeTasksFromSprint([task], destination.droppableId.slice(POOL_DROPPABLE_PREFIX.length));
      return;
    }

    const fromSectionId = source.droppableId.slice(POOL_DROPPABLE_PREFIX.length);
    const section = backlogGroups.find((g) => String(g.id) === fromSectionId);
    const task = section?.tasks.find((t) => String(t.id) === draggableId);
    if (!task) return;
    if (toSprint) addTasksToSprint([task]);
    else moveBetweenSections(task, fromSectionId, destination.droppableId.slice(POOL_DROPPABLE_PREFIX.length));
  }, [addTasksToSprint, backlogGroups, canEditTask, moveBetweenSections, projectActiveTasks, removeTasksFromSprint]);

  const togglePool = useCallback((id) => setPoolSelection((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const toggleSprint = useCallback((id) => setSprintSelection((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const removeSelected = useCallback((tasks) => removeTasksFromSprint(tasks), [removeTasksFromSprint]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 pb-12">
      <PlanningHeader
        sprint={sprint}
        timing={timing}
        committedSP={committedSP}
        capacitySP={capacitySP}
        avgVelocity={avgVelocity}
        scopeCount={projectActiveTasks.length}
        readiness={readiness}
      />

      {!sprint && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" role="status">
          <FaInfoCircle className="h-3 w-3 flex-shrink-0" />
          There is no active sprint for this project. Start one from the board to set a goal and capacity.
        </div>
      )}

      <SprintGoalCard sprint={sprint} canEdit={canEditTask} onSave={handleGoalSave} resetKey={currentProjectId} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <DragDropContext onDragEnd={handleDragEnd}>
          <BacklogPoolPanel
            groups={backlogGroups}
            canEdit={canEditTask}
            users={users}
            selectedIds={poolSelection}
            onToggleSelect={togglePool}
            onSetSelection={setPoolSelection}
            onAddSelected={addTasksToSprint}
            onAddTask={addSingle}
            onOpen={onTaskClick}
            onEstimate={canEditTask ? onPokerClick : undefined}
          />
          <SprintScopePanel
            sprint={sprint}
            tasks={projectActiveTasks}
            committedSP={committedSP}
            capacitySP={capacitySP}
            avgVelocity={avgVelocity}
            canEdit={canEditTask}
            users={users}
            selectedIds={sprintSelection}
            onToggleSelect={toggleSprint}
            onSetSelection={setSprintSelection}
            onRemoveSelected={removeSelected}
            onRemoveTask={removeSingle}
            onOpen={onTaskClick}
            onEstimate={canEditTask ? onPokerClick : undefined}
          />
        </DragDropContext>

        <aside className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-3 xl:col-span-1 xl:grid-cols-1" aria-label="Planning insights">
          <TeamCapacityPanel
            load={memberLoad}
            capacitySP={capacitySP}
            users={users}
            canEdit={canEditTask}
            onCapacityChange={handleCapacityChange}
            onReset={resetCapacities}
          />
          <PlanningReadinessCard readiness={readiness} />
          <VelocityPanel history={velocityHistory} avgVelocity={avgVelocity} committedSP={committedSP} />
        </aside>
      </div>
    </div>
  );
}
