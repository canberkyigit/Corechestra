import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TaskDetailModal from "./TaskDetailModal";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockAddToast = jest.fn();

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

jest.mock("@headlessui/react", () => {
  const Listbox = ({ children }) => <div>{children}</div>;
  Listbox.Button = ({ children, ...props }) => <button {...props}>{children}</button>;
  Listbox.Options = ({ children, ...props }) => <div {...props}>{children}</div>;
  Listbox.Option = ({ children, className, ...props }) => (
    <div
      {...props}
      className={typeof className === "function" ? className({ active: false, selected: false }) : className}
    >
      {typeof children === "function" ? children({ active: false, selected: false }) : children}
    </div>
  );
  return { Listbox };
});

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../docs/components/CommentSection", () => () => <div data-testid="comment-section" />);
jest.mock("./SubtaskDetailPanel", () => () => null);

function createAppMock(overrides = {}) {
  return {
    epics: [],
    labels: [{ id: "lbl-1", name: "Frontend", color: "#3b82f6" }],
    deleteTask: jest.fn(),
    logActivity: jest.fn(),
    sprint: { name: "Sprint 42", startDate: "2026-03-01", endDate: "2026-03-14" },
    teamMembers: [
      { value: "unassigned", label: "Unassigned" },
      { value: "alice", label: "Alice" },
      { value: "bob", label: "Bob" },
    ],
    currentProjectId: "proj-1",
    projects: [{ id: "proj-1", name: "Corechestra", memberUsernames: ["alice", "bob"] }],
    spaces: [{ id: "space-1", name: "Engineering" }],
    docPages: [{ id: "page-1", title: "Auth RFC", spaceId: "space-1", content: "SSO design" }],
    releases: [{ id: "rel-1", version: "v2.0.0", name: "Auth Release", status: "planned" }],
    testSuites: [{ id: "suite-1", name: "Auth Suite" }],
    testCases: [{ id: "case-1", title: "Login succeeds", suiteId: "suite-1" }],
    testRuns: [],
    ...overrides,
  };
}

function renderModal(props = {}) {
  const onClose = jest.fn();
  const onTaskUpdate = jest.fn();

  render(
    <TaskDetailModal
      open
      onClose={onClose}
      task={{ id: "task-1", title: "Existing task", description: "Initial body", status: "todo", priority: "medium", assignedTo: "alice" }}
      onTaskUpdate={onTaskUpdate}
      allTasks={[]}
      sprintOptions={[{ value: "active", label: "Active Sprint" }]}
      selectedSprint={{ value: "active", label: "Active Sprint" }}
      setSelectedSprint={jest.fn()}
      {...props}
    />
  );

  return { onClose, onTaskUpdate };
}

describe("TaskDetailModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue(createAppMock());
    mockUseAuth.mockReturnValue({ role: "member" });
  });

  it("blocks create mode when the title is missing and shows a validation toast", () => {
    const { onTaskUpdate } = renderModal({
      isCreate: true,
      task: {},
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    expect(onTaskUpdate).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith("Title is required", "error");
    expect(screen.getByPlaceholderText(/Title is required/i)).toBeInTheDocument();
  });

  it("creates a task, includes active sprint metadata, closes the modal and shows a success toast", () => {
    const { onClose, onTaskUpdate } = renderModal({
      isCreate: true,
      task: {},
    });

    fireEvent.change(screen.getByPlaceholderText(/Task title/i), {
      target: { value: "Ship dashboard polish" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Add a description/i), {
      target: { value: "Polish the loading and empty states." },
    });
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    expect(onTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Ship dashboard polish",
      description: "Polish the loading and empty states.",
      storyPoint: 5,
      createdSprintName: "Sprint 42",
      createdSprintStart: "2026-03-01",
      createdSprintEnd: "2026-03-14",
    }));
    expect(onClose).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith("Task created", "info");
  });

  it("saves edits, logs activity and shows a success toast in edit mode", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    const { onTaskUpdate } = renderModal();

    fireEvent.change(screen.getByDisplayValue("Existing task"), {
      target: { value: "Existing task updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(onTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: "task-1",
      title: "Existing task updated",
    }));
    expect(appMock.logActivity).toHaveBeenCalledWith("task-1", "updated task");
    expect(mockAddToast).toHaveBeenCalledWith("Changes saved", "success");
  });

  it("shows discard confirmation when closing with unsaved changes", () => {
    const { onClose } = renderModal();

    fireEvent.change(screen.getByDisplayValue("Existing task"), {
      target: { value: "Changed title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    const discardBanner = screen.getByText(/Discard changes\?/i).closest("div");
    fireEvent.click(within(discardBanner).getByRole("button", { name: /^Discard$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders read-only mode for viewers and prevents saving", () => {
    mockUseAuth.mockReturnValue({ role: "viewer" });
    const { onTaskUpdate } = renderModal();

    expect(screen.getByText(/Read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Changes/i })).not.toBeInTheDocument();
    expect(onTaskUpdate).not.toHaveBeenCalled();
  });

  it("supports cross-linking docs, releases and test cases from the links tab", () => {
    renderModal({
      allTasks: [{ id: 44, title: "Auth bug", type: "bug" }],
    });

    fireEvent.click(screen.getByRole("button", { name: /Links/i }));
    fireEvent.click(screen.getByText(/\+ Link a related task, doc, release, or test item/i));
    fireEvent.change(screen.getByPlaceholderText(/Search tasks, docs, releases, or tests/i), {
      target: { value: "auth" },
    });

    expect(screen.getByText("Doc")).toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Test Case")).toBeInTheDocument();
    expect(screen.getByText("Auth RFC")).toBeInTheDocument();
    expect(screen.getByText("Auth Release")).toBeInTheDocument();
    expect(screen.getByText("Login succeeds")).toBeInTheDocument();
  });
});
