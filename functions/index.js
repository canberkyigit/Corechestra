const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
