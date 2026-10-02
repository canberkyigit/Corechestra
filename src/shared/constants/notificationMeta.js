import {
  FaArchive,
  FaArrowRight,
  FaAt,
  FaBolt,
  FaCheckCircle,
  FaComment,
  FaComments,
  FaExclamationTriangle,
  FaLayerGroup,
  FaPlay,
  FaTag,
  FaUndo,
} from "react-icons/fa";

/**
 * Single source of truth for notification icons/colours. Used by the Layout
 * notification panel and the For You inbox. Unknown types fall back to
 * `status_change` via `getNotificationMeta`.
 */
export const NOTIF_META = {
  assignment:       { icon: FaArrowRight,          color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  status_done:      { icon: FaCheckCircle,         color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  status_blocked:   { icon: FaExclamationTriangle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  status_change:    { icon: FaArrowRight,          color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  comment:          { icon: FaComment,             color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  mention:          { icon: FaAt,                  color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  task_created:     { icon: FaCheckCircle,         color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  task_archived:    { icon: FaArchive,             color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  task_restored:    { icon: FaUndo,                color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  task_deleted:     { icon: FaExclamationTriangle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  sprint_started:   { icon: FaPlay,                color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  sprint_completed: { icon: FaCheckCircle,         color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  project_created:  { icon: FaLayerGroup,          color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  project_deleted:  { icon: FaExclamationTriangle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  epic_created:     { icon: FaBolt,                color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
  epic_deleted:     { icon: FaExclamationTriangle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  archive_emptied:  { icon: FaArchive,             color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  release_update:   { icon: FaTag,                 color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
  chat_mention:     { icon: FaComments,            color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
};

export function getNotificationMeta(type) {
  return NOTIF_META[type] || (type?.startsWith("release") ? NOTIF_META.release_update : NOTIF_META.status_change);
}

/**
 * Targeted notifications carry `recipient` (a username). Broadcast
 * notifications (no recipient) are visible to everyone in the workspace.
 */
export function isNotificationVisibleTo(notification, currentUser) {
  if (!notification) return false;
  if (!notification.recipient) return true;
  if (!currentUser) return false;
  return String(notification.recipient).trim().toLowerCase() === String(currentUser).trim().toLowerCase();
}

export function filterNotificationsForUser(notifications, currentUser) {
  return (notifications || []).filter((notification) => isNotificationVisibleTo(notification, currentUser));
}

const TYPE_ROUTES = {
  sprint_started: "board",
  sprint_completed: "board",
  project_created: "projects",
  project_deleted: "projects",
  epic_created: "roadmap",
  epic_deleted: "roadmap",
  archive_emptied: "archive",
  task_archived: "archive",
  task_deleted: "archive",
};

function routePage(route) {
  return String(route || "").replace(/^\//, "").split(/[?#]/)[0] || "board";
}

/**
 * Works out where clicking a notification should take the user.
 * Returns `{ kind: "task", task }`, `{ kind: "route", route }` or `null`.
 * `route` is a path without the leading slash (e.g. `docs?page=page-1`).
 */
export function resolveNotificationTarget(notification, { tasks = [], archivedTasks = [], canAccessPage } = {}) {
  if (!notification) return null;
  const allowed = (route) => !canAccessPage || canAccessPage(routePage(route));
  const asRoute = (route) => (route && allowed(route) ? { kind: "route", route: String(route).replace(/^\//, "") } : null);

  if (notification.taskId != null) {
    const task = (tasks || []).find((entry) => String(entry?.id) === String(notification.taskId));
    if (task && notification.type !== "task_deleted") return { kind: "task", task };
    const archived = (archivedTasks || []).some((entry) => String(entry?.id) === String(notification.taskId));
    if (archived || notification.type === "task_archived" || notification.type === "task_deleted") {
      return asRoute("archive") || asRoute("board");
    }
  }

  if (notification.route) return asRoute(notification.route);
  if (notification.pageId) return asRoute(`docs?page=${encodeURIComponent(notification.pageId)}`);
  if (notification.releaseId || notification.type?.startsWith("release")) return asRoute("releases");
  if (TYPE_ROUTES[notification.type]) return asRoute(TYPE_ROUTES[notification.type]);
  if (notification.taskId != null) return asRoute("board");
  return null;
}
