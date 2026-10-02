import { useMemo } from "react";
import { useReleaseData } from "../../releases/hooks/useReleaseData";
import { buildProjectTestingData } from "../../tests/utils/testingModel";
import {
  computeDashboardStats,
  computeSprintHealth,
  computeTestHealth,
  computeVelocity,
  computeWorkload,
  PRIORITY_KEYS,
  PRIORITY_META,
  STATUS_KEYS,
  STATUS_META,
} from "../utils/dashboardMetrics";
import { buildEpicRows } from "../components/EpicProgressList";

const DEFECT_TYPES = new Set(["bug", "defect"]);
const EMPTY = [];

/** Every derived value the dashboard tabs render, memoized on raw store data. */
export function useDashboardData(app, { now, access }) {
  const {
    activeTasks, allTasks, sprint, epics, globalActivityLog, backlogSections, currentProjectId, currentUser,
    users, burndownSnapshots, completedSprints, releases, testSuites, testCases, testRuns, testPlans, testSharedSteps,
  } = app;

  const stats = useMemo(() => computeDashboardStats({
    activeTasks, epics, backlogSections, globalActivityLog, currentProjectId, currentUser, now,
  }), [activeTasks, epics, backlogSections, globalActivityLog, currentProjectId, currentUser, now]);

  const health = useMemo(() => computeSprintHealth({ sprint, stats, now }), [sprint, stats, now]);

  const statusItems = useMemo(
    () => STATUS_KEYS.map((key) => ({ key, label: STATUS_META[key].label, hex: STATUS_META[key].hex, count: stats.statusCounts[key] })),
    [stats]
  );
  const priorityItems = useMemo(
    () => PRIORITY_KEYS.map((key) => ({ key, label: PRIORITY_META[key].label, hex: PRIORITY_META[key].hex, count: stats.priorityCounts[key] })),
    [stats]
  );

  const workload = useMemo(() => computeWorkload({ tasks: stats.projectTasks, users }), [stats.projectTasks, users]);
  const velocity = useMemo(() => computeVelocity({
    completedSprints: completedSprints || EMPTY,
    currentDonePoints: stats.donePoints,
    currentCommitted: stats.totalPoints,
    sprintName: sprint?.name,
  }), [completedSprints, stats.donePoints, stats.totalPoints, sprint?.name]);
  const epicRows = useMemo(() => buildEpicRows(stats.projectEpics, stats.epicProgress), [stats.projectEpics, stats.epicProgress]);

  const release = useReleaseData({
    releases: access.releases ? releases : EMPTY,
    currentProjectId,
    allTasks: allTasks || activeTasks,
    testRuns,
    testPlans,
    now,
  });

  const testHealth = useMemo(() => {
    if (!access.tests) return null;
    const { runs } = buildProjectTestingData({ testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId });
    return computeTestHealth(runs);
  }, [access.tests, testSuites, testCases, testRuns, testPlans, testSharedSteps, currentProjectId]);

  const openDefects = useMemo(() => {
    const backlogTasks = (backlogSections || []).flatMap((section) => section.tasks || []);
    return [...stats.projectTasks, ...backlogTasks].filter((task) => DEFECT_TYPES.has(task.type) && task.status !== "done").length;
  }, [stats.projectTasks, backlogSections]);

  return {
    stats,
    health,
    sprint,
    burndownSnapshots: burndownSnapshots || EMPTY,
    completedSprints: completedSprints || EMPTY,
    statusItems,
    priorityItems,
    workload,
    velocity,
    epicRows,
    release,
    testHealth,
    openDefects,
    access,
    currentUser,
  };
}

/** Resolves a drill key ("blocked", "status:review", "member:alice", …) to a titled task list. */
export function resolveDrill(key, data) {
  if (!key) return null;
  const { stats, workload, epicRows } = data;
  const [kind, value] = key.split(/:(.*)/s);
  switch (kind) {
    case "open": return { title: "Open work items", tasks: stats.projectTasks.filter((t) => t.status !== "done") };
    case "done": return { title: "Completed work items", tasks: stats.byStatus.done };
    case "active": return { title: "In progress & review", tasks: [...stats.byStatus.inprogress, ...stats.byStatus.review] };
    case "blocked": return { title: "Blocked work items", tasks: stats.byStatus.blocked };
    case "overdue": return { title: "Overdue work items", tasks: stats.overdue };
    case "status": return { title: `${STATUS_META[value]?.label || value} work items`, tasks: stats.byStatus[value] || [] };
    case "priority": return { title: `${PRIORITY_META[value]?.label || value} priority`, tasks: stats.projectTasks.filter((t) => t.priority === value) };
    case "member": {
      const row = workload.find((r) => r.key === value);
      return {
        title: row ? `${row.name}'s sprint work` : "Sprint work",
        tasks: stats.projectTasks.filter((t) => (t.assignedTo ? String(t.assignedTo).toLowerCase() : "__unassigned__") === value),
      };
    }
    case "epic": {
      const epic = epicRows.find((row) => String(row.id) === value);
      return { title: epic ? epic.title : "Epic", tasks: stats.projectTasks.filter((t) => t.epicId != null && String(t.epicId) === value) };
    }
    default: return null;
  }
}
