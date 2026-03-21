import React from "react";
import { useApp } from "../context/AppContext";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import {
  FaRocket, FaCheckCircle, FaHourglass, FaBolt, FaUserAlt,
  FaHistory, FaFlag,
} from "react-icons/fa";

function StatCard({ label, value, sub, color = "blue", icon: Icon }) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", iconBg: "bg-green-100" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-600", iconBg: "bg-yellow-100" },
    red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} rounded-xl p-4 flex items-center gap-4`}>
      <div className={`${c.iconBg} rounded-lg p-2.5`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function SprintProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{done} / {total} tasks done</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-yellow-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { activeTasks, sprint, epics, globalActivityLog, backlogSections } = useApp();

  const totalTasks = activeTasks.length;
  const doneTasks = activeTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = activeTasks.filter((t) => t.status === "inprogress").length;
  const blockedTasks = activeTasks.filter((t) => t.status === "blocked").length;
  const overdueTasks = activeTasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    try {
      const d = parseISO(t.dueDate);
      return isValid(d) && differenceInDays(d, new Date()) < 0;
    } catch { return false; }
  }).length;

  const myTasks = activeTasks.filter(
    (t) => t.assignedTo === "alice" && t.status !== "done"
  );

  const sprintDaysLeft = sprint?.endDate
    ? Math.max(0, differenceInDays(parseISO(sprint.endDate), new Date()))
    : null;

  // Group activity by day
  const recentActivity = (globalActivityLog || []).slice(0, 20);

  const backlogCount = backlogSections.reduce((sum, s) => sum + s.tasks.length, 0);

  const statusCounts = ["todo", "inprogress", "review", "awaiting", "blocked", "done"].reduce((acc, s) => {
    acc[s] = activeTasks.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Sprint banner */}
      {sprint && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FaRocket className="w-4 h-4 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wide">Active Sprint</span>
              </div>
              <h2 className="text-xl font-bold">{sprint.name}</h2>
              {sprint.goal && (
                <p className="text-sm opacity-75 mt-1 max-w-lg">{sprint.goal}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {sprintDaysLeft !== null && (
                <div className="text-3xl font-bold">{sprintDaysLeft}</div>
              )}
              <div className="text-xs opacity-75">days remaining</div>
              {sprint.endDate && (
                <div className="text-xs opacity-60 mt-1">
                  Ends {format(parseISO(sprint.endDate), "MMM d, yyyy")}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <SprintProgressBar done={doneTasks} total={totalTasks} />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tasks" value={totalTasks} icon={FaFlag} color="blue" />
        <StatCard label="Completed" value={doneTasks} sub={`${totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0}% done`} icon={FaCheckCircle} color="green" />
        <StatCard label="In Progress" value={inProgressTasks} icon={FaHourglass} color="yellow" />
        <StatCard label="Blocked" value={blockedTasks} sub={overdueTasks > 0 ? `${overdueTasks} overdue` : undefined} icon={FaBolt} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm">Status Breakdown</h3>
          <div className="space-y-3">
            {[
              { id: "todo", label: "To Do", color: "bg-slate-400" },
              { id: "inprogress", label: "In Progress", color: "bg-blue-500" },
              { id: "review", label: "Review", color: "bg-yellow-500" },
              { id: "awaiting", label: "Awaiting", color: "bg-purple-500" },
              { id: "blocked", label: "Blocked", color: "bg-red-500" },
              { id: "done", label: "Done", color: "bg-green-500" },
            ].map(({ id, label, color }) => {
              const count = statusCounts[id] || 0;
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              return (
                <div key={id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
            {backlogCount} tasks in backlog
          </div>
        </div>

        {/* My tasks */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaUserAlt className="w-3.5 h-3.5 text-blue-500" /> Assigned to Me
          </h3>
          {myTasks.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8">No open tasks assigned to you</div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 8).map((task) => (
                <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === "critical" ? "bg-red-500" :
                    task.priority === "high" ? "bg-orange-400" :
                    task.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-700 font-medium truncate">{task.title}</div>
                    <div className="text-xs text-slate-400 capitalize">{task.status}</div>
                  </div>
                </div>
              ))}
              {myTasks.length > 8 && (
                <div className="text-xs text-slate-400 text-center pt-1">+{myTasks.length - 8} more</div>
              )}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaHistory className="w-3.5 h-3.5 text-slate-400" /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8">No activity yet</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-72">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {entry.user?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-700">
                      <span className="font-medium">{entry.user}</span>{" "}
                      <span className="text-slate-500">{entry.action}</span>
                      {entry.details?.name && (
                        <span className="font-medium text-slate-700"> "{entry.details.name}"</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {entry.timestamp
                        ? (() => {
                            try { return format(parseISO(entry.timestamp), "MMM d, HH:mm"); }
                            catch { return ""; }
                          })()
                        : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Epics overview */}
      {epics.length > 0 && (
        <div className="mt-6 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaRocket className="w-3.5 h-3.5 text-violet-500" /> Epics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {epics.map((epic) => {
              const epicTasks = activeTasks.filter((t) => t.epicId === epic.id);
              const epicDone = epicTasks.filter((t) => t.status === "done").length;
              const pct = epicTasks.length > 0 ? Math.round((epicDone / epicTasks.length) * 100) : 0;
              return (
                <div key={epic.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                    <span className="text-sm font-medium text-slate-700 truncate">{epic.title}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: epic.color }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">{epicDone}/{epicTasks.length} tasks · {pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
