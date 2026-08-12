const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { randomBytes } = require("node:crypto");
const {
  getAuthorization,
  normalizePermissionMatrix,
  requireModule,
  requirePermission,
} = require("./permissions");

initializeApp();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function requireAuth(context) {
  if (!context.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
}

async function requireAdmin(context) {
  requireAuth(context);
  const snap = await getFirestore()
    .collection("users")
    .doc(context.auth.uid)
    .get();
  const profile = snap.data();
  if (!profile || profile.role !== "admin" || profile.deleted === true || profile.status === "inactive") {
    throw new HttpsError("permission-denied", "Admins only.");
  }
}

function requireReasonWhenConfigured(
  authorization,
  request,
  protectedByPolicy = true,
  effectivePolicy = authorization.policy
) {
  if (!protectedByPolicy || effectivePolicy?.requireAdminReason !== true) return null;
  const reason = String(request.data?.reason || "").trim();
  if (!reason) {
    throw new HttpsError("failed-precondition", "A change reason is required by workspace policy.");
  }
  return reason.slice(0, 500);
}

function ensureNonAdminCannotManageAdmin(authorization, target, requestedRole = null) {
  if (authorization.role === "admin") return;
  if (target?.role === "admin" || requestedRole === "admin") {
    throw new HttpsError("permission-denied", "Only administrators can manage administrator accounts.");
  }
}

const VALID_ROLES = ["admin", "member", "viewer"];

function auditActor(request) {
  return {
    actorUid: request.auth.uid,
    actorEmail: request.auth.token?.email || null,
  };
}

async function writeAuditEvent(type, payload = {}) {
  await getFirestore().collection("auditLogs").add({
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
}

const WORKSPACE_DOMAIN_FIELDS = {
  config: ["sprintDefaults", "templateRegistry", "permissionMatrix", "workspaceSettings", "sensitiveActionPolicy"],
  entities: ["projects", "teams", "users", "epics", "labels", "deletedUserIds"],
  tasks: ["activeTasks", "perProjectBacklog"],
  sprints: ["perProjectSprint", "projectColumns", "perProjectBoardSettings", "perProjectBurndownSnapshots", "perProjectCompletedSprints", "perProjectPlannedSprints"],
  activity: ["globalActivityLog", "notifications"],
  workspace: ["perProjectRetrospective", "perProjectPokerHistory", "perProjectNotes"],
  docs: ["spaces", "docPages"],
  releases: ["releases"],
  testing: ["testPlans", "testSuites", "testCases", "testRuns"],
  archive: ["archivedTasks", "archivedProjects", "archivedEpics"],
};

const PROTECTED_CONFIG_FIELDS = new Set([
  "permissionMatrix",
  "workspaceSettings",
  "sensitiveActionPolicy",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equalValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedKeys(current, next, keys) {
  return keys.filter((key) => !equalValue(current?.[key], next?.[key]));
}

function requireAnyPermission(authorization, actions, message) {
  if (!actions.some((action) => authorization.canPerform(action))) {
    throw new HttpsError("permission-denied", message || "A required workspace permission is missing.");
  }
}

function collectTasks(data, result = new Map()) {
  (data.activeTasks || []).forEach((task) => {
    if (task?.id !== undefined) result.set(String(task.id), task);
  });
  Object.values(data.perProjectBacklog || {}).forEach((sections) => {
    (Array.isArray(sections) ? sections : []).forEach((section) => {
      (section?.tasks || []).forEach((task) => {
        if (task?.id !== undefined) result.set(String(task.id), task);
      });
    });
  });
  return result;
}

function collectionChanges(beforeValue, afterValue) {
  const before = new Map((Array.isArray(beforeValue) ? beforeValue : [])
    .filter((item) => item?.id !== undefined)
    .map((item) => [String(item.id), item]));
  const after = new Map((Array.isArray(afterValue) ? afterValue : [])
    .filter((item) => item?.id !== undefined)
    .map((item) => [String(item.id), item]));
  return {
    additions: [...after.keys()].filter((id) => !before.has(id)).map((id) => after.get(id)),
    removals: [...before.keys()].filter((id) => !after.has(id)).map((id) => before.get(id)),
    edits: [...after.keys()]
      .filter((id) => before.has(id) && !equalValue(before.get(id), after.get(id)))
      .map((id) => ({ before: before.get(id), after: after.get(id) })),
  };
}

function authorizeTaskMutation(authorization, current, next) {
  const before = collectTasks({
    activeTasks: current.activeTasks || [],
    perProjectBacklog: current.perProjectBacklog || {},
  });
  const after = collectTasks({
    activeTasks: next.activeTasks || [],
    perProjectBacklog: next.perProjectBacklog || {},
  });
  const additions = [...after.keys()].filter((id) => !before.has(id));
  const removals = [...before.keys()].filter((id) => !after.has(id));
  const edits = [...after.keys()].filter((id) => before.has(id) && !equalValue(before.get(id), after.get(id)));
  const structureChanged = !equalValue(
    { activeTasks: current.activeTasks || [], perProjectBacklog: current.perProjectBacklog || {} },
    { activeTasks: next.activeTasks || [], perProjectBacklog: next.perProjectBacklog || {} }
  );

  if (additions.length > 0) requirePermission(authorization, "task:create", "Task creation permission is required.");
  if (removals.length > 0) requirePermission(authorization, "task:archive", "Task archive permission is required.");
  if (edits.length > 0) {
    requirePermission(authorization, "task:edit", "Task editing permission is required.");
  }
  if (structureChanged && additions.length === 0 && removals.length === 0 && edits.length === 0) {
    requireAnyPermission(
      authorization,
      ["task:edit", "project:manage"],
      "Task editing or project management permission is required."
    );
  }
}

function authorizeWorkspaceDomainMutation(authorization, domain, current, next, fields) {
  if (authorization.role === "viewer") {
    throw new HttpsError("permission-denied", "Viewer accounts are read-only.");
  }

  if (domain === "config") {
    if (fields.some((field) => PROTECTED_CONFIG_FIELDS.has(field))) {
      throw new HttpsError("permission-denied", "Workspace controls must use the audited controls endpoint.");
    }
    if (fields.includes("templateRegistry")) requirePermission(authorization, "templates:manage");
    if (fields.includes("sprintDefaults")) requirePermission(authorization, "project:manage");
    return;
  }

  if (domain === "entities") {
    if (changedKeys(current, next, ["projects"]).length) requirePermission(authorization, "project:manage");
    if (changedKeys(current, next, ["teams"]).length) requirePermission(authorization, "team:manage");
    if (changedKeys(current, next, ["users"]).length) {
      const userChanges = collectionChanges(current.users, next.users);
      if (userChanges.additions.length > 0) requirePermission(authorization, "user:invite");
      if (userChanges.removals.length > 0) requirePermission(authorization, "user:manage");
      userChanges.edits.forEach(({ before, after }) => {
        const affectedFields = Object.keys({ ...before, ...after })
          .filter((key) => !equalValue(before[key], after[key]));
        if (affectedFields.every((field) => field === "role")) {
          requirePermission(authorization, "role:manage");
        } else {
          requirePermission(authorization, "user:manage");
        }
      });
    }
    if (changedKeys(current, next, ["deletedUserIds"]).length) requirePermission(authorization, "user:manage");
    if (changedKeys(current, next, ["epics", "labels"]).length) requirePermission(authorization, "task:edit");
    return;
  }

  if (domain === "tasks") {
    authorizeTaskMutation(authorization, current, next);
    return;
  }
  if (domain === "sprints" || domain === "workspace") {
    requireAnyPermission(
      authorization,
      ["task:edit", "project:manage"],
      "Task editing or project management permission is required."
    );
    return;
  }
  if (domain === "docs") {
    requireModule(authorization, "docs");
    return;
  }
  if (domain === "releases") {
    requireModule(authorization, "releases");
    return;
  }
  if (domain === "testing") {
    requireModule(authorization, "tests");
    return;
  }
  if (domain === "archive") {
    if (fields.includes("archivedTasks") || fields.includes("archivedEpics")) {
      requirePermission(authorization, "task:archive");
    }
    if (fields.includes("archivedProjects")) requirePermission(authorization, "project:manage");
    return;
  }
  // Activity and notifications are append/dismiss side effects of otherwise
  // authorized work. They remain writable by active members only.
  if (domain === "activity" && authorization.role !== "member" && authorization.role !== "admin") {
    throw new HttpsError("permission-denied", "Viewer accounts are read-only.");
  }
}

function sanitizeWorkspaceSettings(value = {}, current = {}) {
  const workflowDefaults = {
    requireReviewBeforeDone: false,
    captureBlockReason: true,
    notifyOnBlocked: true,
    allowBackwardMoves: true,
  };
  const next = {
    displayName: String(value.displayName ?? current.displayName ?? "Corechestra Workspace").trim().slice(0, 120),
    supportEmail: String(value.supportEmail ?? current.supportEmail ?? "").trim().slice(0, 254),
    onboardingMode: ["guided", "accelerated"].includes(value.onboardingMode)
      ? value.onboardingMode
      : (current.onboardingMode || "guided"),
    emptyStateHints: value.emptyStateHints === undefined
      ? current.emptyStateHints !== false
      : value.emptyStateHints !== false,
    defaultTemplates: {},
    defaultProjectWorkflow: {},
  };
  ["doc", "sprint", "release", "onboarding", "approval", "incident"].forEach((key) => {
    next.defaultTemplates[key] = String(value.defaultTemplates?.[key] ?? current.defaultTemplates?.[key] ?? "").slice(0, 120);
  });
  ["requireReviewBeforeDone", "captureBlockReason", "notifyOnBlocked", "allowBackwardMoves"].forEach((key) => {
    const supplied = value.defaultProjectWorkflow?.[key];
    const existing = current.defaultProjectWorkflow?.[key];
    next.defaultProjectWorkflow[key] = supplied === undefined
      ? (existing === undefined ? workflowDefaults[key] : existing === true)
      : supplied === true;
  });
  return next;
}

function sanitizeSensitiveActionPolicy(value = {}, current = {}) {
  const defaults = {
    requireConfirmation: true,
    requireAdminReason: false,
    protectRoleChanges: true,
    protectWorkspaceSettings: true,
  };
  return Object.fromEntries([
    "requireConfirmation",
    "requireAdminReason",
    "protectRoleChanges",
    "protectWorkspaceSettings",
  ].map((key) => [
    key,
    value[key] === undefined
      ? (current[key] === undefined ? defaults[key] : current[key] === true)
      : value[key] === true,
  ]));
}

// ─── inviteUser ───────────────────────────────────────────────────────────────
// Creates a Firebase Auth account for a new user and stores their profile.
// Only callable by admins.
//
// Request:  { email: string, name: string, role: "admin"|"member"|"viewer" }
// Response: { uid: string }
exports.inviteUser = onCall(async (request) => {
  const authorization = await getAuthorization(getFirestore(), request);
  requirePermission(authorization, "user:invite", "User invitation permission is required.");

  const email = String(request.data?.email || "").trim().toLowerCase();
  const name = String(request.data?.name || "").trim();
  const role = request.data?.role || "member";
  if (!email || !name) {
    throw new HttpsError("invalid-argument", "email and name are required.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "A valid role is required.");
  }
  if (authorization.role !== "admin" && role === "admin") {
    throw new HttpsError("permission-denied", "Only administrators can invite another administrator.");
  }

  let userRecord = null;
  try {
    // Create the Auth account with a temporary password (user must reset).
    userRecord = await getAuth().createUser({
      email,
      displayName: name,
      password: `${randomBytes(18).toString("base64url")}Aa1!`,
    });

    const username = email.split("@")[0];
    const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    const color = COLORS[userRecord.uid.charCodeAt(0) % COLORS.length];

    await getFirestore().collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      name,
      username,
      email,
      color,
      role,
      status: "active",
      createdAt: new Date().toISOString(),
    });
    await getAuth().setCustomUserClaims(userRecord.uid, { role });
  } catch (error) {
    if (userRecord) {
      await getFirestore().collection("users").doc(userRecord.uid).delete().catch(() => {});
      await getAuth().deleteUser(userRecord.uid).catch(() => {});
    }
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    if (error.code === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "A valid email address is required.");
    }
    throw error;
  }

  await writeAuditEvent("user.invited", {
    ...auditActor(request),
    invitedUid: userRecord.uid,
    email,
    role,
  });

  return { uid: userRecord.uid };
});

// ─── deleteUser ───────────────────────────────────────────────────────────────
// Deletes a Firebase Auth account and marks the Firestore user as deleted.
// Only callable by admins. Cannot delete yourself.
//
// Request:  { uid: string }
// Response: { success: true }
exports.deleteUser = onCall(async (request) => {
  const authorization = await getAuthorization(getFirestore(), request);
  requirePermission(authorization, "user:manage", "User management permission is required.");

  const uid = String(request.data?.uid || "").trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot delete your own account.");
  }

  const targetRef = getFirestore().collection("users").doc(uid);
  const target = await targetRef.get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  ensureNonAdminCannotManageAdmin(authorization, target.data());

  if (target.data()?.deleted !== true) {
    await targetRef.set({
      deleted: true,
      status: "inactive",
      deletedAt: new Date().toISOString(),
    }, { merge: true });
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }

  await writeAuditEvent("user.deleted", {
    ...auditActor(request),
    deletedUid: uid,
    targetEmail: target.data()?.email || null,
    targetName: target.data()?.name || target.data()?.fullName || null,
  });

  return { success: true };
});

// ─── updateUserRole ───────────────────────────────────────────────────────────
// Updates a user's role both in Firestore and as a custom claim.
// Only callable by admins.
//
// Request:  { uid: string, role: "admin"|"member"|"viewer" }
// Response: { success: true }
exports.updateUserRole = onCall(async (request) => {
  const authorization = await getAuthorization(getFirestore(), request);
  requirePermission(authorization, "role:manage", "Role management permission is required.");

  const uid = String(request.data?.uid || "").trim();
  const role = request.data?.role;
  if (!uid || !VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "uid and a valid role are required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot change your own role.");
  }

  const targetRef = getFirestore().collection("users").doc(uid);
  const target = await targetRef.get();
  if (!target.exists || target.data()?.deleted === true) {
    throw new HttpsError("not-found", "User not found.");
  }
  ensureNonAdminCannotManageAdmin(authorization, target.data(), role);
  const reason = requireReasonWhenConfigured(
    authorization,
    request,
    authorization.policy?.protectRoleChanges !== false
  );

  // Firestore is the authorization source of truth.
  await targetRef.update({ role });
  try {
    await getAuth().setCustomUserClaims(uid, { role });
  } catch (error) {
    console.warn("updateUserRole: custom claim sync failed for", uid, error);
  }

  await writeAuditEvent("user.role_updated", {
    ...auditActor(request),
    targetUid: uid,
    targetEmail: target.data()?.email || null,
    targetName: target.data()?.name || target.data()?.fullName || null,
    role,
    reason,
  });

  return { success: true };
});

// ─── updateUserStatus ────────────────────────────────────────────────────────
// Deactivates/reactivates a login through one audited server-side path.
exports.updateUserStatus = onCall(async (request) => {
  const authorization = await getAuthorization(getFirestore(), request);
  requirePermission(authorization, "user:manage", "User management permission is required.");

  const uid = String(request.data?.uid || "").trim();
  const status = request.data?.status;
  if (!uid || !["active", "inactive"].includes(status)) {
    throw new HttpsError("invalid-argument", "uid and a valid status are required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot change your own account status.");
  }

  const targetRef = getFirestore().collection("users").doc(uid);
  const target = await targetRef.get();
  if (!target.exists || target.data()?.deleted === true) {
    throw new HttpsError("not-found", "User not found.");
  }
  ensureNonAdminCannotManageAdmin(authorization, target.data());

  await targetRef.update({ status });
  try {
    await getAuth().updateUser(uid, { disabled: status === "inactive" });
    if (status === "inactive") await getAuth().revokeRefreshTokens(uid);
  } catch (error) {
    console.warn("updateUserStatus: Auth sync failed for", uid, error);
  }

  await writeAuditEvent("user.status_updated", {
    ...auditActor(request),
    targetUid: uid,
    targetEmail: target.data()?.email || null,
    targetName: target.data()?.name || target.data()?.fullName || null,
    status,
  });

  return { success: true };
});

// ─── saveWorkspaceDomain ────────────────────────────────────────────────────
// All shared appData mutations flow through this endpoint. Firestore rules
// reject direct client writes, while this function validates the role matrix
// against the semantic change (create/edit/archive/manage) before committing.
exports.saveWorkspaceDomain = onCall(async (request) => {
  const firestore = getFirestore();
  const authorization = await getAuthorization(firestore, request);
  const domain = String(request.data?.domain || "").trim();
  const patch = request.data?.patch;
  const allowedFields = WORKSPACE_DOMAIN_FIELDS[domain];

  if (!allowedFields || !isPlainObject(patch)) {
    throw new HttpsError("invalid-argument", "A valid workspace domain and patch are required.");
  }
  const fields = Object.keys(patch);
  if (fields.length === 0 || fields.some((field) => !allowedFields.includes(field))) {
    throw new HttpsError("invalid-argument", "The workspace patch contains unsupported fields.");
  }

  const documentRef = firestore.collection("appData").doc(domain);
  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    const current = snapshot.data() || {};
    const next = { ...current, ...patch };
    authorizeWorkspaceDomainMutation(authorization, domain, current, next, fields);

    const timestamp = Date.now();
    const version = Number(current._version || 0) + 1;
    const metadata = {
      _updatedAt: timestamp,
      _updatedBy: authorization.uid,
      _version: version,
      _lastMutationId: `${domain}-${timestamp}-${authorization.uid}`,
    };
    transaction.set(documentRef, { ...patch, ...metadata }, { merge: true });
    return metadata;
  });

  return { success: true, ...result };
});

// ─── updateWorkspaceControls ────────────────────────────────────────────────
// Permission/security settings are acknowledged and audited server-side before
// the client updates its local store.
exports.updateWorkspaceControls = onCall(async (request) => {
  const firestore = getFirestore();
  const authorization = await getAuthorization(firestore, request);
  const suppliedSettings = request.data?.workspaceSettings;
  const suppliedMatrix = request.data?.permissionMatrix;
  const suppliedPolicy = request.data?.sensitiveActionPolicy;

  if (!isPlainObject(suppliedSettings)) {
    throw new HttpsError("invalid-argument", "Workspace settings are required.");
  }
  if (authorization.role !== "admin"
    && !authorization.canPerform("workspace:manage")
    && !authorization.canPerform("templates:manage")) {
    throw new HttpsError("permission-denied", "Workspace or template management permission is required.");
  }

  const configRef = firestore.collection("appData").doc("config");
  const auditRef = firestore.collection("auditLogs").doc();
  const saved = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(configRef);
    const current = snapshot.data() || {};
    const currentWorkspaceSettings = sanitizeWorkspaceSettings(
      current.workspaceSettings || {},
      current.workspaceSettings || {}
    );
    let workspaceSettings = sanitizeWorkspaceSettings(suppliedSettings, current.workspaceSettings || {});
    if (authorization.role !== "admin" && !authorization.canPerform("workspace:manage")) {
      workspaceSettings = {
        ...currentWorkspaceSettings,
        defaultTemplates: workspaceSettings.defaultTemplates,
      };
    }
    if (authorization.role !== "admin" && !authorization.canPerform("templates:manage")) {
      workspaceSettings = {
        ...workspaceSettings,
        defaultTemplates: currentWorkspaceSettings.defaultTemplates,
      };
    }
    const templatesChanged = !equalValue(
      workspaceSettings.defaultTemplates,
      currentWorkspaceSettings.defaultTemplates
    );
    const generalSettingsChanged = !equalValue(
      { ...workspaceSettings, defaultTemplates: undefined },
      { ...currentWorkspaceSettings, defaultTemplates: undefined }
    );

    if (generalSettingsChanged) requirePermission(authorization, "workspace:manage");
    if (templatesChanged) requirePermission(authorization, "templates:manage");

    const matrixChanged = suppliedMatrix !== undefined
      && !equalValue(normalizePermissionMatrix(suppliedMatrix), normalizePermissionMatrix(current.permissionMatrix || {}));
    const policyChanged = suppliedPolicy !== undefined
      && !equalValue(sanitizeSensitiveActionPolicy(suppliedPolicy, current.sensitiveActionPolicy || {}), current.sensitiveActionPolicy || {});
    if ((matrixChanged || policyChanged) && authorization.role !== "admin") {
      throw new HttpsError("permission-denied", "Only administrators can change the permission matrix or security policy.");
    }

    const permissionMatrix = authorization.role === "admin" && suppliedMatrix !== undefined
      ? normalizePermissionMatrix(suppliedMatrix)
      : normalizePermissionMatrix(current.permissionMatrix || {});
    const sensitiveActionPolicy = authorization.role === "admin" && suppliedPolicy !== undefined
      ? sanitizeSensitiveActionPolicy(suppliedPolicy, current.sensitiveActionPolicy || {})
      : sanitizeSensitiveActionPolicy(current.sensitiveActionPolicy || {}, current.sensitiveActionPolicy || {});
    const protectsWorkspace = sensitiveActionPolicy.protectWorkspaceSettings !== false;
    const reason = requireReasonWhenConfigured(
      authorization,
      request,
      protectsWorkspace,
      sensitiveActionPolicy
    );
    const timestamp = Date.now();
    const version = Number(current._version || 0) + 1;

    transaction.set(configRef, {
      workspaceSettings,
      permissionMatrix,
      sensitiveActionPolicy,
      _updatedAt: timestamp,
      _updatedBy: authorization.uid,
      _version: version,
      _lastMutationId: `config-${timestamp}-${authorization.uid}`,
    }, { merge: true });
    transaction.set(auditRef, {
      type: "workspace.controls_updated",
      payload: {
        ...auditActor(request),
        matrixChanged,
        policyChanged,
        templatesChanged,
        generalSettingsChanged,
        reason,
      },
      createdAt: new Date(timestamp).toISOString(),
    });

    return { workspaceSettings, permissionMatrix, sensitiveActionPolicy, timestamp, version };
  });

  return { success: true, ...saved };
});

// Legacy HR approval cards use hrData/hr_shared rather than approvalRequests.
// Resolve them through the same backend capability instead of a direct client
// array rewrite.
exports.resolveHrApproval = onCall(async (request) => {
  const firestore = getFirestore();
  const authorization = await getAuthorization(firestore, request);
  requirePermission(authorization, "approval:resolve", "Approval resolution permission is required.");
  const id = String(request.data?.id || "").trim();
  const status = request.data?.status;
  if (!id || !["approved", "rejected"].includes(status)) {
    throw new HttpsError("invalid-argument", "A valid approval and decision are required.");
  }

  const sharedRef = firestore.collection("hrData").doc("hr_shared");
  const auditRef = firestore.collection("auditLogs").doc();
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sharedRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Approval not found.");
    const approvals = snapshot.data()?.approvalInbox || [];
    const target = approvals.find((item) => String(item.id) === id);
    if (!target) throw new HttpsError("not-found", "Approval not found.");
    if (target.status !== "pending") {
      throw new HttpsError("failed-precondition", "Approval is already resolved.");
    }
    const resolvedAt = new Date().toISOString();
    transaction.set(sharedRef, {
      approvalInbox: approvals.map((item) => String(item.id) === id
        ? { ...item, status, resolvedAt, resolvedBy: authorization.uid }
        : item),
    }, { merge: true });
    transaction.set(auditRef, {
      type: "hr.approval_resolved",
      payload: { ...auditActor(request), approvalId: id, status },
      createdAt: resolvedAt,
    });
  });

  return { success: true };
});

// ─── resetWorkspace ──────────────────────────────────────────────────────────
// Deletes shared workspace domain documents without exposing broad client-side
// delete permissions. Audit events are intentionally retained.
exports.resetWorkspace = onCall(async (request) => {
  await requireAdmin(request);

  const firestore = getFirestore();
  const snapshot = await firestore.collection("appData").get();
  const batch = firestore.batch();
  snapshot.docs.forEach((documentSnapshot) => batch.delete(documentSnapshot.ref));
  batch.delete(firestore.collection("appState").doc("default"));
  batch.set(firestore.collection("auditLogs").doc(), {
    type: "workspace.reset",
    payload: {
      ...auditActor(request),
      deletedDomainCount: snapshot.size,
    },
    createdAt: new Date().toISOString(),
  });
  await batch.commit();

  return { success: true, deletedDomainCount: snapshot.size };
});

// ─── onUserCreated (trigger) ──────────────────────────────────────────────────
// Automatically sets the "member" custom claim when a user document is created
// without an existing custom claim (e.g. self-registered users).
exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const data = event.data?.data();
  if (!data) return;

  try {
    const existing = await getAuth().getUser(uid);
    // Only set claim if not already set
    if (!existing.customClaims?.role) {
      const role = data.role || "member";
      await getAuth().setCustomUserClaims(uid, { role });
    }
  } catch (err) {
    console.error("onUserCreated: failed to set custom claim for", uid, err);
  }
});

exports.submitApprovalRequest = onCall(async (request) => {
  requireAuth(request);

  const {
    type,
    title,
    description = "",
    entityType = null,
    entityId = null,
    approverIds = [],
    metadata = {},
  } = request.data || {};

  if (!type || !title || !Array.isArray(approverIds) || approverIds.length === 0) {
    throw new HttpsError("invalid-argument", "type, title and approverIds are required.");
  }

  const ref = await getFirestore().collection("approvalRequests").add({
    type,
    title,
    description,
    entityType,
    entityId,
    approverIds,
    metadata,
    status: "pending",
    requestedBy: request.auth.uid,
    decisions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await writeAuditEvent("approval.requested", {
    ...auditActor(request),
    approvalRequestId: ref.id,
    type,
    entityType,
    entityId,
  });

  return { id: ref.id };
});

exports.resolveApprovalRequest = onCall(async (request) => {
  const authorization = await getAuthorization(getFirestore(), request);
  requirePermission(authorization, "approval:resolve", "Approval resolution permission is required.");

  const { id, decision, note = "" } = request.data || {};
  if (!id || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "id and a valid decision are required.");
  }

  const ref = getFirestore().collection("approvalRequests").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Approval request not found.");
  }

  const data = snap.data();
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Approval request is already resolved.");
  }
  if (!Array.isArray(data.approverIds) || !data.approverIds.includes(request.auth.uid)) {
    throw new HttpsError("permission-denied", "You are not an approver for this request.");
  }

  const decisions = [
    ...(data.decisions || []),
    {
      by: request.auth.uid,
      decision,
      note,
      at: new Date().toISOString(),
    },
  ];

  await ref.update({
    status: decision,
    decisions,
    updatedAt: new Date().toISOString(),
  });

  await writeAuditEvent("approval.resolved", {
    ...auditActor(request),
    approvalRequestId: id,
    decision,
  });

  return { success: true };
});

exports.dueSoonReminderSweep = onSchedule("every day 08:00", async () => {
  const tasksSnap = await getFirestore().collection("appData").doc("tasks").get();
  if (!tasksSnap.exists) return;

  const activeTasks = tasksSnap.data()?.activeTasks || [];
  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(now.getDate() + 3);

  const dueSoon = activeTasks.filter((task) => {
    if (!task.dueDate || task.status === "done") return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= now && dueDate <= inThreeDays;
  });

  await Promise.all(dueSoon.map((task) =>
    getFirestore().collection("scheduledReminders").add({
      type: "task.due_soon",
      entityType: "task",
      entityId: task.id,
      assignedTo: task.assignedTo || null,
      title: task.title,
      dueDate: task.dueDate,
      createdAt: new Date().toISOString(),
    })
  ));
});

exports.pendingApprovalSweep = onSchedule("every 60 minutes", async () => {
  const snap = await getFirestore()
    .collection("approvalRequests")
    .where("status", "==", "pending")
    .get();

  const now = Date.now();
  const stale = snap.docs.filter((docSnap) => {
    const createdAt = Date.parse(docSnap.data().createdAt || "");
    return !Number.isNaN(createdAt) && now - createdAt >= 24 * 60 * 60 * 1000;
  });

  await Promise.all(stale.map((docSnap) =>
    getFirestore().collection("scheduledReminders").add({
      type: "approval.overdue",
      entityType: "approval",
      entityId: docSnap.id,
      approverIds: docSnap.data().approverIds || [],
      title: docSnap.data().title,
      createdAt: new Date().toISOString(),
    })
  ));
});
