import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDeploymentTimelineEvent,
  normalizeDeploymentTimeline,
} from "../../../shared/utils/releasePlanning";
import { FaPlus, FaRocket } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { ReleasesSkeleton } from "../../../shared/components/Skeleton";
import { AppButton, AppEmptyState } from "../../../shared/components/AppPrimitives";
import { RELEASES_READ_ONLY_MESSAGE, STATUS_META } from "../constants/releaseMeta";
import { daysRelative, formatDate, isReleaseVisibleInProject } from "../utils/releaseUtils";
import { ReleaseStatCard } from "../components/ReleaseBadges";
import ReleaseModal from "../components/ReleaseModal";
import ReleaseSidebar from "../components/ReleaseSidebar";
import ReleaseHeader from "../components/ReleaseHeader";
import ReleaseChecklistCard from "../components/ReleaseChecklistCard";
import DeploymentTimelineCard from "../components/DeploymentTimelineCard";
import ReleaseDescriptionCard from "../components/ReleaseDescriptionCard";
import ReleaseChangelogCard from "../components/ReleaseChangelogCard";
import LinkedTasksCard from "../components/LinkedTasksCard";

// Public helpers kept on the page module for existing importers/tests.
export { RELEASES_READ_ONLY_MESSAGE } from "../constants/releaseMeta";
export { isReleaseVisibleInProject, matchesTaskQuery } from "../utils/releaseUtils";

export default function ReleasesPage() {
  const {
    releases, createRelease, updateRelease, deleteRelease,
    addChangelogEntry, deleteChangelogEntry,
    allTasks, templateRegistry, currentUser, users, dbReady, currentProjectId,
  } = useApp();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const canManage = canPerform("releases:manage");
  const readOnly = !canManage;

  // ── Page-level state ──────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null); // release object → edit modal
  const releaseTemplates = useMemo(() => templateRegistry?.release || [], [templateRegistry]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const projectReleases = useMemo(
    () => (releases || []).filter((r) => isReleaseVisibleInProject(r, currentProjectId)),
    [releases, currentProjectId]
  );

  const grouped = useMemo(() => ({
    released:     projectReleases.filter((r) => r.status === "released"),
    "in-progress": projectReleases.filter((r) => r.status === "in-progress"),
    planned:      projectReleases.filter((r) => !r.status || r.status === "planned"),
  }), [projectReleases]);

  const selected = useMemo(() => projectReleases.find((r) => r.id === selectedId) || null, [projectReleases, selectedId]);

  const linkedTasks = useMemo(() => {
    if (!selected) return [];
    return (selected.taskIds || []).map((id) => allTasks.find((t) => String(t.id) === String(id))).filter(Boolean);
  }, [selected, allTasks]);
  const unresolvedTaskCount = selected ? Math.max(0, (selected.taskIds || []).length - linkedTasks.length) : 0;

  const timelineEvents = useMemo(
    () => normalizeDeploymentTimeline(selected?.deploymentTimeline),
    [selected]
  );

  const completedCount = useMemo(() => linkedTasks.filter((t) => t.status === "done").length, [linkedTasks]);
  const changelog = useMemo(() => selected?.changelog || [], [selected]);

  const releaseOwner = useMemo(() => {
    if (!selected?.owner) return null;
    return users.find((user) => user.id === selected.owner || user.username === selected.owner) || null;
  }, [selected, users]);

  const selectedTemplate = useMemo(() => {
    if (!selected?.templateId) return null;
    return releaseTemplates.find((template) => template.id === selected.templateId) || null;
  }, [releaseTemplates, selected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Every mutating handler is guarded so stale modals, keyboard submits or
  // programmatic calls cannot write for roles without releases:manage.
  const ensureCanManage = useCallback(() => {
    if (canManage) return true;
    addToast(RELEASES_READ_ONLY_MESSAGE, "error");
    return false;
  }, [addToast, canManage]);

  function handleCreateRelease(formData) {
    setShowCreateModal(false);
    if (!ensureCanManage()) return;
    createRelease({ ...formData, projectId: formData.projectId || currentProjectId || null });
    addToast(`Release ${formData.version} created`, "success");
  }

  function handleUpdateRelease(formData) {
    if (!ensureCanManage()) {
      setEditingRelease(null);
      return;
    }
    const statusChanged = (formData.status || "planned") !== (editingRelease.status || "planned");
    const next = { ...editingRelease, ...formData };
    if (statusChanged) {
      const label = STATUS_META[formData.status]?.label || formData.status;
      next.deploymentTimeline = [
        createDeploymentTimelineEvent("status", `Status changed to ${label} from the edit form`, currentUser),
        ...(editingRelease.deploymentTimeline || []),
      ];
      if (formData.status === "released" && !next.releaseDate) {
        next.releaseDate = new Date().toISOString().slice(0, 10);
      }
    }
    updateRelease(next);
    setEditingRelease(null);
    addToast("Release updated", "success");
  }

  function handleDeleteRelease(id) {
    if (!ensureCanManage()) return;
    if (selectedId === id) setSelectedId(null);
    deleteRelease(id);
    addToast("Release deleted", "info");
  }

  function handleSaveDesc(description) {
    if (!selected || !ensureCanManage()) return;
    updateRelease({ ...selected, description });
    addToast("Description saved", "success");
  }

  function handleAddEntry(entryDraft) {
    if (!selected || !ensureCanManage()) return false;
    addChangelogEntry(selected.id, entryDraft);
    addToast("Changelog entry added", "success");
    return true;
  }

  const handleDeleteEntry = useCallback((entryId) => {
    if (!selected || !ensureCanManage()) return;
    deleteChangelogEntry(selected.id, entryId);
    addToast("Entry removed", "info");
  }, [addToast, deleteChangelogEntry, ensureCanManage, selected]);

  function handleAddTask(taskId) {
    if (!selected || !ensureCanManage()) return;
    if ((selected.taskIds || []).includes(taskId)) return;
    updateRelease({ ...selected, taskIds: [...(selected.taskIds || []), taskId] });
    addToast("Task linked", "success");
  }

  const handleRemoveTask = useCallback((taskId) => {
    if (!selected || !ensureCanManage()) return;
    updateRelease({ ...selected, taskIds: (selected.taskIds || []).filter((id) => id !== taskId) });
    addToast("Task unlinked", "info");
  }, [addToast, ensureCanManage, selected, updateRelease]);

  function handleToggleChecklist(itemId) {
    if (!selected || !ensureCanManage()) return;
    updateRelease({
      ...selected,
      checklist: (selected.checklist || []).map((item) => (
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )),
    });
  }

  function handleAddTimelineEvent(timelineDraft) {
    if (!selected || !ensureCanManage()) return false;
    updateRelease({
      ...selected,
      deploymentTimeline: [
        createDeploymentTimelineEvent(timelineDraft.eventType, timelineDraft.text.trim(), currentUser),
        ...(selected.deploymentTimeline || []),
      ],
    });
    addToast("Deployment event added", "success");
    return true;
  }

  function handleStartRelease() {
    if (!selected || selected.status !== "planned") return;
    if (!ensureCanManage()) return;
    updateRelease({
      ...selected,
      status: "in-progress",
      deploymentTimeline: [
        createDeploymentTimelineEvent("started", `Release ${selected.version || selected.name || ""} started`, currentUser),
        ...(selected.deploymentTimeline || []),
      ],
    });
    addToast("Release moved to In Progress", "success");
  }

  function handleMoveToPlanned() {
    if (!selected || selected.status === "planned") return;
    if (!ensureCanManage()) return;
    updateRelease({
      ...selected,
      status: "planned",
      deploymentTimeline: [
        createDeploymentTimelineEvent("replanned", `Release ${selected.version || selected.name || ""} moved back to planned`, currentUser),
        ...(selected.deploymentTimeline || []),
      ],
    });
    addToast("Release moved back to Planned", "info");
  }

  function handleMarkReleased() {
    if (!selected || selected.status !== "in-progress") return;
    if (!ensureCanManage()) return;
    const effectiveReleaseDate = selected.releaseDate || new Date().toISOString().slice(0, 10);
    updateRelease({
      ...selected,
      status: "released",
      releaseDate: effectiveReleaseDate,
      deploymentTimeline: [
        createDeploymentTimelineEvent("release", `Release ${selected.version || selected.name || ""} marked as released`, currentUser),
        ...(selected.deploymentTimeline || []),
      ],
    });
    addToast("Release moved to Released", "success");
  }

  // Close editing surfaces if releases:manage is revoked mid-session (the
  // detail cards close their own inline editors). Inline editors reset on
  // selection change because the cards are keyed by release id.
  useEffect(() => {
    if (canManage) return;
    setShowCreateModal(false);
    setEditingRelease(null);
  }, [canManage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!dbReady) return <ReleasesSkeleton />;
  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 dark:bg-[#141720] overflow-hidden">
      <ReleaseSidebar
        grouped={grouped}
        selectedId={selectedId}
        onSelect={setSelectedId}
        readOnly={readOnly}
        canManage={canManage}
        onCreate={() => setShowCreateModal(true)}
      />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {!selected ? (
          /* Empty state */
          <div className="p-6 lg:p-8">
            <AppEmptyState
              icon={<FaRocket className="w-7 h-7" />}
              title="Select a release to view details"
              description={canManage ? "Or create a new release to get started." : "Your role can view releases but not change them."}
              action={canManage ? (
                <AppButton onClick={() => setShowCreateModal(true)}>
                  <FaPlus className="w-3 h-3" />
                  New Release
                </AppButton>
              ) : null}
            />
          </div>
        ) : (
          <div className="px-4 md:px-6 xl:px-8 py-6 flex flex-col gap-6 max-w-6xl">
            <ReleaseHeader
              key={`header-${selected.id}`}
              release={selected}
              template={selectedTemplate}
              owner={releaseOwner}
              canManage={canManage}
              onStart={handleStartRelease}
              onMarkReleased={handleMarkReleased}
              onMoveToPlanned={handleMoveToPlanned}
              onEdit={() => setEditingRelease(selected)}
              onDelete={() => handleDeleteRelease(selected.id)}
            />

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <ReleaseStatCard
                label="Linked Tasks"
                value={linkedTasks.length}
                sub={unresolvedTaskCount > 0 ? `${unresolvedTaskCount} not in this project or deleted` : undefined}
              />
              <ReleaseStatCard
                label="Completed"
                value={completedCount}
                sub={`of ${linkedTasks.length} tasks done`}
              />
              <ReleaseStatCard
                label="Changelog"
                value={changelog.length}
                sub="entries"
              />
              <ReleaseStatCard
                label={selected.status === "released" ? "Released" : "Release Date"}
                value={selected.releaseDate ? daysRelative(selected.releaseDate) : "—"}
                sub={selected.releaseDate ? formatDate(selected.releaseDate) : undefined}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReleaseChecklistCard release={selected} readOnly={readOnly} onToggle={handleToggleChecklist} />
              <DeploymentTimelineCard
                key={`timeline-${selected.id}`}
                timelineEvents={timelineEvents}
                canManage={canManage}
                onAddEvent={handleAddTimelineEvent}
              />
            </div>

            <ReleaseDescriptionCard
              key={`description-${selected.id}`}
              description={selected.description}
              canManage={canManage}
              onSave={handleSaveDesc}
            />

            <ReleaseChangelogCard
              key={`changelog-${selected.id}`}
              changelog={changelog}
              canManage={canManage}
              onAddEntry={handleAddEntry}
              onDeleteEntry={handleDeleteEntry}
            />

            <LinkedTasksCard
              linkedTasks={linkedTasks}
              unresolvedTaskCount={unresolvedTaskCount}
              linkedIds={selected.taskIds || []}
              allTasks={allTasks}
              canManage={canManage}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
            />
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showCreateModal && canManage && (
        <ReleaseModal
          onSave={handleCreateRelease}
          onClose={() => setShowCreateModal(false)}
          allTasks={allTasks}
          releaseTemplates={releaseTemplates}
        />
      )}
      {editingRelease && canManage && (
        <ReleaseModal
          initial={editingRelease}
          onSave={handleUpdateRelease}
          onClose={() => setEditingRelease(null)}
          allTasks={allTasks}
          releaseTemplates={releaseTemplates}
        />
      )}
    </div>
  );
}
