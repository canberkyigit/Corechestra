import React, { memo, useMemo, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { FaArrowRight, FaCheckCircle, FaChevronDown, FaChevronRight, FaInbox, FaSearch, FaTimes } from "react-icons/fa";
import { sumStoryPoints } from "../../utils/sprintMetrics";
import { POOL_QUICK_FILTERS, POOL_SORTS, refineTasks } from "../../utils/planningMetrics";
import { Checkbox, EmptyState, PanelHeader, PlanningCard, SelectControl } from "./PlanningPrimitives";
import PlanningTaskRow from "./PlanningTaskRow";

export const POOL_DROPPABLE_PREFIX = "planning-pool-";

function BacklogPoolPanel({
  groups,
  canEdit,
  users,
  selectedIds,
  onToggleSelect,
  onSetSelection,
  onAddSelected,
  onAddTask,
  onOpen,
  onEstimate,
}) {
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sort, setSort] = useState("rank");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const totalCount = useMemo(() => groups.reduce((sum, group) => sum + group.tasks.length, 0), [groups]);
  const totalSP = useMemo(() => groups.reduce((sum, group) => sum + sumStoryPoints(group.tasks), 0), [groups]);

  const visibleGroups = useMemo(
    () => groups.map((group) => ({ ...group, visible: refineTasks(group.tasks, { query, quickFilter, sort }) })),
    [groups, query, quickFilter, sort]
  );
  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.visible.length, 0);
  const isRefined = Boolean(query.trim()) || quickFilter !== "all";

  const selectedTasks = useMemo(
    () => groups.flatMap((group) => group.tasks.filter((task) => selectedIds.has(task.id))),
    [groups, selectedIds]
  );

  const toggleCollapsed = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleGroupSelection = (group) => {
    const ids = group.visible.map((task) => task.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    onSetSelection(next);
  };

  const resetRefinement = () => { setQuery(""); setQuickFilter("all"); };

  return (
    <PlanningCard className="flex min-w-0 flex-col overflow-hidden" aria-label="Backlog pool">
      <PanelHeader
        icon={FaInbox}
        title="Backlog"
        meta={`${totalCount} · ${totalSP} SP`}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[140px] flex-1">
            <span className="sr-only">Search backlog</span>
            <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or key"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-200 dark:placeholder-slate-500"
            />
          </label>
          <SelectControl label="Quick filter" value={quickFilter} onChange={setQuickFilter} options={POOL_QUICK_FILTERS} />
          <SelectControl label="Sort backlog" value={sort} onChange={setSort} options={POOL_SORTS} />
        </div>
      </PanelHeader>

      {canEdit && selectedTasks.length > 0 && (
        <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-500/30 dark:bg-blue-500/10" role="status">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            {selectedTasks.length} selected · {sumStoryPoints(selectedTasks)} SP
          </span>
          <button
            type="button"
            onClick={() => onSetSelection(new Set())}
            className="ml-auto rounded-md px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onAddSelected(selectedTasks)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Add to sprint <FaArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      <div className="max-h-[560px] min-h-[240px] flex-1 overflow-y-auto px-2 py-2">
        {totalCount === 0 ? (
          <EmptyState
            icon={FaCheckCircle}
            title="Backlog is clear"
            hint="Every backlog item is already planned into the sprint."
          />
        ) : isRefined && visibleCount === 0 ? (
          <EmptyState icon={FaSearch} title="No matching items" hint="Try a different search or filter.">
            <button
              type="button"
              onClick={resetRefinement}
              className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <FaTimes className="h-2.5 w-2.5" /> Clear filters
            </button>
          </EmptyState>
        ) : (
          visibleGroups.map((group) => {
            if (group.tasks.length === 0 || (isRefined && group.visible.length === 0)) return null;
            const isCollapsed = collapsed.has(group.id);
            const visibleIds = group.visible.map((task) => task.id);
            const selectedInGroup = visibleIds.filter((id) => selectedIds.has(id)).length;
            return (
              <Droppable key={group.id} droppableId={`${POOL_DROPPABLE_PREFIX}${group.id}`} isDropDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`mb-2 rounded-lg transition-colors last:mb-0 ${snapshot.isDraggingOver ? "bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-500/40" : ""}`}
                  >
                    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md bg-white/95 px-2 py-1.5 backdrop-blur dark:bg-[#1a1f2e]/95">
                      {canEdit && (
                        <Checkbox
                          checked={visibleIds.length > 0 && selectedInGroup === visibleIds.length}
                          indeterminate={selectedInGroup > 0 && selectedInGroup < visibleIds.length}
                          onChange={() => toggleGroupSelection(group)}
                          label={`Select all in ${group.title}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(group.id)}
                        aria-expanded={!isCollapsed}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                      >
                        {isCollapsed
                          ? <FaChevronRight className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
                          : <FaChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />}
                        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                          {group.title}
                        </span>
                        <span className="flex-shrink-0 text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                          {isRefined ? `${group.visible.length}/${group.tasks.length}` : group.tasks.length} · {sumStoryPoints(group.visible)} SP
                        </span>
                      </button>
                      {canEdit && group.visible.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onAddSelected(group.visible)}
                          title={`Add ${group.visible.length} item${group.visible.length !== 1 ? "s" : ""} to the sprint`}
                          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                        >
                          Add all
                        </button>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {group.visible.map((task, index) => (
                          <PlanningTaskRow
                            key={task.id}
                            task={task}
                            index={index}
                            variant="pool"
                            selected={selectedIds.has(task.id)}
                            canEdit={canEdit}
                            users={users}
                            onToggleSelect={onToggleSelect}
                            onOpen={onOpen}
                            onMove={(item) => onAddTask(item, group.id)}
                            onEstimate={onEstimate}
                          />
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })
        )}
      </div>
    </PlanningCard>
  );
}

export default memo(BacklogPoolPanel);
