import React, { useState } from "react";
import { FaCheck, FaClipboardList, FaTimes } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { Badge } from "./HRSharedUI";

const TYPE_LABELS = { timeoff: "Time off", expense: "Expense", timeentry: "Hours" };
const TYPE_COLORS = { timeoff: "blue", expense: "amber", timeentry: "purple" };

/**
 * Approval inbox for approvers (`approval:resolve`). Approving/rejecting updates both the inbox
 * item and the underlying request/expense/time entry in the requester's HR doc.
 * Requesters cannot resolve their own items.
 */
export function ApprovalInboxCard({ limit = 3 }) {
  const { approvalInbox, resolveApproval } = useHR();
  const { user } = useAuth();
  const { canPerform } = usePermissions();
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");

  const canResolve = canPerform("approval:resolve");
  const pending = (approvalInbox || [])
    .filter((item) => item.status === "pending")
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const actionable = canResolve ? pending.filter((item) => item.userId !== user?.uid) : [];
  const mine = pending.filter((item) => item.userId === user?.uid);
  const visible = expanded ? actionable : actionable.slice(0, limit);

  const resolve = async (item, status, decisionNote = "") => {
    setBusyId(item.id);
    try {
      await resolveApproval(item.id, status, decisionNote);
      addToast(`${TYPE_LABELS[item.type] || "Request"} ${status}`, status === "approved" ? "success" : "info");
      setRejecting(null);
      setNote("");
    } catch (error) {
      addToast(error.message || "Could not update the request", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (actionable.length === 0 && mine.length === 0) return null;

  return (
    <div data-testid="approval-inbox">
      {visible.map((item) => (
        <div key={item.id} className="py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center flex-shrink-0">
              <FaClipboardList className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge color={TYPE_COLORS[item.type] || "slate"}>{TYPE_LABELS[item.type] || item.type}</Badge>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => resolve(item, "approved")}
                className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-2 py-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50"
              >
                <FaCheck className="w-2.5 h-2.5" /> Approve
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => { setRejecting(rejecting === item.id ? null : item.id); setNote(""); }}
                className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50"
              >
                <FaTimes className="w-2.5 h-2.5" /> Reject
              </button>
            </div>
          </div>
          {rejecting === item.id && (
            <div className="mt-2 flex items-center gap-2 pl-12">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 200))}
                placeholder="Reason (optional, visible to the requester)"
                aria-label="Rejection reason"
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => resolve(item, "rejected", note.trim())}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                Confirm reject
              </button>
            </div>
          )}
        </div>
      ))}
      {actionable.length > limit && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {expanded ? "Show fewer" : `Show all ${actionable.length} approvals`}
        </button>
      )}
      {mine.length > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2">
          {mine.length} of your request{mine.length === 1 ? " is" : "s are"} waiting for another approver.
        </p>
      )}
    </div>
  );
}

export function countActionableApprovals(approvalInbox, userId, canResolve) {
  if (!canResolve) return 0;
  return (approvalInbox || []).filter((item) => item.status === "pending" && item.userId !== userId).length;
}
