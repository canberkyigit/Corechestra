export const MODULE_PERMISSION_META = [
  { key: "dashboard", label: "Dashboard" },
  { key: "board", label: "Board" },
  { key: "roadmap", label: "Roadmap" },
  { key: "reports", label: "Reports" },
  { key: "calendar", label: "Calendar" },
  { key: "projects", label: "Projects" },
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
      roadmap: true,
      reports: true,
      calendar: true,
      projects: true,
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
    },
  },
  viewer: {
    modules: {
      dashboard: true,
      board: true,
      roadmap: true,
      reports: true,
      calendar: true,
      projects: true,
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
    },
  },
};

export function normalizePermissionMatrix(permissionMatrix) {
  const source = permissionMatrix || {};
  return {
    admin: {
      modules: { ...DEFAULT_PERMISSION_MATRIX.admin.modules, ...(source.admin?.modules || {}) },
      actions: { ...DEFAULT_PERMISSION_MATRIX.admin.actions, ...(source.admin?.actions || {}) },
    },
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
