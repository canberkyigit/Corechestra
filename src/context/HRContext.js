import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

const HRContext = createContext(null);

export const DEFAULT_HR_DOCUMENTS = [
  { id: "doc-1", name: "Company Handbook",           category: "company",  status: "not_submitted", actions: ["sign"]     },
  { id: "doc-2", name: "Worker Verification Letter", category: "company",  status: null,            actions: ["preview"]  },
  { id: "doc-3", name: "HR Administration",          category: "personal", status: null,            actions: ["download"], subtitle: "1 file" },
];

const EMPTY_PIPELINE = { jobRequisitions: [], candidates: [], scorecards: [] };

export function HRProvider({ children }) {
  const { user } = useAuth();

  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeEntries,     setTimeEntries]     = useState([]);
  const [documents,       setDocuments]       = useState(DEFAULT_HR_DOCUMENTS);
  const [allAbsences,     setAllAbsences]     = useState([]);
  const [pipeline,        setPipeline]        = useState(EMPTY_PIPELINE);
  const [employeeProfile, setEmployeeProfile] = useState({});
  const [expenses,        setExpenses]        = useState([]);
  const [bankAccounts,    setBankAccounts]    = useState([]);

  // Keep a ref to latest pipeline so callbacks always see current state without stale closures
  const pipelineRef = useRef(EMPTY_PIPELINE);
  useEffect(() => { pipelineRef.current = pipeline; }, [pipeline]);

  // Per-user listener
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "hrData", user.uid);
    const unsubUser = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setTimeOffRequests(d.timeOffRequests || []);
        setTimeEntries(d.timeEntries     || []);
        setDocuments(d.documents?.length ? d.documents : DEFAULT_HR_DOCUMENTS);
        setEmployeeProfile(d.employeeProfile || {});
        setExpenses(d.expenses || []);
        setBankAccounts(d.bankAccounts || []);
      } else {
        // First-time init
        await setDoc(userRef, {
          timeOffRequests: [],
          timeEntries:     [],
          documents:       DEFAULT_HR_DOCUMENTS,
          employeeProfile: {},
          expenses:        [],
          bankAccounts:    [],
        });
      }
    });

    // Shared absences (all users)
    const sharedRef   = doc(db, "hrData", "hr_shared");
    const unsubShared = onSnapshot(sharedRef, (snap) => {
      setAllAbsences(snap.exists() ? (snap.data().absences || []) : []);
    });

    // Shared hiring pipeline (all users)
    const plRef      = doc(db, "hrData", "pipeline");
    const unsubPipeline = onSnapshot(plRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPipeline({ ...EMPTY_PIPELINE, ...d });
      }
    }, (err) => {
      console.error("[HRContext] pipeline onSnapshot error:", err.code, err.message);
    });

    return () => { unsubUser(); unsubShared(); unsubPipeline(); };
  }, [user?.uid]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const savePipeline = useCallback(async (patch) => {
    await setDoc(doc(db, "hrData", "pipeline"), patch, { merge: true });
  }, []);

  // ── Time off ───────────────────────────────────────────────────────────────
  const addTimeOffRequest = useCallback(async (request, userInfo) => {
    if (!user?.uid) return;
    const id = genId();
    const newReq = { ...request, id };

    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().timeOffRequests || []) : [];
    await setDoc(userDocRef, { timeOffRequests: [...current, newReq] }, { merge: true });

    const sharedRef  = doc(db, "hrData", "hr_shared");
    const sharedSnap = await getDoc(sharedRef);
    const absences   = sharedSnap.exists() ? (sharedSnap.data().absences || []) : [];
    await setDoc(sharedRef, {
      absences: [...absences, {
        requestId: id,
        userId:    user.uid,
        userName:  userInfo?.name  || "Unknown",
        userColor: userInfo?.color || "#6366f1",
        userTitle: userInfo?.title || userInfo?.role || "Team Member",
        fromDate:  request.fromDate,
        toDate:    request.toDate,
        type:      request.type,
        typeName:  request.typeName,
      }],
    }, { merge: true });

    return newReq;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTimeOffRequest = useCallback(async (requestId) => {
    if (!user?.uid) return;

    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().timeOffRequests || []) : [];
    await updateDoc(userDocRef, { timeOffRequests: current.filter(r => r.id !== requestId) });

    const sharedRef  = doc(db, "hrData", "hr_shared");
    const sharedSnap = await getDoc(sharedRef);
    if (sharedSnap.exists()) {
      const absences = sharedSnap.data().absences || [];
      await setDoc(sharedRef, { absences: absences.filter(a => a.requestId !== requestId) }, { merge: true });
    }
  }, [user?.uid]);

  // ── Time tracking ──────────────────────────────────────────────────────────
  const submitHours = useCallback(async (entry) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().timeEntries || []) : [];
    const updated = current.some(e => e.date === entry.date)
      ? current.map(e => e.date === entry.date ? { ...e, ...entry } : e)
      : [...current, entry];
    await setDoc(userDocRef, { timeEntries: updated }, { merge: true });
  }, [user?.uid]);

  // ── Documents ──────────────────────────────────────────────────────────────
  const updateDocumentStatus = useCallback(async (docId, updates) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().documents || DEFAULT_HR_DOCUMENTS) : DEFAULT_HR_DOCUMENTS;
    const updated = current.map(d => d.id === docId ? { ...d, ...updates } : d);
    await setDoc(userDocRef, { documents: updated }, { merge: true });
  }, [user?.uid]);

  const addDocument = useCallback(async (docData) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().documents || DEFAULT_HR_DOCUMENTS) : DEFAULT_HR_DOCUMENTS;
    const newDoc  = { ...docData, id: "doc-" + genId(), createdAt: new Date().toISOString() };
    await setDoc(userDocRef, { documents: [...current, newDoc] }, { merge: true });
    return newDoc;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteDocument = useCallback(async (docId) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().documents || []) : [];
    await setDoc(userDocRef, { documents: current.filter(d => d.id !== docId) }, { merge: true });
  }, [user?.uid]);

  const assignDocumentToUser = useCallback(async (targetUserId, docData) => {
    const targetRef = doc(db, "hrData", targetUserId);
    const snap    = await getDoc(targetRef);
    const current = snap.exists() ? (snap.data().documents || DEFAULT_HR_DOCUMENTS) : DEFAULT_HR_DOCUMENTS;
    const newDoc  = { ...docData, id: "doc-" + genId(), createdAt: new Date().toISOString(), assignedBy: user?.uid || "" };
    await setDoc(targetRef, { documents: [...current, newDoc] }, { merge: true });
    return newDoc;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Employee profile ───────────────────────────────────────────────────────
  const updateEmployeeProfile = useCallback(async (fields) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().employeeProfile || {}) : {};
    await setDoc(userDocRef, { employeeProfile: { ...current, ...fields } }, { merge: true });
  }, [user?.uid]);

  // ── Expenses ───────────────────────────────────────────────────────────────
  const addExpense = useCallback(async (expense) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().expenses || []) : [];
    const newExp  = { ...expense, id: "exp-" + genId(), status: "pending", createdAt: new Date().toISOString() };
    await setDoc(userDocRef, { expenses: [...current, newExp] }, { merge: true });
    return newExp;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteExpense = useCallback(async (expenseId) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().expenses || []) : [];
    await setDoc(userDocRef, { expenses: current.filter(e => e.id !== expenseId) }, { merge: true });
  }, [user?.uid]);

  // ── Bank accounts ──────────────────────────────────────────────────────────
  const addBankAccount = useCallback(async (acct) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().bankAccounts || []) : [];
    const isPrimary = current.length === 0;
    const newAcct = { ...acct, id: "bank-" + genId(), isPrimary, createdAt: new Date().toISOString() };
    await setDoc(userDocRef, { bankAccounts: [...current, newAcct] }, { merge: true });
    return newAcct;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteBankAccount = useCallback(async (accountId) => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userDocRef);
    const current = snap.exists() ? (snap.data().bankAccounts || []) : [];
    const updated = current.filter(a => a.id !== accountId);
    // If we deleted the primary, make next one primary
    if (updated.length > 0 && !updated.some(a => a.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    await setDoc(userDocRef, { bankAccounts: updated }, { merge: true });
  }, [user?.uid]);

  // ── Hiring pipeline ────────────────────────────────────────────────────────
  const createJobReq = useCallback(async (data) => {
    const newReq = {
      ...data,
      id:        "jreq-" + genId(),
      status:    "open",
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || "",
    };
    const updated = [...pipelineRef.current.jobRequisitions, newReq];
    await savePipeline({ jobRequisitions: updated });
    return newReq;
  }, [user?.uid, savePipeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateJobReq = useCallback(async (updated) => {
    const reqs = pipelineRef.current.jobRequisitions.map(r => r.id === updated.id ? updated : r);
    await savePipeline({ jobRequisitions: reqs });
  }, [savePipeline]);

  const createCandidate = useCallback(async (data) => {
    const now = new Date().toISOString();
    const newCand = {
      ...data,
      id:        "cand-" + genId(),
      stage:     "pool",
      appliedAt: now,
      updatedAt: now,
    };
    const updated = [...pipelineRef.current.candidates, newCand];
    await savePipeline({ candidates: updated });
    return newCand;
  }, [savePipeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveCandidate = useCallback(async (candidateId, newStage) => {
    const updated = pipelineRef.current.candidates.map(c =>
      c.id === candidateId ? { ...c, stage: newStage, updatedAt: new Date().toISOString() } : c
    );
    await savePipeline({ candidates: updated });
  }, [savePipeline]);

  const saveScorecard = useCallback(async (data) => {
    const scores    = pipelineRef.current.scorecards;
    const existing  = scores.findIndex(s => s.candidateId === data.candidateId && s.interviewedBy === data.interviewedBy);
    const avg       = data.criteria.reduce((sum, c) => sum + (c.score || 0), 0) / (data.criteria.filter(c => c.score).length || 1);
    const newCard   = { ...data, id: data.id || "sc-" + genId(), overallScore: Math.round(avg * 10) / 10, date: new Date().toISOString() };
    const updated   = existing >= 0
      ? scores.map((s, i) => i === existing ? newCard : s)
      : [...scores, newCard];
    await savePipeline({ scorecards: updated });
    return newCard;
  }, [savePipeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const hireCandidate = useCallback(async (candidateId) => {
    const updated = pipelineRef.current.candidates.map(c =>
      c.id === candidateId ? { ...c, stage: "hired", updatedAt: new Date().toISOString() } : c
    );
    await savePipeline({ candidates: updated });
  }, [savePipeline]);

  const rejectCandidate = useCallback(async (candidateId) => {
    const updated = pipelineRef.current.candidates.map(c =>
      c.id === candidateId ? { ...c, stage: "rejected", updatedAt: new Date().toISOString() } : c
    );
    await savePipeline({ candidates: updated });
  }, [savePipeline]);

  const updateCandidate = useCallback(async (updated) => {
    const cands = pipelineRef.current.candidates.map(c => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : c);
    await savePipeline({ candidates: cands });
  }, [savePipeline]);

  return (
    <HRContext.Provider value={{
      timeOffRequests,
      timeEntries,
      documents,
      allAbsences,
      employeeProfile,
      expenses,
      bankAccounts,
      addTimeOffRequest,
      deleteTimeOffRequest,
      submitHours,
      updateDocumentStatus,
      addDocument,
      deleteDocument,
      assignDocumentToUser,
      updateEmployeeProfile,
      addExpense,
      deleteExpense,
      addBankAccount,
      deleteBankAccount,
      // pipeline
      pipeline,
      createJobReq,
      updateJobReq,
      createCandidate,
      updateCandidate,
      moveCandidate,
      saveScorecard,
      hireCandidate,
      rejectCandidate,
    }}>
      {children}
    </HRContext.Provider>
  );
}

export const useHR = () => useContext(HRContext);
