const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

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
  if (snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }
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

  const { email, name, role = "member" } = request.data;
  if (!email || !name) {
    throw new HttpsError("invalid-argument", "email and name are required.");
  }

  // Create the Auth account with a temporary password (user must reset)
  const userRecord = await getAuth().createUser({
    email,
    displayName: name,
    // Random 16-char temp password — user will use "Forgot Password" to set their own
    password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
  });

  // Store the user profile in Firestore so it shows up in People tab immediately
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

  await writeAuditEvent("user.invited", {
    actorUid: request.auth.uid,
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

  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot delete your own account.");
  }

  await getAuth().deleteUser(uid);
  await getFirestore().collection("users").doc(uid).update({
    deleted: true,
    deletedAt: new Date().toISOString(),
  });

  await writeAuditEvent("user.deleted", {
    actorUid: request.auth.uid,
    deletedUid: uid,
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

  const { uid, role } = request.data;
  const validRoles = ["admin", "member", "viewer"];
  if (!uid || !validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "uid and a valid role are required.");
  }

  // Set custom claim so AuthContext.js can read it without a Firestore round-trip
  await getAuth().setCustomUserClaims(uid, { role });

  // Also persist in Firestore (source of truth for the People tab)
  await getFirestore().collection("users").doc(uid).update({ role });

  await writeAuditEvent("user.role_updated", {
    actorUid: request.auth.uid,
    targetUid: uid,
    role,
  });

  return { success: true };
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
    actorUid: request.auth.uid,
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
    actorUid: request.auth.uid,
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
