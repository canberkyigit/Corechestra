import { useMemo } from "react";
import { useApp } from "../../../shared/context/AppContext";
import {
  getApplicableCustomFields,
  getCardCustomFields,
  getProjectCustomFieldDefs,
} from "../../../shared/utils/customFields";

const EMPTY = [];

/** Field definitions of a project (current project by default), in order. */
export function useProjectFieldDefs(projectIdOverride, { includeArchived = false } = {}) {
  const { customFieldDefs, currentProjectId } = useApp();
  const projectId = projectIdOverride || currentProjectId || "";
  return useMemo(
    () => getProjectCustomFieldDefs(customFieldDefs || EMPTY, projectId, { includeArchived }),
    [customFieldDefs, includeArchived, projectId]
  );
}

/** Active fields that apply to a task of `taskType` in a project. */
export function useApplicableFields(projectIdOverride, taskType) {
  const { customFieldDefs, currentProjectId } = useApp();
  const projectId = projectIdOverride || currentProjectId || "";
  return useMemo(
    () => getApplicableCustomFields(customFieldDefs || EMPTY, { projectId, taskType }),
    [customFieldDefs, projectId, taskType]
  );
}

/** Up to three fields flagged "show on card" for the current project. */
export function useCardCustomFields(projectIdOverride) {
  const { customFieldDefs, currentProjectId } = useApp();
  const projectId = projectIdOverride || currentProjectId || "";
  return useMemo(
    () => getCardCustomFields(customFieldDefs || EMPTY, projectId),
    [customFieldDefs, projectId]
  );
}
