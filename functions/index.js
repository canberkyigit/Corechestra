const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { randomBytes } = require("node:crypto");

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

// ─── inviteUser ───────────────────────────────────────────────────────────────
// Creates a Firebase Auth account for a new user and stores their profile.
// Only callable by admins.
//
// Request:  { email: string, name: string, role: "admin"|"member"|"viewer" }
// Response: { uid: string }
exports.inviteUser = onCall(async (request) => {
  await requireAdmin(request);

  const email = String(request.data?.email || "").trim().toLowerCase();
  const name = String(request.data?.name || "").trim();
  const role = request.data?.role || "member";
  if (!email || !name) {
    throw new HttpsError("invalid-argument", "email and name are required.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "A valid role is required.");
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
  await requireAdmin(request);

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
  await requireAdmin(request);

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
  });

  return { success: true };
});

// ─── updateUserStatus ────────────────────────────────────────────────────────
// Deactivates/reactivates a login through one audited server-side path.
exports.updateUserStatus = onCall(async (request) => {
  await requireAdmin(request);

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
  requireAuth(request);

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
