import { useCallback, useMemo } from "react";

export function useProjectScopedState({
  currentProjectId,
  stateMap,
  setStateMap,
  fallback,
}) {
  const value = useMemo(() => {
    if (!currentProjectId) return fallback;
    return stateMap[currentProjectId] ?? fallback;
  }, [currentProjectId, fallback, stateMap]);

  const setValue = useCallback((updaterOrValue) => {
    if (!currentProjectId) return;
    setStateMap((prev) => ({
      ...prev,
      [currentProjectId]: typeof updaterOrValue === "function"
        ? updaterOrValue(prev[currentProjectId] ?? fallback)
        : updaterOrValue,
    }));
  }, [currentProjectId, fallback, setStateMap]);

  return [value, setValue];
}
