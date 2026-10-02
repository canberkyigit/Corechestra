import React, { useLayoutEffect, useState } from "react";
import { useAppStoreSync } from "./hooks/useAppStoreSync";
import { useAppFacade } from "./hooks/useAppFacade";
import { AppFacadeContext, createAppFacadeStore } from "./appFacadeStore";
import { useAutomationRunner } from "../automation/useAutomationRunner";
export { useApp } from "./hooks/useAppApi";

// `uid` = signed-in Firebase Auth uid (E2E fake auth exposes the same field);
// personal prefs are loaded from and saved to userPrefs/{uid}.
export function AppProvider({ uid = null, children }) {
  useAppStoreSync(uid);

  // Compute the full facade ONCE here instead of inside every useApp() consumer.
  const facade = useAppFacade();
  const [store] = useState(() => createAppFacadeStore(facade));
  useAutomationRunner(store);

  // Publish before children render so same-pass renders see a consistent
  // facade; notify subscribers after commit. Children elements are stable
  // props, so re-rendering this provider does not re-render the subtree.
  store.setSnapshot(facade);
  useLayoutEffect(() => {
    store.notify();
  }, [store, facade]);

  return <AppFacadeContext.Provider value={store}>{children}</AppFacadeContext.Provider>;
}
