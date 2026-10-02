// Admin-side account management for the auth profile collection `users/{uid}`
// and pending invites `invites/{email}`.
//
// Paths, in priority order:
//   1. REACT_APP_USE_FUNCTIONS === "true"  -> trusted Cloud Functions (functions/index.js)
//   2. E2E mode                            -> localStorage fake backend (src/shared/e2e/testMode.js)
//   3. default                             -> direct client Firestore writes (legacy, client-trusted)
//
// NOTE: path 3 is only as secure as firestore.rules (currently `request.auth != null`).
// AuthContext reads the same flags (`disabled`, `deleted`, invite `status`) to refuse access.
import { collection, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../shared/services/firebase";
import {
  isE2EMode,
  readE2EAuthUsers,
  updateE2EAuthUserRole,
  upsertE2EAuthUser,
} from "../../../shared/e2e/testMode";
import {
  isFunctionsEnabled,
  deleteUserFn,
  inviteUserFn,
  setUserStatusFn,
  updateUserRoleFn,
} from "../../../shared/services/functions";
import { getAccountBlockReason, isValidRole } from "../../../shared/constants/permissions";

export const INVITES_COLLECTION = "invites";

export function inviteDocId(email) {
  return String(email || "").trim().toLowerCase();
}

export function isAccountDeleted(account) {
  return getAccountBlockReason(account) === "deleted";
}

export function isAccountDisabled(account) {
  return getAccountBlockReason(account) === "disabled";
}

/** Loads every auth profile. Soft-deleted profiles are included; filter with `isAccountDeleted`. */
export async function listAccounts() {
  if (isE2EMode()) return readE2EAuthUsers();
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((snapshot) => ({ uid: snapshot.id, ...snapshot.data() }));
}

/** Changes the effective role (`users/{uid}.role`), which AuthContext listens to. */
export async function setAccountRole(uid, role) {
  if (!uid) throw new Error("Missing user id.");
  if (!isValidRole(role)) throw new Error(`Invalid role "${role}".`);
  if (isFunctionsEnabled()) {
    await updateUserRoleFn({ uid, role });
    return;
  }
  if (isE2EMode()) {
    updateE2EAuthUserRole(uid, role);
    return;
  }
  await updateDoc(doc(db, "users", uid), { role });
}

/** Activates or deactivates an account. Deactivated accounts are refused at login. */
export async function setAccountActive(uid, active) {
  if (!uid) throw new Error("Missing user id.");
  const patch = active
    ? { disabled: false, status: "active" }
    : { disabled: true, status: "inactive" };
  if (isFunctionsEnabled()) {
    await setUserStatusFn({ uid, disabled: !active });
    return;
  }
  if (isE2EMode()) {
    upsertE2EAuthUser(uid, patch);
    return;
  }
  await setDoc(doc(db, "users", uid), { ...patch, statusChangedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Soft-deletes an account. The profile doc is kept (with `deleted: true`) so the
 * login flow can refuse it and does not silently re-create it.
 * With Cloud Functions enabled the Firebase Auth account is deleted as well.
 */
export async function markAccountDeleted(uid) {
  if (!uid) throw new Error("Missing user id.");
  if (isFunctionsEnabled()) {
    await deleteUserFn({ uid });
    return;
  }
  const patch = { deleted: true, disabled: true, status: "deleted" };
  if (isE2EMode()) {
    upsertE2EAuthUser(uid, patch);
    return;
  }
  await setDoc(doc(db, "users", uid), { ...patch, deletedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Invites a person.
 *  - Functions enabled: creates the Firebase Auth account + profile, returns its uid.
 *  - Otherwise: records `invites/{email}` so the first login gets the invited role
 *    (the Auth account itself must still be created in the Firebase console).
 * Returns `{ uid, mode }`.
 */
export async function inviteAccount({ email, name, role }) {
  const safeRole = isValidRole(role) ? role : "member";
  if (isFunctionsEnabled()) {
    const result = await inviteUserFn({ email, name, role: safeRole });
    return { uid: result?.uid || null, mode: "functions" };
  }
  if (isE2EMode()) return { uid: null, mode: "local" };
  await setDoc(doc(db, INVITES_COLLECTION, inviteDocId(email)), {
    email: inviteDocId(email),
    name: name || "",
    role: safeRole,
    status: "pending",
    invitedAt: new Date().toISOString(),
  }, { merge: true });
  return { uid: null, mode: "invite" };
}

/** Updates a pending invite (role and/or status: "pending" | "inactive" | "revoked"). */
export async function updateInvite(email, patch) {
  if (!email || isE2EMode() || isFunctionsEnabled()) return;
  const safePatch = { ...patch };
  if (safePatch.role !== undefined && !isValidRole(safePatch.role)) delete safePatch.role;
  await setDoc(doc(db, INVITES_COLLECTION, inviteDocId(email)), {
    ...safePatch,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/** Active (not deleted, not disabled) admins in a list of accounts. */
export function countActiveAdmins(accounts) {
  return (accounts || []).filter((account) => (
    account.role === "admin" && !getAccountBlockReason(account)
  )).length;
}
