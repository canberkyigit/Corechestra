import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Keeps keyboard focus inside `containerRef` while `active`:
 * - moves focus in on open (`[data-autofocus]` → first field → container),
 * - wraps Tab / Shift+Tab at the edges,
 * - restores focus to the element that opened the overlay on close.
 */
export function useFocusTrap(containerRef, active = true, { autoFocus = true, restoreFocus = true } = {}) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    previousFocusRef.current = typeof document !== "undefined" ? document.activeElement : null;

    if (autoFocus && !container.contains(document.activeElement)) {
      const preferred = container.querySelector("[data-autofocus]");
      const fields = getFocusableElements(container);
      const firstField = fields.find((element) => /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)) || fields[0];
      const target = preferred || firstField || container;
      if (target === container && !container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
      // Defer one frame so enter animations / portals have mounted.
      const raf = window.requestAnimationFrame(() => target.focus?.({ preventScroll: true }));
      previousFocusRef.raf = raf;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus?.();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.raf) window.cancelAnimationFrame(previousFocusRef.raf);
      const previous = previousFocusRef.current;
      if (restoreFocus && previous && typeof previous.focus === "function" && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
