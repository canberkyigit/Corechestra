import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

const HRContext = createContext(null);

export const DEFAULT_HR_DOCUMENTS = [
  { id: "doc-1", name: "Company Handbook",           category: "company",  status: "not_submitted", actions: ["sign"]     },
  { id: "doc-2", name: "Worker Verification Letter", category: "company",  status: null,            actions: ["preview"]  },
  { id: "doc-3", name: "HR Administration",          category: "personal", status: null,            actions: ["download"], subtitle: "1 file" },
];

export function HRProvider({ children }) {
  const { user } = useAuth();

  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeEntries,     setTimeEntries]     = useState([]);
  const [documents,       setDocuments]       = useState(DEFAULT_HR_DOCUMENTS);
  const [allAbsences,     setAllAbsences]     = useState([]);

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
      } else {
        // First-time init
        await setDoc(userRef, {
          timeOffRequests: [],
          timeEntries:     [],
          documents:       DEFAULT_HR_DOCUMENTS,
        });
      }
    });

    // Shared absences (all users)
    const sharedRef  = doc(db, "hrData", "hr_shared");
    const unsubShared = onSnapshot(sharedRef, (snap) => {
      setAllAbsences(snap.exists() ? (snap.data().absences || []) : []);
    });

    return () => { unsubUser(); unsubShared(); };
  }, [user?.uid]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ── Time off ───────────────────────────────────────────────────────────────
  const addTimeOffRequest = useCallback(async (request, userInfo) => {
    if (!user?.uid) return;
    const id = genId();
    const newReq = { ...request, id };

    const userRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userRef);
    const current = snap.exists() ? (snap.data().timeOffRequests || []) : [];
    await setDoc(userRef, { timeOffRequests: [...current, newReq] }, { merge: true });

    // Shared absence entry so other users can see who is away
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

    const userRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userRef);
    const current = snap.exists() ? (snap.data().timeOffRequests || []) : [];
    await updateDoc(userRef, { timeOffRequests: current.filter(r => r.id !== requestId) });

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
    const userRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userRef);
    const current = snap.exists() ? (snap.data().timeEntries || []) : [];
    const updated = current.some(e => e.date === entry.date)
      ? current.map(e => e.date === entry.date ? { ...e, ...entry } : e)
      : [...current, entry];
    await setDoc(userRef, { timeEntries: updated }, { merge: true });
  }, [user?.uid]);

  // ── Documents ──────────────────────────────────────────────────────────────
  const updateDocumentStatus = useCallback(async (docId, updates) => {
    if (!user?.uid) return;
    const userRef = doc(db, "hrData", user.uid);
    const snap    = await getDoc(userRef);
    const current = snap.exists() ? (snap.data().documents || DEFAULT_HR_DOCUMENTS) : DEFAULT_HR_DOCUMENTS;
    const updated = current.map(d => d.id === docId ? { ...d, ...updates } : d);
    await setDoc(userRef, { documents: updated }, { merge: true });
  }, [user?.uid]);

  return (
    <HRContext.Provider value={{
      timeOffRequests,
      timeEntries,
      documents,
      allAbsences,
      addTimeOffRequest,
      deleteTimeOffRequest,
      submitHours,
      updateDocumentStatus,
    }}>
      {children}
    </HRContext.Provider>
  );
}

export const useHR = () => useContext(HRContext);
