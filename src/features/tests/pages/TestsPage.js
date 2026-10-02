import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaDatabase, FaFileImport, FaFlask, FaPlus } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from "../constants/testingConstants";
import TestsSkeleton from "../components/TestsSkeleton";
import TestsHeader from "../components/TestsHeader";
import TestsTabNav from "../components/TestsTabNav";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState } from "../components/ui";
import OverviewTab from "../overview/OverviewTab";
import RepositoryTab from "../repository/RepositoryTab";
import CaseDrawer from "../repository/CaseDrawer";
import CaseFormModal from "../repository/CaseFormModal";
import CsvImportModal from "../repository/CsvImportModal";
import SharedStepsLibrary from "../repository/SharedStepsLibrary";
import PlansTab from "../plans/PlansTab";
import PlanFormModal from "../plans/PlanFormModal";
import CycleWizard from "../plans/CycleWizard";
import CycleDetailDrawer from "../plans/CycleDetailDrawer";
import ExecutionRunner from "../execution/ExecutionRunner";
import MyQueueTab from "../execution/MyQueueTab";
import TraceabilityTab from "../traceability/TraceabilityTab";
import DefectsTab from "../defects/DefectsTab";
import ReportsTab from "../reports/ReportsTab";
import { useTestsUrlState } from "../hooks/useTestsUrlState";
import { useTestsData } from "../hooks/useTestsData";
import { useTestsActions } from "../hooks/useTestsActions";
import { useTestingSampleSeed } from "../hooks/useTestingSampleSeed";
import { buildMyQueue, collectDefectLinks } from "../utils/testingMetrics";

const EMPTY = [];

/**
 * Test management module (TestRail / Xray / Zephyr-style): overview,
 * repository, plans & cycles, execution, traceability, defects, reports.
 * Thin shell: data via useTestsData, mutations via useTestsActions (facade),
 * navigation via URL search params (?tab=&case=&run=&cycle=&folder=&report=).
 */
export default function TestsPage() {
  // useApp() is a tracking proxy: destructure everything needed at render.
  const {
    projects = EMPTY, currentProjectId, allTasks = EMPTY, currentUser, users = EMPTY, labels = EMPTY, epics = EMPTY,
    releases = EMPTY, backlogSections = EMPTY, dbReady,
    testPlans = EMPTY, testSuites = EMPTY, testCases = EMPTY, testRuns = EMPTY, testSharedSteps = EMPTY,
    createTask,
    createTestPlan, updateTestPlan, deleteTestPlan,
    createTestSuite, updateTestSuite, moveTestSuite, deleteTestSuite,
    createTestCase, updateTestCase, bulkUpdateTestCases, moveTestCases, cloneTestCases, deleteTestCases,
    addTestCaseComment, deleteTestCaseComment,
    createSharedSteps, updateSharedSteps, deleteSharedSteps,
    createTestRun, updateTestRun, deleteTestRun, updateTestRunScope, recordTestExecution, cloneTestRun,
    linkDefectToExecution, importTestingData, removeSampleTestingData,
  } = useApp();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const canEdit = canPerform("tests:edit");
  const canExecute = canPerform("tests:execute");
  const canCreateDefect = canPerform("task:create");
  const perms = useMemo(() => ({ canEdit, canExecute, canCreateDefect }), [canEdit, canExecute, canCreateDefect]);

  const nav = useTestsUrlState();
  const data = useTestsData({ testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId, allTasks, releases });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const now = useMemo(() => new Date(), [data.runs, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const [confirm, setConfirm] = useState(null);
  const [caseForm, setCaseForm] = useState(null);
  const [wizard, setWizard] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sharedOpen, setSharedOpen] = useState(false);
  const [caseSiblings, setCaseSiblings] = useState(EMPTY);

  const facade = {
    createTask,
    createTestPlan, updateTestPlan, deleteTestPlan,
    createTestSuite, updateTestSuite, moveTestSuite, deleteTestSuite,
    createTestCase, updateTestCase, bulkUpdateTestCases, moveTestCases, cloneTestCases, deleteTestCases,
    addTestCaseComment, deleteTestCaseComment,
    createSharedSteps, updateSharedSteps, deleteSharedSteps,
    createTestRun, updateTestRun, deleteTestRun, updateTestRunScope, recordTestExecution, cloneTestRun,
    linkDefectToExecution, importTestingData, removeSampleTestingData,
  };
  const actions = useTestsActions({
    facade, perms, addToast, requestConfirm: setConfirm, currentUser, currentProjectId, data, users,
    tasks: data.tasks, releases: data.projectReleases, labels, backlogSections, nav, taskById: data.taskById,
  });

  useTestingSampleSeed({
    enabled: Boolean(dbReady && perms.canEdit),
    projectId: currentProjectId,
    suiteCount: data.suites.length,
    onSeed: actions.loadSamples,
  });

  const activeTaskIds = useMemo(() => {
    const backlogIds = new Set();
    (backlogSections || []).forEach((section) => (section.tasks || []).forEach((task) => backlogIds.add(String(task.id))));
    return new Set(data.tasks.map((task) => String(task.id)).filter((id) => !backlogIds.has(id)));
  }, [backlogSections, data.tasks]);

  const reportVisibleCases = useCallback((ids) => setCaseSiblings(ids), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const openCaseForm = useCallback((initial = {}) => setCaseForm({ initial }), []);
  const openWizard = useCallback((initial = {}) => setWizard({ initial }), []);
  const loadSamples = useCallback(() => actions.loadSamples(), [actions]);

  const ws = useMemo(() => ({
    data, users, currentUser, currentProjectId, perms, actions, nav, now, addToast, epics, activeTaskIds, backlogSections,
    requestConfirm: setConfirm, reportVisibleCases,
  }), [data, users, currentUser, currentProjectId, perms, actions, nav, now, addToast, epics, activeTaskIds, backlogSections, reportVisibleCases]);

  const counts = useMemo(() => {
    const queue = buildMyQueue(data.runs, currentUser).reduce((sum, group) => sum + group.open.length, 0);
    let openDefects = 0;
    collectDefectLinks(data.cases, data.runs).forEach((_link, taskId) => {
      const task = data.taskById.get(String(taskId));
      if (task && task.status !== "done") openDefects += 1;
    });
    return {
      repository: data.cases.length,
      plans: data.runs.filter((run) => run.status === "in-progress").length,
      executions: queue,
      defects: openDefects,
    };
  }, [data.runs, data.cases, data.taskById, currentUser]);

  if (!dbReady) return <TestsSkeleton />;

  const projectName = projects.find((project) => project.id === currentProjectId)?.name || "";
  const openCase = nav.caseId ? data.caseById.get(nav.caseId) : null;
  const runnerRun = nav.runId ? data.runById.get(nav.runId) : null;
  const cycleRun = nav.cycleId ? data.runById.get(nav.cycleId) : null;
  const isEmptyWorkspace = data.suites.length === 0 && data.runs.length === 0;
  const scrollTab = (content) => (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6 xl:px-8">{content}</div>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-[#141720]" data-testid="tests-page">
      <div className="mx-auto w-full max-w-[1680px] flex-shrink-0 px-4 pt-5 md:px-6 xl:px-8">
        <TestsHeader
          projectName={projectName}
          caseCount={data.cases.length}
          sampleCount={data.sampleCount}
          canEdit={perms.canEdit}
          canExecute={perms.canExecute}
          onNewCase={() => openCaseForm({ suiteId: nav.folderId || undefined })}
          onNewCycle={() => openWizard({})}
          onLoadSamples={loadSamples}
          onRemoveSamples={actions.removeSamples}
          onImportCsv={() => setImportOpen(true)}
          onExportCsv={() => actions.exportCsv(data.cases)}
          onSharedSteps={() => setSharedOpen(true)}
        />
        <div className="mt-4">
          <TestsTabNav activeTab={nav.tab} counts={counts} onChange={nav.setTab} />
        </div>
      </div>

      <div id="tests-tabpanel" role="tabpanel" aria-labelledby={`tests-tab-${nav.tab}`} className="min-h-0 flex-1">
        {isEmptyWorkspace && nav.tab === "overview" ? scrollTab(
          <div className={`${CARD} border-dashed`} data-testid="tests-empty">
            <EmptyState icon={FaFlask} title="Set up test management" description="Write test cases in a structured repository, group them into plans and cycles, execute step by step, trace coverage to requirements and report quality per release.">
              {perms.canEdit ? (
                <>
                  <button type="button" onClick={loadSamples} className={BTN_PRIMARY} data-testid="tests-empty-load-samples"><FaDatabase className="h-3 w-3" /> Load sample data</button>
                  <button type="button" onClick={() => nav.setTab("repository")} className={BTN_SECONDARY}><FaPlus className="h-3 w-3" /> Create a suite</button>
                  <button type="button" onClick={() => setImportOpen(true)} className={BTN_SECONDARY}><FaFileImport className="h-3 w-3" /> Import CSV</button>
                </>
              ) : <p className="text-sm text-slate-500">Your role can view tests but not create them.</p>}
            </EmptyState>
          </div>
        ) : null}
        {!(isEmptyWorkspace && nav.tab === "overview") && nav.tab === "overview" && scrollTab(<OverviewTab ws={ws} />)}
        {nav.tab === "repository" && (
          <RepositoryTab ws={ws} onNewCase={openCaseForm} onNewCycle={openWizard} onLoadSamples={loadSamples} />
        )}
        {nav.tab === "plans" && scrollTab(
          <PlansTab ws={ws} onNewPlan={() => setPlanForm({ plan: null })} onEditPlan={(plan) => setPlanForm({ plan })} onNewCycle={openWizard} onLoadSamples={loadSamples} />
        )}
        {nav.tab === "executions" && scrollTab(<MyQueueTab ws={ws} />)}
        {nav.tab === "traceability" && scrollTab(<TraceabilityTab ws={ws} onCreateCase={openCaseForm} />)}
        {nav.tab === "defects" && scrollTab(<DefectsTab ws={ws} />)}
        {nav.tab === "reports" && scrollTab(<ReportsTab ws={ws} />)}
      </div>

      {cycleRun && <CycleDetailDrawer key={`cycle-${cycleRun.id}`} run={cycleRun} ws={ws} onClose={nav.closeCycle} />}
      {openCase && (
        <CaseDrawer
          key={`case-${openCase.id}`}
          testCase={openCase}
          ws={ws}
          siblings={nav.tab === "repository" ? caseSiblings : EMPTY}
          onNavigate={(id) => id && nav.openCase(id)}
          onClose={nav.closeCase}
        />
      )}
      {runnerRun && <ExecutionRunner key={`runner-${runnerRun.id}`} run={runnerRun} ws={ws} initialCaseId={nav.focusCaseId} onClose={nav.closeRunner} />}

      {caseForm && perms.canEdit && (
        <CaseFormModal ws={ws} initial={caseForm.initial} onClose={() => setCaseForm(null)} onCreated={(record, another) => { if (!another && record?.id) nav.openCase(record.id); }} />
      )}
      {wizard && perms.canEdit && (
        <CycleWizard ws={ws} initial={wizard.initial} onClose={() => setWizard(null)} onCreated={(record) => nav.update({ tab: "plans", cycle: record.id }, { replace: false })} />
      )}
      {planForm && perms.canEdit && <PlanFormModal ws={ws} plan={planForm.plan} onClose={() => setPlanForm(null)} onSaved={() => nav.tab !== "plans" && nav.setTab("plans")} />}
      {importOpen && perms.canEdit && <CsvImportModal ws={ws} defaultSuiteId={nav.folderId} onClose={() => setImportOpen(false)} />}
      {sharedOpen && <SharedStepsLibrary ws={ws} onClose={() => setSharedOpen(false)} />}
      <ConfirmDialog request={confirm} onClose={closeConfirm} />
    </div>
  );
}
