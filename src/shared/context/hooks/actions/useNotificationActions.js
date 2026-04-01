import { useCallback } from "react";

function getPreferenceCategory(type) {
  if (type === "assignment") return "assignments";
  if (type === "mention") return "mentions";
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
  const addNotification = useCallback((notif) => {
    const category = getPreferenceCategory(notif.type);
    if (notificationPreferences?.inApp?.[category] === false) return;
    setNotifications((prev) => [
      { id: Date.now(), read: false, timestamp: new Date().toISOString(), ...notif },
      ...prev,
    ].slice(0, 50));
  }, [notificationPreferences, setNotifications]);

  const markNotifRead = useCallback((id) => {
    setNotifications((prev) => prev.map((notif) => (
      notif.id === id ? { ...notif, read: true } : notif
    )));
  }, [setNotifications]);

  const markAllNotifsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, [setNotifications]);

  return {
    addNotification,
    markNotifRead,
    markAllNotifsRead,
  };
}
