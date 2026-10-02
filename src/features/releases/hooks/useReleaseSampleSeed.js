import { useEffect, useRef } from "react";
import { SAMPLE_SEED_KEY_PREFIX } from "../constants/releaseMeta";

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
 * Auto-seeds sample releases ONCE per project (per browser) on the first visit
 * of a user who can manage releases, when the project has no releases. The
 * guard key is written on that first visit even if the project already has
 * releases, so deleting everything later never re-seeds.
 */
export function useReleaseSampleSeed({ enabled, projectId, releaseCount, onSeed }) {
  const onSeedRef = useRef(onSeed);
  onSeedRef.current = onSeed;

  useEffect(() => {
    if (!enabled || !projectId) return;
    if (hasSeededSamples(projectId)) return;
    markSamplesSeeded(projectId);
    if (releaseCount === 0) onSeedRef.current?.({ auto: true });
  }, [enabled, projectId, releaseCount]);
}
