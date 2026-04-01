import { useMemo } from "react";
import { useApp } from "../AppContext";

function buildViewId(namespace, scopeId) {
  return `${namespace}-${scopeId || "workspace"}-${Date.now()}`;
}

function isSameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useSavedViews(namespace, scopeId, currentState) {
  const { savedViews, saveNamedView, deleteNamedView } = useApp();

  const views = useMemo(
    () => (savedViews?.[namespace] || []).filter((view) => (view.scopeId || "workspace") === (scopeId || "workspace")),
    [namespace, savedViews, scopeId]
  );

  const activeViewId = useMemo(
    () => views.find((view) => isSameState(view.state, currentState))?.id || null,
    [currentState, views]
  );

  const saveCurrentView = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    saveNamedView(namespace, {
      id: buildViewId(namespace, scopeId),
      name: trimmed,
      namespace,
      scopeId: scopeId || "workspace",
      state: currentState,
    });
  };

  return {
    views,
    activeViewId,
    saveCurrentView,
    deleteView: (id) => deleteNamedView(namespace, id),
  };
}
