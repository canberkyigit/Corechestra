import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot, setDoc, runTransaction } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import { isE2EMode, readE2EJson, writeE2EJson, subscribeE2EKey } from "../e2e/testMode";

/*
 * HR data boundary.
 *
 * Documents:
 *   hrData/{uid}       personal HR data (time off, time entries, documents, profile, expenses, bank accounts)
 *   hrData/hr_shared   absences, approval inbox, onboarding workflows, performance notes, allocations,
 *                      pending document assignments
 *   hrData/pipeline    job requisitions, candidates, scorecards
 *
 * Every write goes through `mutate()`, which runs a Firestore transaction: it re-reads the
 * touched documents, recomputes the changed arrays from the *latest* server data and writes
 * them back atomically. Concurrent editors no longer overwrite each other's array entries
 * (the previous implementation rebuilt whole arrays from stale local state).
 *
 * In E2E mode Firebase is not initialised (`db === null`). `mutate()` then persists to
 * localStorage (`corechestra_e2e_hr`) and the provider reads from there, so the HR module
 * stays fully usable in Playwright runs without touching Firestore.
 */

const HRContext = createContext(null);

export const HR_COLLECTION = "hrData";
export const HR_SHARED_DOC = "hr_shared";
export const HR_PIPELINE_DOC = "pipeline";
export const E2E_HR_KEY = "corechestra_e2e_hr";

export const DEFAULT_HR_DOCUMENTS = [
  { id: "doc-1", name: "Company Handbook",           category: "company",  status: "not_submitted", actions: ["sign"]     },
  { id: "doc-2", name: "Worker Verification Letter", category: "company",  status: null,            actions: ["preview"]  },
  { id: "doc-3", name: "HR Administration",          category: "personal", status: null,            actions: ["download"], subtitle: "1 file" },
];

export const APPROVAL_TYPES = { TIME_OFF: "timeoff", EXPENSE: "expense", TIME_ENTRY: "timeentry" };

const EMPTY_LIST = [];
const EMPTY_OBJECT = {};

export function getUserHRDefaults() {
  return {
    timeOffRequests: [],
    timeEntries: [],
    documents: DEFAULT_HR_DOCUMENTS,
    employeeProfile: {},
    expenses: [],
    bankAccounts: [],
  };
}

export const genHrId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();

/** Documents fall back to the defaults only when the field was never initialised. */
export function readDocuments(data) {
  return Array.isArray(data?.documents) ? data.documents : DEFAULT_HR_DOCUMENTS;
}

function sameEmail(a, b) {
  return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Pure approval decision. Returns the patches for the shared doc and the requester's doc.
 * Keeps the approval item and the underlying record (time-off request / expense / time entry)
 * in sync so the requester sees the decision.
 */
export function buildApprovalDecision({ approvalId, status, note = "", resolverId, resolverName = "", sharedData, requesterData, at = nowIso() }) {
  if (!["approved", "rejected"].includes(status)) throw new Error(`Unsupported approval status: ${status}`);
  const inbox = sharedData?.approvalInbox || [];
  const item = inbox.find((entry) => entry.id === approvalId);
  if (!item) throw new Error("Approval request not found");
  if (item.status !== "pending") throw new Error("This request has already been resolved");

  const decision = {
    status,
    resolvedBy: resolverId || "",
    resolvedByName: resolverName || "",
    resolvedAt: at,
    decisionNote: note || "",
    updatedAt: at,
  };
  const recordDecision = { status, resolvedAt: at, resolvedBy: resolverId || "", resolvedByName: resolverName || "", decisionNote: note || "" };

  const sharedPatch = {
    approvalInbox: inbox.map((entry) => (entry.id === approvalId ? { ...entry, ...decision } : entry)),
  };
  let requesterPatch = null;
  const requester = requesterData || {};

  if (item.type === APPROVAL_TYPES.TIME_OFF) {
    requesterPatch = {
      timeOffRequests: (requester.timeOffRequests || []).map((request) => (
        request.id === item.targetId ? { ...request, ...recordDecision } : request
      )),
    };
    sharedPatch.absences = (sharedData.absences || []).map((absence) => (
      absence.requestId === item.targetId ? { ...absence, status } : absence
    ));
  } else if (item.type === APPROVAL_TYPES.EXPENSE) {
    requesterPatch = {
      expenses: (requester.expenses || []).map((expense) => (
        expense.id === item.targetId ? { ...expense, ...recordDecision } : expense
      )),
    };
  } else if (item.type === APPROVAL_TYPES.TIME_ENTRY) {
    requesterPatch = {
      timeEntries: (requester.timeEntries || []).map((entry) => (
        entry.id === item.targetId || (!entry.id && entry.date === item.targetDate) ? { ...entry, ...recordDecision } : entry
      )),
    };
  }

  return { item, sharedPatch, requesterPatch };
}

/** Marks the pending approval item for a record as cancelled (requester withdrew it). */
function cancelPendingApprovals(inbox, targetId, at) {
  return (inbox || []).map((entry) => (
    entry.targetId === targetId && entry.status === "pending"
      ? { ...entry, status: "cancelled", updatedAt: at }
      : entry
  ));
}

export function HRProvider({ children }) {
  const { user, isAdmin, profile } = useAuth();
  const { canPerform } = usePermissions();
  const e2eMode = isE2EMode();
  const uid = user?.uid || null;
  const userEmail = user?.email || "";

  const [userDoc, setUserDoc] = useState(null);
  const [sharedDoc, setSharedDoc] = useState(null);
  const [pipelineDoc, setPipelineDoc] = useState(null);

  // ── Listeners ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return undefined;

    if (e2eMode) {
      const apply = (store) => {
        const data = store || {};
        setUserDoc(data[uid] || getUserHRDefaults());
        setSharedDoc(data[HR_SHARED_DOC] || {});
        setPipelineDoc(data[HR_PIPELINE_DOC] || {});
      };
      apply(readE2EJson(E2E_HR_KEY, {}));
      return subscribeE2EKey(E2E_HR_KEY, apply);
    }

    if (!db) return undefined;

    const userRef = doc(db, HR_COLLECTION, uid);
    const unsubUser = onSnapshot(userRef, async (snap) => {
      try {
        if (snap.exists()) {
          setUserDoc(snap.data());
        } else {
          setUserDoc(getUserHRDefaults());
          await setDoc(userRef, getUserHRDefaults(), { merge: true });
        }
      } catch (err) {
        console.warn("[HRContext] user data sync failed:", err.code || err.message);
      }
    }, (err) => {
      console.warn("[HRContext] user data listener failed:", err.code || err.message);
    });

    const unsubShared = onSnapshot(doc(db, HR_COLLECTION, HR_SHARED_DOC), (snap) => {
      setSharedDoc(snap.exists() ? snap.data() : {});
    }, (err) => {
      console.warn("[HRContext] shared data listener failed:", err.code || err.message);
    });

    const unsubPipeline = onSnapshot(doc(db, HR_COLLECTION, HR_PIPELINE_DOC), (snap) => {
      setPipelineDoc(snap.exists() ? snap.data() : {});
    }, (err) => {
      console.warn("[HRContext] pipeline listener failed:", err.code || err.message);
    });

    return () => { unsubUser(); unsubShared(); unsubPipeline(); };
  }, [e2eMode, uid]);

  // ── Write engine ───────────────────────────────────────────────────────────
  /**
   * Atomically read-modify-write one or more hrData docs.
   * `compute(currentDataArray)` returns an array of patches (null = leave doc untouched).
   * It may run more than once when Firestore retries the transaction, so keep it pure.
   */
  const mutate = useCallback(async (docIds, compute) => {
    if (e2eMode) {
      const store = readE2EJson(E2E_HR_KEY, {}) || {};
      const current = docIds.map((id) => store[id] || (id === uid ? getUserHRDefaults() : {}));
      const patches = compute(current);
      const next = { ...store };
      docIds.forEach((id, index) => {
        if (patches[index]) next[id] = { ...current[index], ...patches[index] };
      });
      writeE2EJson(E2E_HR_KEY, next);
      return;
    }
    if (!db) throw new Error("HR storage is not available");
    await runTransaction(db, async (tx) => {
      const refs = docIds.map((id) => doc(db, HR_COLLECTION, id));
      const snaps = [];
      for (const ref of refs) {
        // Firestore requires all reads before writes inside a transaction.
        snaps.push(await tx.get(ref));
      }
      const current = snaps.map((snap) => (snap.exists() ? snap.data() : {}));
      const patches = compute(current);
      refs.forEach((ref, index) => {
        if (patches[index]) tx.set(ref, patches[index], { merge: true });
      });
    });
  }, [e2eMode, uid]);

  const requireUser = useCallback(() => {
    if (!uid) throw new Error("You must be signed in to update HR data");
    return uid;
  }, [uid]);

  const actorName = profile?.fullName || profile?.name || userEmail.split("@")[0] || "Someone";

  // ── Time off ───────────────────────────────────────────────────────────────
  const addTimeOffRequest = useCallback(async (request, userInfo) => {
    const me = requireUser();
    const at = nowIso();
    const id = genHrId();
    const approvalId = `approval-${genHrId()}`;
    const newReq = { ...request, id, status: "pending", createdAt: at, approvalId };
    const name = userInfo?.name || actorName;

    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => [
      { timeOffRequests: [...(mine.timeOffRequests || []), newReq] },
      {
        absences: [...(shared.absences || []), {
          requestId: id,
          userId: me,
          userEmail,
          userName: name,
          userColor: userInfo?.color || "#6366f1",
          userTitle: userInfo?.title || userInfo?.role || "Team Member",
          fromDate: request.fromDate,
          toDate: request.toDate,
          type: request.type,
          typeName: request.typeName,
          status: "pending",
        }],
        approvalInbox: [...(shared.approvalInbox || []), {
          id: approvalId,
          type: APPROVAL_TYPES.TIME_OFF,
          title: `${name} requested time off`,
          targetId: id,
          userId: me,
          requesterName: name,
          status: "pending",
          createdAt: at,
          summary: `${request.typeName || request.type} • ${request.fromDate} → ${request.toDate}`,
        }],
      },
    ]);
    return newReq;
  }, [actorName, mutate, requireUser, userEmail]);

  /** Withdraws a pending or rejected request. Approved requests must be changed by an approver. */
  const deleteTimeOffRequest = useCallback(async (requestId) => {
    const me = requireUser();
    const at = nowIso();
    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => {
      const request = (mine.timeOffRequests || []).find((item) => item.id === requestId);
      if (!request) return [null, null];
      if (request.status === "approved") throw new Error("Approved time off can only be changed by an approver");
      return [
        { timeOffRequests: (mine.timeOffRequests || []).filter((item) => item.id !== requestId) },
        {
          absences: (shared.absences || []).filter((absence) => absence.requestId !== requestId),
          approvalInbox: cancelPendingApprovals(shared.approvalInbox, requestId, at),
        },
      ];
    });
  }, [mutate, requireUser]);

  // ── Time tracking ──────────────────────────────────────────────────────────
  /** Upserts the entry for `entry.date` and (re)opens its approval request. */
  const submitHours = useCallback(async (entry) => {
    const me = requireUser();
    const at = nowIso();
    let saved = null;
    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => {
      const entries = mine.timeEntries || [];
      const existing = entries.find((item) => item.date === entry.date);
      const entryId = existing?.id || entry.id || `time-${genHrId()}`;
      saved = {
        ...(existing || {}),
        ...entry,
        id: entryId,
        status: "pending",
        submittedAt: at,
        resolvedAt: null,
        resolvedBy: null,
        resolvedByName: null,
        decisionNote: "",
      };
      const nextEntries = existing
        ? entries.map((item) => (item.date === entry.date ? saved : item))
        : [...entries, saved];

      const inbox = shared.approvalInbox || [];
      const typeLabel = { work: "Work", sick: "Sick leave", vacation: "Vacation", other: "Other" }[saved.type] || "Time";
      const summary = `${typeLabel} • ${saved.hours || 0}h • ${saved.date}`;
      const pendingItem = inbox.find((item) => item.type === APPROVAL_TYPES.TIME_ENTRY && item.targetId === entryId && item.status === "pending");
      const nextInbox = pendingItem
        ? inbox.map((item) => (item.id === pendingItem.id ? { ...item, summary, updatedAt: at } : item))
        : [...inbox, {
            id: `approval-${genHrId()}`,
            type: APPROVAL_TYPES.TIME_ENTRY,
            title: `${actorName} submitted hours`,
            targetId: entryId,
            targetDate: saved.date,
            userId: me,
            requesterName: actorName,
            status: "pending",
            createdAt: at,
            summary,
          }];
      return [{ timeEntries: nextEntries }, { approvalInbox: nextInbox }];
    });
    return saved;
  }, [actorName, mutate, requireUser]);

  const deleteTimeEntry = useCallback(async (entryId) => {
    const me = requireUser();
    const at = nowIso();
    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => {
      const entry = (mine.timeEntries || []).find((item) => item.id === entryId);
      if (!entry) return [null, null];
      if (entry.status === "approved") throw new Error("Approved hours can only be changed by an approver");
      return [
        { timeEntries: (mine.timeEntries || []).filter((item) => item.id !== entryId) },
        { approvalInbox: cancelPendingApprovals(shared.approvalInbox, entryId, at) },
      ];
    });
  }, [mutate, requireUser]);

  // ── Approvals ──────────────────────────────────────────────────────────────
  const resolveApproval = useCallback(async (approvalId, status, note = "") => {
    const me = requireUser();
    if (!canPerform("approval:resolve")) throw new Error("You do not have permission to resolve approvals");
    const localItem = (sharedDoc?.approvalInbox || []).find((item) => item.id === approvalId);
    if (!localItem) throw new Error("Approval request not found");
    if (localItem.userId === me) throw new Error("You cannot approve your own request");

    const requesterId = localItem.userId;
    const touchesRequester = [APPROVAL_TYPES.TIME_OFF, APPROVAL_TYPES.EXPENSE, APPROVAL_TYPES.TIME_ENTRY].includes(localItem.type) && requesterId;
    const ids = touchesRequester ? [HR_SHARED_DOC, requesterId] : [HR_SHARED_DOC];

    await mutate(ids, ([shared, requester]) => {
      const { sharedPatch, requesterPatch } = buildApprovalDecision({
        approvalId,
        status,
        note,
        resolverId: me,
        resolverName: actorName,
        sharedData: shared,
        requesterData: requester,
      });
      return touchesRequester ? [sharedPatch, requesterPatch] : [sharedPatch];
    });
  }, [actorName, canPerform, mutate, requireUser, sharedDoc]);

  // ── Documents ──────────────────────────────────────────────────────────────
  const updateDocumentStatus = useCallback(async (docId, updates) => {
    const me = requireUser();
    await mutate([me], ([mine]) => [{
      documents: readDocuments(mine).map((item) => (item.id === docId ? { ...item, ...updates, updatedAt: nowIso() } : item)),
    }]);
  }, [mutate, requireUser]);

  const addDocument = useCallback(async (docData) => {
    const me = requireUser();
    const newDoc = { ...docData, id: "doc-" + genHrId(), createdAt: nowIso() };
    await mutate([me], ([mine]) => [{ documents: [...readDocuments(mine), newDoc] }]);
    return newDoc;
  }, [mutate, requireUser]);

  const deleteDocument = useCallback(async (docId) => {
    const me = requireUser();
    await mutate([me], ([mine]) => {
      const documents = readDocuments(mine);
      const target = documents.find((item) => item.id === docId);
      if (!target) return [null];
      if (target.assignedBy && !isAdmin) throw new Error("Documents assigned by an admin can only be removed by an admin");
      return [{ documents: documents.filter((item) => item.id !== docId) }];
    });
  }, [isAdmin, mutate, requireUser]);

  /**
   * Assigns a document to another employee.
   * `target` is a People record ({ id, email, name }) or a plain id. Assignments for other people are
   * queued in hr_shared and delivered to `hrData/{theirUid}` by their own client on next sign-in.
   * This avoids orphan `hrData/user-…` docs for People records not yet linked to an auth uid.
   */
  const assignDocumentToUser = useCallback(async (target, docData) => {
    const me = requireUser();
    if (!isAdmin) throw new Error("Only admins can assign documents");
    const targetUserId = typeof target === "string" ? target : target?.id;
    const targetEmail = typeof target === "string" ? "" : (target?.email || "");
    const targetName = typeof target === "string" ? "" : (target?.name || "");
    const newDoc = { ...docData, id: "doc-" + genHrId(), createdAt: nowIso(), assignedBy: me, assignedByName: actorName };

    if (targetUserId === me || sameEmail(targetEmail, userEmail)) {
      await mutate([me], ([mine]) => [{ documents: [...readDocuments(mine), newDoc] }]);
      return newDoc;
    }

    await mutate([HR_SHARED_DOC], ([shared]) => [{
      pendingDocumentAssignments: [...(shared.pendingDocumentAssignments || []), {
        id: `assign-${genHrId()}`,
        targetUserId: targetUserId || "",
        targetEmail,
        targetName,
        assignedAt: nowIso(),
        assignedBy: me,
        document: newDoc,
      }],
    }]);
    return newDoc;
  }, [actorName, isAdmin, mutate, requireUser, userEmail]);

  const cancelDocumentAssignment = useCallback(async (assignmentId) => {
    requireUser();
    if (!isAdmin) throw new Error("Only admins can cancel document assignments");
    await mutate([HR_SHARED_DOC], ([shared]) => [{
      pendingDocumentAssignments: (shared.pendingDocumentAssignments || []).filter((item) => item.id !== assignmentId),
    }]);
  }, [isAdmin, mutate, requireUser]);

  // Deliver queued document assignments addressed to the signed-in user.
  const claimingRef = useRef(false);
  useEffect(() => {
    if (!uid || claimingRef.current) return;
    const isMine = (assignment) => assignment.targetUserId === uid || sameEmail(assignment.targetEmail, userEmail);
    const pending = (sharedDoc?.pendingDocumentAssignments || []).filter(isMine);
    if (!pending.length) return;
    claimingRef.current = true;
    mutate([uid, HR_SHARED_DOC], ([mine, shared]) => {
      const queue = shared.pendingDocumentAssignments || [];
      const claim = queue.filter(isMine);
      if (!claim.length) return [null, null];
      const documents = readDocuments(mine);
      const existingIds = new Set(documents.map((item) => item.id));
      return [
        { documents: [...documents, ...claim.map((item) => item.document).filter((item) => item && !existingIds.has(item.id))] },
        { pendingDocumentAssignments: queue.filter((item) => !isMine(item)) },
      ];
    })
      .catch((err) => console.warn("[HRContext] document delivery failed:", err.code || err.message))
      .finally(() => { claimingRef.current = false; });
  }, [mutate, sharedDoc, uid, userEmail]);

  // ── Employee profile ───────────────────────────────────────────────────────
  const updateEmployeeProfile = useCallback(async (fields) => {
    const me = requireUser();
    await mutate([me], ([mine]) => [{ employeeProfile: { ...(mine.employeeProfile || {}), ...fields } }]);
  }, [mutate, requireUser]);

  // ── Expenses ───────────────────────────────────────────────────────────────
  const addExpense = useCallback(async (expense) => {
    const me = requireUser();
    const at = nowIso();
    const approvalId = `approval-${genHrId()}`;
    const newExp = { ...expense, id: "exp-" + genHrId(), status: "pending", createdAt: at, approvalId };
    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => [
      { expenses: [...(mine.expenses || []), newExp] },
      {
        approvalInbox: [...(shared.approvalInbox || []), {
          id: approvalId,
          type: APPROVAL_TYPES.EXPENSE,
          title: `${actorName} submitted an expense`,
          targetId: newExp.id,
          userId: me,
          requesterName: actorName,
          status: "pending",
          createdAt: at,
          summary: `${newExp.category || "Expense"} • ${newExp.currency || ""} ${newExp.amount ?? "—"}`.replace(/\s+/g, " ").trim(),
        }],
      },
    ]);
    return newExp;
  }, [actorName, mutate, requireUser]);

  const deleteExpense = useCallback(async (expenseId) => {
    const me = requireUser();
    const at = nowIso();
    await mutate([me, HR_SHARED_DOC], ([mine, shared]) => {
      const expense = (mine.expenses || []).find((item) => item.id === expenseId);
      if (!expense) return [null, null];
      if (expense.status === "approved") throw new Error("Approved expenses cannot be deleted");
      return [
        { expenses: (mine.expenses || []).filter((item) => item.id !== expenseId) },
        { approvalInbox: cancelPendingApprovals(shared.approvalInbox, expenseId, at) },
      ];
    });
  }, [mutate, requireUser]);

  // ── Bank accounts ──────────────────────────────────────────────────────────
  const addBankAccount = useCallback(async (acct) => {
    const me = requireUser();
    let created = null;
    await mutate([me], ([mine]) => {
      const current = mine.bankAccounts || [];
      created = { ...acct, id: "bank-" + genHrId(), isPrimary: current.length === 0, createdAt: nowIso() };
      return [{ bankAccounts: [...current, created] }];
    });
    return created;
  }, [mutate, requireUser]);

  const deleteBankAccount = useCallback(async (accountId) => {
    const me = requireUser();
    await mutate([me], ([mine]) => {
      const updated = (mine.bankAccounts || []).filter((item) => item.id !== accountId);
      if (updated.length > 0 && !updated.some((item) => item.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return [{ bankAccounts: updated }];
    });
  }, [mutate, requireUser]);

  const setPrimaryBankAccount = useCallback(async (accountId) => {
    const me = requireUser();
    await mutate([me], ([mine]) => [{
      bankAccounts: (mine.bankAccounts || []).map((item) => ({ ...item, isPrimary: item.id === accountId })),
    }]);
  }, [mutate, requireUser]);

  // ── Hiring pipeline ────────────────────────────────────────────────────────
  const createJobReq = useCallback(async (data) => {
    requireUser();
    const newReq = { ...data, id: "jreq-" + genHrId(), status: data.status || "open", createdAt: nowIso(), createdBy: uid || "" };
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => [{ jobRequisitions: [...(pipeline.jobRequisitions || []), newReq] }]);
    return newReq;
  }, [mutate, requireUser, uid]);

  /** Merges `updated` (must include `id`) into the stored requisition. */
  const updateJobReq = useCallback(async (updated) => {
    requireUser();
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => [{
      jobRequisitions: (pipeline.jobRequisitions || []).map((item) => (
        item.id === updated.id ? { ...item, ...updated, updatedAt: nowIso() } : item
      )),
    }]);
  }, [mutate, requireUser]);

  const updateCandidateFields = useCallback(async (candidateId, computePatch) => {
    requireUser();
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => [{
      candidates: (pipeline.candidates || []).map((item) => (
        item.id === candidateId ? { ...item, ...computePatch(item), updatedAt: nowIso() } : item
      )),
    }]);
  }, [mutate, requireUser]);

  const createCandidate = useCallback(async (data) => {
    requireUser();
    const at = nowIso();
    const newCand = { ...data, id: "cand-" + genHrId(), stage: "pool", appliedAt: at, updatedAt: at };
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => [{ candidates: [...(pipeline.candidates || []), newCand] }]);
    return newCand;
  }, [mutate, requireUser]);

  const updateCandidate = useCallback(async (updated) => {
    // eslint-disable-next-line no-unused-vars
    const { _new, sourceLabel, ...fields } = updated;
    await updateCandidateFields(updated.id, () => fields);
  }, [updateCandidateFields]);

  /** Moves between interview stages. Hiring and rejecting have dedicated flows. */
  const moveCandidate = useCallback(async (candidateId, newStage) => {
    if (newStage === "hired") throw new Error("Use the hire flow to hire a candidate");
    if (newStage === "rejected") throw new Error("Use rejectCandidate to reject a candidate");
    await updateCandidateFields(candidateId, (item) => ({ stage: newStage, previousStage: item.stage }));
  }, [updateCandidateFields]);

  /** Marks the candidate hired and fills the requisition once headcount is reached. */
  const hireCandidate = useCallback(async (candidateId, details = {}) => {
    requireUser();
    const at = nowIso();
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => {
      const candidates = (pipeline.candidates || []).map((item) => (
        item.id === candidateId
          ? { ...item, stage: "hired", previousStage: item.stage, hiredAt: at, hiredUserId: details.hiredUserId || item.hiredUserId || null, updatedAt: at }
          : item
      ));
      const hired = candidates.find((item) => item.id === candidateId);
      const jobRequisitions = (pipeline.jobRequisitions || []).map((job) => {
        if (!hired || job.id !== hired.jobReqId || job.status === "closed") return job;
        const hiredCount = candidates.filter((item) => item.jobReqId === job.id && item.stage === "hired").length;
        return hiredCount >= (Number(job.headcount) || 1) ? { ...job, status: "filled", updatedAt: at } : job;
      });
      return [{ candidates, jobRequisitions }];
    });
  }, [mutate, requireUser]);

  const rejectCandidate = useCallback(async (candidateId, reason = "") => {
    const at = nowIso();
    await updateCandidateFields(candidateId, (item) => ({
      stage: "rejected",
      rejectedFromStage: item.stage === "rejected" ? item.rejectedFromStage : item.stage,
      rejectedAt: at,
      rejectionReason: reason,
    }));
  }, [updateCandidateFields]);

  const restoreCandidate = useCallback(async (candidateId) => {
    await updateCandidateFields(candidateId, (item) => ({
      stage: item.rejectedFromStage && item.rejectedFromStage !== "hired" ? item.rejectedFromStage : "pool",
      rejectedAt: null,
      rejectionReason: "",
    }));
  }, [updateCandidateFields]);

  const saveScorecard = useCallback(async (data) => {
    requireUser();
    const scored = (data.criteria || []).filter((criterion) => criterion.score);
    const avg = scored.reduce((sum, criterion) => sum + criterion.score, 0) / (scored.length || 1);
    let saved = null;
    await mutate([HR_PIPELINE_DOC], ([pipeline]) => {
      const scores = pipeline.scorecards || [];
      const existing = scores.find((item) => item.candidateId === data.candidateId && item.interviewedBy === data.interviewedBy);
      saved = { ...data, id: existing?.id || data.id || "sc-" + genHrId(), overallScore: Math.round(avg * 10) / 10, date: nowIso() };
      return [{
        scorecards: existing ? scores.map((item) => (item.id === existing.id ? saved : item)) : [...scores, saved],
      }];
    });
    return saved;
  }, [mutate, requireUser]);

  // ── Onboarding / offboarding ───────────────────────────────────────────────
  const createOnboardingWorkflow = useCallback(async (data) => {
    requireUser();
    const stamp = Date.now();
    const workflow = {
      id: `workflow-${genHrId()}`,
      type: data.type || "onboarding",
      status: "active",
      createdAt: nowIso(),
      createdBy: uid || "",
      ...data,
      steps: (data.steps || []).map((step, index) => (
        typeof step === "string"
          ? { id: `step-${index}-${stamp}`, title: step, completed: false }
          : { completed: false, ...step, id: step.id || `step-${index}-${stamp}` }
      )),
    };
    await mutate([HR_SHARED_DOC], ([shared]) => [{ onboardingWorkflows: [...(shared.onboardingWorkflows || []), workflow] }]);
    return workflow;
  }, [mutate, requireUser, uid]);

  const updateOnboardingWorkflow = useCallback(async (workflowId, patch) => {
    requireUser();
    await mutate([HR_SHARED_DOC], ([shared]) => [{
      onboardingWorkflows: (shared.onboardingWorkflows || []).map((workflow) => (
        workflow.id === workflowId ? { ...workflow, ...patch, updatedAt: nowIso() } : workflow
      )),
    }]);
  }, [mutate, requireUser]);

  const toggleOnboardingStep = useCallback(async (workflowId, stepId) => {
    requireUser();
    await mutate([HR_SHARED_DOC], ([shared]) => [{
      onboardingWorkflows: (shared.onboardingWorkflows || []).map((workflow) => {
        if (workflow.id !== workflowId) return workflow;
        const steps = (workflow.steps || []).map((step) => (
          step.id === stepId ? { ...step, completed: !step.completed, completedAt: step.completed ? null : nowIso() } : step
        ));
        const allDone = steps.length > 0 && steps.every((step) => step.completed);
        return { ...workflow, steps, status: allDone ? "completed" : "active", updatedAt: nowIso() };
      }),
    }]);
  }, [mutate, requireUser]);

  // ── Performance notes & allocations ────────────────────────────────────────
  const addPerformanceNote = useCallback(async (note) => {
    requireUser();
    const newNote = { id: `perf-${genHrId()}`, createdAt: nowIso(), authorId: uid || "", authorName: actorName, ...note };
    await mutate([HR_SHARED_DOC], ([shared]) => [{ performanceNotes: [...(shared.performanceNotes || []), newNote] }]);
    return newNote;
  }, [actorName, mutate, requireUser, uid]);

  const upsertProjectAllocation = useCallback(async ({ userId, projectId, allocation, role }) => {
    requireUser();
    const at = nowIso();
    await mutate([HR_SHARED_DOC], ([shared]) => {
      const current = shared.projectAllocations || [];
      const exists = current.some((item) => item.userId === userId && item.projectId === projectId);
      return [{
        projectAllocations: exists
          ? current.map((item) => (
              item.userId === userId && item.projectId === projectId ? { ...item, allocation, role: role || "", updatedAt: at } : item
            ))
          : [...current, { id: `alloc-${genHrId()}`, userId, projectId, allocation, role: role || "", createdAt: at }],
      }];
    });
  }, [mutate, requireUser]);

  const removeProjectAllocation = useCallback(async ({ userId, projectId }) => {
    requireUser();
    await mutate([HR_SHARED_DOC], ([shared]) => [{
      projectAllocations: (shared.projectAllocations || []).filter((item) => !(item.userId === userId && item.projectId === projectId)),
    }]);
  }, [mutate, requireUser]);

  // ── Context value ──────────────────────────────────────────────────────────
  const userData = userDoc || EMPTY_OBJECT;
  const shared = sharedDoc || EMPTY_OBJECT;
  const pipelineData = pipelineDoc || EMPTY_OBJECT;

  const pipeline = useMemo(() => ({
    jobRequisitions: pipelineData.jobRequisitions || EMPTY_LIST,
    candidates: pipelineData.candidates || EMPTY_LIST,
    scorecards: pipelineData.scorecards || EMPTY_LIST,
  }), [pipelineData]);

  const value = useMemo(() => ({
    loading: userDoc === null,
    timeOffRequests: userData.timeOffRequests || EMPTY_LIST,
    timeEntries: userData.timeEntries || EMPTY_LIST,
    documents: readDocuments(userData),
    employeeProfile: userData.employeeProfile || EMPTY_OBJECT,
    expenses: userData.expenses || EMPTY_LIST,
    bankAccounts: userData.bankAccounts || EMPTY_LIST,
    allAbsences: shared.absences || EMPTY_LIST,
    approvalInbox: shared.approvalInbox || EMPTY_LIST,
    onboardingWorkflows: shared.onboardingWorkflows || EMPTY_LIST,
    performanceNotes: shared.performanceNotes || EMPTY_LIST,
    projectAllocations: shared.projectAllocations || EMPTY_LIST,
    pendingDocumentAssignments: shared.pendingDocumentAssignments || EMPTY_LIST,
    pipeline,
    // time off & time
    addTimeOffRequest,
    deleteTimeOffRequest,
    submitHours,
    deleteTimeEntry,
    // approvals
    resolveApproval,
    // documents
    updateDocumentStatus,
    addDocument,
    deleteDocument,
    assignDocumentToUser,
    cancelDocumentAssignment,
    // profile & finance
    updateEmployeeProfile,
    addExpense,
    deleteExpense,
    addBankAccount,
    deleteBankAccount,
    setPrimaryBankAccount,
    // pipeline
    createJobReq,
    updateJobReq,
    createCandidate,
    updateCandidate,
    moveCandidate,
    saveScorecard,
    hireCandidate,
    rejectCandidate,
    restoreCandidate,
    // workflows, notes, allocations
    createOnboardingWorkflow,
    updateOnboardingWorkflow,
    toggleOnboardingStep,
    addPerformanceNote,
    upsertProjectAllocation,
    removeProjectAllocation,
  }), [
    userDoc, userData, shared, pipeline,
    addTimeOffRequest, deleteTimeOffRequest, submitHours, deleteTimeEntry, resolveApproval,
    updateDocumentStatus, addDocument, deleteDocument, assignDocumentToUser, cancelDocumentAssignment,
    updateEmployeeProfile, addExpense, deleteExpense, addBankAccount, deleteBankAccount, setPrimaryBankAccount,
    createJobReq, updateJobReq, createCandidate, updateCandidate, moveCandidate, saveScorecard, hireCandidate,
    rejectCandidate, restoreCandidate, createOnboardingWorkflow, updateOnboardingWorkflow, toggleOnboardingStep,
    addPerformanceNote, upsertProjectAllocation, removeProjectAllocation,
  ]);

  return <HRContext.Provider value={value}>{children}</HRContext.Provider>;
}

export const useHR = () => useContext(HRContext);
