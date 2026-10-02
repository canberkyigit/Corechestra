import { useMemo } from "react";
import { buildProjectTestingData } from "../utils/testingModel";
import { buildCoverageRows, derivePlanStatus, getRunCreatedTime } from "../utils/testingOperations";

/** Project-scoped, normalized test management data plus derived metrics. */
export function useTestsWorkspace({ testSuites, testCases, testRuns, testPlans, currentProjectId, selectedSuiteId, allTasks = [] }) {
  const data = useMemo(
    () => buildProjectTestingData({ testSuites, testCases, testRuns, testPlans, currentProjectId }),
    [currentProjectId, testCases, testPlans, testRuns, testSuites]
  );
  const { suites, cases, runs, plans } = data;

  const runsByPlan = useMemo(() => {
    const map = {};
    runs.forEach((run) => {
      if (!run.planId) return;
      (map[run.planId] = map[run.planId] || []).push(run);
    });
    return map;
  }, [runs]);

  const planStatusById = useMemo(
    () => Object.fromEntries(plans.map((plan) => [plan.id, derivePlanStatus(plan, runsByPlan[plan.id] || [])])),
    [plans, runsByPlan]
  );

  const caseCountBySuite = useMemo(() => {
    const counts = {};
    cases.forEach((testCase) => { counts[testCase.suiteId] = (counts[testCase.suiteId] || 0) + 1; });
    return counts;
  }, [cases]);

  const lastRunStatusBySuite = useMemo(() => {
    const latest = {};
    runs.forEach((run) => {
      const current = latest[run.suiteId];
      if (!current || getRunCreatedTime(run) >= getRunCreatedTime(current)) latest[run.suiteId] = run;
    });
    return Object.fromEntries(Object.entries(latest).map(([suiteId, run]) => [suiteId, run.status]));
  }, [runs]);

  const selectedSuite = useMemo(() => suites.find((suite) => suite.id === selectedSuiteId) || null, [selectedSuiteId, suites]);
  const suiteCases = useMemo(() => cases.filter((testCase) => testCase.suiteId === selectedSuiteId), [cases, selectedSuiteId]);
  const suiteRuns = useMemo(() => runs.filter((run) => run.suiteId === selectedSuiteId), [runs, selectedSuiteId]);
  const coverageRows = useMemo(() => buildCoverageRows(cases, allTasks, runs), [allTasks, cases, runs]);

  const stats = useMemo(() => {
    let passed = 0;
    let attempted = 0;
    runs.forEach((run) => {
      if (run.status !== "completed") return;
      (run.results || []).forEach((result) => {
        if (!result.status || result.status === "untested") return;
        attempted += 1;
        if (result.status === "passed") passed += 1;
      });
    });
    return {
      totalCases: cases.length,
      passRate: attempted > 0 ? Math.round((passed / attempted) * 100) : null,
      activePlans: plans.filter((plan) => planStatusById[plan.id] === "in-progress").length,
    };
  }, [cases.length, planStatusById, plans, runs]);

  const activeRunCount = useMemo(() => runs.filter((run) => run.status === "in-progress").length, [runs]);

  return {
    suites,
    cases,
    runs,
    plans,
    planStatusById,
    caseCountBySuite,
    lastRunStatusBySuite,
    selectedSuite,
    suiteCases,
    suiteRuns,
    coverageRows,
    stats,
    activeRunCount,
  };
}
