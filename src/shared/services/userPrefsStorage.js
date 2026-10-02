import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import {
  getE2EUserPrefsKey,
  isE2EMode,
  readE2EDomains,
  readE2EUserPrefs,
  subscribeE2EKey,
  writeE2EUserPrefs,
} from "../e2e/testMode";

// ── Per-user preferences (`userPrefs/{uid}`) ────────────────────────────────
// Personal UI state that used to live in the shared `appData/config` doc and
// therefore leaked between users. One doc per Firebase Auth uid; only that
// user's session loads, saves and listens to it. Same write path rules as
// storage.js: debounced, diffed against the last known remote state.

const COLLECTION = "userPrefs";
const LEGACY_COLLECTION = "appData";
const LEGACY_DOMAIN = "config";
const SHOULD_LOG_STORAGE_DIAGNOSTICS = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

export const USER_PREFS_DEBOUNCE_MS = 1500;

export const USER_PREFS_FIELDS = [
  "currentUser", "currentProjectId", "darkMode", "sidebarCollapsed", "projectsViewMode",
  "perProjectBoardFilters", "savedViews", "recentItems", "favoriteItems", "pinnedItems",
  "notificationPreferences",
];

// The legacy `config.currentUser` is whoever saved last, not necessarily this
// user, so it is never copied. App.js derives it from the auth email anyway.
export const LEGACY_SEED_FIELDS = USER_PREFS_FIELDS.filter((field) => field !== "currentUser");

const META_FIELDS = ["_updatedAt", "_updatedBy", "_version"];

function emitStorageError(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("corechestra:storage-error", {
    detail: { message },
  }));
}

function logStorageDiagnostic(level, ...args) {
  if (!SHOULD_LOG_STORAGE_DIAGNOSTICS) return;
  console[level](...args);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function isEqualValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pickFields(data, fields = USER_PREFS_FIELDS) {
  const picked = {};
  if (!data) return picked;
  fields.forEach((field) => {
    if (data[field] !== undefined) picked[field] = data[field];
  });
  return picked;
}

// One session per tab: the signed-in user. `known` mirrors the remote doc and
// is updated optimistically on write, so the echo of our own write is a no-op
// in the listener (no client-clock comparison needed).
let _session = null;

function getSession(uid) {
  return _session && _session.uid === uid ? _session : null;
}

function installKnown(session, known, version) {
  session.known = cloneData(known);
  session.version = version || 0;
  session.ready = true;
}

async function readLegacySeed() {
  if (isE2EMode()) {
    return pickFields(readE2EDomains()[LEGACY_DOMAIN], LEGACY_SEED_FIELDS);
  }
  const snap = await getDoc(doc(db, LEGACY_COLLECTION, LEGACY_DOMAIN));
  return snap.exists() ? pickFields(snap.data(), LEGACY_SEED_FIELDS) : {};
}

async function writeSeedDoc(uid, payload) {
  if (isE2EMode()) {
    writeE2EUserPrefs(uid, payload);
    return;
  }
  // The doc does not exist yet, so a plain set creates it with exactly the seed.
  await setDoc(doc(db, COLLECTION, uid), payload);
}

/**
 * Starts the preference session for `uid` and loads `userPrefs/{uid}`.
 * First visit (no doc yet): seeds it once from the legacy personal fields in
 * the shared `appData/config` doc and writes it, so nobody loses filters or
 * favourites. Resolves `{ prefs, migrated }`, or `null` when loading failed
 * (the session then stays read-only until the listener delivers the doc).
 */
export async function loadUserPrefs(uid) {
  if (!uid) return null;
  if (!getSession(uid)) {
    // A different user's leftover session never writes again.
    if (_session) clearTimeout(_session.timer);
    _session = { uid, ready: false, known: {}, pending: {}, timer: null, version: 0 };
  }

  try {
    const existing = isE2EMode()
      ? readE2EUserPrefs(uid)
      : await getDoc(doc(db, COLLECTION, uid)).then((snap) => (snap.exists() ? snap.data() : null));

    if (existing) {
      const prefs = pickFields(existing);
      const session = getSession(uid);
      if (session) installKnown(session, prefs, existing._version);
      return { prefs, migrated: false };
    }

    const seed = await readLegacySeed();
    const ts = Date.now();
    try {
      await writeSeedDoc(uid, {
        ...seed,
        _updatedAt: ts,
        _updatedBy: uid,
        _version: 1,
        _migratedFrom: `${LEGACY_COLLECTION}/${LEGACY_DOMAIN}`,
        _migratedAt: ts,
      });
      const session = getSession(uid);
      if (session) installKnown(session, seed, 1);
    } catch (e) {
      // Fall back to the normal save path: with nothing known, the first save
      // after hydration writes every personal field (and creates the doc).
      logStorageDiagnostic("warn", "[Firestore] userPrefs migration write failed:", e.message);
      const session = getSession(uid);
      if (session) installKnown(session, {}, 0);
    }
    return { prefs: seed, migrated: true };
  } catch (e) {
    logStorageDiagnostic("warn", "[Firestore] loadUserPrefs failed:", e.message);
    emitStorageError("Failed to load your personal preferences.");
    return null;
  }
}

/** Current known prefs of an active session (what the store should show). */
export function getUserPrefsSnapshot(uid) {
  const session = getSession(uid);
  return session?.ready ? cloneData(session.known) : null;
}

/**
 * Queues personal fields for `userPrefs/{uid}`. Ignored unless `uid` owns the
 * active, loaded session, so nothing is written before hydration or for a
 * user who already signed out.
 */
export function saveUserPrefs(uid, data) {
  const session = getSession(uid);
  if (!session?.ready) return;
  session.pending = {
    ...session.pending,
    ...cloneData(pickFields(data)),
  };

  if (isE2EMode()) {
    flushUserPrefs();
    return;
  }

  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    flushUserPrefs();
  }, USER_PREFS_DEBOUNCE_MS);
}

/**
 * Writes pending personal fields now. Uses `mergeFields` so each changed
 * top-level field is replaced as a whole (deleted map keys do not come back).
 * Resolves `true` when something was written.
 */
export async function flushUserPrefs() {
  const session = _session;
  if (!session?.ready) return false;
  clearTimeout(session.timer);
  session.timer = null;

  const pending = session.pending;
  session.pending = {};
  const previousKnown = session.known;
  const changedFields = {};
  USER_PREFS_FIELDS.forEach((field) => {
    if (pending[field] === undefined) return;
    if (!isEqualValue(previousKnown[field], pending[field])) changedFields[field] = pending[field];
  });
  const changedKeys = Object.keys(changedFields);
  if (changedKeys.length === 0) return false;

  const ts = Date.now();
  const version = (session.version || 0) + 1;
  const payload = {
    ...changedFields,
    _updatedAt: ts,
    _updatedBy: session.uid,
    _version: version,
  };
  session.known = { ...previousKnown, ...changedFields };
  session.version = version;

  try {
    if (isE2EMode()) {
      writeE2EUserPrefs(session.uid, {
        ...(readE2EUserPrefs(session.uid) || {}),
        ...payload,
      });
    } else {
      await setDoc(doc(db, COLLECTION, session.uid), payload, {
        mergeFields: [...changedKeys, ...META_FIELDS],
      });
    }
    return true;
  } catch (e) {
    // Forget the optimistic state so the next save sends these fields again.
    changedKeys.forEach((field) => {
      if (session.known[field] === changedFields[field]) {
        if (previousKnown[field] === undefined) delete session.known[field];
        else session.known[field] = previousKnown[field];
      }
    });
    logStorageDiagnostic("warn", "[Firestore] save userPrefs failed:", e.message);
    emitStorageError("Failed to save your personal preferences.");
    return false;
  }
}

/**
 * Listens to the user's own doc so another tab/device of the same user stays
 * in sync. Calls `onUpdate(field, value)` only for fields whose remote value
 * differs from what this tab already knows and has not queued locally.
 */
export function subscribeToUserPrefs(uid, onUpdate) {
  if (!uid) return () => {};

  const apply = (data) => {
    const session = getSession(uid);
    if (!session || !data) return;
    const remote = pickFields(data);

    // Initial load failed (e.g. offline): adopt the doc once it arrives.
    if (!session.ready) {
      installKnown(session, remote, data._version);
      Object.entries(remote).forEach(([field, value]) => onUpdate(field, value));
      return;
    }

    session.version = Math.max(session.version || 0, data._version || 0);
    Object.entries(remote).forEach(([field, value]) => {
      if (isEqualValue(session.known[field], value)) return;
      session.known[field] = cloneData(value);
      if (session.pending[field] !== undefined) return;
      onUpdate(field, value);
    });
  };

  if (isE2EMode()) {
    const key = getE2EUserPrefsKey(uid);
    const applyE2E = () => apply(readE2EUserPrefs(uid));
    const unsubscribe = subscribeE2EKey(key, applyE2E);
    const intervalId = window.setInterval(applyE2E, 500);
    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }

  return onSnapshot(doc(db, COLLECTION, uid), (snap) => {
    if (!snap.exists()) return;
    apply(snap.data());
  }, (err) => {
    logStorageDiagnostic("warn", "[Firestore] userPrefs listener error:", err.message);
    emitStorageError("Realtime sync failed for your personal preferences.");
  });
}

/**
 * Ends `uid`'s session (logout / user switch). Pending edits are dropped —
 * call `flushUserPrefs()` first while the user can still write.
 */
export function endUserPrefsSession(uid) {
  const session = getSession(uid);
  if (!session) return;
  clearTimeout(session.timer);
  _session = null;
}
