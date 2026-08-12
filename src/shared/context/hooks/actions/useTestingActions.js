import { useCallback } from "react";
import { createDeploymentTimelineEvent, hydrateReleaseDefaults } from "../../../utils/releasePlanning";

export function useTestingActions({
  currentUser,
  templateRegistry,
  setReleases,
  setTestPlans,
  setTestSuites,
  setTestCases,
  setTestRuns,
}) {
  const createRelease = useCallback((data) => {
    const selectedTemplate = (templateRegistry?.release || []).find((template) => template.id === data.templateId) || null;
    const newRelease = hydrateReleaseDefaults({
      ...data,
      id: `rel-${Date.now()}`,
      taskIds: data.taskIds || [],
      changelog: data.changelog || [],
    }, selectedTemplate, currentUser);
    setReleases((prev) => [...prev, newRelease]);
  }, [currentUser, setReleases, templateRegistry]);

  const updateRelease = useCallback((updated) => {
    setReleases((prev) => prev.map((release) => (
      release.id === updated.id
        ? {
            ...release,
            ...updated,
            checklist: updated.checklist || release.checklist || [],
            deploymentTimeline: updated.deploymentTimeline || release.deploymentTimeline || [],
            updatedAt: new Date().toISOString(),
          }
        : release
    )));
  }, [setReleases]);

  const deleteRelease = useCallback((id) => {
    setReleases((prev) => prev.filter((release) => release.id !== id));
  }, [setReleases]);

  const createTestPlan = useCallback((data) => {
    const now = new Date().toISOString();
    setTestPlans((prev) => [
      ...prev,
      {
        ...data,
        id: `tp-${Date.now()}`,
        status: data.status || "draft",
        owner: data.owner || currentUser || null,
        createdAt: data.createdAt || now,
        updatedAt: now,
      },
    ]);
  }, [currentUser, setTestPlans]);

  const updateTestPlan = useCallback((updated) => {
    setTestPlans((prev) => prev.map((plan) => (
      plan.id === updated.id
        ? { ...plan, ...updated, updatedAt: new Date().toISOString() }
        : plan
    )));
  }, [setTestPlans]);

  const deleteTestPlan = useCallback((id) => {
    setTestPlans((prev) => prev.filter((plan) => plan.id !== id));
  }, [setTestPlans]);

  const addChangelogEntry = useCallback((releaseId, entry) => {
    const newEntry = {
      ...entry,
      id: `cl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: entry.author || currentUser || null,
    };
    setReleases((prev) => prev.map((release) => (
      release.id === releaseId
        ? {
            ...release,
            updatedAt: new Date().toISOString(),
            deploymentTimeline: [
              createDeploymentTimelineEvent("changelog", "Release notes updated", currentUser),
              ...(release.deploymentTimeline || []),
            ],
            changelog: [...(release.changelog || []), newEntry],
          }
        : release
    )));
  }, [currentUser, setReleases]);

  const deleteChangelogEntry = useCallback((releaseId, entryId) => {
    setReleases((prev) => prev.map((release) => (
      release.id === releaseId
        ? {
            ...release,
            updatedAt: new Date().toISOString(),
            changelog: (release.changelog || []).filter((entry) => entry.id !== entryId),
          }
        : release
    )));
  }, [setReleases]);

  const createTestSuite = useCallback((data) => {
    const now = new Date().toISOString();
    setTestSuites((prev) => [...prev, {
      ...data,
      id: `ts-${Date.now()}`,
      owner: data.owner || currentUser || null,
      createdAt: data.createdAt || now,
      updatedAt: now,
    }]);
  }, [currentUser, setTestSuites]);

  const updateTestSuite = useCallback((updated) => {
    setTestSuites((prev) => prev.map((suite) => (
      suite.id === updated.id
        ? { ...suite, ...updated, updatedAt: new Date().toISOString() }
        : suite
    )));
  }, [setTestSuites]);

  const deleteTestSuite = useCallback((id) => {
    setTestSuites((prev) => prev.filter((suite) => suite.id !== id));
    setTestCases((prev) => prev.filter((testCase) => testCase.suiteId !== id));
    setTestRuns((prev) => prev.filter((run) => run.suiteId !== id));
  }, [setTestCases, setTestRuns, setTestSuites]);

  const createTestCase = useCallback((data) => {
    const now = new Date().toISOString();
    setTestCases((prev) => [
      ...prev,
      {
        ...data,
        id: `tc-${Date.now()}`,
        status: data.status || "untested",
        owner: data.owner || currentUser || null,
        createdAt: data.createdAt || now,
        updatedAt: now,
      },
    ]);
  }, [currentUser, setTestCases]);

  const updateTestCase = useCallback((updated) => {
    setTestCases((prev) => prev.map((testCase) => (
      testCase.id === updated.id
        ? { ...testCase, ...updated, updatedAt: new Date().toISOString() }
        : testCase
    )));
  }, [setTestCases]);

  const deleteTestCase = useCallback((id) => {
    setTestCases((prev) => prev.filter((testCase) => testCase.id !== id));
  }, [setTestCases]);

  const createTestRun = useCallback((data) => {
    const now = new Date().toISOString();
    setTestRuns((prev) => [
      ...prev,
      {
        ...data,
        id: `tr-${Date.now()}`,
        owner: data.owner || currentUser || null,
        createdAt: data.createdAt || now,
        updatedAt: now,
        completedAt: null,
        results: data.results || [],
      },
    ]);
  }, [currentUser, setTestRuns]);

  const updateTestRun = useCallback((updated) => {
    setTestRuns((prev) => prev.map((run) => (
      run.id === updated.id
        ? { ...run, ...updated, updatedAt: new Date().toISOString() }
        : run
    )));
  }, [setTestRuns]);

  const updateTestRunResult = useCallback((runId, caseId, result) => {
    setTestRuns((prev) => prev.map((run) => {
      if (run.id !== runId) return run;
      const existing = (run.results || []).find((item) => item.caseId === caseId);
      const results = existing
        ? run.results.map((item) => (
            item.caseId === caseId ? { ...item, ...result } : item
          ))
        : [...(run.results || []), { caseId, ...result }];
      return { ...run, results, updatedAt: new Date().toISOString() };
    }));
  }, [setTestRuns]);

  return {
    createRelease,
    updateRelease,
    deleteRelease,
    addChangelogEntry,
    deleteChangelogEntry,
    createTestPlan,
    updateTestPlan,
    deleteTestPlan,
    createTestSuite,
    updateTestSuite,
    deleteTestSuite,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    createTestRun,
    updateTestRun,
    updateTestRunResult,
  };
}
