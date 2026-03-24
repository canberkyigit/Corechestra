import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// ── Firestore domain structure ──────────────────────────────────────────────
// Each domain maps to a separate document under "appData" collection.
// Keeps documents small (<1MB) and writes granular.

const COLLECTION = "appData";

export const DOMAIN_FIELDS = {
  config:    ["currentUser", "currentProjectId", "sprintDefaults",
              "darkMode", "sidebarCollapsed", "projectsViewMode", "perProjectBoardFilters"],
  entities:  ["projects", "teams", "users", "epics", "labels"],
  tasks:     ["activeTasks", "perProjectBacklog"],
  sprints:   ["perProjectSprint", "projectColumns", "perProjectBoardSettings",
              "perProjectBurndownSnapshots", "perProjectCompletedSprints"],
  activity:  ["globalActivityLog", "notifications"],
  workspace: ["perProjectRetrospective", "perProjectPokerHistory", "perProjectNotes"],
  docs:      ["spaces", "docPages"],
  releases:  ["releases"],
  testing:   ["testSuites", "testCases", "testRuns"],
};

// ── Load all domains from Firestore ─────────────────────────────────────────
// Tries: 1) new domain-split format  2) old single-doc format  3) localStorage

export async function loadAllDomains() {
  try {
    // 1. Try new domain-split format
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

    // 2. Try old single-doc format (migration from previous setup)
    const oldSnap = await getDoc(doc(db, "appState", "default"));
    if (oldSnap.exists()) {
      const data = oldSnap.data();
      delete data._updatedAt;
      return data;
    }

    // 3. Try localStorage (one-time migration)
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

const _timers = {};

export function saveDomain(domain, data) {
  clearTimeout(_timers[domain]);
  _timers[domain] = setTimeout(async () => {
    try {
      const clean = JSON.parse(JSON.stringify(data));
      clean._updatedAt = Date.now();
      await setDoc(doc(db, COLLECTION, domain), clean);
    } catch (e) {
      console.warn(`[Firestore] save "${domain}" failed:`, e.message);
    }
  }, 1500);
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
