import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { ForYouSkeleton } from "../components/Skeleton";
import {
  FaBell, FaCheckCircle, FaExclamationTriangle, FaComment, FaArrowRight,
  FaArchive, FaUndo, FaBolt, FaLayerGroup, FaPlay, FaCheck, FaInbox,
  FaCheckSquare, FaBug, FaPlusSquare, FaExclamationCircle, FaUser,
} from "react-icons/fa";

const NOTIF_META = {
  assignment:      { icon: FaArrowRight,          color: "text-blue-500    bg-blue-50    dark:bg-blue-900/20"    },
  status_done:     { icon: FaCheckCircle,         color: "text-green-500   bg-green-50   dark:bg-green-900/20"   },
  status_blocked:  { icon: FaExclamationTriangle, color: "text-red-500     bg-red-50     dark:bg-red-900/20"     },
  status_change:   { icon: FaArrowRight,          color: "text-blue-500    bg-blue-50    dark:bg-blue-900/20"    },
  comment:         { icon: FaComment,             color: "text-purple-500  bg-purple-50  dark:bg-purple-900/20"  },
  mention:         { icon: FaComment,             color: "text-purple-500  bg-purple-50  dark:bg-purple-900/20"  },
  task_created:    { icon: FaCheckCircle,         color: "text-green-500   bg-green-50   dark:bg-green-900/20"   },
  task_archived:   { icon: FaArchive,             color: "text-amber-500   bg-amber-50   dark:bg-amber-900/20"   },
  task_restored:   { icon: FaUndo,                color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  task_deleted:    { icon: FaExclamationTriangle, color: "text-red-500     bg-red-50     dark:bg-red-900/20"     },
  sprint_started:  { icon: FaPlay,                color: "text-blue-500    bg-blue-50    dark:bg-blue-900/20"    },
  sprint_completed:{ icon: FaCheckCircle,         color: "text-green-500   bg-green-50   dark:bg-green-900/20"   },
  project_created: { icon: FaLayerGroup,          color: "text-purple-500  bg-purple-50  dark:bg-purple-900/20"  },
  project_deleted: { icon: FaExclamationTriangle, color: "text-red-500     bg-red-50     dark:bg-red-900/20"     },
  epic_created:    { icon: FaBolt,                color: "text-violet-500  bg-violet-50  dark:bg-violet-900/20"  },
  epic_deleted:    { icon: FaExclamationTriangle, color: "text-red-500     bg-red-50     dark:bg-red-900/20"     },
  archive_emptied: { icon: FaArchive,             color: "text-red-500     bg-red-50     dark:bg-red-900/20"     },
};

const TASK_TYPE_ICONS = {
  task:          { icon: FaCheckSquare,       color: "text-green-500"  },
  bug:           { icon: FaBug,               color: "text-red-500"    },
  feature:       { icon: FaPlusSquare,        color: "text-cyan-500"   },
  defect:        { icon: FaExclamationCircle, color: "text-orange-500" },
  userstory:     { icon: FaUser,              color: "text-blue-500"   },
};

const STATUS_COLORS = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  inprogress: "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300",
  review:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  awaiting:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blocked:    "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300",
  done:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
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
  } = useApp();
  const [filter, setFilter] = useState("all");

  const allBacklogTasks = useMemo(
    () => (backlogSections || []).flatMap((s) => s.tasks || []),
    [backlogSections]
  );

  const visibleNotifs = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const assignedTasks = useMemo(() => {
    const name = (currentUser || "").toLowerCase();
    return [...(activeTasks || []), ...allBacklogTasks].filter(
      (t) => t.assignedTo && t.assignedTo.toLowerCase() === name && t.status !== "done"
    );
  }, [activeTasks, allBacklogTasks, currentUser]);

  const blockedTasks = assignedTasks.filter((t) => t.status === "blocked");
  const inProgressTasks = assignedTasks.filter((t) => t.status === "inprogress");

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
              onClick={markAllNotifsRead}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FaCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Assigned to me — blocked/in-progress callout */}
        {(blockedTasks.length > 0 || inProgressTasks.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Assigned to you
            </h2>
            <div className="space-y-2">
              {blockedTasks.map((task) => {
                const TypeIcon = (TASK_TYPE_ICONS[task.type] || TASK_TYPE_ICONS.task).icon;
                const typeColor = (TASK_TYPE_ICONS[task.type] || TASK_TYPE_ICONS.task).color;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
                  >
                    <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">cy-{task.id}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS.blocked}`}>
                      Blocked
                    </span>
                  </motion.div>
                );
              })}
              {inProgressTasks.map((task) => {
                const TypeIcon = (TASK_TYPE_ICONS[task.type] || TASK_TYPE_ICONS.task).icon;
                const typeColor = (TASK_TYPE_ICONS[task.type] || TASK_TYPE_ICONS.task).color;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#252b3b]"
                  >
                    <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">cy-{task.id}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS.inprogress}`}>
                      In Progress
                    </span>
                  </motion.div>
                );
              })}
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
                const meta = NOTIF_META[n.type] || NOTIF_META.status_change;
                const NIcon = meta.icon;
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => markNotifRead(n.id)}
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

      </div>
    </div>
  );
}
