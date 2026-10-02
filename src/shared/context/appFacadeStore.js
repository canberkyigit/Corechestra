import { createContext, useCallback, useMemo, useRef, useSyncExternalStore } from "react";

/**
 * Tiny external store that publishes the `useApp()` facade computed once in
 * `AppProvider`, plus the tracking-proxy hook consumers read it through.
 *
 * Why: computing the facade per consumer (66 files) and subscribing every
 * consumer to the whole Zustand store re-rendered the entire app on any
 * change. Now the facade is computed once, and each consumer re-renders only
 * when a non-function key it actually read changes (Object.is).
 */

export const AppFacadeContext = createContext(null);

export function createAppFacadeStore(initialFacade) {
  let snapshot = initialFacade;
  const listeners = new Set();
  const actionWrappers = new Map();

  return {
    getSnapshot: () => snapshot,
    // Updates the snapshot WITHOUT notifying. AppProvider calls this during
    // render (before its children render) so that components re-rendering in
    // the same pass (e.g. via direct Zustand selectors) see a consistent
    // facade; `notify()` then runs from a layout effect.
    setSnapshot: (next) => {
      snapshot = next;
    },
    notify: () => {
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Stable per-key wrapper for function members (actions/setters): identity
    // never changes and every call dispatches to the latest implementation.
    getAction: (key) => {
      let wrapper = actionWrappers.get(key);
      if (!wrapper) {
        wrapper = (...args) => snapshot[key](...args);
        actionWrappers.set(key, wrapper);
      }
      return wrapper;
    },
  };
}

function readTracked(store, tracker, key) {
  const facade = store.getSnapshot();
  const value = facade[key];
  if (typeof value === "function") return store.getAction(key);
  tracker.seen.set(key, value);
  return value;
}

function createTrackedProxy(store, tracker) {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key === "symbol") return store.getSnapshot()[key];
        return readTracked(store, tracker, key);
      },
      has(_target, key) {
        return key in store.getSnapshot();
      },
      ownKeys() {
        return Reflect.ownKeys(store.getSnapshot());
      },
      getOwnPropertyDescriptor(_target, key) {
        const facade = store.getSnapshot();
        if (!Object.prototype.hasOwnProperty.call(facade, key)) return undefined;
        return {
          value: typeof key === "symbol" ? facade[key] : readTracked(store, tracker, key),
          writable: false,
          enumerable: true,
          configurable: true,
        };
      },
      set() {
        return false;
      },
      deleteProperty() {
        return false;
      },
      defineProperty() {
        return false;
      },
    }
  );
}

/**
 * Returns a proxy over the provider facade that records which keys the
 * component reads and re-renders the component only when one of those keys
 * changes. The proxy identity changes only when a tracked key changed, so it
 * is safe to use as a hook dependency.
 */
export function useTrackedAppFacade(store) {
  const trackerRef = useRef(null);
  if (trackerRef.current === null || trackerRef.current.store !== store) {
    trackerRef.current = {
      store,
      seen: new Map(),
      lastFacade: store.getSnapshot(),
      version: 0,
    };
  }
  const tracker = trackerRef.current;

  const subscribe = useCallback((listener) => store.subscribe(listener), [store]);

  const getSnapshot = useCallback(() => {
    const current = trackerRef.current;
    const facade = store.getSnapshot();
    if (facade !== current.lastFacade) {
      current.lastFacade = facade;
      let changed = false;
      current.seen.forEach((value, key) => {
        const next = facade[key];
        if (!Object.is(next, value)) {
          changed = true;
          current.seen.set(key, next);
        }
      });
      if (changed) current.version += 1;
    }
    return current.version;
  }, [store]);

  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // `version` is intentionally a dependency: a new proxy identity signals that
  // a tracked key changed, so `[app]`-style hook deps stay correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createTrackedProxy(store, tracker), [store, tracker, version]);
}
