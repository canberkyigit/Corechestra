import { useCallback, useMemo, useState } from "react";
import { useApp } from "../../../../shared/context/AppContext";
import {
  buildEntityRegistry,
  findLinkableEntities,
  groupLinkedItemsByRelationship,
} from "../../../../shared/utils/entityRegistry";
import { buildStatusOptions, resolveColumns } from "../../utils/boardColumns";
import { isInProject } from "../../../../shared/utils/helpers";

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function createSubtask(title) {
  return {
    id: Date.now(),
    title: title.trim(),
    done: false,
    priority: "medium",
    storyPoint: "",
    assignedTo: "unassigned",
  };
}

export function buildLink(target, relationship) {
  const targetEntity = typeof target === "object" ? target : { type: "task", id: target };
  return {
    id: Date.now().toString(),
    targetType: targetEntity.type || "task",
    targetId: targetEntity.id,
    relationship,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Reads files as data URLs (≤ 5 MB each) and hands each attachment record to
 * `onAttachment`. Oversized files are reported through `onReject(file)`.
 */
export function readAttachmentFiles(files, { onAttachment, onReject }) {
  Array.from(files || []).forEach((file) => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      onReject?.(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      onAttachment({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: event.target.result,
        addedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

/** Assignee options limited to the task's project members (when configured). */
export function useProjectAssignees(projectIdOverride) {
  const { teamMembers, currentProjectId, projects } = useApp();
  const projectId = projectIdOverride || currentProjectId;
  return useMemo(() => {
    const members = teamMembers || [];
    const project = (projects || []).find((item) => item.id === projectId);
    const memberSet = new Set(project?.memberUsernames || []);
    return memberSet.size > 0
      ? members.filter((member) => member.value === "unassigned" || memberSet.has(member.value))
      : members.filter((member) => member.value !== "");
  }, [projectId, projects, teamMembers]);
}

/** Epics of the task's project (plus the currently linked epic, if foreign). */
export function useProjectEpics(projectIdOverride, selectedEpicId) {
  const { epics, currentProjectId } = useApp();
  const projectId = projectIdOverride || currentProjectId || "";
  return useMemo(() => (epics || []).filter((epic) => (
    isInProject(epic, projectId, currentProjectId) || epic.id === selectedEpicId
  )), [currentProjectId, epics, projectId, selectedEpicId]);
}

/** Status options from the task project's workflow columns (custom included). */
export function useTaskStatusOptions(projectIdOverride, currentStatus) {
  const { projectColumns, columns, currentProjectId } = useApp();
  const projectId = projectIdOverride || currentProjectId;
  return useMemo(() => {
    const projectCols = projectColumns?.[projectId] || (projectId === currentProjectId ? columns : null);
    return buildStatusOptions(resolveColumns(projectCols), currentStatus);
  }, [columns, currentProjectId, currentStatus, projectColumns, projectId]);
}

/** Link search state + entity registry shared by the task modal and panel. */
export function useTaskLinkSearch({ task, allTasks, linkedItems }) {
  const { docPages, spaces, releases, testSuites, testCases, testRuns } = useApp();
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkRelationship, setLinkRelationship] = useState("relates to");

  const entityRegistry = useMemo(() => buildEntityRegistry({
    tasks: allTasks || [],
    docPages,
    spaces,
    releases,
    testSuites,
    testCases,
    testRuns,
  }), [allTasks, docPages, releases, spaces, testCases, testRuns, testSuites]);

  const linkSearchResults = useMemo(() => (
    findLinkableEntities(linkSearch, entityRegistry.entities, {
      sourceRef: task?.id ? { type: "task", id: task.id } : null,
      linkedItems,
    })
  ), [entityRegistry.entities, linkSearch, linkedItems, task?.id]);

  const linkedByRelationship = useMemo(
    () => groupLinkedItemsByRelationship(linkedItems, entityRegistry.entityMap),
    [entityRegistry.entityMap, linkedItems]
  );

  const closeLinkSearch = useCallback(() => {
    setLinkSearchOpen(false);
    setLinkSearch("");
  }, []);

  return {
    linkSearchOpen,
    setLinkSearchOpen,
    linkSearch,
    setLinkSearch,
    linkRelationship,
    setLinkRelationship,
    linkSearchResults,
    linkedByRelationship,
    closeLinkSearch,
  };
}
