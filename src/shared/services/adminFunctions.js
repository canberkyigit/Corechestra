import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

function callable(name) {
  if (!functions) {
    throw new Error("Firebase Functions is unavailable in this environment.");
  }
  return httpsCallable(functions, name);
}

export function getAdminActionMessage(error, fallback = "The admin action could not be completed.") {
  const code = String(error?.code || "").replace("functions/", "");
  const messages = {
    unauthenticated: "Your session has expired. Sign in again and retry.",
    "permission-denied": error?.message || "Your workspace role does not allow this action.",
    "failed-precondition": error?.message || "This action is not allowed in the current state.",
    "invalid-argument": error?.message || "Check the supplied values and retry.",
    "already-exists": "An account with this email already exists.",
    "not-found": "The selected user no longer exists.",
    unavailable: "The admin service is temporarily unavailable. Retry in a moment.",
  };
  return messages[code] || error?.message || fallback;
}

export async function inviteWorkspaceUser({ email, name, role }) {
  const result = await callable("inviteUser")({ email, name, role });
  return result.data;
}

export async function changeWorkspaceUserRole(uid, role, reason = "") {
  const result = await callable("updateUserRole")({ uid, role, reason, confirmed: true });
  return result.data;
}

export async function changeWorkspaceUserStatus(uid, status) {
  const result = await callable("updateUserStatus")({ uid, status });
  return result.data;
}

export async function removeWorkspaceUser(uid) {
  const result = await callable("deleteUser")({ uid });
  return result.data;
}

export async function resetWorkspaceData() {
  const result = await callable("resetWorkspace")({});
  return result.data;
}

export async function persistWorkspaceDomain(domain, patch) {
  const result = await callable("saveWorkspaceDomain")({ domain, patch });
  return result.data;
}

export async function saveWorkspaceControls({
  workspaceSettings,
  permissionMatrix,
  sensitiveActionPolicy,
  reason = "",
}) {
  const result = await callable("updateWorkspaceControls")({
    workspaceSettings,
    permissionMatrix,
    sensitiveActionPolicy,
    reason,
    confirmed: true,
  });
  return result.data;
}

export async function resolveWorkspaceHrApproval(id, status) {
  const result = await callable("resolveHrApproval")({ id, status });
  return result.data;
}
