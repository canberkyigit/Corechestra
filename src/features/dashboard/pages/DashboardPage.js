import React, { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../../../shared/context/AppContext";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import { requestNavigate, requestOpenTask } from "../../../shared/components/appNavigation";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { WorkspaceSetupChecklist } from "../../../shared/components/WorkspaceSetupChecklist";
import { buildWorkspaceSetupState } from "../../../shared/utils/workspaceSetup";
import DashboardHeader, { DASHBOARD_TABS } from "../components/DashboardHeader";
import TaskListModal from "../components/TaskListModal";
import OverviewTab from "../tabs/OverviewTab";
import SprintTab from "../tabs/SprintTab";
import TeamTab from "../tabs/TeamTab";
import EpicsTab from "../tabs/EpicsTab";
import HistoryTab from "../tabs/HistoryTab";
import { resolveDrill, useDashboardData } from "../hooks/useDashboardData";
import { buildDashboardCsv } from "../utils/dashboardMetrics";

export { computeDashboardStats } from "../utils/dashboardMetrics";

const TAB_IDS = new Set(DASHBOARD_TABS.map((tab) => tab.id));
const TAB_COMPONENTS = { overview: OverviewTab, sprint: SprintTab, team: TeamTab, epics: EpicsTab, history: HistoryTab };

const PRINT_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    #dashboard-print-area, #dashboard-print-area * { visibility: visible !important; }
    #dashboard-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: 100% !important; padding: 16px !important; margin: 0 !important; }
    #dashboard-print-area .no-print { display: none !important; }
    #dashboard-print-area section { break-inside: avoid; box-shadow: none !important; }
  }
`;

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const app = useApp();
  const {
    currentProjectId, dbReady, projects, users, teams, spaces, templateRegistry, permissionMatrix, workspaceSettings,
  } = app;
  const { canPerform, canAccessModule } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drillKey, setDrillKey] = useState(null);
  const [now] = useState(() => new Date());

  const rawTab = searchParams.get("tab");
  const activeTab = TAB_IDS.has(rawTab) ? rawTab : "overview";
  const setTab = useCallback((tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const access = useMemo(() => ({
    releases: canAccessModule ? canAccessModule("releases") : true,
    tests: canAccessModule ? canAccessModule("tests") : true,
    activity: canAccessModule ? canAccessModule("activity") : true,
  }), [canAccessModule]);

  const data = useDashboardData(app, { now, access });
  const project = (projects || []).find((p) => p.id === currentProjectId);

  const workspaceSetup = useMemo(() => buildWorkspaceSetupState({
    projects, users, teams, spaces, templateRegistry, permissionMatrix, workspaceSettings,
  }), [projects, users, teams, spaces, templateRegistry, permissionMatrix, workspaceSettings]);

  const openTask = useCallback((task) => {
    setDrillKey(null);
    requestOpenTask(task);
  }, []);

  const actions = useMemo(() => ({
    drill: setDrillKey,
    setTab,
    openTask,
    openBoard: () => requestNavigate("board"),
    openReleases: () => requestNavigate("releases"),
    openTests: () => requestNavigate("tests"),
    openActivity: () => requestNavigate("activity"),
  }), [setTab, openTask]);

  const exportCsv = useCallback(() => {
    const csv = buildDashboardCsv({ tasks: data.stats.projectTasks, epics: data.stats.projectEpics });
    const slug = String(project?.key || project?.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(csv, `corechestra-${slug}-${now.toISOString().slice(0, 10)}.csv`);
  }, [data.stats, project, now]);

  const drill = drillKey ? resolveDrill(drillKey, data) : null;

  if (!dbReady) return <DashboardSkeleton />;

  const ActiveTab = TAB_COMPONENTS[activeTab];
  return (
    <div id="dashboard-print-area" className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
      <style>{PRINT_CSS}</style>

      <DashboardHeader
        projectName={project?.name}
        sprintName={data.sprint?.name}
        activeTab={activeTab}
        onTabChange={setTab}
        onExport={exportCsv}
        onPrint={() => window.print()}
        exportDisabled={data.stats.total === 0}
        now={now}
      />

      {!workspaceSetup.isComplete && workspaceSettings?.emptyStateHints !== false && activeTab === "overview" && (
        <div className="no-print">
          <WorkspaceSetupChecklist
            setup={workspaceSetup}
            compact
            onOpenWorkspace={canPerform("workspace:manage") ? () => requestNavigate("admin") : undefined}
          />
        </div>
      )}

      <div role="tabpanel" aria-label={DASHBOARD_TABS.find((tab) => tab.id === activeTab)?.label}>
        <ActiveTab data={data} actions={actions} />
      </div>

      {drill && (
        <TaskListModal title={drill.title} tasks={drill.tasks} onClose={() => setDrillKey(null)} onOpenTask={openTask} />
      )}
    </div>
  );
}
