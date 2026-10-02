import { useEffect, useRef } from "react";

// Only the most recently mounted active handler receives Escape, so nested
// overlays (e.g. a subtask panel inside a task modal) close one at a time.
const handlerStack = [];

function handleKeyDown(event) {
  if (event.key !== "Escape" || event.defaultPrevented || handlerStack.length === 0) return;
  const top = handlerStack[handlerStack.length - 1];
  top.current?.(event);
}

export function useEscapeKey(handler, active = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return undefined;
    handlerStack.push(handlerRef);
    if (handlerStack.length === 1) document.addEventListener("keydown", handleKeyDown);
    return () => {
      const index = handlerStack.lastIndexOf(handlerRef);
      if (index >= 0) handlerStack.splice(index, 1);
      if (handlerStack.length === 0) document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);
}
