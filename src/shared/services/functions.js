// Thin client wrapper around Firebase Cloud Functions (`functions/index.js`).
//
// The callable functions are only used when REACT_APP_USE_FUNCTIONS === "true"
// (and never in E2E mode). Otherwise callers fall back to the existing
// client-side Firestore path. `firebase/functions` is imported lazily so the
// SDK is not part of the main bundle when the flag is off.
import app from "./firebase";
import { isE2EMode } from "../e2e/testMode";

let functionsInstancePromise = null;

export function isFunctionsEnabled() {
  return process.env.REACT_APP_USE_FUNCTIONS === "true" && !isE2EMode() && !!app;
}

async function getFunctionsInstance() {
  if (!functionsInstancePromise) {
    functionsInstancePromise = import("firebase/functions").then(({ getFunctions }) => (
      getFunctions(app, process.env.REACT_APP_FUNCTIONS_REGION || undefined)
    ));
  }
  return functionsInstancePromise;
}

/**
 * Calls an `onCall` Cloud Function and returns its `data` payload.
 * Throws when functions are disabled so callers must check `isFunctionsEnabled()` first.
 */
export async function callFunction(name, payload = {}) {
  if (!isFunctionsEnabled()) {
    throw new Error(`Cloud Functions are disabled (REACT_APP_USE_FUNCTIONS is not "true"); cannot call ${name}.`);
  }
  const [{ httpsCallable }, instance] = await Promise.all([
    import("firebase/functions"),
    getFunctionsInstance(),
  ]);
  const result = await httpsCallable(instance, name)(payload);
  return result?.data;
}

export const inviteUserFn = (payload) => callFunction("inviteUser", payload);
export const deleteUserFn = (payload) => callFunction("deleteUser", payload);
export const updateUserRoleFn = (payload) => callFunction("updateUserRole", payload);
export const setUserStatusFn = (payload) => callFunction("setUserStatus", payload);
