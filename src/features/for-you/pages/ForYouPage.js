import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { addDays, isValid, parseISO, startOfDay } from "date-fns";
import { useApp } from "../../../shared/context/AppContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { ForYouSkeleton } from "../../../shared/components/Skeleton";
import { requestNavigate, requestOpenTask } from "../../../shared/components/appNavigation";
import { buildUniversalTimeline } from "../../../shared/utils/universalTimeline";
import { taskKey } from "../../../shared/utils/helpers";
import { TASK_STATUS_BADGE_STYLES, TASK_TYPE_ICON_META } from "../../../shared/constants/taskMeta";
import {
  filterNotificationsForUser,
  getNotificationMeta,
  resolveNotificationTarget,
} from "../../../shared/constants/notificationMeta";
import {
  FaBell, FaCheck, FaInbox, FaCheckSquare, FaComment, FaClock, FaBookOpen, FaLink,
} from "react-icons/fa";

/** Parses "YYYY-MM-DD" (or ISO) as a *local* date; `new Date("YYYY-MM-DD")` is UTC midnight. */
export function parseLocalDueDate(value) {
  if (!value) return null;
  const parsed = parseISO(String(value));
  return isValid(parsed) ? parsed : null;
}

/** Tasks due today (local) through the next 7 days, soonest first. */
export function selectDueSoonTasks(tasks, now = new Date(), limit = 5) {
  const start = startOfDay(now);
  const end = addDays(start, 8); // exclusive: through the end of day +7
  return (tasks || [])
    .map((task) => ({ task, due: parseLocalDueDate(task.dueDate) }))
    .filter(({ due }) => due && due >= start && due < end)
    .sort((left, right) => left.due - right.due)
    .slice(0, limit)
    .map(({ task }) => task);
}

function relativeTime(isoStr) {
  const time = new Date(isoStr).getTime();
  if (!isoStr || Number.isNaN(time)) return "";
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function ForYouPage() {
  const {
    notifications, markNotifRead, markAllNotifsRead,
    activeTasks, backlogSections, currentUser, dbReady,
    docPages, releases, testRuns, globalActivityLog, archivedTasks,
    notificationPreferences, setNotificationPreferences,
  } = useApp();
  const { canAccessPage } = usePermissions();
  const [filter, setFilter] = useState("all");

  const allBacklogTasks = useMemo(
    () => (backlogSections || []).flatMap((s) => s.tasks || []),
    [backlogSections]
  );

  const myNotifications = useMemo(
    () => filterNotificationsForUser(notifications, currentUser),
    [notifications, currentUser]
  );

  const visibleNotifs = useMemo(() => {
    if (filter === "unread") return myNotifications.filter((n) => !n.read);
    return myNotifications;
  }, [myNotifications, filter]);

  const unreadCount = myNotifications.filter((n) => !n.read).length;
  const allTasks = useMemo(() => [...(activeTasks || []), ...allBacklogTasks], [activeTasks, allBacklogTasks]);

  const handleNotificationClick = (notification) => {
    markNotifRead(notification.id);
    const target = resolveNotificationTarget(notification, { tasks: allTasks, archivedTasks, canAccessPage });
    if (target?.kind === "task") requestOpenTask(target.task);
    else if (target?.kind === "route") requestNavigate(target.route);
  };

  const handleTimelineClick = (entry) => {
    if (entry.entityType === "task") {
      const task = allTasks.find((candidate) => String(candidate.id) === String(entry.entityId));
      if (task) requestOpenTask(task);
      return;
    }
    if (entry.entityType === "doc" && entry.entityId) requestNavigate(`docs?page=${encodeURIComponent(entry.entityId)}`);
    else if (entry.entityType === "release") requestNavigate("releases");
    else if (entry.entityType === "test-run") requestNavigate("tests");
  };

  const assignedTasks = useMemo(() => {
    const name = (currentUser || "").toLowerCase();
    if (!name) return [];
    return allTasks.filter(
      (t) => t.assignedTo && String(t.assignedTo).toLowerCase() === name && t.status !== "done"
    );
  }, [allTasks, currentUser]);

  const blockedTasks = assignedTasks.filter((t) => t.status === "blocked");
  const inProgressTasks = assignedTasks.filter((t) => t.status === "inprogress");

  const dueSoonTasks = useMemo(() => selectDueSoonTasks(assignedTasks), [assignedTasks]);

  const universalTimeline = useMemo(() => buildUniversalTimeline({
    currentUser,
    globalActivityLog,
    activeTasks,
    backlogSections,
    docPages,
    releases,
    testRuns,
  }), [activeTasks, backlogSections, currentUser, docPages, globalActivityLog, releases, testRuns]);

  const mentionItems = useMemo(
    () => universalTimeline.filter((entry) => entry.mentionsCurrentUser).slice(0, 5),
    [universalTimeline]
  );
  const recentTimeline = useMemo(
    () => universalTimeline.slice(0, 8),
    [universalTimeline]
  );

  if (!dbReady) return <ForYouSkeleton />;
  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#141720]">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <FaBell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">For You</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotifsRead(myNotifications.filter((n) => !n.read).map((n) => n.id))}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FaCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1c2030] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notification Preferences</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Choose which in-app signals should surface in your workspace inbox.</p>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Digest: {notificationPreferences?.digest || "daily"}</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(notificationPreferences?.inApp || {}).map(([key, enabled]) => (
              <button
                key={key}
                type="button"
                onClick={() => setNotificationPreferences((prev) => ({
                  ...prev,
                  inApp: {
                    ...prev.inApp,
                    [key]: !enabled,
                  },
                }))}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  enabled
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-900/20 dark:text-blue-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-[#252b3b] dark:bg-[#232838] dark:text-slate-400"
                }`}
              >
                <div className="text-xs font-semibold capitalize">{key}</div>
                <div className="mt-1 text-[11px] opacity-80">{enabled ? "Visible in-app" : "Muted"}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Assigned to me — blocked/in-progress callout */}
        {(blockedTasks.length > 0 || inProgressTasks.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Assigned to you
            </h2>
            <div className="space-y-2">
              {blockedTasks.map((task) => {
                const TypeIcon = (TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task).icon;
                const typeColor = (TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task).color;
                return (
                  <motion.button
                    type="button"
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => requestOpenTask(task)}
                    className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 hover:border-red-200 dark:hover:border-red-800/50 transition-colors"
                  >
                    <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{taskKey(task.id)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TASK_STATUS_BADGE_STYLES.blocked}`}>
                      Blocked
                    </span>
                  </motion.button>
                );
              })}
              {inProgressTasks.map((task) => {
                const TypeIcon = (TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task).icon;
                const typeColor = (TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task).color;
                return (
                  <motion.button
                    type="button"
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => requestOpenTask(task)}
                    className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#252b3b] hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors"
                  >
                    <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{taskKey(task.id)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TASK_STATUS_BADGE_STYLES.inprogress}`}>
                      In Progress
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {(dueSoonTasks.length > 0 || mentionItems.length > 0) && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1c2030] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <FaClock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Due Soon</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Tasks due in the next 7 days</p>
                </div>
              </div>
              {dueSoonTasks.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">Nothing urgent on your plate.</p>
              ) : (
                <div className="space-y-2">
                  {dueSoonTasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => requestOpenTask(task)}
                      className="w-full text-left flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-[#232838] px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors"
                    >
                      <FaCheckSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{taskKey(task.id)} · due {task.dueDate}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1c2030] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <FaComment className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mentions</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Comments and updates that mention you</p>
                </div>
              </div>
              {mentionItems.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">No mentions right now.</p>
              ) : (
                <div className="space-y-2">
                  {mentionItems.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => handleTimelineClick(entry)}
                      className="w-full text-left rounded-xl bg-slate-50 dark:bg-[#232838] px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{entry.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{entry.subtitle}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notifications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Notifications
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1c2030] rounded-lg p-0.5">
              {["all", "unread"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-colors capitalize ${
                    filter === tab
                      ? "bg-white dark:bg-[#252b3b] text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {visibleNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1c2030] flex items-center justify-center mb-3">
                <FaInbox className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Activity from your workspace will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleNotifs.map((n) => {
                const meta = getNotificationMeta(n.type);
                const NIcon = meta.icon;
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left group ${
                      !n.read
                        ? "bg-blue-50/60 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        : "bg-white dark:bg-[#1c2030] border-slate-100 dark:border-[#252b3b] hover:bg-slate-50 dark:hover:bg-[#232838]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color}`}>
                      <NIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-medium text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}>
                        {n.text}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{relativeTime(n.timestamp)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Universal Activity
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Tasks, docs, releases and test runs</span>
          </div>

          {recentTimeline.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1c2030] px-4 py-8 text-center">
              <FaBookOpen className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent cross-workspace activity yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTimeline.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => handleTimelineClick(entry)}
                  className="w-full text-left flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-[#252b3b] bg-white dark:bg-[#1c2030] px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#232838] flex items-center justify-center flex-shrink-0">
                    {entry.category === "comment" ? (
                      <FaComment className="w-3.5 h-3.5 text-purple-500" />
                    ) : entry.category === "release" ? (
                      <FaLink className="w-3.5 h-3.5 text-violet-500" />
                    ) : (
                      <FaClock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{entry.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{entry.subtitle}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">{relativeTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
