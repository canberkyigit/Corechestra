import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Layout from "./Layout";
import { requestNavigate, requestOpenTask } from "./appNavigation";

const mockUseApp = jest.fn();
const mockUsePermissions = jest.fn();

jest.mock("framer-motion", () => {
  const strip = ({ initial, animate, exit, transition, ...rest }) => rest;
  return {
    motion: {
      div: ({ children, ...props }) => <div {...strip(props)}>{children}</div>,
      aside: ({ children, ...props }) => <aside {...strip(props)}>{children}</aside>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

jest.mock("../context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "alice@example.com" }, role: "member", profile: null, logout: jest.fn() }),
}));

jest.mock("../context/ToastContext", () => ({
  useToast: () => ({ addToast: jest.fn() }),
}));

jest.mock("../context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

jest.mock("./Logo", () => () => <span>Logo</span>);

const task = { id: "CY-11", title: "Fix login", status: "todo", type: "bug" };

function appState(overrides = {}) {
  return {
    sidebarCollapsed: false,
    setSidebarCollapsed: jest.fn(),
    notifications: [],
    markNotifRead: jest.fn(),
    markAllNotifsRead: jest.fn(),
    activeTasks: [task],
    backlogSections: [],
    epics: [],
    projects: [{ id: "proj-1", name: "Corechestra" }],
    currentProjectId: "proj-1",
    currentUser: "alice",
    archivedTasks: [],
    ...overrides,
  };
}

function permissions({ create = true, pages = null } = {}) {
  return {
    canAccessPage: (page) => (pages ? pages.includes(page) : page !== "admin" && page !== "archive" && page !== "hr"),
    canPerform: (action) => (action === "task:create" ? create : false),
  };
}

function setupLayout(props = {}) {
  const handlers = {
    onPageChange: jest.fn(),
    onOpenTask: jest.fn(),
    onCreateClick: jest.fn(),
  };
  render(
    <Layout activePage="dashboard" darkMode={false} {...handlers} {...props}>
      <div>Page body</div>
    </Layout>
  );
  return handlers;
}

describe("Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue(appState());
    mockUsePermissions.mockReturnValue(permissions());
  });

  it("renders a Create button only for roles that can create tasks", () => {
    const handlers = setupLayout();
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));
    expect(handlers.onCreateClick).toHaveBeenCalled();
  });

  it("hides the Create button for viewers", () => {
    mockUsePermissions.mockReturnValue(permissions({ create: false }));
    setupLayout();
    expect(screen.queryByRole("button", { name: /create task/i })).not.toBeInTheDocument();
  });

  it("filters notifications by recipient and opens the related task on click", () => {
    const markNotifRead = jest.fn();
    mockUseApp.mockReturnValue(appState({
      markNotifRead,
      notifications: [
        { id: "n-1", type: "mention", text: "bob mentioned you", recipient: "alice", taskId: "CY-11", read: false, timestamp: new Date().toISOString() },
        { id: "n-2", type: "mention", text: "carol only", recipient: "carol", read: false, timestamp: new Date().toISOString() },
      ],
    }));
    const handlers = setupLayout();

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.queryByText("carol only")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("bob mentioned you"));

    expect(markNotifRead).toHaveBeenCalledWith("n-1");
    expect(handlers.onOpenTask).toHaveBeenCalledWith(task);
    expect(handlers.onPageChange).not.toHaveBeenCalled();
  });

  it("routes sprint notifications (sprint_started) to the board", () => {
    mockUseApp.mockReturnValue(appState({
      notifications: [
        { id: "n-3", type: "sprint_started", text: "Sprint 4 started", read: false, timestamp: new Date().toISOString() },
      ],
    }));
    const handlers = setupLayout();

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByText("Sprint 4 started"));

    expect(handlers.onPageChange).toHaveBeenCalledWith("board");
  });

  it("marks only the current user's visible notifications as read", () => {
    const markAllNotifsRead = jest.fn();
    mockUseApp.mockReturnValue(appState({
      markAllNotifsRead,
      notifications: [
        { id: "mine", type: "comment", text: "mine", recipient: "alice", read: false, timestamp: new Date().toISOString() },
        { id: "broadcast", type: "task_created", text: "broadcast", read: false, timestamp: new Date().toISOString() },
        { id: "theirs", type: "comment", text: "theirs", recipient: "bob", read: false, timestamp: new Date().toISOString() },
      ],
    }));
    setupLayout();

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

    expect(markAllNotifsRead).toHaveBeenCalledWith(["mine", "broadcast"]);
  });

  it("only lists permitted pages in the quick navigation", () => {
    setupLayout();
    fireEvent.focus(screen.getByLabelText(/search tasks, epics and pages/i));

    expect(screen.getByText("Quick navigation")).toBeInTheDocument();
    // sidebar entry + quick-navigation entry
    expect(screen.getAllByRole("button", { name: "Documentation" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("forwards open-task and navigate requests from feature pages", () => {
    const handlers = setupLayout();

    act(() => {
      requestOpenTask(task);
      requestNavigate("docs?page=page-1");
    });

    expect(handlers.onOpenTask).toHaveBeenCalledWith(task);
    expect(handlers.onPageChange).toHaveBeenCalledWith("docs?page=page-1");
  });
});
