import { useMemo } from "react";
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

  return {
    rolePermissions,
    permissionMatrix: normalized,
    sensitiveActionPolicy,
    isAdmin,
    canAccessModule: (moduleKey) => canAccessModule(normalized, role || "viewer", moduleKey),
    canAccessPage: (pageId) => canAccessModule(normalized, role || "viewer", pageId),
    canPerform: (actionKey) => canPerformAction(normalized, role || "viewer", actionKey),
    firstAccessiblePage: getFirstAccessibleModule(normalized, role || "viewer"),
  };
}
