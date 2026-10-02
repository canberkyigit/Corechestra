import { useMemo } from "react";
import { buildProjectTestingData } from "../utils/testingModel";
import { getRootSuiteId } from "../utils/testingTree";
import { latestResultsByCase } from "../utils/testingMetrics";

const EMPTY = [];

/**
 * Normalized, project-scoped test data plus shared lookups. Everything is
 * memoized on the raw store arrays, so unrelated store updates are free.
 */
export function useTestsData({
  testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId, allTasks, releases,
}) {
  const data = useMemo(() => buildProjectTestingData({
    testSuites: testSuites || EMPTY,
    testCases: testCases || EMPTY,
    testRuns: testRuns || EMPTY,
    testPlans: testPlans || EMPTY,
    testSharedSteps: testSharedSteps || EMPTY,
    currentProjectId,
  }), [testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId]);

  const latestMap = useMemo(() => latestResultsByCase(data.runs), [data.runs]);

  const tasks = useMemo(() => (allTasks || EMPTY).filter((task) => task && task.id !== undefined && task.id !== null), [allTasks]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [String(task.id), task])), [tasks]);

  const projectReleases = useMemo(
    () => (releases || EMPTY).filter((release) => release && (!release.projectId || release.projectId === currentProjectId)),
    [releases, currentProjectId]
  );
  const releaseById = useMemo(() => new Map(projectReleases.map((release) => [release.id, release])), [projectReleases]);

  const rootIdOf = useMemo(() => {
    const cache = new Map();
    return (suiteId) => {
      if (!cache.has(suiteId)) cache.set(suiteId, getRootSuiteId(suiteId, data.suiteById));
      return cache.get(suiteId);
    };
  }, [data.suiteById]);

  const sampleCount = useMemo(
    () => data.suites.filter((suite) => suite.sample).length + data.cases.filter((testCase) => testCase.sample).length + data.runs.filter((run) => run.sample).length,
    [data.suites, data.cases, data.runs]
  );

  return {
    ...data,
    latestMap,
    tasks,
    taskById,
    projectReleases,
    releaseById,
    rootIdOf,
    sampleCount,
  };
}
