import { useEffect, useRef } from "react";

// Only the most recently mounted active handler receives Escape, so nested
// overlays (e.g. a confirm dialog over a task modal, or the command palette
// over a side panel) close one layer at a time.
const handlerStack = [];

function handleKeyDown(event) {
  if (event.key !== "Escape" || event.defaultPrevented || handlerStack.length === 0) return;
  const top = handlerStack[handlerStack.length - 1];
  // Claim the key so window-level listeners and outer layers ignore it.
  event.preventDefault();
  event.stopPropagation();
  top.current?.(event);
}

/** True while any overlay registered through useEscapeKey is open. */
export function hasOpenEscapeLayer() {
  return handlerStack.length > 0;
}

export function useEscapeKey(handler, active = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return undefined;
    handlerStack.push(handlerRef);
    // Bubble phase on document: inner widgets (menus, mention popups, inputs)
    // handle Escape first and can preventDefault to keep the overlay open;
    // window-level listeners run after and see the event as handled.
    if (handlerStack.length === 1) document.addEventListener("keydown", handleKeyDown);
    return () => {
      const index = handlerStack.lastIndexOf(handlerRef);
      if (index >= 0) handlerStack.splice(index, 1);
      if (handlerStack.length === 0) document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);
}
