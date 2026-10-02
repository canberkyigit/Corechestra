import { useMemo } from "react";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAppStore } from "../../../shared/store/useAppStore";
import { canPerformAction, normalizePermissionMatrix } from "../../../shared/constants/permissions";

/**
 * Client-side capability flags for board / project UI, derived from the
 * workspace permission matrix (same rules as `usePermissions`, but tolerant
 * of a missing AuthProvider). UI gating only — Firestore rules do not
 * enforce roles.
 */
export function useBoardPermissions() {
  const auth = useAuth() || {};
  const { role, isAdmin } = auth;
  const permissionMatrix = useAppStore((state) => state.permissionMatrix);

  return useMemo(() => {
    const normalized = normalizePermissionMatrix(permissionMatrix);
    const effectiveRole = role || (isAdmin ? "admin" : "viewer");
    const allow = (key) => Boolean(isAdmin) || canPerformAction(normalized, effectiveRole, key);
    return {
      canCreateTask: allow("task:create"),
      canEditTask: allow("task:edit"),
      canArchiveTask: allow("task:archive"),
      canManageProject: allow("project:manage"),
      canManageWorkspace: allow("workspace:manage"),
      canManageAutomation: allow("automation:manage"),
      canManageFields: allow("fields:manage"),
    };
  }, [isAdmin, permissionMatrix, role]);
}
