import React, { useCallback, useMemo, useState } from "react";
import { FaLayerGroup, FaTable, FaThLarge } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { useToast } from "../../../shared/context/ToastContext";
import { requestNavigate } from "../../../shared/components/appNavigation";
import { HEALTH_META } from "../utils/healthMeta";
import { FIELD_CLS, ScoreRing, Segmented, StatTile } from "./PortfolioPrimitives";
import { HealthDistribution, PortfolioCard, PortfolioTable } from "./PortfolioViews";
import ProjectHealthDrawer from "./ProjectHealthDrawer";
import { usePortfolioData } from "../hooks/usePortfolioData";
import { sortPortfolio } from "../utils/portfolioMetrics";

const SORT_OPTIONS = [
  { id: "health", label: "Needs attention first" },
  { id: "name", label: "Name" },
  { id: "progress", label: "Sprint progress" },
  { id: "overdue", label: "Most overdue" },
  { id: "release", label: "Next release" },
];

/** Dashboard tab: health of every project in the workspace. */
export default function PortfolioTab({ actions }) {
  const app = useApp();
  const {
    users, projectStatusUpdates, setCurrentProjectId, postProjectStatusUpdate, deleteProjectStatusUpdate,
  } = app;
  const { canPerform } = usePermissions();
  const { addToast } = useToast();
  const [now] = useState(() => new Date());
  const [view, setView] = useState("cards");
  const [sortKey, setSortKey] = useState("health");
  const [healthFilter, setHealthFilter] = useState(null);
  const [openProjectId, setOpenProjectId] = useState(null);

  const { rows, summary } = usePortfolioData(app, now);
  const sorted = useMemo(() => sortPortfolio(rows, sortKey), [rows, sortKey]);
  const visible = useMemo(() => (healthFilter ? sorted.filter((row) => row.health === healthFilter) : sorted), [sorted, healthFilter]);
  const openRow = openProjectId ? rows.find((row) => row.project.id === openProjectId) : null;
  const openUpdates = useMemo(
    () => (projectStatusUpdates || []).filter((update) => update.projectId === openProjectId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [projectStatusUpdates, openProjectId]
  );

  const ownerName = useCallback((username) => {
    if (!username) return "";
    const user = (users || []).find((item) => item.username === username || item.id === username);
    return user?.name || username;
  }, [users]);

  const goToProject = (projectId, page) => {
    setCurrentProjectId(projectId);
    setOpenProjectId(null);
    if (page === "dashboard" && actions?.setTab) actions.setTab("overview");
    else requestNavigate(page);
  };

  const toggleHealth = (key) => setHealthFilter((current) => (current === key ? null : key));
  const avgHex = summary.avgScore === null ? "#94a3b8" : HEALTH_META[summary.avgScore >= 75 ? "on-track" : summary.avgScore >= 50 ? "at-risk" : "off-track"].hex;

  return (
    <div className="space-y-4" data-testid="portfolio-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Health across {summary.total === 1 ? "1 project" : `all ${summary.total} projects`} · calculated live from boards, releases and tests
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Sort projects" className={`${FIELD_CLS} py-1.5 pr-8`} value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <Segmented
            ariaLabel="Portfolio view"
            value={view}
            onChange={setView}
            options={[{ id: "cards", label: "Cards", icon: FaThLarge }, { id: "table", label: "Table", icon: FaTable }]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-[#2a3044]">
          <FaLayerGroup className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No projects yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create a project to see its health here.</p>
        </div>
      ) : (
        <>
          <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Portfolio score" value={summary.avgScore ?? "—"} sub={summary.total === 1 ? "Across 1 project" : `Average of ${summary.total} projects`}>
              <span className="absolute right-4 top-4">
                <ScoreRing value={summary.avgScore} size={40} stroke={4} color={avgHex} label="Average health score"><span /></ScoreRing>
              </span>
            </StatTile>
            {["on-track", "at-risk", "off-track"].map((key) => (
              <StatTile
                key={key}
                label={HEALTH_META[key].label}
                value={summary.counts[key] || 0}
                accent={HEALTH_META[key].hex}
                sub={key === "on-track" ? "Healthy delivery" : key === "at-risk" ? "Watch closely" : "Needs intervention"}
                onClick={() => toggleHealth(key)}
                active={healthFilter === key}
              />
            ))}
            <StatTile label="Open work" value={summary.open} sub={summary.overdue ? `${summary.overdue} overdue` : "Nothing overdue"} />
            <StatTile label="Upcoming releases" value={summary.releasesSoon} sub="Due in the next 30 days" />
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e]">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Health distribution</h2>
              {healthFilter && (
                <button type="button" onClick={() => setHealthFilter(null)} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Showing {HEALTH_META[healthFilter].label.toLowerCase()} · clear
                </button>
              )}
            </div>
            <HealthDistribution counts={summary.counts} total={summary.total} />
          </section>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-[#2a3044] dark:text-slate-400">
              No projects are {HEALTH_META[healthFilter]?.label.toLowerCase()} right now.
            </div>
          ) : view === "table" ? (
            <PortfolioTable rows={visible} onOpen={setOpenProjectId} now={now} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((row) => (
                <PortfolioCard key={row.project.id} row={row} ownerName={ownerName} onOpen={setOpenProjectId} now={now} />
              ))}
            </div>
          )}
        </>
      )}

      {openRow && (
        <ProjectHealthDrawer
          row={openRow}
          updates={openUpdates}
          ownerName={ownerName}
          canUpdate={canPerform("portfolio:update")}
          now={now}
          onClose={() => setOpenProjectId(null)}
          onPostUpdate={(data) => { postProjectStatusUpdate(data); addToast("Status update posted", "success"); }}
          onDeleteUpdate={deleteProjectStatusUpdate}
          onOpenDashboard={() => goToProject(openRow.project.id, "dashboard")}
          onOpenBoard={() => goToProject(openRow.project.id, "board")}
        />
      )}
    </div>
  );
}
