import { useEffect, useRef } from "react";
import { useConfirm } from "../context/ConfirmContext";

// App-level "leave this page?" guard. The app uses <BrowserRouter> (no data
// router → no useBlocker), so every in-app navigation entry point (sidebar,
// command palette, notifications, requestNavigate) goes through
// `confirmNavigation()` before calling navigate(). Browser back/close is
// covered separately by beforeunload + local draft backups.

const guards = new Set();

export function registerNavigationGuard(guard) {
  guards.add(guard);
  return () => guards.delete(guard);
}

/** Resolves true when navigation may proceed (no dirty guard, or the user chose to discard). */
export async function confirmNavigation() {
  for (const guard of Array.from(guards)) {
    if (!guard.isBlocking()) continue;
    // eslint-disable-next-line no-await-in-loop
    const ok = await guard.confirm();
    if (!ok) return false;
    guard.onDiscard?.();
  }
  return true;
}

export function hasBlockingNavigationGuard() {
  return Array.from(guards).some((guard) => guard.isBlocking());
}

/**
 * Registers a guard while mounted.
 * @param {() => boolean} isBlocking  read lazily at navigation time (can use refs)
 * @param {{ title?: string, description?: string, confirmLabel?: string, onDiscard?: () => void }} options
 */
export function useNavigationGuard(isBlocking, options = {}) {
  const confirm = useConfirm();
  const latest = useRef({ isBlocking, options, confirm });
  latest.current = { isBlocking, options, confirm };

  useEffect(() => registerNavigationGuard({
    isBlocking: () => Boolean(latest.current.isBlocking?.()),
    confirm: () => latest.current.confirm({
      title: latest.current.options.title || "Leave without saving?",
      description: latest.current.options.description || "You have unsaved changes. They will be lost if you leave this page.",
      confirmLabel: latest.current.options.confirmLabel || "Discard and leave",
      cancelLabel: "Stay",
      tone: "danger",
    }),
    onDiscard: () => latest.current.options.onDiscard?.(),
  }), []);
}
