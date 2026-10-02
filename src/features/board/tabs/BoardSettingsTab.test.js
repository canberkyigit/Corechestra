import React from "react";
import { render, screen } from "@testing-library/react";
import BoardSettingsTab from "./BoardSettingsTab";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

function appMock(overrides = {}) {
  return {
    boardSettings: { boardName: "Core", projectKey: "CORE", taskViewMode: "panel" },
    updateBoardSettings: jest.fn(),
    resetAllData: jest.fn(),
    activeTasks: [
      { id: "1", projectId: "proj-1", status: "done", assignedTo: "ayse" },
      { id: "2", projectId: "proj-1", status: "todo", assignedTo: "ayse" },
      { id: "3", projectId: "proj-2", status: "todo", assignedTo: "mehmet" },
    ],
    backlogSections: [{ id: 1, title: "Backlog", tasks: [{ id: "4" }] }],
    columns: [{ id: "todo", title: "To Do" }, { id: "done", title: "Done" }],
    users: [
      { id: "u1", username: "ayse", name: "Ayşe Kaya", status: "active", color: "#ff0000" },
      { id: "u2", username: "mehmet", name: "Mehmet Demir", status: "active" },
      { id: "u3", username: "gone", name: "Gone User", status: "deleted" },
    ],
    projects: [{ id: "proj-1", memberUsernames: ["ayse"] }],
    currentProjectId: "proj-1",
    ...overrides,
  };
}

describe("BoardSettingsTab", () => {
  it("lists the real project members with their project workload", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    mockUseApp.mockReturnValue(appMock());
    render(<BoardSettingsTab />);

    expect(screen.getByText("Ayşe Kaya")).toBeInTheDocument();
    expect(screen.getByText(/2 active tasks/)).toBeInTheDocument();
    expect(screen.queryByText("Mehmet Demir")).not.toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("scopes board statistics to the current project", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    mockUseApp.mockReturnValue(appMock());
    render(<BoardSettingsTab />);

    expect(screen.getByTestId("board-stat-total-tasks")).toHaveTextContent(/^3\s*Total Tasks$/);
  });

  it("only shows Reset All Data to people who can manage the workspace", () => {
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
    mockUseApp.mockReturnValue(appMock());
    const { unmount } = render(<BoardSettingsTab />);
    expect(screen.queryByText(/Reset All Data/)).not.toBeInTheDocument();
    unmount();

    mockUseAuth.mockReturnValue({ role: "admin", isAdmin: true });
    render(<BoardSettingsTab />);
    expect(screen.getByText(/Reset All Data/)).toBeInTheDocument();
  });
});
