import { useEffect, useRef } from "react";

// Lightweight bridge so feature pages can open the global TaskSidePanel or
// change route without importing router/board code. `Layout` (always mounted)
// listens and forwards to the handlers App passes it (`onOpenTask`,
// `onPageChange`).

export const OPEN_TASK_EVENT = "corechestra:open-task";
export const NAVIGATE_EVENT = "corechestra:navigate";

export function requestOpenTask(task) {
  if (!task || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_TASK_EVENT, { detail: { task } }));
}

/** `route` is a path without the leading slash, e.g. "docs?page=page-1". */
export function requestNavigate(route) {
  if (!route || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { route: String(route).replace(/^\//, "") } }));
}

export function useAppNavigationListener({ onOpenTask, onNavigate }) {
  const handlersRef = useRef({ onOpenTask, onNavigate });
  handlersRef.current = { onOpenTask, onNavigate };

  useEffect(() => {
    const handleOpen = (event) => {
      const task = event?.detail?.task;
      if (task) handlersRef.current.onOpenTask?.(task);
    };
    const handleNavigate = (event) => {
      const route = event?.detail?.route;
      if (route) handlersRef.current.onNavigate?.(route);
    };
    window.addEventListener(OPEN_TASK_EVENT, handleOpen);
    window.addEventListener(NAVIGATE_EVENT, handleNavigate);
    return () => {
      window.removeEventListener(OPEN_TASK_EVENT, handleOpen);
      window.removeEventListener(NAVIGATE_EVENT, handleNavigate);
    };
  }, []);
}
