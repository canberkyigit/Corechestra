import { useProjectTaskIndex } from "./selectors/useProjectTaskIndex";

export function useProjectTasks(projectIdOverride) {
  return useProjectTaskIndex(projectIdOverride);
}
