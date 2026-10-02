import React, { useLayoutEffect, useState } from "react";
import { useAppStoreSync } from "./hooks/useAppStoreSync";
import { useAppFacade } from "./hooks/useAppFacade";
import { AppFacadeContext, createAppFacadeStore } from "./appFacadeStore";
export { useApp } from "./hooks/useAppApi";

export function AppProvider({ children }) {
  useAppStoreSync();

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

  return <AppFacadeContext.Provider value={store}>{children}</AppFacadeContext.Provider>;
}
