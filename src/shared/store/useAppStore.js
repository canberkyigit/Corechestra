import { create } from "zustand";
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
  };
}

export const useAppStore = create((set) => ({
  ...createWorkspaceSlice(set),
  ...createBoardSlice(set),
  ...createDocsSlice(set),
  ...createTestingSlice(set),
  ...createPreferencesSlice(set),
  resetState: () => set(buildInitialAppStoreState()),
}));

export function resetAppStore() {
  useAppStore.getState().resetState();
}
