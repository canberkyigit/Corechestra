import { useMemo } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { emitWorkspaceEvent, WORKSPACE_EVENT_TYPES } from "../../../services/workspaceEvents";

function byId(list) {
  const map = new Map();
  (list || []).forEach((entry) => { if (entry?.id) map.set(entry.id, entry); });
  return map;
}

function countResults(run) {
  const source = run?.results ?? run?.executions ?? [];
  const list = Array.isArray(source) ? source : Object.values(source || {});
  const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, total: 0 };
  list.forEach((entry) => {
    const status = String(entry?.status || "").toLowerCase();
    counts.total += 1;
    if (status === "passed" || status === "pass") counts.passed += 1;
    else if (status === "failed" || status === "fail") counts.failed += 1;
    else if (status === "blocked") counts.blocked += 1;
    else if (status === "skipped") counts.skipped += 1;
  });
  return counts;
}

const RUN_DONE = new Set(["completed", "done", "closed", "passed", "failed"]);

/**
 * Pure diff of releases / test runs before and after one local action.
 * Returns the workspace events that action caused.
 */
export function diffTestingEvents(prev, next, { actor = null, fallbackProjectId = null } = {}) {
  const events = [];
  const before = byId(prev.releases);
  (next.releases || []).forEach((release) => {
    if (!release?.id) return;
    const old = before.get(release.id);
    const summary = {
      id: release.id, version: release.version || "", name: release.name || "", status: release.status || "planned",
      targetDate: release.targetDate || release.releaseDate || null,
    };
    const projectId = release.projectId || fallbackProjectId;
    if (!old) {
      events.push({ type: WORKSPACE_EVENT_TYPES.RELEASE_CREATED, projectId, actor, release: summary });
    } else if (old.status !== release.status) {
      events.push({ type: WORKSPACE_EVENT_TYPES.RELEASE_STATUS, projectId, actor, release: summary, from: old.status || "planned", to: release.status });
    }
  });

  const runsBefore = byId(prev.testRuns);
  (next.testRuns || []).forEach((run) => {
    if (!run?.id) return;
    const old = runsBefore.get(run.id);
    const finished = RUN_DONE.has(String(run.status || "").toLowerCase()) || Boolean(run.completedAt);
    const wasFinished = old && (RUN_DONE.has(String(old.status || "").toLowerCase()) || Boolean(old.completedAt));
    if (!old || !finished || wasFinished) return;
    events.push({
      type: WORKSPACE_EVENT_TYPES.TEST_RUN_COMPLETED,
      projectId: run.projectId || fallbackProjectId,
      actor,
      run: { id: run.id, name: run.name || "Test run", releaseId: run.releaseId || null, environment: run.environment || "" },
      results: countResults(run),
    });
  });
  return events;
}

function snapshot() {
  const state = useAppStore.getState();
  return { releases: state.releases || [], testRuns: state.testRuns || [] };
}

/**
 * Wraps every testing/release action so the changes it makes locally are
 * announced on the workspace event bus (project channel bot posts). Remote
 * updates never pass through here, so nothing is announced twice.
 */
export function useWorkspaceEventBridge(testingActions, { currentUser, currentProjectId }) {
  return useMemo(() => {
    const wrapped = {};
    Object.entries(testingActions || {}).forEach(([name, value]) => {
      if (typeof value !== "function") {
        wrapped[name] = value;
        return;
      }
      wrapped[name] = (...args) => {
        const prev = snapshot();
        const result = value(...args);
        try {
          diffTestingEvents(prev, snapshot(), { actor: currentUser || null, fallbackProjectId: currentProjectId || null })
            .forEach(emitWorkspaceEvent);
        } catch {
          // Announcing is best-effort and must never break the action.
        }
        return result;
      };
    });
    return wrapped;
  }, [currentProjectId, currentUser, testingActions]);
}
