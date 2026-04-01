import React from "react";
import KanbanBoard from "./KanbanBoard";
import { ListView, TableView } from "./BoardTaskViews";

function KanbanEmptyState({ title, description, onCreateTask, onClearFilters, hasActiveFilters }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-300 dark:text-slate-600">
        <rect x="4" y="10" width="16" height="44" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="24" y="10" width="16" height="44" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="44" y="10" width="16" height="44" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="7" y="16" width="10" height="6" rx="1.5" fill="currentColor" opacity="0.2" />
        <rect x="27" y="16" width="10" height="6" rx="1.5" fill="currentColor" opacity="0.2" />
        <rect x="47" y="16" width="10" height="6" rx="1.5" fill="currentColor" opacity="0.2" />
      </svg>
      <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300 mt-4">{title}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">{description}</p>
      <div className="mt-4 flex items-center gap-2">
        {hasActiveFilters && (
          <button
            className="px-4 py-2 border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        )}
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors" onClick={onCreateTask}>
          Create Task
        </button>
      </div>
    </div>
  );
}

export function BoardActiveContent({
  viewMode,
  filteredTasks,
  projectActiveTasks,
  filterValue,
  memberValue,
  search,
  setProjectTasks,
  idToGlobalIndex,
  showBadges,
  showPriorityColors,
  showTaskIds,
  showSubtaskButtons,
  swimlaneMode,
  onTaskClick,
  columns,
  selectedIds,
  onToggleSelect,
  bulkMode,
  onSelectAll,
  onCreateTask,
  hasActiveFilters,
  onClearFilters,
}) {
  if (viewMode === "kanban") {
    if (filteredTasks.length === 0) {
      const hasProjectTasks = projectActiveTasks.length > 0;
      const title = hasProjectTasks
        ? hasActiveFilters
          ? "No tasks match your current filters"
          : "No tasks found"
        : "No tasks in the active sprint";
      const description = hasProjectTasks
        ? hasActiveFilters
          ? "Clear the current filters or change the search query to see more work."
          : "Create a new task to start filling this sprint board."
        : "Add work to the active sprint or create a new task to get this board moving.";

      return (
        <KanbanEmptyState
          title={title}
          description={description}
          onCreateTask={onCreateTask}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      );
    }

    return (
      <div className="flex-1 min-h-0">
        <KanbanBoard
          filter={filterValue}
          member={memberValue}
          search={search}
          tasks={projectActiveTasks}
          setTasks={setProjectTasks}
          idToGlobalIndex={idToGlobalIndex}
          allBadgesOpen={showBadges}
          priorityColorsOpen={showPriorityColors}
          taskIdsOpen={showTaskIds}
          subtaskButtonsOpen={showSubtaskButtons}
          swimlaneMode={swimlaneMode}
          onTaskClick={onTaskClick}
          columns={columns}
        />
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <ListView
        tasks={filteredTasks}
        onTaskClick={onTaskClick}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        bulkMode={bulkMode}
        onCreateTask={onCreateTask}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <TableView
      tasks={filteredTasks}
      onTaskClick={onTaskClick}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      bulkMode={bulkMode}
      onSelectAll={onSelectAll}
      onCreateTask={onCreateTask}
      onClearFilters={onClearFilters}
    />
  );
}
