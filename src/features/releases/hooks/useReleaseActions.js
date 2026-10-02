import { useCallback, useMemo, useRef } from "react";
import { createDeploymentTimelineEvent } from "../../../shared/utils/releasePlanning";
import { RELEASES_READ_ONLY_MESSAGE, STATUS_META, TIMELINE_TYPE_LABELS } from "../constants/releaseMeta";
import { buildEnvironmentPatch, buildStatusChangePatch, buildTransitionPatch, nextBuildId, TRANSITIONS } from "../utils/releaseLifecycle";
import { nextAvailableVersion } from "../utils/releaseModel";
import { generateNotesFromTasks, releaseNotesFileName, releaseNotesMarkdown } from "../utils/releaseNotes";
import { copyToClipboard, downloadTextFile, releasesToCsv } from "../utils/releaseExport";
import { buildSampleReleases } from "../utils/sampleReleases";

const TRANSITION_TOASTS = {
  start: ["Release moved to In progress", "success"],
  replan: ["Release moved back to Planned", "info"],
  freeze: ["Code freeze started", "success"],
  unfreeze: ["Code freeze lifted", "info"],
  release: ["Release shipped to production", "success"],
  rollback: ["Release rolled back", "warning"],
  cancel: ["Release cancelled", "info"],
};

function withEvent(release, type, text, actor) {
  return [createDeploymentTimelineEvent(type, text, actor || null), ...(release.deploymentTimeline || [])];
}

const ENV_TOASTS = {
  deploy: "Deployment recorded",
  start: "Deployment started",
  fail: "Deployment marked as failed",
  rollback: "Environment rolled back",
};

/**
 * Every release mutation used by the page, guarded by `releases:manage` (UI
 * hides controls too; the guard covers stale modals, keyboard submits and
 * programmatic calls). Handlers receive the *normalized* release and write
 * minimal patches through the facade actions.
 */
export function useReleaseActions({
  canManage,
  addToast,
  currentUser,
  currentProjectId,
  users,
  allTasks,
  projectReleases,
  metricsById,
  facade,
}) {
  // Read latest values inside stable callbacks.
  const ctx = useRef({});
  ctx.current = { canManage, addToast, currentUser, currentProjectId, users, allTasks, projectReleases, metricsById, facade };

  const ensure = useCallback(() => {
    if (ctx.current.canManage) return true;
    ctx.current.addToast(RELEASES_READ_ONLY_MESSAGE, "error");
    return false;
  }, []);

  const patch = useCallback((release, fields) => {
    ctx.current.facade.updateRelease({ id: release.id, ...fields });
  }, []);

  const handlers = useMemo(() => ({
    create(form) {
      if (!ensure()) return null;
      const { facade: f, currentProjectId: pid } = ctx.current;
      const created = f.createRelease({ ...form, projectId: form.projectId || pid || null });
      ctx.current.addToast(`Release ${form.version} created`, "success");
      return created || null;
    },

    saveEdit(release, form) {
      if (!ensure()) return;
      const fields = { ...form };
      const statusChanged = (form.status || "planned") !== (release.status || "planned");
      if (statusChanged) {
        const label = STATUS_META[form.status]?.label || form.status;
        fields.deploymentTimeline = withEvent(release, "status", `Status changed to ${label} from the edit form`, ctx.current.currentUser);
        if (form.status === "released") {
          if (!fields.releaseDate) fields.releaseDate = new Date().toISOString().slice(0, 10);
          if (!release.releasedAt) fields.releasedAt = new Date().toISOString();
        }
      }
      patch(release, fields);
      ctx.current.addToast("Release updated", "success");
    },

    remove(release) {
      if (!ensure()) return;
      ctx.current.facade.deleteRelease(release.id);
      ctx.current.addToast(`Release ${release.version} deleted`, "info");
    },

    transition(release, key) {
      if (!ensure()) return false;
      const fields = buildTransitionPatch(release, key, ctx.current.currentUser);
      if (!fields) return false;
      patch(release, fields);
      const [message, tone] = TRANSITION_TOASTS[key] || [`Release ${TRANSITIONS[key]?.label || key}`, "success"];
      ctx.current.addToast(message, tone);
      return true;
    },

    changeStatus(release, toStatus) {
      if (!ensure()) return false;
      if (release.status === toStatus) return false;
      const fields = buildStatusChangePatch(release, toStatus, ctx.current.currentUser);
      if (!fields) {
        ctx.current.addToast(`Can't move ${release.version} from ${STATUS_META[release.status]?.label} to ${STATUS_META[toStatus]?.label}`, "warning");
        return false;
      }
      patch(release, fields);
      ctx.current.addToast(`${release.version} moved to ${STATUS_META[toStatus]?.label || toStatus}`, "success");
      return true;
    },

    duplicate(release, kind = "patch") {
      if (!ensure()) return null;
      const versions = ctx.current.projectReleases.map((item) => item.version);
      const version = nextAvailableVersion(release.version, kind, versions);
      const created = ctx.current.facade.createRelease({
        version,
        name: release.name ? `${release.name}${kind === "patch" ? " patch" : ""}` : "",
        status: "planned",
        description: release.description || "",
        owner: release.owner || ctx.current.currentUser || null,
        templateId: release.templateId || null,
        projectId: release.projectId || ctx.current.currentProjectId || null,
        checklist: (release.checklist || []).map((item, index) => ({ id: `check-${Date.now()}-${index}`, title: item.title, completed: false })),
        rollbackPlan: release.rollbackPlan || "",
        monitoringChecks: release.monitoringChecks || "",
        taskIds: [],
        changelog: [],
      });
      ctx.current.addToast(`Created ${version} from ${release.version}`, "success");
      return created || null;
    },

    toggleChecklist(release, itemId) {
      if (!ensure()) return;
      patch(release, {
        checklist: (release.checklist || []).map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
      });
    },

    addChecklistItem(release, title) {
      const text = String(title || "").trim();
      if (!text || !ensure()) return false;
      patch(release, { checklist: [...(release.checklist || []), { id: `check-${Date.now()}`, title: text, completed: false }] });
      return true;
    },

    removeChecklistItem(release, itemId) {
      if (!ensure()) return;
      patch(release, { checklist: (release.checklist || []).filter((item) => item.id !== itemId) });
    },

    addRisk(release, { text, severity = "medium" }) {
      const value = String(text || "").trim();
      if (!value || !ensure()) return false;
      patch(release, {
        risks: [...(release.risks || []), { id: `risk-${Date.now()}`, text: value, severity, createdAt: new Date().toISOString(), author: ctx.current.currentUser || null }],
      });
      ctx.current.addToast("Risk added", "success");
      return true;
    },

    removeRisk(release, riskId) {
      if (!ensure()) return;
      patch(release, { risks: (release.risks || []).filter((risk) => risk.id !== riskId) });
    },

    savePlan(release, fields) {
      if (!ensure()) return;
      patch(release, {
        ...(fields.rollbackPlan !== undefined ? { rollbackPlan: fields.rollbackPlan } : {}),
        ...(fields.monitoringChecks !== undefined ? { monitoringChecks: fields.monitoringChecks } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
      });
      ctx.current.addToast("Saved", "success");
    },

    linkTasks(release, taskIds) {
      if (!ensure()) return;
      const existing = new Set((release.taskIds || []).map(String));
      const added = (taskIds || []).filter((id) => !existing.has(String(id)));
      if (added.length === 0) return;
      patch(release, { taskIds: [...(release.taskIds || []), ...added] });
      ctx.current.addToast(added.length === 1 ? "Work item linked" : `${added.length} work items linked`, "success");
    },

    unlinkTask(release, taskId) {
      if (!ensure()) return;
      patch(release, { taskIds: (release.taskIds || []).filter((id) => String(id) !== String(taskId)) });
      ctx.current.addToast("Work item unlinked", "info");
    },

    moveTasks(release, targetId, taskIds) {
      if (!ensure() || !targetId || !(taskIds || []).length) return;
      const target = ctx.current.projectReleases.find((item) => item.id === targetId);
      ctx.current.facade.moveReleaseTasks(release.id, targetId, taskIds);
      ctx.current.addToast(`Moved ${taskIds.length} item${taskIds.length !== 1 ? "s" : ""} to ${target?.version || "release"}`, "success");
    },

    addNote(release, entry) {
      if (!ensure() || !String(entry?.text || "").trim()) return false;
      ctx.current.facade.addChangelogEntry(release.id, { ...entry, text: entry.text.trim() });
      ctx.current.addToast("Release note added", "success");
      return true;
    },

    updateNote(release, entryId, fields) {
      if (!ensure()) return;
      ctx.current.facade.updateChangelogEntry(release.id, entryId, fields);
      ctx.current.addToast("Release note updated", "success");
    },

    deleteNote(release, entryId) {
      if (!ensure()) return;
      ctx.current.facade.deleteChangelogEntry(release.id, entryId);
      ctx.current.addToast("Release note removed", "info");
    },

    generateNotes(release, linkedTasks) {
      if (!ensure()) return 0;
      const generated = generateNotesFromTasks(linkedTasks, release.changelog, { author: ctx.current.currentUser });
      if (generated.length === 0) {
        ctx.current.addToast("No new completed work to add", "info");
        return 0;
      }
      const stamp = Date.now();
      patch(release, {
        changelog: [...(release.changelog || []), ...generated.map((entry, index) => ({ ...entry, id: `cl-${stamp}-${index}` }))],
        deploymentTimeline: withEvent(release, "changelog", `Generated ${generated.length} release note${generated.length !== 1 ? "s" : ""} from completed work`, ctx.current.currentUser),
      });
      ctx.current.addToast(`Added ${generated.length} note${generated.length !== 1 ? "s" : ""} from completed work`, "success");
      return generated.length;
    },

    envAction(release, envKey, action) {
      if (!ensure()) return;
      const fields = buildEnvironmentPatch(release, envKey, action, {
        actor: ctx.current.currentUser,
        build: action === "deploy" || action === "start" ? nextBuildId(release) : "",
      });
      if (!fields) return;
      patch(release, fields);
      ctx.current.addToast(ENV_TOASTS[action] || "Environment updated", action === "fail" || action === "rollback" ? "warning" : "success");
    },

    addTimelineEvent(release, { type, text }) {
      const value = String(text || "").trim();
      if (!value || !ensure()) return false;
      patch(release, { deploymentTimeline: withEvent(release, type || "note", value, ctx.current.currentUser) });
      ctx.current.addToast(`${TIMELINE_TYPE_LABELS[type] || "Event"} added`, "success");
      return true;
    },

    loadSamples({ auto = false } = {}) {
      if (!ensure()) return 0;
      const { facade: f, currentProjectId: pid, allTasks: tasks, users: people, currentUser: me } = ctx.current;
      const samples = buildSampleReleases({ projectId: pid, tasks, users: people, currentUser: me, now: new Date() });
      f.importReleases(samples);
      ctx.current.addToast(auto ? `Added ${samples.length} sample releases to get you started` : `Loaded ${samples.length} sample releases`, "success");
      return samples.length;
    },

    removeSamples() {
      if (!ensure()) return;
      const count = ctx.current.projectReleases.filter((release) => release.sample).length;
      ctx.current.facade.removeSampleReleases(ctx.current.currentProjectId || null);
      ctx.current.addToast(count ? `Removed ${count} sample release${count !== 1 ? "s" : ""}` : "No sample releases to remove", "info");
    },

    async copyNotes(release) {
      const ok = await copyToClipboard(releaseNotesMarkdown(release));
      ctx.current.addToast(ok ? "Release notes copied as Markdown" : "Couldn't copy to clipboard", ok ? "success" : "error");
    },

    downloadNotes(release) {
      downloadTextFile(releaseNotesFileName(release), releaseNotesMarkdown(release), "text/markdown");
    },

    exportCsv(list) {
      const csv = releasesToCsv(list, ctx.current.metricsById, ctx.current.users);
      const ok = downloadTextFile(`releases-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
      ctx.current.addToast(ok ? `Exported ${list.length} release${list.length !== 1 ? "s" : ""}` : "Export failed", ok ? "success" : "error");
    },
  }), [ensure, patch]);

  return handlers;
}
