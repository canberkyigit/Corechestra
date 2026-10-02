import { create } from "zustand";
import { automationInitialState, createAutomationSlice } from "./slices/automationSlice";
import { boardInitialState, createBoardSlice } from "./slices/boardSlice";
import { docsInitialState, createDocsSlice } from "./slices/docsSlice";
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
  };
}

export const useAppStore = create((set) => ({
  ...createWorkspaceSlice(set),
  ...createBoardSlice(set),
  ...createDocsSlice(set),
  ...createTestingSlice(set),
  ...createPreferencesSlice(set),
  ...createAutomationSlice(set),
  resetState: () => set(buildInitialAppStoreState()),
}));

export function resetAppStore() {
  useAppStore.getState().resetState();
}
