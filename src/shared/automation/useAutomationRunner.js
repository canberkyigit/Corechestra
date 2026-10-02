import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { createAutomationRunner } from "./automationRunner";

let activeRunner = null;

/** The runner mounted by `AppProvider` (null outside the app, e.g. in unit tests). */
export function getActiveAutomationRunner() {
  return activeRunner;
}

/**
 * Starts the automation runner for the lifetime of `AppProvider`.
 * `facadeStore` is the provider facade store: its action members are the
 * same `updateTask` / `createTask` / `addNotification` the UI uses.
 */
export function useAutomationRunner(facadeStore) {
  useEffect(() => {
    const runner = createAutomationRunner({
      store: useAppStore,
      getActions: () => facadeStore.getSnapshot(),
    });
    runner.start();
    activeRunner = runner;
    return () => {
      runner.stop();
      if (activeRunner === runner) activeRunner = null;
    };
  }, [facadeStore]);
}
