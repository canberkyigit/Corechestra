import { useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useAppStore } from "../../store/useAppStore";
import {
  canAccessModule,
  canPerformAction,
  getFirstAccessibleModule,
  getRolePermissionSet,
  normalizePermissionMatrix,
} from "../../constants/permissions";

export function usePermissions() {
  const { role, isAdmin } = useAuth();
  const permissionMatrix = useAppStore((state) => state.permissionMatrix);
  const sensitiveActionPolicy = useAppStore((state) => state.sensitiveActionPolicy);

  const normalized = useMemo(
    () => normalizePermissionMatrix(permissionMatrix),
    [permissionMatrix]
  );

  const rolePermissions = useMemo(
    () => getRolePermissionSet(normalized, role || "viewer"),
    [normalized, role]
  );


  const effectiveRole = role || "viewer";

  const canAccessModuleFn = useCallback(
    (moduleKey) => canAccessModule(normalized, effectiveRole, moduleKey),
    [normalized, effectiveRole]
  );

  const canPerform = useCallback(
    (actionKey) => canPerformAction(normalized, effectiveRole, actionKey),
    [normalized, effectiveRole]
  );

  const firstAccessiblePage = useMemo(
    () => getFirstAccessibleModule(normalized, effectiveRole),
    [normalized, effectiveRole]
  );

  // Stable identities so consumers can safely use these in hook deps / memo.
  return useMemo(
    () => ({
      rolePermissions,
      permissionMatrix: normalized,
      sensitiveActionPolicy,
      isAdmin,
      canAccessModule: canAccessModuleFn,
      canAccessPage: canAccessModuleFn,
      canPerform,
      firstAccessiblePage,
    }),
    [rolePermissions, normalized, sensitiveActionPolicy, isAdmin, canAccessModuleFn, canPerform, firstAccessiblePage]
  );
}
