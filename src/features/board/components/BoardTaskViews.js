import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FaCheck } from "react-icons/fa";
import { parseISO, format } from "date-fns";
import { AppBadge, AppButton, AppEmptyState, getTaskStatusTone } from "../../../shared/components/AppPrimitives";

const STATUS_LABELS = {
  todo: "To Do",
  inprogress: "In Progress",
  review: "Review",
  awaiting: "Awaiting",
  blocked: "Blocked",
  done: "Done",
};

const COL_WIDTHS = {
  check: 36,
  title: "1fr",
  status: 110,
  priority: 90,
  assignee: 110,
  due: 110,
  points: 60,
};

function EmptyState({ onCreateTask }) {
  return (
    <AppEmptyState
      icon={(
        <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="20" y="16" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="20" y="24" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
          <rect x="20" y="32" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
          <rect x="20" y="40" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
          <path d="M12 14h40" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        </svg>
      )}
      title="No tasks found"
      description="Try adjusting your filters or create a new task."
      action={onCreateTask ? <AppButton onClick={onCreateTask}>Create Task</AppButton> : null}
      className="border-dashed shadow-none"
    />
  );
}

export function ListView({ tasks, onTaskClick, selectedIds, onToggleSelect, bulkMode, onCreateTask }) {
  const grouped = useMemo(() => {
    const map = {};
    ["todo", "inprogress", "review", "awaiting", "blocked", "done"].forEach((status) => {
      const groupedTasks = tasks.filter((task) => task.status === status);
      if (groupedTasks.length > 0) {
        map[status] = groupedTasks;
      }
    });
    return map;
  }, [tasks]);

  const flatItems = useMemo(() => {
    const items = [];
    Object.entries(grouped).forEach(([status, groupedTasks]) => {
      items.push({ kind: "header", status, count: groupedTasks.length });
      groupedTasks.forEach((task) => items.push({ kind: "task", task }));
      items.push({ kind: "spacer" });
    });
    return items;
  }, [grouped]);

  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      if (item.kind === "header") return 32;
      if (item.kind === "spacer") return 12;
      return 44;
    },
    overscan: 12,
  });

  if (tasks.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <EmptyState onCreateTask={onCreateTask} />
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-2">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = flatItems[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
            >
              {item.kind === "header" && (
                <div className="flex items-center gap-2 h-full">
                  <AppBadge tone={getTaskStatusTone(item.status)}>
                    {STATUS_LABELS[item.status]}
                  </AppBadge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{item.count}</span>
                </div>
              )}
              {item.kind === "task" && (
                <div
                  className={`flex items-center gap-3 px-3 h-[40px] rounded-lg border transition-colors cursor-pointer ${
                    selectedIds.has(item.task.id)
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                  onClick={() => (bulkMode ? onToggleSelect(item.task.id) : onTaskClick(item.task))}
                >
                  {bulkMode && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedIds.has(item.task.id) ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {selectedIds.has(item.task.id) && <FaCheck className="w-2.5 h-2.5 text-white" />}
                    </div>
                  )}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.task.priority === "critical" ? "bg-red-500" :
                    item.task.priority === "high" ? "bg-orange-400" :
                    item.task.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate font-medium">{item.task.title}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 capitalize hidden md:block">{item.task.assignedTo || "—"}</span>
                  {item.task.dueDate && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden lg:block">{format(parseISO(item.task.dueDate), "MMM d")}</span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">{item.task.storyPoint || 0}pt</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableRow({ task, bulkMode, selectedIds, onToggleSelect, onTaskClick }) {
  const selected = selectedIds.has(task.id);
  return (
    <div
      onClick={() => (bulkMode ? onToggleSelect(task.id) : onTaskClick(task))}
      className={`flex items-center gap-0 border-b border-slate-100 dark:border-[#232838] cursor-pointer transition-colors text-sm ${
        selected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"
      }`}
      style={{ height: 41 }}
    >
      {bulkMode && (
        <div className="flex items-center justify-center flex-shrink-0" style={{ width: COL_WIDTHS.check }}>
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
            selected ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"
          }`}>
            {selected && <FaCheck className="w-2.5 h-2.5 text-white" />}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 pr-4 pl-3">
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate block">{task.title}</span>
      </div>
      <div className="flex-shrink-0 pr-4" style={{ width: COL_WIDTHS.status }}>
        <AppBadge tone={getTaskStatusTone(task.status)}>
          {STATUS_LABELS[task.status] || task.status}
        </AppBadge>
      </div>
      <div className="flex-shrink-0 pr-4" style={{ width: COL_WIDTHS.priority }}>
        <span className={`text-xs font-medium capitalize ${
          task.priority === "critical" ? "text-red-500" :
          task.priority === "high" ? "text-orange-500" :
          task.priority === "medium" ? "text-yellow-500" : "text-green-500"
        }`}>{task.priority}</span>
      </div>
      <div className="flex-shrink-0 pr-4" style={{ width: COL_WIDTHS.assignee }}>
        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate block">{task.assignedTo || "—"}</span>
      </div>
      <div className="flex-shrink-0 pr-4" style={{ width: COL_WIDTHS.due }}>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "—"}
        </span>
      </div>
      <div className="flex-shrink-0 pr-3" style={{ width: COL_WIDTHS.points }}>
        <span className="text-xs text-slate-500 dark:text-slate-400">{task.storyPoint || 0}</span>
      </div>
    </div>
  );
}

export function TableView({ tasks, onTaskClick, selectedIds, onToggleSelect, bulkMode, onSelectAll, onCreateTask }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41,
    overscan: 10,
  });

  if (tasks.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4">
        <EmptyState onCreateTask={onCreateTask} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-[#2a3044] px-4 py-2 flex-shrink-0 bg-white dark:bg-[#141720]">
        {bulkMode && (
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: COL_WIDTHS.check }}>
            <button onClick={onSelectAll} className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center">
              {selectedIds.size === tasks.length && tasks.length > 0 && <FaCheck className="w-2.5 h-2.5 text-blue-500" />}
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0 pr-4 pl-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</div>
        <div className="flex-shrink-0 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: COL_WIDTHS.status }}>Status</div>
        <div className="flex-shrink-0 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: COL_WIDTHS.priority }}>Priority</div>
        <div className="flex-shrink-0 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: COL_WIDTHS.assignee }}>Assignee</div>
        <div className="flex-shrink-0 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: COL_WIDTHS.due }}>Due Date</div>
        <div className="flex-shrink-0 pr-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: COL_WIDTHS.points }}>Pts</div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto px-4">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
            >
              <TableRow
                task={tasks[virtualItem.index]}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onTaskClick={onTaskClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
