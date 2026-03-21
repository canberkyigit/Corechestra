import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, parseISO, isValid, addMonths, subMonths,
  isPast, isThisWeek, differenceInDays, isSameDay,
} from "date-fns";
import {
  FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClock,
  FaExclamationTriangle, FaCheckCircle, FaCircle, FaUser,
} from "react-icons/fa";

const PRIORITY_COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

const STATUS_CONFIG = {
  todo:       { label: "To Do",       color: "#94a3b8" },
  inprogress: { label: "In Progress", color: "#3b82f6" },
  review:     { label: "Review",      color: "#a855f7" },
  awaiting:   { label: "Awaiting",    color: "#f97316" },
  blocked:    { label: "Blocked",     color: "#ef4444" },
  done:       { label: "Done",        color: "#22c55e" },
};

function getDueDateStatus(dueDate, status) {
  if (status === "done") return "done";
  try {
    const d = parseISO(dueDate);
    if (!isValid(d)) return "none";
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return "overdue";
    if (diff <= 2) return "soon";
    return "ok";
  } catch { return "none"; }
}

function TaskPill({ task, onClick }) {
  const pColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || "#3b82f6";
  const dueSt = getDueDateStatus(task.dueDate, task.status);
  const isOverdue = dueSt === "overdue";

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-80"
      style={{
        backgroundColor: pColor + "22",
        color: isOverdue ? "#ef4444" : pColor,
        borderLeft: `2px solid ${isOverdue ? "#ef4444" : pColor}`,
      }}
      title={task.title}
    >
      {isOverdue && "⚠ "}{task.title}
    </button>
  );
}

function TaskDetailPanel({ task, onClose }) {
  if (!task) return null;
  const dueSt = getDueDateStatus(task.dueDate, task.status);
  const pColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || "#3b82f6";
  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const daysLeft = task.dueDate && isValid(parseISO(task.dueDate))
    ? differenceInDays(parseISO(task.dueDate), new Date())
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Task Detail</h4>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838]">✕</button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Priority bar */}
        <div className="h-1 w-full rounded-full" style={{ backgroundColor: pColor }} />

        {/* Title */}
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{task.title}</h3>

        {/* Status + Priority */}
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: sCfg.color + "20", color: sCfg.color }}>
            <FaCircle className="w-2 h-2" /> {sCfg.label}
          </span>
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium capitalize" style={{ backgroundColor: pColor + "20", color: pColor }}>
            {task.priority}
          </span>
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            dueSt === "overdue" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" :
            dueSt === "soon"    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" :
            dueSt === "done"    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
            "bg-slate-50 dark:bg-[#232838] border-slate-200 dark:border-[#2a3044]"
          }`}>
            {dueSt === "overdue" ? <FaExclamationTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> :
             dueSt === "done"    ? <FaCheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :
             <FaClock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
            <div>
              <p className={`text-xs font-semibold ${
                dueSt === "overdue" ? "text-red-600 dark:text-red-400" :
                dueSt === "soon"    ? "text-orange-600 dark:text-orange-400" :
                dueSt === "done"    ? "text-green-600 dark:text-green-400" :
                "text-slate-700 dark:text-slate-200"
              }`}>
                {format(parseISO(task.dueDate), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {dueSt === "overdue" ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} overdue` :
                 dueSt === "done"    ? "Completed" :
                 daysLeft === 0      ? "Due today" :
                 daysLeft === 1      ? "Due tomorrow" :
                 `${daysLeft} days remaining`}
              </p>
            </div>
          </div>
        )}

        {/* Assignee */}
        {task.assignedTo && (
          <div className="flex items-center gap-2">
            <FaUser className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Assigned to</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{task.assignedTo}</span>
          </div>
        )}

        {/* Story points */}
        {task.storyPoint > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Story Points</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#232838] px-2 py-0.5 rounded-full">{task.storyPoint}</span>
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Subtasks ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
            </p>
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${s.done ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                    {s.done && "✓"}
                  </span>
                  <span className={s.done ? "line-through opacity-50" : ""}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { activeTasks, backlogSections } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const allTasks = useMemo(() => [
    ...activeTasks,
    ...backlogSections.flatMap((s) => s.tasks),
  ].filter((t) => t.dueDate), [activeTasks, backlogSections]);

  const getTasksForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return allTasks.filter((t) => {
      try {
        const d = parseISO(t.dueDate);
        return isValid(d) && format(d, "yyyy-MM-dd") === dayStr;
      } catch { return false; }
    });
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks = useMemo(() => {
    const ws = [];
    let day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
      ws.push(week);
    }
    return ws;
  }, [currentMonth]); // eslint-disable-line

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Month stats
  const monthTasks = useMemo(() => allTasks.filter((t) => {
    try { const d = parseISO(t.dueDate); return isValid(d) && isSameMonth(d, currentMonth); } catch { return false; }
  }), [allTasks, currentMonth]);

  const overdueCount = monthTasks.filter((t) => {
    try { return isPast(parseISO(t.dueDate)) && t.status !== "done"; } catch { return false; }
  }).length;

  // Upcoming tasks (next 7 days)
  const upcomingTasks = useMemo(() => allTasks.filter((t) => {
    try {
      const d = parseISO(t.dueDate);
      if (!isValid(d)) return false;
      const diff = differenceInDays(d, new Date());
      return diff >= 0 && diff <= 7 && t.status !== "done";
    } catch { return false; }
  }).sort((a, b) => parseISO(a.dueDate) - parseISO(b.dueDate)), [allTasks]);

  // Selected day tasks
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  const handleDayClick = (day) => {
    setSelectedDay((prev) => prev && isSameDay(prev, day) ? null : day);
    setSelectedTask(null);
  };

  const panelContent = selectedTask
    ? <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
    : selectedDay
    ? (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {format(selectedDay, "EEEE")}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">{format(selectedDay, "MMMM d, yyyy")}</p>
          </div>
          <button onClick={() => setSelectedDay(null)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {selectedDayTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <FaCalendarAlt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks due on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayTasks.map((task) => {
                const pColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || "#3b82f6";
                const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const dueSt = getDueDateStatus(task.dueDate, task.status);
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-[#1c2030] hover:shadow-sm transition-all"
                    style={{ borderLeft: `3px solid ${dueSt === "overdue" ? "#ef4444" : pColor}` }}
                  >
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: sCfg.color + "20", color: sCfg.color }}>
                        {sCfg.label}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: pColor + "20", color: pColor }}>
                        {task.priority}
                      </span>
                      {task.assignedTo && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">@{task.assignedTo}</span>
                      )}
                      {dueSt === "overdue" && (
                        <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">
                          <FaExclamationTriangle className="w-2.5 h-2.5" /> Overdue
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )
    : (
      /* Upcoming tasks panel */
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Upcoming (7 days)</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500">Tasks due soon</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <FaCheckCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming deadlines!</p>
            </div>
          ) : upcomingTasks.map((task) => {
            const pColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || "#3b82f6";
            const diff = differenceInDays(parseISO(task.dueDate), new Date());
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-[#1c2030] hover:shadow-sm transition-all"
                style={{ borderLeft: `3px solid ${pColor}` }}
              >
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mb-1">{task.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {format(parseISO(task.dueDate), "MMM d")}
                  </span>
                  <span className={`text-xs font-medium ${diff === 0 ? "text-red-500" : diff <= 2 ? "text-orange-500" : "text-slate-400"}`}>
                    {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="p-4 h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Calendar</h2>
        </div>

        {/* Month stats */}
        <div className="flex items-center gap-2">
          {monthTasks.length > 0 && (
            <>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <span className="font-bold">{monthTasks.length}</span> due this month
              </span>
              {overdueCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <FaExclamationTriangle className="w-3 h-3" />
                  <span className="font-bold">{overdueCount}</span> overdue
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <FaCheckCircle className="w-3 h-3" />
                <span className="font-bold">{monthTasks.filter((t) => t.status === "done").length}</span> done
              </span>
            </>
          )}

          {/* Nav */}
          <div className="flex items-center gap-1 ml-2">
            <button
              className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <FaChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-2 min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <FaChevronRight className="w-3 h-3" />
            </button>
            <button
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors ml-1"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Body: Calendar + Panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm overflow-hidden min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-[#232838] flex-shrink-0">
            {weekDays.map((d, i) => (
              <div key={d} className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${i >= 5 ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 flex-1 border-b border-slate-100 dark:border-[#232838] last:border-0 min-h-0">
                {week.map((day, di) => {
                  const tasks = getTasksForDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isWeekend = di === 5 || di === 6;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <div
                      key={di}
                      onClick={() => handleDayClick(day)}
                      className={`p-1 border-r border-slate-100 dark:border-[#232838] last:border-r-0 cursor-pointer transition-colors flex flex-col min-h-0 ${
                        isSelected ? "bg-blue-50 dark:bg-blue-900/20" :
                        !inMonth    ? "bg-slate-50/50 dark:bg-[#141720]/50" :
                        isWeekend   ? "bg-slate-50/30 dark:bg-[#141720]/30" : ""
                      } hover:bg-blue-50/60 dark:hover:bg-blue-900/10`}
                    >
                      {/* Date number */}
                      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 flex-shrink-0 ${
                        today       ? "bg-blue-600 text-white font-bold" :
                        !inMonth    ? "text-slate-300 dark:text-slate-600" :
                        isWeekend   ? "text-slate-400 dark:text-slate-500" :
                        "text-slate-700 dark:text-slate-300"
                      }`}>
                        {format(day, "d")}
                      </div>

                      {/* Task pills */}
                      <div className="space-y-0.5 flex-1 overflow-hidden">
                        {tasks.slice(0, 3).map((task) => (
                          <TaskPill key={task.id} task={task} onClick={setSelectedTask} />
                        ))}
                        {tasks.length > 3 && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                            +{tasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm overflow-hidden">
          {panelContent}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
        <span>Priority:</span>
        {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1 capitalize">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color + "44", border: `2px solid ${color}` }} />
            {key}
          </span>
        ))}
        <span className="ml-4 flex items-center gap-1 text-red-400"><FaExclamationTriangle className="w-3 h-3" /> Overdue</span>
      </div>
    </div>
  );
}
