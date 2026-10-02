import React, { useCallback, useState } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { DEFAULT_COLUMNS } from "../../../shared/context/AppSeeds";
import {
  getWorkflowRules,
  validateWorkflowTransition,
} from "../../../shared/context/hooks/actions/useBoardActions";
import BlockReasonDialog from "../components/BlockReasonDialog";
import { getTaskProjectId } from "../../../shared/utils/helpers";

/**
 * Client-side gate for status changes that mirrors the workflow rules the
 * board actions enforce: rejects invalid moves with a toast and asks for a
 * blocker reason when the project requires one.
 *
 * Returns `{ guardStatusChange, reportResult, dialog }` — render `dialog`.
 */
export function useWorkflowGuard() {
  const { projects, projectColumns, columns, currentProjectId } = useApp();
  const { addToast } = useToast();
  const [request, setRequest] = useState(null);

  const resolveContext = useCallback((task) => {
    const projectId = getTaskProjectId(task, currentProjectId);
    const project = (projects || []).find((item) => item.id === projectId);
    const projectCols = projectColumns?.[projectId]
      || (projectId === currentProjectId ? columns : null)
      || DEFAULT_COLUMNS;
    return { rules: getWorkflowRules(project), columns: projectCols };
  }, [columns, currentProjectId, projectColumns, projects]);

  const askBlockReason = useCallback((task) => new Promise((resolve) => {
    setRequest({ task, resolve });
  }), []);

  /**
   * Resolves to `{ ok: true, patch }` (patch includes `blockReason` when
   * collected) or `{ ok: false }` when rejected/cancelled.
   */
  const guardStatusChange = useCallback(async (task, toStatus) => {
    if (!task || !toStatus || task.status === toStatus) return { ok: true, patch: { status: toStatus } };
    const { rules, columns: workflowColumns } = resolveContext(task);
    const verdict = validateWorkflowTransition({
      fromStatus: task.status,
      toStatus,
      rules,
      columns: workflowColumns,
      blockReason: "",
    });
    if (verdict.ok) return { ok: true, patch: { status: toStatus } };
    if (verdict.code === "block_reason_required") {
      const reason = await askBlockReason(task);
      if (!reason) return { ok: false, cancelled: true };
      return { ok: true, patch: { status: toStatus, blockReason: reason } };
    }
    addToast(verdict.message, "error");
    return { ok: false, ...verdict };
  }, [addToast, askBlockReason, resolveContext]);

  /** Toasts a rejected action result (`{ ok: false, message }`). */
  const reportResult = useCallback((result) => {
    if (result && result.ok === false && result.message) addToast(result.message, "error");
    return result;
  }, [addToast]);

  const dialog = request ? (
    <BlockReasonDialog
      task={request.task}
      onSubmit={(reason) => { request.resolve(reason); setRequest(null); }}
      onCancel={() => { request.resolve(null); setRequest(null); }}
    />
  ) : null;

  return { guardStatusChange, reportResult, dialog };
}
