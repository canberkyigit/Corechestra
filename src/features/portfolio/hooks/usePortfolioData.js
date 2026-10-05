import { useMemo } from "react";
import { useAppStore } from "../../../shared/store/useAppStore";
import { buildPortfolio, summarizePortfolio } from "../utils/portfolioMetrics";

/**
 * Health rows for every project. Cross-project maps (sprints, backlogs) are
 * read straight from the store because the facade only exposes the current
 * project's slice of them.
 */
export function usePortfolioData(app, now) {
  const perProjectBacklog = useAppStore((state) => state.perProjectBacklog);
  const perProjectSprint = useAppStore((state) => state.perProjectSprint);
  const {
    projects, currentProjectId, activeTasks, releases, testSuites, testCases, testRuns, testPlans, testSharedSteps,
    goals, projectStatusUpdates,
  } = app;

  const rows = useMemo(() => buildPortfolio({
    projects,
    currentProjectId,
    activeTasks,
    perProjectBacklog,
    perProjectSprint,
    releases,
    testSuites,
    testCases,
    testRuns,
    testPlans,
    testSharedSteps,
    goals,
    projectStatusUpdates,
    now,
  }), [projects, currentProjectId, activeTasks, perProjectBacklog, perProjectSprint, releases, testSuites, testCases, testRuns, testPlans, testSharedSteps, goals, projectStatusUpdates, now]);

  const summary = useMemo(() => summarizePortfolio(rows, now), [rows, now]);
  return { rows, summary };
}
