import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog } from "../ui/Modal";

const ConfirmContext = createContext(null);

/**
 * App-wide promise-based confirmation, the styled replacement for
 * `window.confirm`:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete page?", confirmLabel: "Delete" }))) return;
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    // A new request supersedes an unanswered one (treated as cancelled).
    resolverRef.current?.(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setRequest(typeof options === "string" ? { title: options } : options);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(request)}
        title={request?.title || "Are you sure?"}
        description={request?.description}
        details={request?.details}
        confirmLabel={request?.confirmLabel || "Confirm"}
        cancelLabel={request?.cancelLabel || "Cancel"}
        tone={request?.tone || "danger"}
        requireText={request?.requireText}
        requireTextLabel={request?.requireTextLabel}
        onCancel={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}

function fallbackConfirm(options = {}) {
  const { title = "Are you sure?", description = "" } = typeof options === "string" ? { title: options } : options;
  if (typeof window === "undefined" || typeof window.confirm !== "function") return Promise.resolve(false);
  return Promise.resolve(window.confirm(description ? `${title}\n\n${description}` : title));
}

/** Returns `confirm(options) => Promise<boolean>`. Falls back to window.confirm outside the provider (tests). */
export function useConfirm() {
  return useContext(ConfirmContext) || fallbackConfirm;
}
