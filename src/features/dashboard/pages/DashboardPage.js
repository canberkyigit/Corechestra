import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../../../shared/context/AppContext";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import { TASK_STATUS_SHORT_LABELS } from "../../../shared/constants/taskMeta";
import { requestNavigate, requestOpenTask } from "../../../shared/components/appNavigation";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import {
  FaRocket, FaCheckCircle, FaHourglass, FaBolt, FaUserAlt,
  FaHistory, FaFlag, FaTimes,
} from "react-icons/fa";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { WorkspaceSetupChecklist } from "../../../shared/components/WorkspaceSetupChecklist";
import { buildWorkspaceSetupState } from "../../../shared/utils/workspaceSetup";
import { isInProject } from "../../../shared/utils/helpers";

const STATUS_KEYS = ["todo", "inprogress", "review", "awaiting", "blocked", "done"];

function parseValidDate(value) {
  if (!value) return null;
  try {
    const date = parseISO(String(value));
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * All dashboard aggregates in a single pass over the project's tasks.
 * Exported for tests.
 */
export function computeDashboardStats({
  activeTasks = [],
  epics = [],
  backlogSections = [],
  globalActivityLog = [],
  currentProjectId,
  currentUser,
  now = new Date(),
}) {
  const me = String(currentUser || "").toLowerCase();
  const projectTasks = [];
  const byStatus = Object.fromEntries(STATUS_KEYS.map((key) => [key, []]));
  const myTasks = [];
  const epicProgress = {};
  let overdue = 0;

  (activeTasks || []).forEach((task) => {
    if (!isInProject(task, currentProjectId)) return;
    projectTasks.push(task);
    if (byStatus[task.status]) byStatus[task.status].push(task);
    const isDone = task.status === "done";
    if (!isDone) {
      const due = parseValidDate(task.dueDate);
      if (due && differenceInDays(due, now) < 0) overdue += 1;
      if (me && String(task.assignedTo || "").toLowerCase() === me) myTasks.push(task);
    }
    if (task.epicId) {
      const entry = epicProgress[task.epicId] || { total: 0, done: 0 };
      entry.total += 1;
      if (isDone) entry.done += 1;
      epicProgress[task.epicId] = entry;
    }
  });

  return {
    projectTasks,
    byStatus,
    statusCounts: Object.fromEntries(STATUS_KEYS.map((key) => [key, byStatus[key].length])),
    overdueTasks: overdue,
    myTasks,
    epicProgress,
    projectEpics: (epics || []).filter((epic) => isInProject(epic, currentProjectId)),
    backlogCount: (backlogSections || []).reduce((sum, section) => sum + (section.tasks || []).length, 0),
    recentActivity: (globalActivityLog || [])
      .filter((entry) => !entry.projectId || entry.projectId === currentProjectId)
      .slice(0, 20),
  };
}

function StatCard({ label, value, sub, color = "blue", icon: Icon, onClick }) {
  const colorMap = {
    blue:   { bg: "bg-blue-50   dark:bg-blue-900/20",   text: "text-blue-600   dark:text-blue-400",   iconBg: "bg-blue-100   dark:bg-blue-900/30"   },
    green:  { bg: "bg-green-50  dark:bg-green-900/20",  text: "text-green-600  dark:text-green-400",  iconBg: "bg-green-100  dark:bg-green-900/30"  },
    yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400", iconBg: "bg-yellow-100 dark:bg-yellow-900/30" },
    red:    { bg: "bg-red-50    dark:bg-red-900/20",    text: "text-red-600    dark:text-red-400",    iconBg: "bg-red-100    dark:bg-red-900/30"    },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", iconBg: "bg-purple-100 dark:bg-purple-900/30" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <button
      onClick={onClick}
      className={`${c.bg} rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 w-full h-full text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className={`${c.iconBg} rounded-lg p-2 md:p-2.5 flex-shrink-0`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${c.text}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-xl md:text-2xl font-bold ${c.text}`}>{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
      </div>
    </button>
  );
}

function SprintProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{done} / {total} tasks done</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
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

function TaskDrillModal({ title, tasks, onClose, onOpenTask }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#232838]">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838]">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8">No tasks</p>
          ) : tasks.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => onOpenTask?.(t)}
              className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#141720] border border-slate-100 dark:border-[#232838] hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                t.priority === "critical" ? "bg-red-500" :
                t.priority === "high" ? "bg-orange-400" :
                t.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
              }`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.title}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 capitalize mt-0.5">
                  {TASK_STATUS_SHORT_LABELS[t.status] || t.status} · {t.assignedTo || "unassigned"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    activeTasks, sprint, epics, globalActivityLog, backlogSections, currentProjectId, currentUser, dbReady,
    projects, users, teams, spaces, templateRegistry, permissionMatrix, workspaceSettings,
  } = useApp();
  const { canPerform } = usePermissions();
  const [drillModal, setDrillModal] = useState(null);

  const stats = useMemo(() => computeDashboardStats({
    activeTasks, epics, backlogSections, globalActivityLog, currentProjectId, currentUser,
  }), [activeTasks, epics, backlogSections, globalActivityLog, currentProjectId, currentUser]);
  const {
    projectTasks, byStatus, statusCounts, overdueTasks, myTasks, epicProgress, projectEpics, backlogCount, recentActivity,
  } = stats;

  const totalTasks = projectTasks.length;
  const doneTasks = statusCounts.done;
  const inProgressTasks = statusCounts.inprogress;
  const blockedTasks = statusCounts.blocked;

  // Guard against missing/invalid sprint dates (format() throws on Invalid Date).
  const sprintEnd = useMemo(() => parseValidDate(sprint?.endDate), [sprint?.endDate]);
  const sprintDaysLeft = sprintEnd ? Math.max(0, differenceInDays(sprintEnd, new Date())) : null;

  const workspaceSetup = useMemo(() => buildWorkspaceSetupState({
    projects,
    users,
    teams,
    spaces,
    templateRegistry,
    permissionMatrix,
    workspaceSettings,
  }), [projects, users, teams, spaces, templateRegistry, permissionMatrix, workspaceSettings]);

  const openDrill = (title, tasks) => setDrillModal({ title, tasks });
  const openTask = (task) => {
    setDrillModal(null);
    requestOpenTask(task);
  };

  if (!dbReady) return <DashboardSkeleton />;
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {!workspaceSetup.isComplete && workspaceSettings?.emptyStateHints !== false && (
        <div className="mb-6">
          <WorkspaceSetupChecklist
            setup={workspaceSetup}
            compact
            onOpenWorkspace={canPerform("workspace:manage") ? () => requestNavigate("admin") : undefined}
          />
        </div>
      )}

      {/* Sprint banner */}
      {sprint && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 md:p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FaRocket className="w-4 h-4 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wide">Active Sprint</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold">{sprint.name}</h2>
              {sprint.goal && (
                <p className="text-sm opacity-75 mt-1 max-w-lg">{sprint.goal}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {sprintDaysLeft !== null && (
                <div className={`text-2xl md:text-3xl font-bold flex items-center justify-end gap-1.5 ${sprintDaysLeft <= 2 ? "text-red-200" : ""}`}>
                  {sprintDaysLeft <= 2 && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-300 animate-pulse" />}
                  {sprintDaysLeft}
                </div>
              )}
              {sprintDaysLeft !== null && (
                <div className={`text-xs ${sprintDaysLeft <= 2 ? "text-red-200 font-semibold" : "opacity-75"}`}>days remaining</div>
              )}
              {sprintEnd ? (
                <div className="text-xs opacity-60 mt-1">
                  Ends {format(sprintEnd, "MMM d, yyyy")}
                </div>
              ) : (
                <div className="text-xs opacity-60 mt-1">No end date set</div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <SprintProgressBar done={doneTasks} total={totalTasks} />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Total Tasks", value: totalTasks, icon: FaFlag, color: "blue", tasks: projectTasks, title: "All Tasks" },
          { label: "Completed", value: doneTasks, sub: `${totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0}% done`, icon: FaCheckCircle, color: "green", tasks: byStatus.done, title: "Completed Tasks" },
          { label: "In Progress", value: inProgressTasks, icon: FaHourglass, color: "yellow", tasks: byStatus.inprogress, title: "In Progress Tasks" },
          { label: "Blocked", value: blockedTasks, sub: overdueTasks > 0 ? `${overdueTasks} overdue` : undefined, icon: FaBolt, color: "red", tasks: byStatus.blocked, title: "Blocked Tasks" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07, ease: "easeOut" }}
          >
            <StatCard
              label={card.label} value={card.value} sub={card.sub} icon={card.icon} color={card.color}
              onClick={() => openDrill(card.title, card.tasks)}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                    <span className="text-slate-400 dark:text-slate-500">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#232838] text-xs text-slate-400 dark:text-slate-500">
            {backlogCount} tasks in backlog
          </div>
        </div>

        {/* My tasks */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaUserAlt className="w-3.5 h-3.5 text-blue-500" />
            Assigned to Me
            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-auto capitalize">({currentUser})</span>
          </h3>
          {myTasks.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">No open tasks assigned to you</div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 8).map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => openTask(task)}
                  className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === "critical" ? "bg-red-500" :
                    task.priority === "high" ? "bg-orange-400" :
                    task.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">{task.title}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{TASK_STATUS_SHORT_LABELS[task.status] || task.status}</div>
                  </div>
                </button>
              ))}
              {myTasks.length > 8 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">+{myTasks.length - 8} more</div>
              )}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaHistory className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">No activity yet</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-72">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {entry.user?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{entry.user}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-400">{entry.action}</span>
                      {entry.details?.name && (
                        <span className="font-medium text-slate-700 dark:text-slate-200"> "{entry.details.name}"</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
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
      {projectEpics.length > 0 && (
        <div className="mt-6 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
            <FaRocket className="w-3.5 h-3.5 text-violet-500" /> Epics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {projectEpics.map((epic) => {
              const { total: epicTotal = 0, done: epicDone = 0 } = epicProgress[epic.id] || {};
              const pct = epicTotal > 0 ? Math.round((epicDone / epicTotal) * 100) : 0;
              return (
                <div key={epic.id} className="rounded-lg border border-slate-200 dark:border-[#2a3044] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{epic.title}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: epic.color }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{epicDone}/{epicTotal} tasks · {pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drill-down modal */}
      {drillModal && (
        <TaskDrillModal
          title={drillModal.title}
          tasks={drillModal.tasks}
          onClose={() => setDrillModal(null)}
          onOpenTask={openTask}
        />
      )}
    </div>
  );
}
