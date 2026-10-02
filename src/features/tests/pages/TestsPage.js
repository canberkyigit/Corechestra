import React, { useCallback, useEffect, useState } from "react";
import { FaChevronDown, FaFlask, FaPlus } from "react-icons/fa";
import { AppButton } from "../../../shared/components/AppPrimitives";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { TestsSkeleton } from "../../../shared/components/Skeleton";
import { ConfirmDialog } from "../components/TestingPrimitives";
import TestsSidebar from "../components/TestsSidebar";
import TestsTabBar, { SUITE_SCOPED_TABS } from "../components/TestsTabBar";
import NewSuiteModal from "../modals/NewSuiteModal";
import QueueTab from "../tabs/QueueTab";
import PlansTab from "../tabs/PlansTab";
import TestCasesTab from "../tabs/TestCasesTab";
import TestRunsTab from "../tabs/TestRunsTab";
import CoverageTab from "../tabs/CoverageTab";
import AnalyticsTab from "../tabs/AnalyticsTab";
import { useTestsWorkspace } from "../hooks/useTestsWorkspace";
import { useTestingWorkflows } from "../hooks/useTestingWorkflows";

const EMPTY = [];

export default function TestsPage() {
  // useApp may be a tracking proxy: destructure everything needed at render.
  const {
    projects = EMPTY, currentProjectId, allTasks = EMPTY, currentUser, users = EMPTY, labels = EMPTY,
    releases = EMPTY, testPlans = EMPTY, testSuites = EMPTY, testCases = EMPTY, testRuns = EMPTY, dbReady,
    createTask,
    createTestPlan, updateTestPlan, deleteTestPlan,
    createTestSuite, updateTestSuite, deleteTestSuite,
    createTestCase, updateTestCase, deleteTestCase,
    createTestRun, createTestRuns, updateTestRun, deleteTestRun, updateTestRunResult,
  } = useApp();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const readOnly = !canPerform("tests:edit");
  const executeReadOnly = !canPerform("tests:execute");
  const canCreateBug = canPerform("task:create");

  const [selectedSuiteId, setSelectedSuiteId] = useState(null);
  const [activeTab, setActiveTab] = useState("queue");
  const [newSuiteModal, setNewSuiteModal] = useState(false);
  const [suitesOpenMobile, setSuitesOpenMobile] = useState(false);
  const [focusedRunId, setFocusedRunId] = useState(null);
  const [confirmRequest, setConfirmRequest] = useState(null);

  const workspace = useTestsWorkspace({ testSuites, testCases, testRuns, testPlans, currentProjectId, selectedSuiteId, allTasks });
  const { suites, cases, runs, plans, planStatusById, selectedSuite, suiteCases, suiteRuns, coverageRows } = workspace;

  // Keep a valid suite selected when the project or suite list changes.
  useEffect(() => {
    setSelectedSuiteId((prev) => (suites.some((suite) => suite.id === prev) ? prev : suites[0]?.id || null));
  }, [currentProjectId, suites]);

  const workflows = useTestingWorkflows({
    actions: {
      createTask,
      createTestPlan, updateTestPlan, deleteTestPlan,
      createTestSuite, updateTestSuite, deleteTestSuite,
      createTestCase, updateTestCase, deleteTestCase,
      createTestRun, createTestRuns, updateTestRun, deleteTestRun, updateTestRunResult,
    },
    workspace,
    currentProjectId,
    currentUser,
    labels,
    selectedSuiteId,
    addToast,
    requestConfirm: setConfirmRequest,
    setSelectedSuiteId,
    setActiveTab,
  });

  const selectSuite = useCallback((suiteId) => {
    setSelectedSuiteId(suiteId);
    setActiveTab("cases");
  }, []);
  const openRun = useCallback((runId) => {
    const run = runs.find((item) => item.id === runId);
    if (!run) return;
    setSelectedSuiteId(run.suiteId);
    setFocusedRunId(run.id);
    setActiveTab("runs");
  }, [runs]);
  const consumeOpenRun = useCallback(() => setFocusedRunId(null), []);
  const closeConfirm = useCallback(() => setConfirmRequest(null), []);

  if (!dbReady) return <TestsSkeleton />;


  const currentProject = projects.find((project) => project.id === currentProjectId);
  const tabCounts = {
    queue: workspace.activeRunCount,
    plans: plans.length,
    cases: selectedSuite ? suiteCases.length : 0,
    runs: selectedSuite ? suiteRuns.length : 0,
    coverage: coverageRows.length,
  };
  const showSuiteEmptyState = !selectedSuite && SUITE_SCOPED_TABS.includes(activeTab);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-100 dark:bg-[#141720] overflow-hidden">
      {/* Mobile: suites collapse into a toggle so the content keeps full width */}
      <button
        type="button"
        onClick={() => setSuitesOpenMobile((value) => !value)}
        aria-expanded={suitesOpenMobile}
        aria-controls="tests-suites-panel"
        className="md:hidden flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3044]"
      >
        <span className="truncate">
          {selectedSuite ? `Suite: ${selectedSuite.name}` : `Test suites (${suites.length})`}
        </span>
        <FaChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${suitesOpenMobile ? "rotate-180" : ""}`} />
      </button>
      <TestsSidebar
        mobileOpen={suitesOpenMobile}
        projectName={currentProject?.name}
        suites={suites}
        selectedSuiteId={selectedSuiteId}
        caseCountBySuite={workspace.caseCountBySuite}
        lastRunStatusBySuite={workspace.lastRunStatusBySuite}
        stats={workspace.stats}
        readOnly={readOnly}
        onSelectSuite={(suiteId) => { selectSuite(suiteId); setSuitesOpenMobile(false); }}
        onNewSuite={() => setNewSuiteModal(true)}
        onDeleteSuite={workflows.deleteSuite}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-[#141720]">
        <TestsTabBar activeTab={activeTab} counts={tabCounts} onChange={setActiveTab} />

        <div className="flex-1 overflow-hidden">
          {showSuiteEmptyState && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <FaFlask className="w-14 h-14 mb-4 opacity-20 dark:opacity-30" />
              <p className="text-lg font-semibold text-slate-500 dark:text-slate-300">No suite selected</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                {suites.length === 0 ? "Create your first test suite to get started." : "Select a suite from the sidebar."}
              </p>
              {suites.length === 0 && !readOnly && (
                <AppButton variant="primary" onClick={() => setNewSuiteModal(true)} className="mt-4">
                  <FaPlus className="w-3.5 h-3.5" /> New Test Suite
                </AppButton>
              )}
            </div>
          )}
          {activeTab === "queue" && (
            <QueueTab
              currentUser={currentUser}
              plans={plans}
              planStatusById={planStatusById}
              runs={runs}
              suites={suites}
              releases={releases}
              readOnly={executeReadOnly}
              onOpenRun={openRun}
              onRerunFailed={workflows.rerunFailed}
              onStartPlan={workflows.startPlan}
              onOpenPlans={() => setActiveTab("plans")}
            />
          )}
          {activeTab === "plans" && (
            <PlansTab
              plans={plans}
              planStatusById={planStatusById}
              projectSuites={suites}
              releases={releases}
              users={users}
              testCases={cases}
              testRuns={runs}
              currentUser={currentUser}
              readOnly={readOnly}
              onCreatePlan={workflows.createPlan}
              onUpdatePlan={workflows.updatePlan}
              onDeletePlan={workflows.deletePlan}
              onStartPlan={workflows.startPlan}
              onMoveToDraft={workflows.moveToDraft}
              onViewRuns={workflows.viewPlanRuns}
            />
          )}
          {activeTab === "cases" && selectedSuite && (
            <TestCasesTab
              suite={selectedSuite}
              cases={suiteCases}
              runs={suiteRuns}
              allTasks={allTasks}
              currentProjectId={currentProjectId}
              readOnly={readOnly}
              onCreateCase={workflows.createCase}
              onUpdateCase={workflows.updateCase}
              onDeleteCase={workflows.deleteCase}
              onUpdateSuite={workflows.updateSuite}
            />
          )}
          {activeTab === "runs" && selectedSuite && (
            <TestRunsTab
              suite={selectedSuite}
              cases={suiteCases}
              runs={suiteRuns}
              releases={releases}
              users={users}
              currentUser={currentUser}
              openRunId={focusedRunId}
              readOnly={executeReadOnly}
              canCreateBug={canCreateBug}
              onConsumeOpenRun={consumeOpenRun}
              onCreateRun={workflows.createRun}
              onCompleteRun={workflows.completeRun}
              onAbortRun={workflows.abortRun}
              onDeleteRun={typeof deleteTestRun === "function" ? workflows.deleteRun : undefined}
              onUpdateResult={workflows.updateResult}
              onCreateBug={workflows.createBug}
              onRerunFailed={workflows.rerunFailed}
            />
          )}
          {activeTab === "coverage" && <CoverageTab rows={coverageRows} allTasks={allTasks} />}
          {activeTab === "analytics" && selectedSuite && (
            <div className="flex-1 overflow-y-auto h-full">
              <AnalyticsTab cases={suiteCases} runs={suiteRuns} />
            </div>
          )}
        </div>
      </main>

      {newSuiteModal && <NewSuiteModal onClose={() => setNewSuiteModal(false)} onCreate={workflows.createSuite} />}
      <ConfirmDialog request={confirmRequest} onClose={closeConfirm} />
    </div>
  );
}
