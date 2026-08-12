import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { persistWorkspaceDomain, resetWorkspaceData } from "./adminFunctions";
import {
  E2E_DOMAINS_KEY,
  isE2EMode,
  readE2EDomains,
  subscribeE2EKey,
  writeE2EDomains,
} from "../e2e/testMode";

// ── Firestore domain structure ──────────────────────────────────────────────
const COLLECTION = "appData";
const PREFERENCES_COLLECTION = "userPreferences";
const SHOULD_LOG_STORAGE_DIAGNOSTICS = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

function emitStorageError(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("corechestra:storage-error", {
    detail: { message },
  }));
}

function emitStorageConflict(domain, fields, strategy) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("corechestra:storage-conflict", {
    detail: { domain, fields, strategy },
  }));
}

function logStorageDiagnostic(level, ...args) {
  if (!SHOULD_LOG_STORAGE_DIAGNOSTICS) return;
  console[level](...args);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneMaybe(value) {
  return value === undefined ? undefined : cloneData(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripMeta(data) {
  if (!data) return {};
  const next = { ...data };
  delete next._updatedAt;
  delete next._updatedBy;
  delete next._version;
  delete next._lastMutationId;
  return next;
}

function isEqualValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function extractComparableTimestamp(value) {
  if (!isPlainObject(value)) return 0;
  const candidates = [value.updatedAt, value.createdAt, value.timestamp, value.addedAt];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const ts = Date.parse(candidate);
    if (!Number.isNaN(ts)) return ts;
  }
  return 0;
}

function isIdCollection(value) {
  return Array.isArray(value) && value.every((entry) => isPlainObject(entry) && entry.id !== undefined);
}

function mergeConflictValue(baseValue, remoteValue, localValue) {
  const remoteChanged = !isEqualValue(baseValue, remoteValue);
  const localChanged = !isEqualValue(baseValue, localValue);

  if (!remoteChanged) return cloneMaybe(localValue);
  if (!localChanged) return cloneMaybe(remoteValue);

  if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
    return mergeConflictArray(baseValue || [], remoteValue, localValue);
  }

  if (isPlainObject(remoteValue) && isPlainObject(localValue)) {
    return mergeConflictObject(baseValue || {}, remoteValue, localValue);
  }

  const remoteTs = extractComparableTimestamp(remoteValue);
  const localTs = extractComparableTimestamp(localValue);
  if (remoteTs || localTs) {
    return cloneMaybe(localTs >= remoteTs ? localValue : remoteValue);
  }

  return cloneMaybe(localValue);
}

function mergeConflictObject(baseObject, remoteObject, localObject) {
  const merged = {};
  const keys = new Set([
    ...Object.keys(baseObject || {}),
    ...Object.keys(remoteObject || {}),
    ...Object.keys(localObject || {}),
  ]);

  keys.forEach((key) => {
    const resolved = mergeConflictValue(baseObject?.[key], remoteObject?.[key], localObject?.[key]);
    if (resolved !== undefined) merged[key] = resolved;
  });

  return merged;
}

function mergeConflictArray(baseArray, remoteArray, localArray) {
  if (isIdCollection(remoteArray) && isIdCollection(localArray)) {
    const baseMap = new Map((baseArray || []).map((entry) => [entry.id, entry]));
    const remoteMap = new Map(remoteArray.map((entry) => [entry.id, entry]));
    const localMap = new Map(localArray.map((entry) => [entry.id, entry]));
    const orderedIds = [];
    [...remoteArray, ...localArray].forEach((entry) => {
      if (!orderedIds.includes(entry.id)) orderedIds.push(entry.id);
    });

    return orderedIds
      .map((id) => mergeConflictValue(baseMap.get(id), remoteMap.get(id), localMap.get(id)))
      .filter((entry) => entry !== undefined);
  }

  const merged = [];
  [...remoteArray, ...localArray].forEach((entry) => {
    if (!merged.some((existing) => isEqualValue(existing, entry))) {
      merged.push(cloneMaybe(entry));
    }
  });
  return merged;
}

export const DOMAIN_FIELDS = {
  config:    ["sprintDefaults", "templateRegistry", "permissionMatrix", "workspaceSettings", "sensitiveActionPolicy"],
  entities:  ["projects", "teams", "users", "epics", "labels", "deletedUserIds"],
  tasks:     ["activeTasks", "perProjectBacklog"],
  sprints:   ["perProjectSprint", "projectColumns", "perProjectBoardSettings",
              "perProjectBurndownSnapshots", "perProjectCompletedSprints", "perProjectPlannedSprints"],
  activity:  ["globalActivityLog", "notifications"],
  workspace: ["perProjectRetrospective", "perProjectPokerHistory", "perProjectNotes"],
  docs:      ["spaces", "docPages"],
  releases:  ["releases"],
  testing:   ["testPlans", "testSuites", "testCases", "testRuns"],
  archive:   ["archivedTasks", "archivedProjects", "archivedEpics"],
};

export const PREFERENCE_FIELDS = [
  "currentProjectId",
  "darkMode",
  "sidebarCollapsed",
  "projectsViewMode",
  "perProjectBoardFilters",
  "savedViews",
  "recentItems",
  "favoriteItems",
  "pinnedItems",
  "notificationPreferences",
];

// ── Load all domains (one-time, for initial hydration) ──────────────────────

export async function loadAllDomains(userId = null) {
  if (isE2EMode()) {
    try {
      const rawDomains = readE2EDomains();
      const merged = {};
      let hasData = false;

      Object.entries(DOMAIN_FIELDS).forEach(([domain, fields]) => {
        const data = rawDomains[domain];
        if (!data) return;
        hasData = true;
        _lastRemoteTs[domain] = data._updatedAt || 0;
        _lastRemoteVersion[domain] = data._version || 0;
        _lastKnownDomainData[domain] = stripMeta(data);
        fields.forEach((field) => {
          if (data[field] !== undefined) merged[field] = data[field];
        });
      });

      const preferences = userId ? rawDomains[`preferences:${userId}`] : null;
      if (preferences) {
        hasData = true;
        _lastKnownPreferences = stripMeta(preferences);
        PREFERENCE_FIELDS.forEach((field) => {
          if (preferences[field] !== undefined) merged[field] = preferences[field];
        });
      }

      return hasData ? merged : null;
    } catch (e) {
      logStorageDiagnostic("warn", "[E2E Storage] loadAllDomains failed:", e.message);
      emitStorageError("Failed to load workspace data from local E2E storage.");
      return null;
    }
  }

  try {
    const domains = Object.keys(DOMAIN_FIELDS);
    const snaps = await Promise.all(
      domains.map((d) => getDoc(doc(db, COLLECTION, d)))
    );

    const merged = {};
    let hasData = false;

    snaps.forEach((snap, i) => {
      if (snap.exists()) {
        hasData = true;
        const data = snap.data();
        _lastRemoteTs[domains[i]] = data._updatedAt || 0;
        _lastRemoteVersion[domains[i]] = data._version || 0;
        _lastKnownDomainData[domains[i]] = stripMeta(data);
        DOMAIN_FIELDS[domains[i]].forEach((field) => {
          if (data[field] !== undefined) merged[field] = data[field];
        });
      }
    });

    if (userId) {
      const preferenceSnap = await getDoc(doc(db, PREFERENCES_COLLECTION, userId));
      const preferenceData = preferenceSnap.exists() ? preferenceSnap.data() : null;
      if (preferenceData) _lastKnownPreferences = stripMeta(preferenceData);
      const legacyConfig = snaps[domains.indexOf("config")]?.data?.() || {};
      const source = preferenceData || legacyConfig;
      PREFERENCE_FIELDS.forEach((field) => {
        if (source[field] !== undefined) {
          hasData = true;
          merged[field] = source[field];
        }
      });
    }

    if (hasData) return merged;

    // Legacy migration: old single-doc format
    const oldSnap = await getDoc(doc(db, "appState", "default"));
    if (oldSnap.exists()) {
      const data = oldSnap.data();
      delete data._updatedAt;
      return data;
    }

    // Legacy migration: localStorage
    const raw = localStorage.getItem("corechestra_v1");
    if (raw) {
      const local = JSON.parse(raw);
      localStorage.removeItem("corechestra_v1");
      return local;
    }

    return null;
  } catch (e) {
    logStorageDiagnostic("warn", "[Firestore] loadAllDomains failed:", e.message);
    emitStorageError("Failed to load workspace data from Firestore.");
    return null;
  }
}

// ── Per-domain debounced save ───────────────────────────────────────────────
// Tracks write timestamps so real-time listeners can ignore own writes.

const _timers = {};
const _lastWriteTs = {};
const _lastRemoteTs = {};
const _lastRemoteVersion = {};
const _lastKnownDomainData = {};
const _pendingDomainData = {};
const _pendingBaseData = {};
let _storageActor = "";
let _storageRole = "admin";

let _preferenceTimer = null;
let _lastKnownPreferences = {};
let _pendingPreferences = {};

export function setStorageActor(actor, role = "admin") {
  _storageActor = actor || "";
  _storageRole = role || "viewer";
}

export function saveDomain(domain, data) {
  if (_storageRole === "viewer") return;
  const clean = cloneData(data);
  // These controls use an immediate, audited, acknowledgement-based callable
  // from WorkspaceTab. Do not duplicate them through the generic debounce.
  if (domain === "config" && !isE2EMode()) {
    delete clean.permissionMatrix;
    delete clean.workspaceSettings;
    delete clean.sensitiveActionPolicy;
    if (Object.keys(clean).length === 0) return;
  }
  if (!_pendingBaseData[domain]) {
    _pendingBaseData[domain] = cloneData(_lastKnownDomainData[domain] || {});
  }
  _pendingDomainData[domain] = {
    ...(_pendingDomainData[domain] || {}),
    ...clean,
  };

  if (isE2EMode()) {
    try {
      const liveDomains = readE2EDomains();
      const liveDomainDoc = liveDomains[domain] || {};
      const known = stripMeta(liveDomainDoc);
      const pending = _pendingDomainData[domain] || {};
      const base = _pendingBaseData[domain] || {};
      const changedFields = {};
      const mergedFields = [];

      _lastKnownDomainData[domain] = known;

      DOMAIN_FIELDS[domain].forEach((field) => {
        if (pending[field] === undefined) return;
        const remoteChangedSinceQueue = !isEqualValue(base[field], known[field]);
        const localPendingChanged = !isEqualValue(base[field], pending[field]);

        if (remoteChangedSinceQueue && localPendingChanged) {
          const resolved = mergeConflictValue(base[field], known[field], pending[field]);
          if (!isEqualValue(known[field], resolved)) {
            changedFields[field] = resolved;
          }
          mergedFields.push(field);
          return;
        }
        if (!isEqualValue(known[field], pending[field])) {
          changedFields[field] = pending[field];
        }
      });

      if (mergedFields.length > 0) {
        logStorageDiagnostic("info", `[E2E Storage] save "${domain}" merged conflicting fields:`, mergedFields.join(", "));
        emitStorageConflict(domain, mergedFields, "merge");
      }

      if (Object.keys(changedFields).length > 0) {
        const ts = Date.now();
        _lastWriteTs[domain] = ts;
        writeE2EDomains({
          ...liveDomains,
          [domain]: {
            ...liveDomainDoc,
            ...changedFields,
            _updatedAt: ts,
            _updatedBy: _storageActor || null,
            _version: (liveDomainDoc?._version || 0) + 1,
            _lastMutationId: `${domain}-${ts}`,
          },
        });
        _lastKnownDomainData[domain] = {
          ...known,
          ...changedFields,
        };
      }
    } catch (e) {
      logStorageDiagnostic("warn", `[E2E Storage] save "${domain}" failed:`, e.message);
      emitStorageError(`Failed to save ${domain} data to local test storage.`);
    } finally {
      delete _pendingDomainData[domain];
      delete _pendingBaseData[domain];
    }
    return;
  }

  clearTimeout(_timers[domain]);
  _timers[domain] = setTimeout(async () => {
    try {
      if (isE2EMode()) {
        const liveDomains = readE2EDomains();
        const liveDomainDoc = liveDomains[domain] || {};
        const liveKnown = stripMeta(liveDomainDoc);
        _lastKnownDomainData[domain] = liveKnown;
      }

      const pending = _pendingDomainData[domain] || {};
      const known = _lastKnownDomainData[domain] || {};
      const base = _pendingBaseData[domain] || {};
      const changedFields = {};
      const mergedFields = [];

      DOMAIN_FIELDS[domain].forEach((field) => {
        if (pending[field] === undefined) return;
        const remoteChangedSinceQueue = !isEqualValue(base[field], known[field]);
        const localPendingChanged = !isEqualValue(base[field], pending[field]);

        if (remoteChangedSinceQueue && localPendingChanged) {
          const resolved = mergeConflictValue(base[field], known[field], pending[field]);
          if (!isEqualValue(known[field], resolved)) {
            changedFields[field] = resolved;
          }
          mergedFields.push(field);
          return;
        }
        if (!isEqualValue(known[field], pending[field])) {
          changedFields[field] = pending[field];
        }
      });

      if (mergedFields.length > 0) {
        logStorageDiagnostic("info", `[Firestore] save "${domain}" merged conflicting fields:`, mergedFields.join(", "));
        emitStorageConflict(domain, mergedFields, "merge");
      }

      if (Object.keys(changedFields).length === 0) {
        delete _pendingDomainData[domain];
        delete _pendingBaseData[domain];
        return;
      }

      const ts = Date.now();
      _lastWriteTs[domain] = ts;
      if (isE2EMode()) {
        const liveDomains = readE2EDomains();
        writeE2EDomains({
          ...liveDomains,
          [domain]: {
            ...(liveDomains[domain] || {}),
            ...changedFields,
            _updatedAt: ts,
            _updatedBy: _storageActor || null,
            _version: ((liveDomains[domain] || {})._version || 0) + 1,
            _lastMutationId: `${domain}-${ts}`,
          },
        });
      } else {
        const result = await persistWorkspaceDomain(domain, changedFields);
        _lastWriteTs[domain] = result?._updatedAt || ts;
        _lastRemoteVersion[domain] = result?._version || ((_lastRemoteVersion[domain] || 0) + 1);
      }
      if (isE2EMode()) {
        _lastRemoteVersion[domain] = (_lastRemoteVersion[domain] || 0) + 1;
      }
      _lastKnownDomainData[domain] = {
        ...known,
        ...changedFields,
      };
    } catch (e) {
      logStorageDiagnostic("warn", `[Firestore] save "${domain}" failed:`, e.message);
      emitStorageError(`Failed to save ${domain} data to Firestore.`);
    } finally {
      delete _pendingDomainData[domain];
      delete _pendingBaseData[domain];
    }
  }, 1500);
}

export function saveUserPreferences(userId, data) {
  if (!userId) return;
  const clean = cloneData(data);
  _pendingPreferences = { ..._pendingPreferences, ...clean };

  clearTimeout(_preferenceTimer);
  _preferenceTimer = setTimeout(async () => {
    const changedFields = {};
    PREFERENCE_FIELDS.forEach((field) => {
      if (_pendingPreferences[field] === undefined) return;
      if (!isEqualValue(_lastKnownPreferences[field], _pendingPreferences[field])) {
        changedFields[field] = _pendingPreferences[field];
      }
    });

    _pendingPreferences = {};
    if (Object.keys(changedFields).length === 0) return;

    const updatedAt = Date.now();
    try {
      if (isE2EMode()) {
        const domains = readE2EDomains();
        const key = `preferences:${userId}`;
        writeE2EDomains({
          ...domains,
          [key]: { ...(domains[key] || {}), ...changedFields, _updatedAt: updatedAt },
        });
      } else {
        await setDoc(
          doc(db, PREFERENCES_COLLECTION, userId),
          { ...changedFields, _updatedAt: updatedAt },
          { merge: true }
        );
      }
      _lastKnownPreferences = { ..._lastKnownPreferences, ...changedFields };
    } catch (error) {
      logStorageDiagnostic("warn", "[Firestore] user preferences save failed:", error.message);
      emitStorageError("Failed to save your personal preferences.");
    }
  }, 1000);
}

export function subscribeToUserPreferences(userId, onUpdate) {
  if (!userId) return () => {};

  if (isE2EMode()) {
    const applyPreferences = () => {
      const data = readE2EDomains()[`preferences:${userId}`];
      if (!data) return;
      _lastKnownPreferences = stripMeta(data);
      PREFERENCE_FIELDS.forEach((field) => {
        if (data[field] !== undefined) onUpdate(field, data[field]);
      });
    };
    applyPreferences();
    return subscribeE2EKey(E2E_DOMAINS_KEY, applyPreferences);
  }

  return onSnapshot(doc(db, PREFERENCES_COLLECTION, userId), (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    _lastKnownPreferences = stripMeta(data);
    PREFERENCE_FIELDS.forEach((field) => {
      if (data[field] !== undefined) onUpdate(field, data[field]);
    });
  }, (error) => {
    logStorageDiagnostic("warn", "[Firestore] user preferences listener failed:", error.message);
    emitStorageError("Failed to sync your personal preferences.");
  });
}

// ── Real-time listeners ─────────────────────────────────────────────────────
// Subscribes to all domain documents. Calls `onUpdate(field, value)` when
// a REMOTE change is detected (ignores own writes via timestamp comparison).

export function subscribeToAll(onUpdate) {
  if (isE2EMode()) {
    const applyE2EUpdates = () => {
      const rawDomains = readE2EDomains();

      Object.entries(DOMAIN_FIELDS).forEach(([domain, fields]) => {
        const data = rawDomains[domain];
        if (!data) return;

        const remoteTs = data._updatedAt || 0;
        const localTs = _lastWriteTs[domain] || 0;
        _lastRemoteTs[domain] = remoteTs;
        _lastRemoteVersion[domain] = data._version || 0;
        _lastKnownDomainData[domain] = stripMeta(data);

        if (remoteTs <= localTs) return;

        fields.forEach((field) => {
          if (data[field] !== undefined) {
            onUpdate(field, data[field]);
          }
        });
      });
    };

    const unsubscribe = subscribeE2EKey(E2E_DOMAINS_KEY, applyE2EUpdates);
    const intervalId = window.setInterval(applyE2EUpdates, 500);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }

  const unsubscribers = Object.entries(DOMAIN_FIELDS).map(([domain, fields]) => {
    const ref = doc(db, COLLECTION, domain);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remoteTs = data._updatedAt || 0;
      const localTs = _lastWriteTs[domain] || 0;
      _lastRemoteTs[domain] = remoteTs;
      _lastRemoteVersion[domain] = data._version || 0;
      _lastKnownDomainData[domain] = stripMeta(data);

      // Skip if this snapshot is from our own write
      if (remoteTs <= localTs) return;

      // Remote change detected — push each field
      fields.forEach((field) => {
        if (data[field] !== undefined) {
          onUpdate(field, data[field]);
        }
      });
    }, (err) => {
      logStorageDiagnostic("warn", `[Firestore] listener "${domain}" error:`, err.message);
      emitStorageError(`Realtime sync failed for ${domain}.`);
    });
  });

  // Return cleanup function
  return () => unsubscribers.forEach((unsub) => unsub());
}

// ── Clear all domains (for resetAllData) ────────────────────────────────────

export async function clearAllDomains() {
  if (isE2EMode()) {
    try {
      const preferences = Object.fromEntries(
        Object.entries(readE2EDomains()).filter(([key]) => key.startsWith("preferences:"))
      );
      writeE2EDomains(preferences);
      Object.keys(DOMAIN_FIELDS).forEach((domain) => {
        clearTimeout(_timers[domain]);
        delete _timers[domain];
        delete _lastWriteTs[domain];
        delete _lastRemoteTs[domain];
        delete _lastRemoteVersion[domain];
        delete _lastKnownDomainData[domain];
        delete _pendingDomainData[domain];
        delete _pendingBaseData[domain];
      });
      return true;
    } catch (e) {
      logStorageDiagnostic("warn", "[E2E Storage] clearAllDomains failed:", e.message);
      emitStorageError("Failed to clear local E2E workspace data.");
      return false;
    }
  }

  try {
    Object.keys(DOMAIN_FIELDS).forEach((domain) => clearTimeout(_timers[domain]));
    await resetWorkspaceData();
    localStorage.removeItem("corechestra_v1");
    Object.keys(DOMAIN_FIELDS).forEach((domain) => {
      delete _timers[domain];
      delete _lastWriteTs[domain];
      delete _lastRemoteTs[domain];
      delete _lastRemoteVersion[domain];
      delete _lastKnownDomainData[domain];
      delete _pendingDomainData[domain];
      delete _pendingBaseData[domain];
    });
    return true;
  } catch (e) {
    logStorageDiagnostic("warn", "[Firestore] clearAllDomains failed:", e.message);
    emitStorageError("Failed to clear workspace data.");
    return false;
  }
}
