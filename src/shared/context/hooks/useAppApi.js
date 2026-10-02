import { useContext } from "react";
import { AppFacadeContext, useTrackedAppFacade } from "../appFacadeStore";
import { useAppFacade } from "./useAppFacade";

export { useAppFacade };

function useAppFromProvider(store) {
  return useTrackedAppFacade(store);
}

function useAppStandalone() {
  return useAppFacade();
}

/**
 * App-facing facade over the Zustand store.
 *
 * Inside `AppProvider` the facade is computed once by the provider; this hook
 * returns a tracking proxy that re-renders the caller only when a value it
 * read changes. Function members (actions/setters) are stable wrappers that
 * always dispatch to the latest implementation and never trigger re-renders.
 *
 * Outside the provider (e.g. `renderHook(() => useApp())` in tests) it falls
 * back to computing the facade locally, exactly as before.
 *
 * Note: a given component must not move between "inside" and "outside" the
 * provider during its lifetime (the two paths use different hooks).
 */
export function useApp() {
  const store = useContext(AppFacadeContext);
  const useImpl = store ? useAppFromProvider : useAppStandalone;
  return useImpl(store);
}
