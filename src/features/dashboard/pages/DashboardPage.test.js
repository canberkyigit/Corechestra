import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import DashboardPage, { computeDashboardStats } from "./DashboardPage";
import { OPEN_TASK_EVENT } from "../../../shared/components/appNavigation";

const mockUseApp = jest.fn();

jest.mock("framer-motion", () => ({
  motion: { div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div> },
}));
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: () => false }),
}));
jest.mock("../../../shared/components/Skeleton", () => ({ DashboardSkeleton: () => <div>loading</div> }));

const tasks = [
  { id: "CY-1", title: "Mine open", status: "inprogress", assignedTo: "Alice", projectId: "proj-1", epicId: "e1" },
  { id: "CY-2", title: "Done", status: "done", assignedTo: "alice", projectId: "proj-1", epicId: "e1" },
  { id: "CY-3", title: "Other project", status: "todo", assignedTo: "alice", projectId: "proj-2" },
  { id: "CY-4", title: "Overdue", status: "blocked", dueDate: "2000-01-01", projectId: "proj-1" },
];

function appState(overrides = {}) {
  return {
    activeTasks: tasks,
    sprint: { name: "Sprint 9", endDate: "not-a-date" },
    epics: [{ id: "e1", title: "Epic", color: "#3b82f6", projectId: "proj-1" }],
    globalActivityLog: [],
    backlogSections: [{ id: 1, tasks: [{ id: "b1" }] }],
    currentProjectId: "proj-1",
    currentUser: "alice",
    dbReady: true,
    projects: [], users: [], teams: [], spaces: [], templateRegistry: {}, permissionMatrix: {},
    workspaceSettings: { emptyStateHints: false },
    ...overrides,
  };
}

describe("computeDashboardStats", () => {
  it("aggregates project tasks in one pass (case-insensitive 'mine', overdue, epics)", () => {
    const stats = computeDashboardStats({ ...appState(), now: new Date(2026, 0, 1) });
    expect(stats.projectTasks).toHaveLength(3);
    expect(stats.statusCounts).toMatchObject({ inprogress: 1, done: 1, blocked: 1, todo: 0 });
    expect(stats.myTasks.map((task) => task.id)).toEqual(["CY-1"]);
    expect(stats.overdueTasks).toBe(1);
    expect(stats.epicProgress.e1).toEqual({ total: 2, done: 1 });
    expect(stats.backlogCount).toBe(1);
  });
});

describe("DashboardPage", () => {
  it("does not crash on an invalid sprint end date", () => {
    mockUseApp.mockReturnValue(appState());
    render(<DashboardPage />);
    expect(screen.getByText("Sprint 9")).toBeInTheDocument();
    expect(screen.getByText(/No end date set/i)).toBeInTheDocument();
  });

  it("opens tasks from 'Assigned to Me' and from the drill-down modal", () => {
    mockUseApp.mockReturnValue(appState());
    const opened = jest.fn();
    const listener = (event) => opened(event.detail.task.id);
    window.addEventListener(OPEN_TASK_EVENT, listener);

    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /Mine open/i }));
    expect(opened).toHaveBeenLastCalledWith("CY-1");

    fireEvent.click(screen.getByRole("button", { name: /Blocked/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /^Overdue/i }).at(-1));
    expect(opened).toHaveBeenLastCalledWith("CY-4");

    window.removeEventListener(OPEN_TASK_EVENT, listener);
  });
});
