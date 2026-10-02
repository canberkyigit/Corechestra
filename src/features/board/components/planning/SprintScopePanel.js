import React, { memo, useMemo, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { FaArrowLeft, FaExclamationTriangle, FaFlagCheckered, FaLayerGroup } from "react-icons/fa";
import { TASK_PRIORITY_OPTIONS } from "../../../../shared/constants/taskMeta";
import { sumStoryPoints } from "../../utils/sprintMetrics";
import { getUserDisplayName } from "../../utils/userColors";
import { getAssigneeKey, getLoadTone } from "../../utils/planningMetrics";
import { EmptyState, LOAD_TONE_BAR, LOAD_TONE_TEXT, PanelHeader, PlanningCard, SegmentedControl } from "./PlanningPrimitives";
import PlanningTaskRow from "./PlanningTaskRow";

export const SPRINT_DROPPABLE_ID = "planning-sprint";

const GROUP_OPTIONS = [
  { value: "none", label: "List" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
];

const pct = (value, max) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;

/** Committed scope vs capacity, with the average velocity as a second marker. */
export function CommitmentMeter({ committedSP, capacitySP, avgVelocity }) {
  const tone = getLoadTone(committedSP, capacitySP);
  const scaleMax = Math.max(capacitySP, committedSP, avgVelocity || 0, 1);
  const ratio = capacitySP > 0 ? Math.round((committedSP / capacitySP) * 100) : null;
  const over = committedSP - capacitySP;

  return (
    <div className="space-y-2" data-testid="planning-commitment-meter">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">{committedSP}</span>
          {" "}of {capacitySP} SP capacity
        </span>
        <span className={`text-xs font-semibold tabular-nums ${LOAD_TONE_TEXT[tone]}`}>
          {ratio === null ? "—" : `${ratio}%`}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-100 dark:bg-[#232838]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${LOAD_TONE_BAR[tone]}`}
          style={{ width: pct(committedSP, scaleMax) }}
        />
        {capacitySP > 0 && (
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-slate-700 dark:bg-slate-200"
            style={{ left: pct(capacitySP, scaleMax) }}
            title={`Capacity: ${capacitySP} SP`}
          />
        )}
        {avgVelocity !== null && avgVelocity !== undefined && avgVelocity > 0 && (
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-blue-500"
            style={{ left: pct(avgVelocity, scaleMax) }}
            title={`Average velocity: ${avgVelocity} SP`}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-3 rounded-full ${LOAD_TONE_BAR[tone]}`} />Committed</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-0.5 rounded bg-slate-700 dark:bg-slate-200" />Capacity</span>
        {avgVelocity !== null && avgVelocity !== undefined && (
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-0.5 rounded bg-blue-500" />Avg velocity {avgVelocity} SP</span>
        )}
        {over > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
            <FaExclamationTriangle className="h-2.5 w-2.5" /> Over capacity by {over} SP
          </span>
        )}
      </div>
    </div>
  );
}

function groupTasks(tasks, mode, users) {
  if (mode === "assignee") {
    const map = new Map();
    tasks.forEach((task) => {
      const key = getAssigneeKey(task) || "__unassigned__";
      if (!map.has(key)) {
        map.set(key, { key, title: key === "__unassigned__" ? "Unassigned" : getUserDisplayName(key, users), tasks: [] });
      }
      map.get(key).tasks.push(task);
    });
    return [...map.values()].sort((a, b) => {
      if (a.key === "__unassigned__") return 1;
      if (b.key === "__unassigned__") return -1;
      return a.title.localeCompare(b.title);
    });
  }
  if (mode === "priority") {
    return TASK_PRIORITY_OPTIONS
      .map((option) => ({
        key: option.value,
        title: option.label,
        tasks: tasks.filter((task) => String(task.priority || "medium").toLowerCase() === option.value),
      }))
      .filter((group) => group.tasks.length > 0);
  }
  return [{ key: "all", title: null, tasks }];
}

function SprintScopePanel({
  sprint,
  tasks,
  committedSP,
  capacitySP,
  avgVelocity,
  canEdit,
  users,
  selectedIds,
  onToggleSelect,
  onSetSelection,
  onRemoveSelected,
  onRemoveTask,
  onOpen,
  onEstimate,
}) {
  const [groupMode, setGroupMode] = useState("none");
  const groups = useMemo(() => groupTasks(tasks, groupMode, users), [tasks, groupMode, users]);
  const selectedTasks = useMemo(() => tasks.filter((task) => selectedIds.has(task.id)), [tasks, selectedIds]);

  let rowIndex = 0;

  return (
    <PlanningCard className="flex min-w-0 flex-col overflow-hidden" aria-label="Sprint scope">
      <PanelHeader
        icon={FaFlagCheckered}
        title={sprint?.name ? `${sprint.name} scope` : "Sprint scope"}
        meta={`${tasks.length} · ${committedSP} SP`}
        actions={tasks.length > 0 && (
          <SegmentedControl label="Group sprint scope" value={groupMode} onChange={setGroupMode} options={GROUP_OPTIONS} />
        )}
      >
        <div className="mt-3">
          <CommitmentMeter committedSP={committedSP} capacitySP={capacitySP} avgVelocity={avgVelocity} />
        </div>
      </PanelHeader>

      {canEdit && selectedTasks.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-[#252b3b] dark:bg-[#141720]" role="status">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {selectedTasks.length} selected · {sumStoryPoints(selectedTasks)} SP
          </span>
          <button
            type="button"
            onClick={() => onSetSelection(new Set())}
            className="ml-auto rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-[#232838]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onRemoveSelected(selectedTasks)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-200 dark:hover:bg-[#2a3044]"
          >
            <FaArrowLeft className="h-2.5 w-2.5" /> Move to backlog
          </button>
        </div>
      )}

      <Droppable droppableId={SPRINT_DROPPABLE_ID} isDropDisabled={!canEdit}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`max-h-[560px] min-h-[240px] flex-1 overflow-y-auto px-2 py-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50/70 dark:bg-blue-500/5" : ""
            }`}
          >
            {tasks.length === 0 ? (
              <div className={`rounded-lg border-2 border-dashed ${snapshot.isDraggingOver ? "border-blue-400" : "border-slate-200 dark:border-[#2a3044]"}`}>
                <EmptyState
                  icon={FaLayerGroup}
                  title="No work planned yet"
                  hint={canEdit ? "Drag items here, or use Add on any backlog item." : "Nothing has been committed to this sprint."}
                />
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="mb-2 last:mb-0">
                  {group.title && (
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{group.title}</span>
                      <span className="text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                        {group.tasks.length} · {sumStoryPoints(group.tasks)} SP
                      </span>
                      <span className="h-px flex-1 bg-slate-100 dark:bg-[#252b3b]" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.tasks.map((task) => {
                      const index = rowIndex;
                      rowIndex += 1;
                      return (
                        <PlanningTaskRow
                          key={task.id}
                          task={task}
                          index={index}
                          variant="sprint"
                          selected={selectedIds.has(task.id)}
                          canEdit={canEdit}
                          users={users}
                          onToggleSelect={onToggleSelect}
                          onOpen={onOpen}
                          onMove={onRemoveTask}
                          onEstimate={onEstimate}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </PlanningCard>
  );
}

export default memo(SprintScopePanel);
