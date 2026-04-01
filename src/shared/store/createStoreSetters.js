export function resolveUpdater(currentValue, updaterOrValue) {
  return typeof updaterOrValue === "function"
    ? updaterOrValue(currentValue)
    : updaterOrValue;
}

export function createFieldSetter(field, set) {
  return (updaterOrValue) =>
    set((state) => ({
      [field]: resolveUpdater(state[field], updaterOrValue),
    }));
}
