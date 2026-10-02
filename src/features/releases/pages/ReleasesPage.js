import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { ReleasesSkeleton } from "../../../shared/components/Skeleton";
import ReleasesHeader from "../components/ReleasesHeader";
import ReleasesToolbar from "../components/ReleasesToolbar";
import ReleaseKpiStrip from "../components/ReleaseKpiStrip";
import ReleasesEmptyState from "../components/ReleasesEmptyState";
import ReleaseFormModal from "../components/ReleaseFormModal";
import ReleaseListView from "../components/views/ReleaseListView";
import ReleaseTimelineView from "../components/views/ReleaseTimelineView";
import ReleaseBoardView from "../components/views/ReleaseBoardView";
import ReleaseDetailDrawer from "../components/detail/ReleaseDetailDrawer";
import { useReleaseViewPrefs } from "../hooks/useReleaseViewPrefs";
import { useReleaseData } from "../hooks/useReleaseData";
import { useReleaseActions } from "../hooks/useReleaseActions";
import { useReleaseSampleSeed } from "../hooks/useReleaseSampleSeed";
import { countByStatusFilter, matchesReleaseQuery, matchesStatusFilter, sortReleases } from "../utils/releaseMetrics";
import { compareVersions, nextAvailableVersion } from "../utils/releaseModel";
import { userDisplayName } from "../utils/releaseUtils";

// Public helpers kept on the page module for existing importers/tests.
export { RELEASES_READ_ONLY_MESSAGE } from "../constants/releaseMeta";
export { isReleaseVisibleInProject, matchesTaskQuery } from "../utils/releaseUtils";

function initialReleaseFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("release");
  } catch {
    return null;
  }
}

export default function ReleasesPage() {
  const {
    releases, createRelease, updateRelease, deleteRelease,
    addChangelogEntry, deleteChangelogEntry, updateChangelogEntry,
    importReleases, removeSampleReleases, moveReleaseTasks,
    allTasks, testRuns, testPlans, testCases, templateRegistry,
    currentUser, users, projects, dbReady, currentProjectId,
  } = useApp();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const canManage = canPerform("releases:manage");

  const [now] = useState(() => new Date());
  const prefs = useReleaseViewPrefs();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sort, setSort] = useState("date");
  const [selectedId, setSelectedId] = useState(initialReleaseFromUrl);
  const [detailTab, setDetailTab] = useState("overview");
  const [formState, setFormState] = useState(null); // { mode: "create" } | { mode: "edit", id }

  const safeUsers = useMemo(() => users || [], [users]);
  const safeTasks = useMemo(() => allTasks || [], [allTasks]);
  const { projectReleases, metricsById, kpis } = useReleaseData({
    releases, currentProjectId, allTasks: safeTasks, testRuns, testPlans, now,
  });

  const facade = {
    createRelease, updateRelease, deleteRelease, addChangelogEntry, deleteChangelogEntry,
    updateChangelogEntry, importReleases, removeSampleReleases, moveReleaseTasks,
  };
  const actions = useReleaseActions({
    canManage, addToast, currentUser, currentProjectId, users: safeUsers, allTasks: safeTasks,
    projectReleases, metricsById, facade,
  });

  useReleaseSampleSeed({
    enabled: Boolean(dbReady && canManage),
    projectId: currentProjectId,
    releaseCount: projectReleases.length,
    onSeed: actions.loadSamples,
  });

  // Close editing surfaces if releases:manage is revoked mid-session.
  useEffect(() => {
    if (!canManage) setFormState(null);
  }, [canManage]);

  const visibleReleases = useMemo(() => sortReleases(
    projectReleases.filter((release) => (
      matchesStatusFilter(release, statusFilter)
      && matchesReleaseQuery(release, query)
      && (!ownerFilter || release.owner === ownerFilter)
    )),
    sort,
    metricsById
  ), [projectReleases, statusFilter, query, ownerFilter, sort, metricsById]);

  const statusCounts = useMemo(() => countByStatusFilter(projectReleases), [projectReleases]);
  const ownerOptions = useMemo(() => [...new Set(projectReleases.map((release) => release.owner).filter(Boolean))]
    .map((owner) => ({ value: owner, label: userDisplayName(safeUsers, owner) }))
    .sort((a, b) => a.label.localeCompare(b.label)), [projectReleases, safeUsers]);
  const sampleCount = useMemo(() => projectReleases.filter((release) => release.sample).length, [projectReleases]);
  const existingVersions = useMemo(() => projectReleases.map((release) => release.version), [projectReleases]);
  const suggestedVersion = useMemo(() => {
    const latest = existingVersions.slice().sort(compareVersions).pop();
    return latest ? nextAvailableVersion(latest, "minor", existingVersions) : "v1.0.0";
  }, [existingVersions]);

  const selected = selectedId ? projectReleases.find((release) => release.id === selectedId) || null : null;
  const editing = formState?.mode === "edit" ? projectReleases.find((release) => release.id === formState.id) || null : null;
  const otherReleases = useMemo(() => projectReleases.filter((release) => release.id !== selectedId), [projectReleases, selectedId]);
  const releaseTemplates = useMemo(() => templateRegistry?.release || [], [templateRegistry]);

  const openRelease = useCallback((id) => setSelectedId(id), []);
  const closeRelease = useCallback(() => setSelectedId(null), []);
  const openCreate = useCallback(() => setFormState({ mode: "create" }), []);
  const clearFilters = useCallback(() => {
    setQuery("");
    setStatusFilter("all");
    setOwnerFilter("");
  }, []);
  const handleChangeStatus = useCallback((release, status) => actions.changeStatus(release, status), [actions]);

  const handleSaveForm = (form) => {
    if (formState?.mode === "edit" && editing) {
      actions.saveEdit(editing, form);
    } else {
      const created = actions.create(form);
      if (created?.id) setSelectedId(created.id);
    }
    setFormState(null);
  };

  if (!dbReady) return <ReleasesSkeleton />;

  const projectName = (projects || []).find((project) => project.id === currentProjectId)?.name || "";
  const viewProps = { releases: visibleReleases, metricsById, users: safeUsers, now, onOpen: openRelease };

  return (
    <div className="relative h-full overflow-hidden bg-slate-50 dark:bg-[#141720]">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-5 px-4 py-5 md:px-6 xl:px-8">
          <ReleasesHeader
            projectName={projectName}
            totalCount={projectReleases.length}
            sampleCount={sampleCount}
            canManage={canManage}
            onCreate={openCreate}
            onLoadSamples={() => actions.loadSamples()}
            onRemoveSamples={() => actions.removeSamples()}
            onExportCsv={() => actions.exportCsv(visibleReleases)}
          />

          {projectReleases.length > 0 && (
            <>
              <ReleaseKpiStrip kpis={kpis} onOpenRelease={openRelease} onFilter={setStatusFilter} />
              <ReleasesToolbar
                query={query}
                onQueryChange={setQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusCounts={statusCounts}
                ownerFilter={ownerFilter}
                onOwnerFilterChange={setOwnerFilter}
                ownerOptions={ownerOptions}
                sort={sort}
                onSortChange={setSort}
                view={prefs.view}
                onViewChange={prefs.setView}
                groupByStatus={prefs.groupByStatus}
                onGroupByStatusChange={prefs.setGroupByStatus}
              />
            </>
          )}

          {projectReleases.length === 0 || visibleReleases.length === 0 ? (
            <ReleasesEmptyState
              canManage={canManage}
              filtered={projectReleases.length > 0}
              onCreate={openCreate}
              onLoadSamples={() => actions.loadSamples()}
              onClearFilters={clearFilters}
            />
          ) : (
            <>
              {prefs.view === "list" && (
                <ReleaseListView {...viewProps} selectedId={selectedId} groupByStatus={prefs.groupByStatus} />
              )}
              {prefs.view === "timeline" && (
                <ReleaseTimelineView {...viewProps} zoom={prefs.timelineZoom} onZoomChange={prefs.setTimelineZoom} />
              )}
              {prefs.view === "board" && (
                <ReleaseBoardView {...viewProps} canManage={canManage} onChangeStatus={handleChangeStatus} />
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <ReleaseDetailDrawer
          release={selected}
          metrics={metricsById.get(selected.id)}
          users={safeUsers}
          now={now}
          canManage={canManage}
          actions={actions}
          allTasks={safeTasks}
          testCases={testCases}
          otherReleases={otherReleases}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={closeRelease}
          onEdit={() => setFormState({ mode: "edit", id: selected.id })}
          onOpenRelease={openRelease}
        />
      )}

      {formState && canManage && (formState.mode === "create" || editing) && (
        <ReleaseFormModal
          key={formState.mode === "edit" ? formState.id : "create"}
          initial={editing}
          onSave={handleSaveForm}
          onClose={() => setFormState(null)}
          allTasks={safeTasks}
          users={safeUsers}
          releaseTemplates={releaseTemplates}
          existingVersions={existingVersions}
          suggestedVersion={suggestedVersion}
        />
      )}
    </div>
  );
}
