import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import HRPage from "./HRPage";

const mockUseAuth = jest.fn();
const mockUseApp = jest.fn();
const mockUseHR = jest.fn();

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
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

function createAppMock(overrides = {}) {
  return {
    users: [
      { id: "uid-1", name: "Alice Admin", email: "alice@example.com", color: "#2563eb", role: "admin", status: "active", country: "TR" },
      { id: "uid-2", name: "Bob Member", email: "bob@example.com", color: "#10b981", role: "member", status: "active", country: "US" },
    ],
    updateUser: jest.fn(),
    createUser: jest.fn(),
    activeTasks: [],
    ...overrides,
  };
}

function createHRMock(overrides = {}) {
  return {
    allAbsences: [],
    documents: [
      { id: "doc-1", name: "NDA", category: "company", status: "not_submitted", actions: ["sign"] },
      { id: "doc-2", name: "Passport", category: "personal", status: "uploaded", actions: [] },
    ],
    employeeProfile: { salary: "5000", salaryCurrency: "$", jobTitle: "Engineer", vacationDays: 18 },
    updateDocumentStatus: jest.fn(),
    addDocument: jest.fn(),
    deleteDocument: jest.fn(),
    assignDocumentToUser: jest.fn(),
    pipeline: { jobRequisitions: [], candidates: [], scorecards: [] },
    moveCandidate: jest.fn(),
    ...overrides,
  };
}

describe("HRPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: "uid-1", email: "alice@example.com" },
      profile: { fullName: "Alice Admin" },
      isAdmin: true,
      updateProfile: jest.fn(),
    });
    mockUseApp.mockReturnValue(createAppMock());
    mockUseHR.mockReturnValue(createHRMock());
  });

  it("shows manager controls in the People tab only for admins", () => {
    const { rerender } = render(<HRPage />);

    fireEvent.click(screen.getByRole("button", { name: /People/i }));
    expect(screen.getAllByRole("button", { name: /Set manager/i }).length).toBeGreaterThan(0);

    mockUseAuth.mockReturnValue({
      user: { uid: "uid-2", email: "bob@example.com" },
      profile: { fullName: "Bob Member" },
      isAdmin: false,
      updateProfile: jest.fn(),
    });
    rerender(<HRPage />);
    fireEvent.click(screen.getByRole("button", { name: /People/i }));

    expect(screen.queryByRole("button", { name: /Set manager/i })).not.toBeInTheDocument();
  });

  it("shows document assignment controls only for admins", () => {
    const { rerender } = render(<HRPage />);

    fireEvent.click(screen.getByRole("button", { name: /Documents/i }));
    expect(screen.getByRole("button", { name: /Assign to user/i })).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      user: { uid: "uid-2", email: "bob@example.com" },
      profile: { fullName: "Bob Member" },
      isAdmin: false,
      updateProfile: jest.fn(),
    });
    rerender(<HRPage />);
    fireEvent.click(screen.getByRole("button", { name: /Documents/i }));

    expect(screen.queryByRole("button", { name: /Assign to user/i })).not.toBeInTheDocument();
  });
});
