import { create } from "zustand";
import { automationInitialState, createAutomationSlice } from "./slices/automationSlice";
import { boardInitialState, createBoardSlice } from "./slices/boardSlice";
import { docsInitialState, createDocsSlice } from "./slices/docsSlice";
import { strategyInitialState, createStrategySlice } from "./slices/strategySlice";
import { preferencesInitialState, createPreferencesSlice } from "./slices/preferencesSlice";
import { testingInitialState, createTestingSlice } from "./slices/testingSlice";
import { workspaceInitialState, createWorkspaceSlice } from "./slices/workspaceSlice";

export function buildInitialAppStoreState() {
  return {
    ...workspaceInitialState,
    ...boardInitialState,
    ...docsInitialState,
    ...testingInitialState,
    ...preferencesInitialState,
    ...automationInitialState,
    ...strategyInitialState,
  };
}

export const useAppStore = create((set) => ({
  ...createWorkspaceSlice(set),
  ...createBoardSlice(set),
  ...createDocsSlice(set),
  ...createTestingSlice(set),
  ...createPreferencesSlice(set),
  ...createAutomationSlice(set),
  ...createStrategySlice(set),
  resetState: () => set(buildInitialAppStoreState()),
}));

export function resetAppStore() {
  useAppStore.getState().resetState();
}
