import { useMemo } from "react";
import { normalizeReleases } from "../utils/releaseModel";
import { buildTaskMap, computeKpis, computeReleaseMetrics } from "../utils/releaseMetrics";
import { isReleaseVisibleInProject } from "../utils/releaseUtils";

/**
 * Normalized, project-scoped releases plus per-release metrics. Everything is
 * memoized on the raw store arrays so unrelated store updates are free.
 */
export function useReleaseData({ releases, currentProjectId, allTasks, testRuns, testPlans, now }) {
  const projectReleases = useMemo(
    () => normalizeReleases((releases || []).filter((release) => isReleaseVisibleInProject(release, currentProjectId))),
    [releases, currentProjectId]
  );

  const taskMap = useMemo(() => buildTaskMap(allTasks), [allTasks]);

  const metricsById = useMemo(() => {
    const map = new Map();
    projectReleases.forEach((release) => {
      map.set(release.id, computeReleaseMetrics(release, { taskMap, testRuns, testPlans, now }));
    });
    return map;
  }, [projectReleases, taskMap, testRuns, testPlans, now]);

  const kpis = useMemo(() => computeKpis(projectReleases, metricsById, now), [projectReleases, metricsById, now]);

  return { projectReleases, taskMap, metricsById, kpis };
}
