import { createFieldSetter } from "../createStoreSetters";

export const strategyInitialState = {
  goals: [],
  projectStatusUpdates: [],
};

export function createStrategySlice(set) {
  return {
    ...strategyInitialState,
    setGoals: createFieldSetter("goals", set),
    setProjectStatusUpdates: createFieldSetter("projectStatusUpdates", set),
  };
}
