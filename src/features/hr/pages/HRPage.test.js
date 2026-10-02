import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HRPage from "./HRPage";

const mockUseAuth = jest.fn();
const mockUseApp = jest.fn();
const mockUseHR = jest.fn();
const mockNavigate = jest.fn();
const mockAddToast = jest.fn();
const mockDnd = { onDragEnd: null };

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => {
    const auth = mockUseAuth();
    return { canPerform: () => !!auth?.isAdmin };
  },
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }) => {
    mockDnd.onDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children, droppableId }) => children(
    {
      innerRef: jest.fn(),
      droppableProps: { "data-droppable-id": droppableId },
      placeholder: null,
    },
    { isDraggingOver: false }
  ),
  Draggable: ({ children, draggableId }) => children(
    {
      innerRef: jest.fn(),
      draggableProps: { "data-draggable-id": draggableId },
      dragHandleProps: {},
    },
    { isDragging: false, combineTargetFor: null }
  ),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/HRContext", () => ({
  useHR: () => mockUseHR(),
}));

function localIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createAppMock(overrides = {}) {
  return {
    users: [
      { id: "uid-1", name: "Alice Admin", email: "alice@example.com", color: "#2563eb", role: "admin", status: "active", country: "TR" },
      { id: "uid-2", name: "Bob Member", email: "bob@example.com", color: "#10b981", role: "member", status: "active", country: "US" },
    ],
    projects: [],
    updateUser: jest.fn(),
    createUser: jest.fn(),
    activeTasks: [],
    allTasks: [],
    templateRegistry: {},
    darkMode: false,
    ...overrides,
  };
}

function createHRMock(overrides = {}) {
  return {
    allAbsences: [],
    approvalInbox: [],
    onboardingWorkflows: [],
    performanceNotes: [],
    projectAllocations: [],
    pendingDocumentAssignments: [],
    timeOffRequests: [],
    timeEntries: [],
    expenses: [],
    bankAccounts: [],
    documents: [
      { id: "doc-1", name: "NDA", category: "company", status: "not_submitted", actions: ["sign"] },
      { id: "doc-2", name: "Passport", category: "personal", status: "uploaded", actions: ["preview"] },
    ],
    employeeProfile: { salary: "5000", salaryCurrency: "$", jobTitle: "Engineer", vacationDays: 18 },
    updateDocumentStatus: jest.fn().mockResolvedValue(),
    addDocument: jest.fn().mockResolvedValue(),
    deleteDocument: jest.fn().mockResolvedValue(),
    assignDocumentToUser: jest.fn().mockResolvedValue(),
    cancelDocumentAssignment: jest.fn().mockResolvedValue(),
    resolveApproval: jest.fn().mockResolvedValue(),
    toggleOnboardingStep: jest.fn().mockResolvedValue(),
    updateOnboardingWorkflow: jest.fn().mockResolvedValue(),
    addTimeOffRequest: jest.fn().mockResolvedValue(),
    deleteTimeOffRequest: jest.fn().mockResolvedValue(),
    submitHours: jest.fn().mockResolvedValue(),
    deleteTimeEntry: jest.fn().mockResolvedValue(),
    updateEmployeeProfile: jest.fn().mockResolvedValue(),
    addPerformanceNote: jest.fn().mockResolvedValue(),
    upsertProjectAllocation: jest.fn().mockResolvedValue(),
    removeProjectAllocation: jest.fn().mockResolvedValue(),
    createOnboardingWorkflow: jest.fn().mockResolvedValue(),
    addExpense: jest.fn().mockResolvedValue(),
    deleteExpense: jest.fn().mockResolvedValue(),
    addBankAccount: jest.fn().mockResolvedValue(),
    deleteBankAccount: jest.fn().mockResolvedValue(),
    setPrimaryBankAccount: jest.fn().mockResolvedValue(),
    pipeline: { jobRequisitions: [], candidates: [], scorecards: [] },
    createJobReq: jest.fn().mockResolvedValue(),
    updateJobReq: jest.fn().mockResolvedValue(),
    createCandidate: jest.fn().mockResolvedValue(),
    updateCandidate: jest.fn().mockResolvedValue(),
    moveCandidate: jest.fn().mockResolvedValue(),
    hireCandidate: jest.fn().mockResolvedValue(),
    rejectCandidate: jest.fn().mockResolvedValue(),
    restoreCandidate: jest.fn().mockResolvedValue(),
    saveScorecard: jest.fn().mockResolvedValue(),
    ...overrides,
  };
}

const ADMIN_AUTH = {
  user: { uid: "uid-1", email: "alice@example.com" },
  profile: { fullName: "Alice Admin" },
  isAdmin: true,
  updateProfile: jest.fn(),
};

const MEMBER_AUTH = {
  user: { uid: "uid-2", email: "bob@example.com" },
  profile: { fullName: "Bob Member" },
  isAdmin: false,
  updateProfile: jest.fn(),
};

function openTab(label) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("HRPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockUseAuth.mockReturnValue(ADMIN_AUTH);
    mockUseApp.mockReturnValue(createAppMock());
    mockUseHR.mockReturnValue(createHRMock());
    jest.spyOn(window, "confirm").mockReturnValue(true);
    window.URL.createObjectURL = jest.fn(() => "blob:mock");
    window.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows manager controls in the People tab only for people managers", () => {
    const { rerender } = render(<HRPage />);

    openTab("People");
    expect(screen.getAllByRole("button", { name: /Set manager/i }).length).toBeGreaterThan(0);

    mockUseAuth.mockReturnValue(MEMBER_AUTH);
    rerender(<HRPage />);
    expect(screen.queryByRole("button", { name: /Set manager/i })).not.toBeInTheDocument();
  });

  it("shows document assignment controls only for admins", () => {
    const { rerender } = render(<HRPage />);

    openTab("Documents");
    expect(screen.getByRole("button", { name: /Assign to user/i })).toBeInTheDocument();

    mockUseAuth.mockReturnValue(MEMBER_AUTH);
    rerender(<HRPage />);
    expect(screen.queryByRole("button", { name: /Assign to user/i })).not.toBeInTheDocument();
  });

  describe("overview approvals", () => {
    const inbox = [
      { id: "approval-1", type: "timeoff", title: "Bob Member requested time off", userId: "uid-2", status: "pending", summary: "Vacation • 2026-10-05 → 2026-10-06", createdAt: "2026-10-01T10:00:00Z" },
      { id: "approval-2", type: "expense", title: "Alice submitted an expense", userId: "uid-1", status: "pending", summary: "Travel • USD 20", createdAt: "2026-10-01T11:00:00Z" },
    ];

    it("lets approvers resolve other people's requests but not their own", async () => {
      const hr = createHRMock({ approvalInbox: inbox });
      mockUseHR.mockReturnValue(hr);
      render(<HRPage />);

      const panel = screen.getByTestId("approval-inbox");
      expect(within(panel).getByText("Bob Member requested time off")).toBeInTheDocument();
      expect(within(panel).queryByText("Alice submitted an expense")).not.toBeInTheDocument();
      expect(within(panel).getByText(/1 of your request is waiting for another approver/i)).toBeInTheDocument();

      fireEvent.click(within(panel).getByRole("button", { name: /Approve/i }));
      await waitFor(() => expect(hr.resolveApproval).toHaveBeenCalledWith("approval-1", "approved", ""));
    });

    it("records a rejection reason", async () => {
      const hr = createHRMock({ approvalInbox: inbox });
      mockUseHR.mockReturnValue(hr);
      render(<HRPage />);

      fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
      fireEvent.change(screen.getByLabelText("Rejection reason"), { target: { value: "Team is short-staffed" } });
      fireEvent.click(screen.getByRole("button", { name: /Confirm reject/i }));
      await waitFor(() => expect(hr.resolveApproval).toHaveBeenCalledWith("approval-1", "rejected", "Team is short-staffed"));
    });

    it("hides approve controls without the approval permission", () => {
      mockUseAuth.mockReturnValue(MEMBER_AUTH);
      mockUseHR.mockReturnValue(createHRMock({ approvalInbox: inbox }));
      render(<HRPage />);
      expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    });
  });

  it("turns the 2FA banner into a working security tip", () => {
    render(<HRPage />);
    fireEvent.click(screen.getByRole("button", { name: /Review sign-in security/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");

    fireEvent.click(screen.getByRole("button", { name: /Dismiss security tip/i }));
    expect(screen.queryByTestId("security-tip")).not.toBeInTheDocument();
  });

  describe("time off", () => {
    const today = localIso();

    it("highlights requests on the calendar regardless of label casing", () => {
      mockUseHR.mockReturnValue(createHRMock({
        timeOffRequests: [{ id: "r1", type: "Vacation", typeName: "Vacation", fromDate: today, toDate: today, status: "pending" }],
      }));
      render(<HRPage />);
      openTab("Time off");

      expect(screen.getByTestId(`timeoff-day-${today}`)).toHaveAttribute("data-kind", "vacation");
    });

    it("shows team absences in the team calendar", () => {
      mockUseHR.mockReturnValue(createHRMock({
        allAbsences: [{ requestId: "r9", userId: "uid-2", userName: "Bob Member", type: "Sick leave", typeName: "Sick leave", fromDate: today, toDate: today, status: "approved" }],
      }));
      render(<HRPage />);
      openTab("Time off");

      expect(screen.getByTestId(`timeoff-day-${today}`)).toHaveAttribute("data-kind", "");
      fireEvent.click(screen.getByRole("button", { name: /Team calendar/i }));
      expect(screen.getByTestId(`timeoff-day-${today}`)).toHaveAttribute("data-kind", "sick");
      expect(within(screen.getByTestId("team-absences")).getByText("Bob Member")).toBeInTheDocument();
    });

    it("lets employees withdraw pending requests", async () => {
      const hr = createHRMock({
        timeOffRequests: [{ id: "r1", type: "Vacation", typeName: "Vacation", fromDate: today, toDate: today, status: "pending" }],
      });
      mockUseHR.mockReturnValue(hr);
      render(<HRPage />);
      openTab("Time off");

      fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
      await waitFor(() => expect(hr.deleteTimeOffRequest).toHaveBeenCalledWith("r1"));
    });
  });

  it("records leave entries with configurable hours instead of a hidden 8h default", async () => {
    const hr = createHRMock({ employeeProfile: { standardDailyHours: 6 } });
    mockUseHR.mockReturnValue(hr);
    render(<HRPage />);
    openTab("Time tracking");

    fireEvent.click(screen.getAllByRole("button", { name: "Submit hours" })[0]);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "sick" } });
    expect(screen.getByLabelText("Hours credited")).toHaveValue(6);
    fireEvent.change(screen.getByLabelText("Hours credited"), { target: { value: "4" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Submit hours" })).getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(hr.submitHours).toHaveBeenCalledWith(expect.objectContaining({
      type: "sick",
      hours: 4,
      startTime: null,
      endTime: null,
    })));
  });

  describe("my profile", () => {
    it("reads the manager from the People record and switches sub-tabs", () => {
      mockUseApp.mockReturnValue(createAppMock({
        users: [
          { id: "uid-1", name: "Alice Admin", email: "alice@example.com", managerId: "uid-2" },
          { id: "uid-2", name: "Bob Member", email: "bob@example.com", title: "Engineering Manager" },
        ],
      }));
      mockUseHR.mockReturnValue(createHRMock({
        employeeProfile: { salary: "120000", salaryCurrency: "USD", salaryType: "Annual", startDate: "2025-01-15", jobTitle: "Engineer" },
      }));
      render(<HRPage />);
      openTab("My profile");

      expect(screen.getByText("Bob Member")).toBeInTheDocument();
      expect(screen.queryByText("Not assigned")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Payslips" }));
      expect(screen.getByText(/Estimated statements calculated from your contract/i)).toBeInTheDocument();
      expect(screen.getAllByText("$10,000.00").length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("tab", { name: "History" }));
      expect(screen.getByText("Started at the company")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Personal information" }));
      expect(screen.getByText("Personal")).toBeInTheDocument();
    });
  });

  describe("interview pipeline", () => {
    const job = { id: "jreq-1", title: "Frontend Engineer", department: "Engineering", status: "open", headcount: 1, priority: "high" };
    const candidates = [
      { id: "cand-1", jobReqId: "jreq-1", name: "Jane Doe", email: "jane@example.com", stage: "offer", source: "linkedin" },
      { id: "cand-2", jobReqId: "jreq-1", name: "Rick Rejected", stage: "rejected", rejectedFromStage: "screening", rejectionReason: "Timing" },
    ];

    function renderInterview(hrOverrides = {}) {
      const hr = createHRMock({ pipeline: { jobRequisitions: [job], candidates, scorecards: [] }, ...hrOverrides });
      mockUseHR.mockReturnValue(hr);
      const app = createAppMock();
      mockUseApp.mockReturnValue(app);
      render(<HRPage />);
      openTab("Interview");
      fireEvent.click(screen.getByText("Frontend Engineer"));
      return { hr, app };
    }

    it("opens the hire confirmation when a candidate is dropped on Hired", async () => {
      const { hr, app } = renderInterview();

      await act(async () => {
        await mockDnd.onDragEnd({ draggableId: "cand-1", source: { droppableId: "offer" }, destination: { droppableId: "hired" } });
      });
      expect(hr.moveCandidate).not.toHaveBeenCalled();
      expect(screen.getByText("Hire Jane Doe?")).toBeInTheDocument();

      const roleSelect = screen.getByLabelText("Workspace role");
      expect(within(roleSelect).getAllByRole("option").map((option) => option.value)).toEqual(["member", "viewer", "admin"]);
      expect(roleSelect).toHaveValue("member");

      fireEvent.click(screen.getByRole("button", { name: /Hire & Add to Team/i }));
      await waitFor(() => expect(hr.hireCandidate).toHaveBeenCalledWith("cand-1", expect.objectContaining({ hiredUserId: expect.any(String) })));
      expect(app.createUser).toHaveBeenCalledWith(expect.objectContaining({ role: "member", email: "jane@example.com" }));
      expect(hr.createOnboardingWorkflow).toHaveBeenCalledWith(expect.objectContaining({ type: "onboarding", candidateId: "cand-1" }));
    });

    it("lists rejected candidates and restores them", async () => {
      const { hr } = renderInterview();
      fireEvent.click(screen.getByRole("button", { name: /Rejected \(1\)/i }));
      const panel = screen.getByTestId("rejected-candidates");
      expect(within(panel).getByText("Rick Rejected")).toBeInTheDocument();
      fireEvent.click(within(panel).getByRole("button", { name: /Restore/i }));
      await waitFor(() => expect(hr.restoreCandidate).toHaveBeenCalledWith("cand-2"));
    });

    it("edits and closes requisitions", async () => {
      const { hr } = renderInterview();

      fireEvent.click(screen.getByRole("button", { name: /Close requisition/i }));
      await waitFor(() => expect(hr.updateJobReq).toHaveBeenCalledWith({ id: "jreq-1", status: "closed" }));

      fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
      expect(screen.getByText("Edit Job Requisition")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Senior Frontend Engineer" } });
      fireEvent.change(screen.getByLabelText("Status"), { target: { value: "paused" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await waitFor(() => expect(hr.updateJobReq).toHaveBeenCalledWith(expect.objectContaining({ id: "jreq-1", title: "Senior Frontend Engineer", status: "paused" })));
    });

    it("blocks the hire without the invite permission", async () => {
      mockUseAuth.mockReturnValue({ ...ADMIN_AUTH, isAdmin: false });
      renderInterview();
      await act(async () => {
        await mockDnd.onDragEnd({ draggableId: "cand-1", source: { droppableId: "offer" }, destination: { droppableId: "hired" } });
      });
      expect(screen.getByRole("button", { name: /Hire & Add to Team/i })).toBeDisabled();
    });
  });

  describe("org chart", () => {
    const users = [
      { id: "uid-1", name: "Alice Admin", email: "alice@example.com", title: "CTO" },
      { id: "uid-2", name: "Bob Member", email: "bob@example.com", managerId: "uid-1", title: "Engineer" },
    ];

    it("exports CSV and opens the full profile", () => {
      mockUseApp.mockReturnValue(createAppMock({ users }));
      render(<HRPage />);
      openTab("Org chart");

      fireEvent.click(screen.getByRole("button", { name: "Download org chart" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /CSV/i }));
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      fireEvent.click(screen.getByTestId("org-node-uid-2"));
      fireEvent.click(screen.getByRole("button", { name: /View full profile/i }));
      expect(screen.getByText("Bob Member — profile")).toBeInTheDocument();
    });

    it("filters to my manager and reports", () => {
      mockUseApp.mockReturnValue(createAppMock({
        users: [...users, { id: "uid-3", name: "Carol Other", email: "carol@example.com", managerId: "uid-1" }],
      }));
      mockUseAuth.mockReturnValue({ ...MEMBER_AUTH, isAdmin: true });
      render(<HRPage />);
      openTab("Org chart");

      expect(screen.getByTestId("org-node-uid-3")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Entire organization/i }));
      fireEvent.click(screen.getByRole("menuitemradio", { name: /My manager and reports/i }));
      expect(screen.queryByTestId("org-node-uid-3")).not.toBeInTheDocument();
      expect(screen.getByTestId("org-node-uid-1")).toBeInTheDocument();
    });
  });

  it("filters people with the filter menu", () => {
    mockUseApp.mockReturnValue(createAppMock({
      users: [
        { id: "uid-1", name: "Alice Admin", email: "alice@example.com" },
        { id: "uid-2", name: "Bob Member", email: "bob@example.com", managerId: "uid-1" },
      ],
    }));
    render(<HRPage />);
    openTab("People");

    fireEvent.click(screen.getByRole("button", { name: "Filter people" }));
    fireEvent.change(screen.getByLabelText("Manager"), { target: { value: "has" } });
    expect(screen.getByText("Showing 1 of 2 people")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Alice Admin/ })).not.toBeInTheDocument();
  });

  it("previews unattached documents and signs with a typed name", async () => {
    const hr = createHRMock();
    mockUseHR.mockReturnValue(hr);
    render(<HRPage />);
    openTab("Documents");

    fireEvent.click(screen.getByRole("button", { name: /Preview/i }));
    const previewDialog = screen.getByRole("dialog");
    expect(within(previewDialog).getByText("Document record")).toBeInTheDocument();
    fireEvent.click(within(previewDialog).getAllByRole("button", { name: "Close" })[0]);

    fireEvent.click(screen.getAllByRole("button", { name: /^Sign$/i })[0]);
    const signButton = screen.getByRole("button", { name: "Sign document" });
    expect(signButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(signButton);
    await waitFor(() => expect(hr.updateDocumentStatus).toHaveBeenCalledWith("doc-1", expect.objectContaining({ status: "signed", signedBy: "Alice Admin" })));
  });

  it("shows estimated payslips in Finance", () => {
    mockUseHR.mockReturnValue(createHRMock({
      employeeProfile: { salary: "3000", salaryCurrency: "EUR", salaryType: "Monthly", contractStartDate: "2025-01-01" },
    }));
    render(<HRPage />);
    openTab("Finance");
    expect(screen.getByText(/No payroll system is connected/i)).toBeInTheDocument();
    expect(screen.getAllByText("€3,000.00").length).toBeGreaterThan(0);
  });
});
