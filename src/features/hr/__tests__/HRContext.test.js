import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import {
  HRProvider,
  useHR,
  buildApprovalDecision,
  readDocuments,
  DEFAULT_HR_DOCUMENTS,
  E2E_HR_KEY,
} from "../../../shared/context/HRContext";

// ── In-memory Firestore ─────────────────────────────────────────────────────
const mockStore = {};
const mockListeners = {};
const mockCalls = { transactions: 0, setDoc: 0 };
const mockAuth = { current: null };
const mockPermissions = { canResolve: true };
const mockE2E = { value: false };

function mockSnap(path) {
  const data = mockStore[path];
  return { exists: () => data !== undefined, data: () => (data === undefined ? undefined : JSON.parse(JSON.stringify(data))) };
}

function mockWrite(path, data) {
  mockStore[path] = { ...(mockStore[path] || {}), ...JSON.parse(JSON.stringify(data)) };
  (mockListeners[path] || []).forEach((callback) => callback(mockSnap(path)));
}

jest.mock("../../../shared/services/firebase", () => ({ db: { mocked: true } }));

jest.mock("firebase/firestore", () => ({
  doc: (_db, collection, id) => ({ path: `${collection}/${id}` }),
  onSnapshot: (ref, callback) => {
    mockListeners[ref.path] = [...(mockListeners[ref.path] || []), callback];
    Promise.resolve().then(() => callback(mockSnap(ref.path)));
    return () => {
      mockListeners[ref.path] = (mockListeners[ref.path] || []).filter((item) => item !== callback);
    };
  },
  setDoc: async (ref, data) => {
    mockCalls.setDoc += 1;
    mockWrite(ref.path, data);
  },
  runTransaction: async (_db, fn) => {
    mockCalls.transactions += 1;
    const writes = [];
    const tx = {
      get: async (ref) => mockSnap(ref.path),
      set: (ref, data) => { writes.push([ref.path, data]); },
    };
    const result = await fn(tx);
    writes.forEach(([path, data]) => mockWrite(path, data));
    return result;
  },
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockAuth.current,
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => (key === "approval:resolve" ? mockPermissions.canResolve : true) }),
}));

jest.mock("../../../shared/e2e/testMode", () => ({
  ...jest.requireActual("../../../shared/e2e/testMode"),
  isE2EMode: () => mockE2E.value,
}));

const ALICE = { user: { uid: "uid-1", email: "alice@example.com" }, isAdmin: false, profile: { fullName: "Alice Employee" } };
const BOB = { user: { uid: "uid-2", email: "bob@example.com" }, isAdmin: true, profile: { fullName: "Bob Approver" } };

let hr = null;
function Capture() {
  hr = useHR();
  return null;
}

function renderProvider(auth) {
  mockAuth.current = auth;
  const utils = render(<HRProvider><Capture /></HRProvider>);
  return {
    ...utils,
    switchUser: (nextAuth) => {
      mockAuth.current = nextAuth;
      utils.rerender(<HRProvider><Capture /></HRProvider>);
    },
  };
}

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  Object.keys(mockListeners).forEach((key) => delete mockListeners[key]);
  mockCalls.transactions = 0;
  mockCalls.setDoc = 0;
  mockPermissions.canResolve = true;
  mockE2E.value = false;
  window.localStorage.clear();
  hr = null;
});

describe("buildApprovalDecision", () => {
  const sharedData = {
    approvalInbox: [
      { id: "a1", type: "timeoff", targetId: "r1", userId: "uid-1", status: "pending" },
      { id: "a2", type: "expense", targetId: "e1", userId: "uid-1", status: "pending" },
      { id: "a3", type: "timeentry", targetId: "t1", userId: "uid-1", status: "pending" },
      { id: "a4", type: "timeoff", targetId: "r2", userId: "uid-1", status: "approved" },
    ],
    absences: [{ requestId: "r1", status: "pending" }],
  };
  const requesterData = {
    timeOffRequests: [{ id: "r1", status: "pending" }],
    expenses: [{ id: "e1", status: "pending" }],
    timeEntries: [{ id: "t1", date: "2026-10-01", status: "pending" }],
  };

  it("propagates time-off decisions to the request and the shared absence", () => {
    const { sharedPatch, requesterPatch } = buildApprovalDecision({ approvalId: "a1", status: "approved", resolverId: "uid-2", sharedData, requesterData });
    expect(sharedPatch.approvalInbox.find((item) => item.id === "a1")).toMatchObject({ status: "approved", resolvedBy: "uid-2" });
    expect(sharedPatch.absences[0].status).toBe("approved");
    expect(requesterPatch.timeOffRequests[0]).toMatchObject({ status: "approved", resolvedBy: "uid-2" });
  });

  it("propagates expense and time entry decisions", () => {
    expect(buildApprovalDecision({ approvalId: "a2", status: "rejected", note: "No receipt", resolverId: "uid-2", sharedData, requesterData })
      .requesterPatch.expenses[0]).toMatchObject({ status: "rejected", decisionNote: "No receipt" });
    expect(buildApprovalDecision({ approvalId: "a3", status: "approved", resolverId: "uid-2", sharedData, requesterData })
      .requesterPatch.timeEntries[0].status).toBe("approved");
  });

  it("refuses to resolve twice", () => {
    expect(() => buildApprovalDecision({ approvalId: "a4", status: "approved", resolverId: "uid-2", sharedData, requesterData })).toThrow(/already been resolved/);
  });
});

describe("readDocuments", () => {
  it("only falls back to defaults when documents were never initialised", () => {
    expect(readDocuments({})).toBe(DEFAULT_HR_DOCUMENTS);
    expect(readDocuments({ documents: [] })).toEqual([]);
  });
});

describe("HRProvider (Firestore)", () => {
  it("approving time off updates the requester's request and the absence", async () => {
    const { switchUser } = renderProvider(ALICE);
    await waitFor(() => expect(hr.loading).toBe(false));

    let request;
    await act(async () => {
      request = await hr.addTimeOffRequest({ type: "Vacation", typeName: "Vacation", fromDate: "2026-10-05", toDate: "2026-10-06" }, { name: "Alice Employee" });
    });
    expect(mockStore["hrData/uid-1"].timeOffRequests[0]).toMatchObject({ id: request.id, status: "pending" });
    const approval = mockStore["hrData/hr_shared"].approvalInbox[0];
    expect(approval).toMatchObject({ type: "timeoff", targetId: request.id, userId: "uid-1", status: "pending" });

    // Alice cannot approve her own request.
    await expect(hr.resolveApproval(approval.id, "approved")).rejects.toThrow(/own request/);

    switchUser(BOB);
    await waitFor(() => expect(hr.approvalInbox).toHaveLength(1));
    await act(async () => {
      await hr.resolveApproval(approval.id, "approved", "Enjoy");
    });

    expect(mockStore["hrData/uid-1"].timeOffRequests[0]).toMatchObject({ status: "approved", resolvedBy: "uid-2", decisionNote: "Enjoy" });
    expect(mockStore["hrData/hr_shared"].absences[0].status).toBe("approved");
    expect(mockStore["hrData/hr_shared"].approvalInbox[0].status).toBe("approved");
  });

  it("requires the approval permission", async () => {
    mockStore["hrData/hr_shared"] = { approvalInbox: [{ id: "a1", type: "expense", targetId: "e1", userId: "uid-1", status: "pending" }] };
    mockPermissions.canResolve = false;
    renderProvider(BOB);
    await waitFor(() => expect(hr.approvalInbox).toHaveLength(1));
    await expect(hr.resolveApproval("a1", "approved")).rejects.toThrow(/permission/);
  });

  it("submitting hours creates one approval per entry and re-uses it on resubmission", async () => {
    renderProvider(ALICE);
    await waitFor(() => expect(hr.loading).toBe(false));
    await act(async () => { await hr.submitHours({ date: "2026-10-01", type: "work", hours: 8 }); });
    await act(async () => { await hr.submitHours({ date: "2026-10-01", type: "work", hours: 7.5 }); });

    expect(mockStore["hrData/uid-1"].timeEntries).toHaveLength(1);
    expect(mockStore["hrData/uid-1"].timeEntries[0]).toMatchObject({ hours: 7.5, status: "pending" });
    const items = mockStore["hrData/hr_shared"].approvalInbox.filter((item) => item.type === "timeentry");
    expect(items).toHaveLength(1);
    expect(items[0].summary).toContain("7.5h");
  });

  it("withdrawing an expense cancels its pending approval", async () => {
    renderProvider(ALICE);
    await waitFor(() => expect(hr.loading).toBe(false));
    let expense;
    await act(async () => { expense = await hr.addExpense({ description: "Taxi", amount: 20, currency: "EUR", category: "Travel" }); });
    expect(mockStore["hrData/hr_shared"].approvalInbox[0].summary).toBe("Travel • EUR 20");
    await act(async () => { await hr.deleteExpense(expense.id); });
    expect(mockStore["hrData/uid-1"].expenses).toEqual([]);
    expect(mockStore["hrData/hr_shared"].approvalInbox[0].status).toBe("cancelled");
  });

  it("re-reads the latest pipeline so concurrent additions are not overwritten", async () => {
    renderProvider(ALICE);
    await waitFor(() => expect(hr.loading).toBe(false));
    // Another client added a candidate; our local snapshot has not seen it yet.
    mockStore["hrData/pipeline"] = { candidates: [{ id: "cand-remote", name: "Remote", stage: "pool" }] };
    await act(async () => { await hr.createCandidate({ jobReqId: "j1", name: "Local" }); });
    expect(mockStore["hrData/pipeline"].candidates.map((item) => item.name)).toEqual(["Remote", "Local"]);
    expect(mockCalls.transactions).toBeGreaterThan(0);
  });

  it("hiring routes through hireCandidate and fills the requisition at headcount", async () => {
    mockStore["hrData/pipeline"] = {
      jobRequisitions: [{ id: "j1", title: "Engineer", status: "open", headcount: 1 }],
      candidates: [{ id: "c1", jobReqId: "j1", name: "Jane", stage: "offer" }],
    };
    renderProvider(BOB);
    await waitFor(() => expect(hr.pipeline.candidates).toHaveLength(1));

    await expect(hr.moveCandidate("c1", "hired")).rejects.toThrow(/hire flow/);
    await act(async () => { await hr.hireCandidate("c1", { hiredUserId: "user-1" }); });
    expect(mockStore["hrData/pipeline"].candidates[0]).toMatchObject({ stage: "hired", hiredUserId: "user-1" });
    expect(mockStore["hrData/pipeline"].jobRequisitions[0].status).toBe("filled");
  });

  it("rejects and restores candidates to their previous stage", async () => {
    mockStore["hrData/pipeline"] = { candidates: [{ id: "c1", name: "Jane", stage: "technical" }] };
    renderProvider(BOB);
    await waitFor(() => expect(hr.pipeline.candidates).toHaveLength(1));
    await act(async () => { await hr.rejectCandidate("c1", "Timing"); });
    expect(mockStore["hrData/pipeline"].candidates[0]).toMatchObject({ stage: "rejected", rejectedFromStage: "technical", rejectionReason: "Timing" });
    await act(async () => { await hr.restoreCandidate("c1"); });
    expect(mockStore["hrData/pipeline"].candidates[0].stage).toBe("technical");
  });

  it("queues documents for other people and delivers them on their sign-in", async () => {
    const { switchUser } = renderProvider(BOB);
    await waitFor(() => expect(hr.loading).toBe(false));
    await act(async () => {
      await hr.assignDocumentToUser({ id: "user-123", email: "Alice@Example.com", name: "Alice" }, { name: "NDA", category: "company", status: "not_submitted", actions: ["sign"] });
    });
    expect(mockStore["hrData/user-123"]).toBeUndefined();
    expect(mockStore["hrData/hr_shared"].pendingDocumentAssignments).toHaveLength(1);

    switchUser(ALICE);
    await waitFor(() => expect(mockStore["hrData/hr_shared"].pendingDocumentAssignments).toHaveLength(0));
    expect(mockStore["hrData/uid-1"].documents.some((item) => item.name === "NDA" && item.assignedBy === "uid-2")).toBe(true);
  });

  it("only admins can delete admin-assigned documents", async () => {
    mockStore["hrData/uid-1"] = { documents: [{ id: "d1", name: "Policy", assignedBy: "uid-2" }] };
    renderProvider(ALICE);
    await waitFor(() => expect(hr.documents).toHaveLength(1));
    await expect(hr.deleteDocument("d1")).rejects.toThrow(/admin/);
  });

  it("re-opens a completed workflow when a step is unchecked", async () => {
    mockStore["hrData/hr_shared"] = {
      onboardingWorkflows: [{ id: "w1", status: "completed", steps: [{ id: "s1", title: "Step", completed: true }] }],
    };
    renderProvider(BOB);
    await waitFor(() => expect(hr.onboardingWorkflows).toHaveLength(1));
    await act(async () => { await hr.toggleOnboardingStep("w1", "s1"); });
    expect(mockStore["hrData/hr_shared"].onboardingWorkflows[0].status).toBe("active");
  });
});

describe("HRProvider (E2E mode)", () => {
  it("persists to localStorage instead of Firestore", async () => {
    mockE2E.value = true;
    renderProvider(ALICE);
    await waitFor(() => expect(hr.loading).toBe(false));

    await act(async () => {
      await hr.addExpense({ description: "Lunch", amount: 12, currency: "USD", category: "Meals" });
      await hr.addTimeOffRequest({ type: "Sick leave", typeName: "Sick leave", fromDate: "2026-10-05", toDate: "2026-10-05" }, { name: "Alice" });
      await hr.createJobReq({ title: "Designer" });
    });

    expect(mockCalls.transactions).toBe(0);
    expect(mockCalls.setDoc).toBe(0);
    const stored = JSON.parse(window.localStorage.getItem(E2E_HR_KEY));
    expect(stored["uid-1"].expenses).toHaveLength(1);
    expect(stored.hr_shared.approvalInbox).toHaveLength(2);
    expect(stored.pipeline.jobRequisitions[0].title).toBe("Designer");
    await waitFor(() => expect(hr.expenses).toHaveLength(1));
  });
});
