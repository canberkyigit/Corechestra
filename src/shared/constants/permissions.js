export const MODULE_PERMISSION_META = [
  { key: "dashboard", label: "Dashboard" },
  { key: "board", label: "Board" },
  { key: "chats", label: "Chats" },
  { key: "roadmap", label: "Roadmap" },
  { key: "calendar", label: "Calendar" },
  { key: "projects", label: "Projects" },
  { key: "portfolio", label: "Portfolio" },
  { key: "goals", label: "Goals" },
  { key: "docs", label: "Documentation" },
  { key: "releases", label: "Releases" },
  { key: "tests", label: "Tests" },
  { key: "archive", label: "Archive" },
  { key: "for-you", label: "For You" },
  { key: "activity", label: "Activity" },
  { key: "admin", label: "Admin" },
  { key: "hr", label: "Human Resources" },
];

export const ACTION_PERMISSION_META = [
  { key: "task:create", label: "Create tasks" },
  { key: "task:edit", label: "Edit tasks" },
  { key: "task:archive", label: "Archive tasks" },
  { key: "project:manage", label: "Manage projects" },
  { key: "team:manage", label: "Manage teams" },
  { key: "user:invite", label: "Invite users" },
  { key: "user:manage", label: "Manage users" },
  { key: "role:manage", label: "Manage roles" },
  { key: "workspace:manage", label: "Manage workspace settings" },
  { key: "templates:manage", label: "Manage default templates" },
  { key: "audit:view", label: "View audit log" },
  { key: "approval:resolve", label: "Resolve approvals" },
  { key: "tests:edit", label: "Edit test plans, suites and cases" },
  { key: "tests:execute", label: "Run tests and record results" },
  { key: "docs:edit", label: "Create and edit docs spaces and pages" },
  { key: "releases:manage", label: "Create and edit releases" },
  { key: "chat:manage", label: "Create and manage chat channels" },
  { key: "automation:manage", label: "Create and edit automation rules" },
  { key: "fields:manage", label: "Manage project custom fields" },
  { key: "goals:manage", label: "Create and edit goals" },
  { key: "portfolio:update", label: "Post project status updates" },
];

const ALL_MODULE_KEYS = MODULE_PERMISSION_META.map((item) => item.key);
const ALL_ACTION_KEYS = ACTION_PERMISSION_META.map((item) => item.key);

function buildAllowAll(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

export const DEFAULT_PERMISSION_MATRIX = {
  admin: {
    modules: buildAllowAll(ALL_MODULE_KEYS),
    actions: buildAllowAll(ALL_ACTION_KEYS),
  },
  member: {
    modules: {
      dashboard: true,
      board: true,
      chats: true,
      roadmap: true,
      calendar: true,
      projects: true,
      portfolio: true,
      goals: true,
      docs: true,
      releases: true,
      tests: true,
      archive: false,
      "for-you": true,
      activity: true,
      admin: false,
      hr: false,
    },
    actions: {
      "task:create": true,
      "task:edit": true,
      "task:archive": false,
      "project:manage": false,
      "team:manage": false,
      "user:invite": false,
      "user:manage": false,
      "role:manage": false,
      "workspace:manage": false,
      "templates:manage": false,
      "audit:view": false,
      "approval:resolve": false,
      "tests:edit": true,
      "tests:execute": true,
      "docs:edit": true,
      "releases:manage": true,
      "chat:manage": true,
      "automation:manage": false,
      "fields:manage": false,
      "goals:manage": true,
      "portfolio:update": true,
    },
  },
  viewer: {
    modules: {
      dashboard: true,
      board: true,
      chats: true,
      roadmap: true,
      calendar: true,
      projects: true,
      portfolio: true,
      goals: true,
      docs: true,
      releases: true,
      tests: true,
      archive: false,
      "for-you": true,
      activity: true,
      admin: false,
      hr: false,
    },
    actions: {
      "task:create": false,
      "task:edit": false,
      "task:archive": false,
      "project:manage": false,
      "team:manage": false,
      "user:invite": false,
      "user:manage": false,
      "role:manage": false,
      "workspace:manage": false,
      "templates:manage": false,
      "audit:view": false,
      "approval:resolve": false,
      "tests:edit": false,
      "tests:execute": false,
      "docs:edit": false,
      "releases:manage": false,
      "chat:manage": false,
      "automation:manage": false,
      "fields:manage": false,
      "goals:manage": false,
      "portfolio:update": false,
    },
  },
};

export const VALID_ROLES = ["admin", "member", "viewer"];

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/**
 * Admin permissions that can never be switched off through the matrix.
 * Removing any of them would lock every admin out of the Admin page,
 * the workspace controls or role management (there is no recovery UI).
 */
export const LOCKED_ADMIN_PERMISSIONS = {
  modules: ["admin"],
  actions: ["workspace:manage", "role:manage"],
};

export function isLockedPermission(role, scope, key) {
  return role === "admin" && (LOCKED_ADMIN_PERMISSIONS[scope] || []).includes(key);
}

function applyLockedAdminPermissions(adminSet) {
  const modules = { ...adminSet.modules };
  const actions = { ...adminSet.actions };
  LOCKED_ADMIN_PERMISSIONS.modules.forEach((key) => { modules[key] = true; });
  LOCKED_ADMIN_PERMISSIONS.actions.forEach((key) => { actions[key] = true; });
  return { modules, actions };
}

export function normalizePermissionMatrix(permissionMatrix) {
  const source = permissionMatrix || {};
  return {
    admin: applyLockedAdminPermissions({
      modules: { ...DEFAULT_PERMISSION_MATRIX.admin.modules, ...(source.admin?.modules || {}) },
      actions: { ...DEFAULT_PERMISSION_MATRIX.admin.actions, ...(source.admin?.actions || {}) },
    }),
    member: {
      modules: { ...DEFAULT_PERMISSION_MATRIX.member.modules, ...(source.member?.modules || {}) },
      actions: { ...DEFAULT_PERMISSION_MATRIX.member.actions, ...(source.member?.actions || {}) },
    },
    viewer: {
      modules: { ...DEFAULT_PERMISSION_MATRIX.viewer.modules, ...(source.viewer?.modules || {}) },
      actions: { ...DEFAULT_PERMISSION_MATRIX.viewer.actions, ...(source.viewer?.actions || {}) },
    },
  };
}

export function getRolePermissionSet(permissionMatrix, role = "viewer") {
  const normalized = normalizePermissionMatrix(permissionMatrix);
  return normalized[role] || normalized.viewer;
}

export function canAccessModule(permissionMatrix, role, moduleKey) {
  return !!getRolePermissionSet(permissionMatrix, role).modules?.[moduleKey];
}

export function canPerformAction(permissionMatrix, role, actionKey) {
  return !!getRolePermissionSet(permissionMatrix, role).actions?.[actionKey];
}

export function getFirstAccessibleModule(permissionMatrix, role) {
  const allowed = MODULE_PERMISSION_META.find((item) => canAccessModule(permissionMatrix, role, item.key));
  return allowed?.key || "dashboard";
}

// ─── Sensitive action policy ──────────────────────────────────────────────────

export const DEFAULT_SENSITIVE_ACTION_POLICY = {
  requireConfirmation: true,
  requireAdminReason: false,
  protectRoleChanges: true,
  protectWorkspaceSettings: true,
};

export function normalizeSensitiveActionPolicy(policy) {
  const source = policy || {};
  return {
    requireConfirmation: source.requireConfirmation !== false,
    requireAdminReason: source.requireAdminReason === true,
    protectRoleChanges: source.protectRoleChanges !== false,
    protectWorkspaceSettings: source.protectWorkspaceSettings !== false,
  };
}

/**
 * Whether an action of the given kind must be confirmed before it runs.
 *  - "destructive": deletes / deactivations  -> requireConfirmation
 *  - "role":        role changes             -> requireConfirmation OR protectRoleChanges
 *  - "workspace":   permission matrix / security settings -> protectWorkspaceSettings
 */
export function requiresConfirmation(policy, kind) {
  const normalized = normalizeSensitiveActionPolicy(policy);
  if (kind === "role") return normalized.requireConfirmation || normalized.protectRoleChanges;
  if (kind === "workspace") return normalized.protectWorkspaceSettings;
  return normalized.requireConfirmation;
}

/** Role and workspace-security changes need a written reason when the policy asks for it. */
export function requiresAdminReason(policy, kind) {
  const normalized = normalizeSensitiveActionPolicy(policy);
  if (!normalized.requireAdminReason) return false;
  return kind === "role" || kind === "workspace";
}

/** Audit metadata for a sensitive change, honouring the protect* flags. */
export function getSensitiveAuditMeta(policy, kind) {
  const normalized = normalizeSensitiveActionPolicy(policy);
  if (kind === "role") {
    return normalized.protectRoleChanges
      ? { scope: "security", severity: "warning" }
      : { scope: "security", severity: "info" };
  }
  if (kind === "workspace") {
    return normalized.protectWorkspaceSettings
      ? { scope: "security", severity: "warning" }
      : { scope: "workspace", severity: "info" };
  }
  return { scope: "security", severity: "warning" };
}

/**
 * Runs the confirmation / reason prompts required by the policy.
 * Returns `{ ok: false }` when the admin cancelled, otherwise `{ ok: true, reason }`.
 * `confirmFn` / `promptFn` default to window.confirm / window.prompt (injectable for tests).
 */
export function runSensitiveActionGate(policy, kind, message, {
  confirmFn = typeof window !== "undefined" ? window.confirm.bind(window) : () => true,
  promptFn = typeof window !== "undefined" ? window.prompt.bind(window) : () => "",
} = {}) {
  if (requiresConfirmation(policy, kind) && !confirmFn(message)) {
    return { ok: false };
  }
  if (requiresAdminReason(policy, kind)) {
    const reason = String(promptFn("Reason for this change (required by workspace policy):") || "").trim();
    if (!reason) return { ok: false, missingReason: true };
    return { ok: true, reason };
  }
  return { ok: true, reason: "" };
}

// ─── Account status (users/{uid} and invites/{email}) ─────────────────────────

export const ACCOUNT_BLOCK_MESSAGES = {
  deleted: "This account has been removed from the workspace. Contact your workspace administrator if you think this is a mistake.",
  disabled: "This account has been deactivated. Contact your workspace administrator to restore access.",
};

/**
 * Returns "deleted" | "disabled" | null for an auth profile (`users/{uid}`)
 * or a pending invite (`invites/{email}`).
 */
export function getAccountBlockReason(record) {
  if (!record) return null;
  if (record.deleted === true || record.status === "deleted" || record.status === "revoked") return "deleted";
  if (record.disabled === true || record.status === "inactive" || record.status === "disabled") return "disabled";
  return null;
}
