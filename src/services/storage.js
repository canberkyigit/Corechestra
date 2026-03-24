import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ── Firestore domain structure ──────────────────────────────────────────────
const COLLECTION = "appData";

export const DOMAIN_FIELDS = {
  config:    ["currentUser", "currentProjectId", "sprintDefaults",
              "darkMode", "sidebarCollapsed", "projectsViewMode", "perProjectBoardFilters"],
  entities:  ["projects", "teams", "users", "epics", "labels"],
  tasks:     ["activeTasks", "perProjectBacklog"],
  sprints:   ["perProjectSprint", "projectColumns", "perProjectBoardSettings",
              "perProjectBurndownSnapshots", "perProjectCompletedSprints", "perProjectPlannedSprints"],
  activity:  ["globalActivityLog", "notifications"],
  workspace: ["perProjectRetrospective", "perProjectPokerHistory", "perProjectNotes"],
  docs:      ["spaces", "docPages"],
  releases:  ["releases"],
  testing:   ["testSuites", "testCases", "testRuns"],
  archive:   ["archivedTasks", "archivedProjects", "archivedEpics"],
};

// ── Load all domains (one-time, for initial hydration) ──────────────────────

export async function loadAllDomains() {
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
        DOMAIN_FIELDS[domains[i]].forEach((field) => {
          if (data[field] !== undefined) merged[field] = data[field];
        });
      }
    });

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
    console.warn("[Firestore] loadAllDomains failed:", e.message);
    return null;
  }
}

// ── Per-domain debounced save ───────────────────────────────────────────────
// Tracks write timestamps so real-time listeners can ignore own writes.

const _timers = {};
const _lastWriteTs = {};

export function saveDomain(domain, data) {
  clearTimeout(_timers[domain]);
  _timers[domain] = setTimeout(async () => {
    try {
      const clean = JSON.parse(JSON.stringify(data));
      const ts = Date.now();
      clean._updatedAt = ts;
      _lastWriteTs[domain] = ts;
      await setDoc(doc(db, COLLECTION, domain), clean);
    } catch (e) {
      console.warn(`[Firestore] save "${domain}" failed:`, e.message);
    }
  }, 1500);
}

// ── Real-time listeners ─────────────────────────────────────────────────────
// Subscribes to all domain documents. Calls `onUpdate(field, value)` when
// a REMOTE change is detected (ignores own writes via timestamp comparison).

export function subscribeToAll(onUpdate) {
  const unsubscribers = Object.entries(DOMAIN_FIELDS).map(([domain, fields]) => {
    const ref = doc(db, COLLECTION, domain);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remoteTs = data._updatedAt || 0;
      const localTs = _lastWriteTs[domain] || 0;

      // Skip if this snapshot is from our own write
      if (remoteTs <= localTs) return;

      // Remote change detected — push each field
      fields.forEach((field) => {
        if (data[field] !== undefined) {
          onUpdate(field, data[field]);
        }
      });
    }, (err) => {
      console.warn(`[Firestore] listener "${domain}" error:`, err.message);
    });
  });

  // Return cleanup function
  return () => unsubscribers.forEach((unsub) => unsub());
}

// ── Clear all domains (for resetAllData) ────────────────────────────────────

export async function clearAllDomains() {
  try {
    await Promise.all(
      Object.keys(DOMAIN_FIELDS).map((d) => deleteDoc(doc(db, COLLECTION, d)))
    );
  } catch (e) {
    console.warn("[Firestore] clearAllDomains failed:", e.message);
  }
}
