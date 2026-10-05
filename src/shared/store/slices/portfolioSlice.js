import { createFieldSetter } from "../createStoreSetters";

export const portfolioInitialState = {
  projectStatusUpdates: [],
};

export function createPortfolioSlice(set) {
  return {
    ...portfolioInitialState,
    setProjectStatusUpdates: createFieldSetter("projectStatusUpdates", set),
  };
}
