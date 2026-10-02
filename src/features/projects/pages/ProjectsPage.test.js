import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectsPage from "./ProjectsPage";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div>,
  },
}));
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../../shared/components/Skeleton", () => ({ ProjectsSkeleton: () => <div>loading</div> }));
jest.mock("../../board/components/ProjectSettingsModal", () => () => <div data-testid="project-settings" />);

function appMock(overrides = {}) {
  return {
    projects: [
      { id: "proj-1", name: "Core", key: "CORE", color: "#2563eb", description: "Real description" },
      { id: "proj-2", name: "Mobile", key: "MOB", color: "#7c3aed", status: "archived" },
    ],
    currentProjectId: "proj-1",
    setCurrentProjectId: jest.fn(),
    activeTasks: [{ id: "1", projectId: "proj-1", status: "done" }],
    createProject: jest.fn(),
    projectsViewMode: "grid",
    setProjectsViewMode: jest.fn(),
    dbReady: true,
    ...overrides,
  };
}

describe("ProjectsPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows stored project descriptions instead of hardcoded copy", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    mockUseApp.mockReturnValue(appMock());
    render(<ProjectsPage onNavigate={jest.fn()} />);

    expect(screen.getByText("Real description")).toBeInTheDocument();
    expect(screen.getByText("No description yet.")).toBeInTheDocument();
    expect(screen.queryByText(/offline-first architecture/)).not.toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("gates project creation behind the manage-projects permission", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    mockUseApp.mockReturnValue(appMock());
    const { unmount } = render(<ProjectsPage onNavigate={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /New Project/i })).not.toBeInTheDocument();
    unmount();

    mockUseAuth.mockReturnValue({ role: "admin", isAdmin: true });
    render(<ProjectsPage onNavigate={jest.fn()} />);
    expect(screen.getByRole("button", { name: /New Project/i })).toBeInTheDocument();
  });

  it("rejects duplicate project keys", () => {
    mockUseAuth.mockReturnValue({ role: "admin", isAdmin: true });
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    render(<ProjectsPage onNavigate={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /New Project/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Backend API"), { target: { value: "Another" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. API"), { target: { value: "core" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Project/i }));

    expect(screen.getByText(/already used by another project/)).toBeInTheDocument();
    expect(app.createProject).not.toHaveBeenCalled();
  });

  it("opens a project by keyboard and keeps settings reachable without nested buttons", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    const app = appMock();
    const onNavigate = jest.fn();
    mockUseApp.mockReturnValue(app);
    render(<ProjectsPage onNavigate={onNavigate} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /Core/ }), { key: "Enter" });
    expect(app.setCurrentProjectId).toHaveBeenCalledWith("proj-1");
    expect(onNavigate).toHaveBeenCalledWith("board");

    fireEvent.click(screen.getAllByTitle("Project settings")[0]);
    expect(screen.getByTestId("project-settings")).toBeInTheDocument();
  });
});
