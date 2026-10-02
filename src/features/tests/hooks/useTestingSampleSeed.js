import { useEffect, useRef } from "react";
import { SAMPLE_SEED_KEY_PREFIX } from "../constants/testingConstants";

export function sampleSeedKey(projectId) {
  return `${SAMPLE_SEED_KEY_PREFIX}${projectId || "default"}`;
}

export function hasSeededSamples(projectId) {
  try {
    return window.localStorage.getItem(sampleSeedKey(projectId)) === "1";
  } catch {
    return true; // no storage → never auto-seed (avoids seeding on every visit)
  }
}

export function markSamplesSeeded(projectId) {
  try {
    window.localStorage.setItem(sampleSeedKey(projectId), "1");
  } catch {
    // ignore
  }
}

/**
 * Auto-seeds sample test data ONCE per project (per browser) on the first
 * visit of a user with `tests:edit` when the project has no suites. The guard
 * key is written on that first visit even if the project already has suites,
 * so deleting everything later never re-seeds.
 */
export function useTestingSampleSeed({ enabled, projectId, suiteCount, onSeed }) {
  const onSeedRef = useRef(onSeed);
  onSeedRef.current = onSeed;

  useEffect(() => {
    if (!enabled || !projectId) return;
    if (hasSeededSamples(projectId)) return;
    markSamplesSeeded(projectId);
    if (suiteCount === 0) onSeedRef.current?.({ auto: true });
  }, [enabled, projectId, suiteCount]);
}
