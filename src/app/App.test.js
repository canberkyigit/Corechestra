import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockUsePermissions = jest.fn();

jest.mock("react-router-dom", () => {
  const React = require("react");

  function BrowserRouter({ children }) {
    return <>{children}</>;
  }

  function Route() {
    return null;
  }

  function Routes({ children }) {
    const pathname = globalThis.location.pathname;
    const routes = React.Children.toArray(children);
    const exactMatch = routes.find((child) => child.props.path === pathname);
    const rootMatch = pathname === "/" ? routes.find((child) => child.props.path === "/") : null;
    const fallbackMatch = routes.find((child) => child.props.path === "*");
    const match = exactMatch || rootMatch || fallbackMatch || null;
    return match ? match.props.element : null;
  }

  function Navigate({ to }) {
    return <div>Redirected to {to}</div>;
  }

  return {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: globalThis.location.pathname }),
  };
}, { virtual: true });

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

jest.mock("../shared/context/AppContext", () => ({
  AppProvider: ({ children }) => <>{children}</>,
  useApp: () => mockUseApp(),
}));

jest.mock("../shared/context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

jest.mock("../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

jest.mock("../shared/context/ToastContext", () => ({
  ToastProvider: ({ children }) => <>{children}</>,
}));

jest.mock("../shared/context/HRContext", () => ({
  HRProvider: ({ children }) => <>{children}</>,
}));

jest.mock("../shared/components/AppErrorFallback", () => () => <div>Error boundary</div>);
jest.mock("../shared/components/Logo", () => () => <div>Logo</div>);
jest.mock("../shared/components/Layout", () => ({ children, onCreateClick }) => (
  <div>
    <button onClick={onCreateClick}>Open Create</button>
    {children}
  </div>
));
jest.mock("../shared/components/CommandPalette", () => () => null);
jest.mock("../features/board/components/TaskSidePanel", () => () => null);
jest.mock("../features/board/components/TaskDetailModal", () => ({ open }) => (
  open ? <div>Create modal open</div> : null
));

jest.mock("../features/board/pages/BoardPage", () => () => <div>Board page</div>);
jest.mock("../features/dashboard/pages/DashboardPage", () => () => <div>Dashboard page</div>);
jest.mock("../features/activity/pages/ActivityPage", () => () => <div>Activity page</div>);
jest.mock("../features/roadmap/pages/RoadmapPage", () => () => <div>Roadmap page</div>);
jest.mock("../features/calendar/pages/CalendarPage", () => () => <div>Calendar page</div>);
jest.mock("../features/reports/pages/ReportsPage", () => () => <div>Reports page</div>);
jest.mock("../features/profile/pages/ProfilePage", () => () => <div>Profile page</div>);
jest.mock("../features/admin/pages/AdminPage", () => () => <div>Admin page</div>);
jest.mock("../features/hr/pages/HRPage", () => () => <div>HR page</div>);
jest.mock("../features/projects/pages/ProjectsPage", () => () => <div>Projects page</div>);
jest.mock("../features/docs/pages/DocsPage", () => () => <div>Docs page</div>);
jest.mock("../features/releases/pages/ReleasesPage", () => () => <div>Releases page</div>);
jest.mock("../features/tests/pages/TestsPage", () => () => <div>Tests page</div>);
jest.mock("../features/archive/pages/ArchivePage", () => () => <div>Archive page</div>);
jest.mock("../features/for-you/pages/ForYouPage", () => () => <div>For you page</div>);
jest.mock("../features/auth/pages/LoginPage", () => () => <div>Login page</div>);

import App from "./App";

function createAppMock(overrides = {}) {
  return {
    createTask: jest.fn(),
    updateActiveTask: jest.fn(),
    backlogSections: [],
    darkMode: false,
    setDarkMode: jest.fn(),
    densityMode: "comfortable",
    setDensityMode: jest.fn(),
    users: [],
    createUser: jest.fn(),
    updateUser: jest.fn(),
    setCurrentUser: jest.fn(),
    pushRecentItem: jest.fn(),
    dbReady: true,
    ...overrides,
  };
}

describe("App route and auth behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "", "/board");
    mockUseApp.mockReturnValue(createAppMock());
    mockUseAuth.mockReturnValue({
      user: { uid: "uid-1", email: "alice@example.com" },
      role: "member",
      isAdmin: false,
    });
    mockUsePermissions.mockReturnValue({
      canAccessPage: (pageId) => pageId !== "admin" && pageId !== "hr" && pageId !== "archive",
      canPerform: (action) => action !== "role:manage" && action !== "workspace:manage" && action !== "audit:view",
      firstAccessiblePage: "dashboard",
    });
  });

  it("shows the login page when there is no authenticated user", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, isAdmin: false });

    render(<App />);

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects non-admin users away from the admin route", async () => {
    window.history.pushState({}, "", "/admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Redirected to /dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("renders the admin page for admins on the admin route", async () => {
    window.history.pushState({}, "", "/admin");
    mockUseAuth.mockReturnValue({
      user: { uid: "uid-1", email: "alice@example.com" },
      role: "admin",
      isAdmin: true,
    });
    mockUsePermissions.mockReturnValue({
      canAccessPage: () => true,
      canPerform: () => true,
      firstAccessiblePage: "board",
    });

    render(<App />);

    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });

  it("prevents viewers from opening the create task modal", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "uid-2", email: "viewer@example.com" },
      role: "viewer",
      isAdmin: false,
    });
    mockUsePermissions.mockReturnValue({
      canAccessPage: (pageId) => pageId !== "admin" && pageId !== "hr" && pageId !== "archive",
      canPerform: () => false,
      firstAccessiblePage: "dashboard",
    });

    render(<App />);
    expect(await screen.findByText("Board page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Open Create"));

    expect(screen.queryByText("Create modal open")).not.toBeInTheDocument();
  });

  it("opens the create task modal for editable roles", async () => {
    render(<App />);
    expect(await screen.findByText("Board page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Open Create"));

    expect(await screen.findByText("Create modal open")).toBeInTheDocument();
  });
});
