import { useCallback, useState } from "react";
import { RELEASE_VIEWS, VIEW_STORAGE_KEY } from "../constants/releaseMeta";

const VALID_VIEWS = new Set(RELEASE_VIEWS.map((view) => view.id));

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return {};
    if (VALID_VIEWS.has(raw)) return { view: raw }; // tolerate a bare string
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable (private mode / quota) — preference stays in memory
  }
}

/** View switcher + list grouping, persisted per browser. */
export function useReleaseViewPrefs() {
  const [prefs, setPrefs] = useState(() => {
    const stored = readPrefs();
    return {
      view: VALID_VIEWS.has(stored.view) ? stored.view : "list",
      groupByStatus: stored.groupByStatus !== false,
      timelineZoom: stored.timelineZoom === "half" ? "half" : "quarter",
    };
  });

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  return {
    view: prefs.view,
    groupByStatus: prefs.groupByStatus,
    timelineZoom: prefs.timelineZoom,
    setView: useCallback((view) => update({ view: VALID_VIEWS.has(view) ? view : "list" }), [update]),
    setGroupByStatus: useCallback((groupByStatus) => update({ groupByStatus }), [update]),
    setTimelineZoom: useCallback((timelineZoom) => update({ timelineZoom }), [update]),
  };
}
