import React, { useLayoutEffect, useState } from "react";
import { useAppStoreSync } from "./hooks/useAppStoreSync";
import { useAppFacade } from "./hooks/useAppFacade";
import { AppFacadeContext, createAppFacadeStore } from "./appFacadeStore";
import { useAuth } from "./AuthContext";
import WorkspaceLoadError from "../components/WorkspaceLoadError";
export { useApp } from "./hooks/useAppApi";

export function AppProvider({ children }) {
  const uid = useAuth()?.user?.uid || null;
  const { loadError, retryLoad, isRetrying } = useAppStoreSync(uid);

  // Compute the full facade ONCE here instead of inside every useApp() consumer.
  const facade = useAppFacade();
  const [store] = useState(() => createAppFacadeStore(facade));

  // Publish before children render so same-pass renders see a consistent
  // facade; notify subscribers after commit. Children elements are stable
  // props, so re-rendering this provider does not re-render the subtree.
  store.setSnapshot(facade);
  useLayoutEffect(() => {
    store.notify();
  }, [store, facade]);

  return (
    <AppFacadeContext.Provider value={store}>
      {loadError ? <WorkspaceLoadError onRetry={retryLoad} retrying={isRetrying} /> : children}
    </AppFacadeContext.Provider>
  );
}
