import { useCallback } from "react";

export function useUiApi({
  resetAllData,
  dbReady,
  darkMode,
  setDarkMode,
  sidebarCollapsed,
  setSidebarCollapsed,
  projectsViewMode,
  setProjectsViewMode,
  densityMode,
  setDensityMode,
  perProjectBoardFilters,
  setPerProjectBoardFilters,
  templateRegistry,
  setTemplateRegistry,
  savedViews,
  setSavedViews,
  recentItems,
  setRecentItems,
  favoriteItems,
  setFavoriteItems,
  pinnedItems,
  setPinnedItems,
  notificationPreferences,
  setNotificationPreferences,
  permissionMatrix,
  setPermissionMatrix,
  workspaceSettings,
  setWorkspaceSettings,
  sensitiveActionPolicy,
  setSensitiveActionPolicy,
  globalActivityLog,
  logActivity,
  notifications,
  addNotification,
  markNotifRead,
  markAllNotifsRead,
  currentUser,
}) {
  const upsertNamedView = useCallback((namespace, nextView) => {
    setSavedViews((prev) => {
      const current = prev?.[namespace] || [];
      const idx = current.findIndex((view) => view.id === nextView.id);
      const updatedView = {
        createdAt: nextView.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: nextView.createdBy || currentUser || "system",
        shared: false,
        ...nextView,
      };
      return {
        ...prev,
        [namespace]: idx >= 0
          ? current.map((view, index) => (index === idx ? updatedView : view))
          : [updatedView, ...current].slice(0, 24),
      };
    });
  }, [currentUser, setSavedViews]);

  const removeNamedView = useCallback((namespace, id) => {
    setSavedViews((prev) => ({
      ...prev,
      [namespace]: (prev?.[namespace] || []).filter((view) => view.id !== id),
    }));
  }, [setSavedViews]);

  const pushRecentItem = useCallback((item) => {
    if (!item?.id) return;
    setRecentItems((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const next = [item, ...current.filter((entry) => entry.id !== item.id)];
      return next.slice(0, 16);
    });
  }, [setRecentItems]);

  const toggleFavoriteItem = useCallback((item) => {
    if (!item?.id) return;
    setFavoriteItems((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      return current.some((entry) => entry.id === item.id)
        ? current.filter((entry) => entry.id !== item.id)
        : [item, ...current].slice(0, 24);
    });
  }, [setFavoriteItems]);

  const togglePinnedItem = useCallback((item) => {
    if (!item?.id) return;
    setPinnedItems((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      return current.some((entry) => entry.id === item.id)
        ? current.filter((entry) => entry.id !== item.id)
        : [item, ...current].slice(0, 24);
    });
  }, [setPinnedItems]);

  return {
    resetAllData,
    dbReady,
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsViewMode,
    setProjectsViewMode,
    densityMode,
    setDensityMode,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
    templateRegistry,
    setTemplateRegistry,
    savedViews,
    saveNamedView: upsertNamedView,
    deleteNamedView: removeNamedView,
    recentItems,
    pushRecentItem,
    favoriteItems,
    toggleFavoriteItem,
    pinnedItems,
    togglePinnedItem,
    notificationPreferences,
    setNotificationPreferences,
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
    globalActivityLog,
    logActivity,
    notifications,
    addNotification,
    markNotifRead,
    markAllNotifsRead,
  };
}
