import React, { Suspense, lazy, useState, useMemo } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { CalendarSkeleton } from "../../../shared/components/Skeleton";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, parseISO, isValid, addMonths, subMonths,
  isPast, differenceInDays, isSameDay, addWeeks, isTomorrow,
  startOfDay, isBefore,
} from "date-fns";
import {
  FaChevronLeft, FaChevronRight, FaCalendarAlt,
  FaExclamationTriangle, FaCheckCircle, FaUser,
  FaThLarge, FaListUl,
} from "react-icons/fa";
const TaskSidePanel = lazy(() => import("../../board/components/TaskSidePanel"));

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
      className="w-full text-left text-xs px-2 py-1 rounded-md truncate font-medium transition-all hover:opacity-90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:shadow-none"
      style={{
        backgroundColor: pColor + "20",
        color: isOverdue ? "#ef4444" : pColor,
        border: `1px solid ${isOverdue ? "#fecaca" : `${pColor}40`}`,
        borderLeft: `3px solid ${isOverdue ? "#ef4444" : pColor}`,
      }}
      title={task.title}
    >
      {isOverdue && "⚠ "}{task.title}
    </button>
  );
}


export default function CalendarPage() {
  const { activeTasks, backlogSections, currentProjectId, updateActiveTask, dbReady } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [calendarView, setCalendarView] = useState("month"); // "month" | "week" | "agenda"

  const allTasks = useMemo(() => [
    ...activeTasks,
    ...backlogSections.flatMap((s) => s.tasks),
  ].filter((t) => t.dueDate && (t.projectId || "proj-1") === currentProjectId),
  [activeTasks, backlogSections, currentProjectId]);

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

  // Agenda view: group tasks by date bucket
  const agendaGroups = useMemo(() => {
    if (calendarView !== "agenda") return [];
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

    const buckets = {
      overdue:  { label: "Overdue", tasks: [], accent: "red" },
      today:    { label: `Today — ${format(now, "MMM d")}`, tasks: [], accent: "blue" },
      tomorrow: { label: `Tomorrow — ${format(tomorrowStart, "MMM d")}`, tasks: [], accent: "blue" },
      thisWeek: { label: "This Week", tasks: [], accent: "slate" },
      nextWeek: { label: "Next Week", tasks: [], accent: "slate" },
      later:    { label: "Later", tasks: [], accent: "slate" },
    };

    allTasks.forEach((t) => {
      try {
        const d = parseISO(t.dueDate);
        if (!isValid(d)) return;
        const dStart = startOfDay(d);

        if (t.status !== "done" && isBefore(dStart, todayStart)) {
          buckets.overdue.tasks.push(t);
        } else if (isToday(d)) {
          buckets.today.tasks.push(t);
        } else if (isTomorrow(d)) {
          buckets.tomorrow.tasks.push(t);
        } else if (isBefore(dStart, thisWeekEnd) || isSameDay(dStart, thisWeekEnd)) {
          buckets.thisWeek.tasks.push(t);
        } else if (isBefore(dStart, nextWeekEnd) || isSameDay(dStart, nextWeekEnd)) {
          buckets.nextWeek.tasks.push(t);
        } else {
          buckets.later.tasks.push(t);
        }
      } catch { /* skip invalid dates */ }
    });

    // Sort each bucket by due date
    Object.values(buckets).forEach((b) =>
      b.tasks.sort((a, b2) => parseISO(a.dueDate) - parseISO(b2.dueDate))
    );

    return Object.entries(buckets)
      .filter(([, b]) => b.tasks.length > 0)
      .map(([key, b]) => ({ key, ...b }));
  }, [calendarView, allTasks]);

  const panelContent = selectedTask
    ? null // TaskSidePanel rendered separately below
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

  const TYPE_COLORS = {
    story:   "#3b82f6",
    bug:     "#ef4444",
    task:    "#8b5cf6",
    epic:    "#f97316",
    subtask: "#06b6d4",
  };

  if (allTasks.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <FaCalendarAlt className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Calendar</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-300 dark:text-slate-600">
            <rect x="8" y="14" width="48" height="42" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M8 24h48" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <rect x="18" y="8" width="2" height="12" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="44" y="8" width="2" height="12" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="16" y="30" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
            <rect x="29" y="30" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
            <rect x="42" y="30" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
            <rect x="16" y="42" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
          </svg>
          <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300 mt-4">No scheduled tasks</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">Assign due dates to your tasks to see them here</p>
        </div>
      </div>
    );
  }

  if (!dbReady) return <CalendarSkeleton />;
  return (
    <div className="p-4 h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Calendar</h2>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-slate-300/90 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-sm overflow-hidden">
            <button
              onClick={() => setCalendarView("month")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                calendarView === "month"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              <FaThLarge className="w-3 h-3" /> Month
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border-l border-r border-slate-300/90 dark:border-[#2a3044] transition-colors ${
                calendarView === "week"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              <FaCalendarAlt className="w-3 h-3" /> Week
            </button>
            <button
              onClick={() => setCalendarView("agenda")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                calendarView === "agenda"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              <FaListUl className="w-3 h-3" /> Agenda
            </button>
          </div>
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

          {/* Nav (visible in month/week views) */}
          {calendarView !== "agenda" && (
            <div className="flex items-center gap-1 ml-2">
              <button
                className="p-1.5 border border-slate-300/90 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-2 min-w-[120px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button
                className="p-1.5 border border-slate-300/90 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
              <button
                className="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-400 border border-slate-300/90 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors ml-1 shadow-sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Agenda view */}
        {calendarView === "agenda" ? (
          <div className="flex-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm overflow-y-auto min-w-0">
            {agendaGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-16">
                <FaCalendarAlt className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No upcoming tasks</p>
                <p className="text-xs mt-1">Tasks with due dates will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#232838]">
                {agendaGroups.map((group) => (
                  <div key={group.key}>
                    {/* Group header */}
                    <div className={`sticky top-0 z-10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-l-3 ${
                      group.key === "overdue"
                        ? "bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400 border-l-red-500"
                        : group.key === "today"
                        ? "bg-blue-50 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 border-l-blue-500"
                        : "bg-slate-50 dark:bg-[#181c28] text-slate-500 dark:text-slate-400 border-l-slate-300 dark:border-l-slate-600"
                    }`} style={{ borderLeftWidth: "3px" }}>
                      {group.key === "overdue" && <FaExclamationTriangle className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                      {group.label}
                      <span className="ml-2 text-[10px] font-semibold opacity-60">({group.tasks.length})</span>
                    </div>

                    {/* Task rows */}
                    <div className="divide-y divide-slate-50 dark:divide-[#1e2235]">
                      {group.tasks.map((task) => {
                        const pColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || "#3b82f6";
                        const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                        const typeColor = TYPE_COLORS[task.type?.toLowerCase()] || "#6b7280";
                        return (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors group"
                          >
                            {/* Priority dot */}
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: pColor }}
                              title={task.priority}
                            />

                            {/* Title */}
                            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.title}
                            </span>

                            {/* Assignee */}
                            {task.assignedTo && (
                              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 capitalize flex-shrink-0">
                                <FaUser className="w-2.5 h-2.5" />
                                {task.assignedTo}
                              </span>
                            )}

                            {/* Type badge */}
                            {task.type && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                                style={{ backgroundColor: typeColor + "18", color: typeColor }}
                              >
                                {task.type}
                              </span>
                            )}

                            {/* Status badge */}
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ backgroundColor: sCfg.color + "20", color: sCfg.color }}
                            >
                              {sCfg.label}
                            </span>

                            {/* Due date */}
                            <span className={`text-xs flex-shrink-0 min-w-[52px] text-right ${
                              group.key === "overdue" ? "text-red-500 font-semibold" : "text-slate-400 dark:text-slate-500"
                            }`}>
                              {format(parseISO(task.dueDate), "MMM d")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Month / Week calendar grid */
          <div className="flex-1 flex flex-col bg-white dark:bg-[#1c2030] rounded-xl border border-slate-300 dark:border-[#2a3044] shadow-sm overflow-hidden min-w-0 overflow-x-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#232838] bg-slate-50/80 dark:bg-[#181c28] flex-shrink-0">
              {weekDays.map((d, i) => (
                <div key={d} className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] ${i >= 5 ? "text-slate-500 dark:text-slate-500" : "text-slate-600 dark:text-slate-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {(calendarView === "week" ? [weeks.find((w) => w.some((d) => isToday(d))) || weeks[0]] : weeks).map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 flex-1 border-b border-slate-200 dark:border-[#232838] last:border-0 min-h-0">
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
                        className={`p-1.5 border-r border-slate-200 dark:border-[#232838] last:border-r-0 cursor-pointer transition-colors flex flex-col min-h-0 ${
                          isSelected ? "bg-blue-50/95 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-200 dark:ring-blue-700/40" :
                          !inMonth    ? "bg-slate-50/80 dark:bg-[#141720]/50" :
                          isWeekend   ? "bg-slate-50/45 dark:bg-[#141720]/30" :
                          "bg-white dark:bg-[#1c2030]"
                        } hover:bg-blue-50/70 dark:hover:bg-blue-900/10`}
                      >
                        {/* Date number */}
                        <div className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 flex-shrink-0 ${
                          today       ? "bg-blue-600 text-white font-bold shadow-sm" :
                          !inMonth    ? "text-slate-400 dark:text-slate-600" :
                          isWeekend   ? "text-slate-500 dark:text-slate-500" :
                          "text-slate-700 dark:text-slate-300"
                        }`}>
                          {format(day, "d")}
                        </div>

                        {/* Task pills */}
                        <div className="space-y-1 flex-1 overflow-hidden">
                          {tasks.slice(0, calendarView === "week" ? 10 : 3).map((task) => (
                            <TaskPill key={task.id} task={task} onClick={setSelectedTask} />
                          ))}
                          {tasks.length > (calendarView === "week" ? 10 : 3) && (
                            <div
                              className="text-[10px] text-slate-500 dark:text-slate-500 px-1.5 py-1 rounded-md bg-slate-100/90 dark:bg-[#181c28] cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 relative group"
                              onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                            >
                              +{tasks.length - (calendarView === "week" ? 10 : 3)} more
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-0 mb-1 z-30 hidden group-hover:block">
                                <div className="bg-slate-800 dark:bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-2 min-w-[140px] max-w-[200px] border border-slate-700">
                                  {tasks.slice(calendarView === "week" ? 10 : 3).map((t) => (
                                    <div key={t.id} className="py-0.5 truncate opacity-90">{t.title}</div>
                                  ))}
                                </div>
                              </div>
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
        )}

        {/* Side panel (calendar info panel - only when no task selected) */}
        {!selectedTask && (
          <div className="w-64 flex-shrink-0 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-300 dark:border-[#2a3044] shadow-sm overflow-hidden">
            {panelContent}
          </div>
        )}
      </div>

      {/* TaskSidePanel (editable, replaces read-only TaskDetailPanel) */}
      {selectedTask && (
        <Suspense fallback={null}>
          <TaskSidePanel
            task={selectedTask}
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onTaskUpdate={(updated) => {
              updateActiveTask(updated);
              setSelectedTask(updated);
            }}
          />
        </Suspense>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-500 flex-shrink-0">
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
