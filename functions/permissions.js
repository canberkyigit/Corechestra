const { HttpsError } = require("firebase-functions/v2/https");

const MODULE_KEYS = [
  "dashboard", "board", "roadmap", "reports", "calendar", "projects",
  "docs", "releases", "tests", "archive", "for-you", "activity", "admin", "hr",
];

const ACTION_KEYS = [
  "task:create", "task:edit", "task:archive", "project:manage", "team:manage",
  "user:invite", "user:manage", "role:manage", "workspace:manage",
  "templates:manage", "audit:view", "approval:resolve",
];

const MEMBER_DEFAULT_MODULES = {
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
};

const MEMBER_DEFAULT_ACTIONS = {
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
};

function boolMap(keys, source = {}, fallback = false) {
  return Object.fromEntries(keys.map((key) => [
    key,
    source[key] === undefined ? fallback : source[key] === true,
  ]));
}

function normalizePermissionMatrix(source = {}) {
  return {
    admin: {
      modules: boolMap(MODULE_KEYS, {}, true),
      actions: boolMap(ACTION_KEYS, {}, true),
    },
    member: {
      modules: boolMap(MODULE_KEYS, {
        ...MEMBER_DEFAULT_MODULES,
        ...(source.member?.modules || {}),
      }),
      actions: boolMap(ACTION_KEYS, {
        ...MEMBER_DEFAULT_ACTIONS,
        ...(source.member?.actions || {}),
      }),
    },
    viewer: {
      modules: boolMap(MODULE_KEYS, {
        ...MEMBER_DEFAULT_MODULES,
        ...(source.viewer?.modules || {}),
      }),
      actions: boolMap(ACTION_KEYS),
    },
  };
}

async function getAuthorization(firestore, request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const [userSnapshot, configSnapshot] = await Promise.all([
    firestore.collection("users").doc(request.auth.uid).get(),
    firestore.collection("appData").doc("config").get(),
  ]);
  const profile = userSnapshot.data();
  if (!profile || profile.deleted === true || profile.status === "inactive") {
    throw new HttpsError("permission-denied", "This workspace account is inactive.");
  }

  const role = ["admin", "member", "viewer"].includes(profile.role)
    ? profile.role
    : "viewer";
  const config = configSnapshot.data() || {};
  const matrix = normalizePermissionMatrix(config.permissionMatrix || {});

  return {
    uid: request.auth.uid,
    role,
    profile,
    matrix,
    policy: config.sensitiveActionPolicy || {},
    canPerform(action) {
      return role === "admin" || (role === "member" && matrix.member.actions[action] === true);
    },
    canAccess(moduleKey) {
      return role === "admin" || matrix[role].modules[moduleKey] === true;
    },
  };
}

function requirePermission(authorization, action, message = "You do not have permission to perform this action.") {
  if (!authorization.canPerform(action)) {
    throw new HttpsError("permission-denied", message);
  }
}

function requireModule(authorization, moduleKey, message = "You do not have access to this workspace module.") {
  if (!authorization.canAccess(moduleKey)) {
    throw new HttpsError("permission-denied", message);
  }
}

module.exports = {
  ACTION_KEYS,
  MODULE_KEYS,
  getAuthorization,
  normalizePermissionMatrix,
  requireModule,
  requirePermission,
};
