import { useCallback } from "react";

function getPreferenceCategory(type) {
  if (type === "assignment") return "assignments";
  if (type === "mention" || type === "chat_mention") return "mentions";
  if (type === "comment") return "comments";
  if (type?.startsWith("release")) return "releases";
  if (type?.startsWith("approval") || type?.startsWith("workflow")) return "workflow";
  if (type?.includes("reminder")) return "reminders";
  return "system";
}

export function useNotificationActions({
  setNotifications,
  notificationPreferences,
}) {
  /**
   * `notif`: `{ type, text, taskId?, taskTitle?, recipient?, actor?, route?, pageId?, spaceId?, releaseId? }`.
   * `recipient` (username) targets the notification at one user; without it
   * the notification is a workspace-wide broadcast.
   */
  const addNotification = useCallback((notif) => {
    if (!notif) return;
    const category = getPreferenceCategory(notif.type);
    if (notificationPreferences?.inApp?.[category] === false) return;
    // Unique ids: several notifications are often emitted in the same tick
    // (status + assignment, comment + mentions); Date.now() alone collided.
    const id = `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [
      { id, read: false, timestamp: new Date().toISOString(), ...notif },
      ...(prev || []),
    ].slice(0, 50));
  }, [notificationPreferences, setNotifications]);

  const markNotifRead = useCallback((id) => {
    setNotifications((prev) => prev.map((notif) => (
      notif.id === id ? { ...notif, read: true } : notif
    )));
  }, [setNotifications]);

  /** Marks every notification read, or only those whose id is in `ids`. */
  const markAllNotifsRead = useCallback((ids) => {
    const only = Array.isArray(ids) ? new Set(ids) : null;
    setNotifications((prev) => (prev || []).map((notif) => (
      !only || only.has(notif.id) ? { ...notif, read: true } : notif
    )));
  }, [setNotifications]);

  return {
    addNotification,
    markNotifRead,
    markAllNotifsRead,
  };
}
