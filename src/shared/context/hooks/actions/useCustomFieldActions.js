import { useCallback } from "react";
import { useAppStore } from "../../../store/useAppStore";
import {
  countTasksWithFieldValue,
  createCustomFieldId,
  getNextFieldOrder,
  normalizeCustomFieldDefInput,
  sortCustomFieldDefs,
  stripCustomFieldValues,
} from "../../../utils/customFields";

function collectAllTasks({ activeTasks, perProjectBacklog, archivedTasks }) {
  return [
    ...(activeTasks || []),
    ...Object.values(perProjectBacklog || {}).flatMap((sections) => (sections || []).flatMap((section) => section.tasks || [])),
    ...(archivedTasks || []),
  ];
}

/**
 * CRUD for per-project custom field definitions (`customFieldDefs`).
 * Values are edited through `updateTask` (`task.customFields`), so the
 * activity log / notifications / workflow rules keep applying.
 */
export function useCustomFieldActions({
  currentUser,
  currentProjectId,
  setCustomFieldDefs,
  setActiveTasks,
  setPerProjectBacklog,
  setArchivedTasks,
  logAuditEvent,
}) {
  const createCustomFieldDef = useCallback((data = {}) => {
    const projectId = data.projectId || currentProjectId || "";
    const defs = useAppStore.getState().customFieldDefs || [];
    const now = new Date().toISOString();
    const def = {
      ...normalizeCustomFieldDefInput(data),
      id: createCustomFieldId(),
      projectId,
      order: getNextFieldOrder(defs, projectId),
      archived: false,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser || null,
    };
    setCustomFieldDefs((prev) => [...(prev || []), def]);
    logAuditEvent?.("custom_field_created", {
      entityType: "custom_field",
      entityId: def.id,
      name: def.name,
      fieldType: def.type,
      projectId,
    });
    return def;
  }, [currentProjectId, currentUser, logAuditEvent, setCustomFieldDefs]);

  /** Updates editable properties; the field type is fixed after creation. */
  const updateCustomFieldDef = useCallback((fieldId, patch = {}) => {
    let updated = null;
    setCustomFieldDefs((prev) => (prev || []).map((def) => {
      if (def.id !== fieldId) return def;
      const normalized = normalizeCustomFieldDefInput({ ...def, ...patch, type: def.type });
      updated = { ...def, ...normalized, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (updated) {
      logAuditEvent?.("custom_field_updated", {
        entityType: "custom_field",
        entityId: fieldId,
        name: updated.name,
        projectId: updated.projectId,
      });
    }
    return updated;
  }, [logAuditEvent, setCustomFieldDefs]);

  const setArchived = useCallback((fieldId, archived) => {
    let target = null;
    setCustomFieldDefs((prev) => (prev || []).map((def) => {
      if (def.id !== fieldId) return def;
      target = { ...def, archived, updatedAt: new Date().toISOString() };
      return target;
    }));
    if (target) {
      logAuditEvent?.(archived ? "custom_field_archived" : "custom_field_restored", {
        entityType: "custom_field",
        entityId: fieldId,
        name: target.name,
        projectId: target.projectId,
      });
    }
    return target;
  }, [logAuditEvent, setCustomFieldDefs]);

  // Archive is the safe default: the field disappears from tasks and the
  // board, but every stored value is kept and comes back on restore.
  const archiveCustomFieldDef = useCallback((fieldId) => setArchived(fieldId, true), [setArchived]);
  const restoreCustomFieldDef = useCallback((fieldId) => setArchived(fieldId, false), [setArchived]);

  /**
   * Permanently removes a definition AND its values from every task (active,
   * backlog and archive). Returns the number of tasks that lost a value, or
   * -1 when the field does not exist.
   */
  const deleteCustomFieldDef = useCallback((fieldId) => {
    const state = useAppStore.getState();
    const def = (state.customFieldDefs || []).find((item) => item.id === fieldId);
    if (!def) return -1;
    const affected = countTasksWithFieldValue(collectAllTasks(state), fieldId);
    const strip = (tasks) => (tasks || []).map((task) => stripCustomFieldValues(task, [fieldId]));

    setCustomFieldDefs((prev) => (prev || []).filter((item) => item.id !== fieldId));
    if (affected > 0) {
      setActiveTasks((prev) => strip(prev));
      setPerProjectBacklog((prev) => Object.fromEntries(Object.entries(prev || {}).map(([projectId, sections]) => [
        projectId,
        (sections || []).map((section) => ({ ...section, tasks: strip(section.tasks) })),
      ])));
      setArchivedTasks((prev) => strip(prev));
    }
    logAuditEvent?.("custom_field_deleted", {
      entityType: "custom_field",
      entityId: fieldId,
      name: def.name,
      projectId: def.projectId,
      affectedTasks: affected,
      severity: "warning",
    });
    return affected;
  }, [logAuditEvent, setActiveTasks, setArchivedTasks, setCustomFieldDefs, setPerProjectBacklog]);

  /**
   * Re-numbers a project's fields in the given id order. Ids that are not
   * listed keep their relative order after the listed ones.
   */
  const reorderCustomFieldDefs = useCallback((projectId, orderedIds) => {
    setCustomFieldDefs((prev) => {
      const list = prev || [];
      const projectDefs = sortCustomFieldDefs(list.filter((def) => def.projectId === projectId));
      const position = new Map((orderedIds || []).map((id, index) => [id, index]));
      const sorted = [...projectDefs].sort((a, b) => {
        const pa = position.has(a.id) ? position.get(a.id) : Number.MAX_SAFE_INTEGER;
        const pb = position.has(b.id) ? position.get(b.id) : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
      const nextOrder = new Map(sorted.map((def, index) => [def.id, index]));
      return list.map((def) => (
        nextOrder.has(def.id) && def.order !== nextOrder.get(def.id)
          ? { ...def, order: nextOrder.get(def.id) }
          : def
      ));
    });
  }, [setCustomFieldDefs]);

  /** Moves a field one step up (-1) or down (+1) among its project's active fields. */
  const moveCustomFieldDef = useCallback((fieldId, direction) => {
    const defs = useAppStore.getState().customFieldDefs || [];
    const def = defs.find((item) => item.id === fieldId);
    if (!def) return;
    const ids = sortCustomFieldDefs(defs.filter((item) => item.projectId === def.projectId && !item.archived)).map((item) => item.id);
    const index = ids.indexOf(fieldId);
    const target = index + (direction < 0 ? -1 : 1);
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderCustomFieldDefs(def.projectId, ids);
  }, [reorderCustomFieldDefs]);

  return {
    createCustomFieldDef,
    updateCustomFieldDef,
    archiveCustomFieldDef,
    restoreCustomFieldDef,
    deleteCustomFieldDef,
    reorderCustomFieldDefs,
    moveCustomFieldDef,
  };
}
