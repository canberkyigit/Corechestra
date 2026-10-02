import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import DashboardPage from "./DashboardPage";
import { OPEN_TASK_EVENT } from "../../../shared/components/appNavigation";

const mockUseApp = jest.fn();
let mockSearch = "";

jest.mock("react-router-dom", () => {
  const ReactLib = require("react");
  return {
    useSearchParams: () => {
      const [params, setParams] = ReactLib.useState(() => new URLSearchParams(mockSearch));
      const update = ReactLib.useCallback((next) => setParams((prev) => new URLSearchParams(typeof next === "function" ? next(prev) : next)), []);
      return [params, update];
    },
  };
}, { virtual: true });
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: () => false, canAccessModule: () => true }),
}));
jest.mock("../../../shared/components/Skeleton", () => ({ DashboardSkeleton: () => <div>loading</div> }));

const tasks = [
  { id: "CY-1", title: "Mine open", status: "inprogress", assignedTo: "Alice", projectId: "proj-1", epicId: "e1", storyPoint: 3 },
  { id: "CY-2", title: "Shipped", status: "done", assignedTo: "alice", projectId: "proj-1", epicId: "e1", storyPoint: 5 },
  { id: "CY-3", title: "Other project", status: "todo", assignedTo: "alice", projectId: "proj-2" },
  { id: "CY-4", title: "Late fix", status: "blocked", dueDate: "2000-01-01", projectId: "proj-1", type: "bug" },
];

function appState(overrides = {}) {
  return {
    activeTasks: tasks,
    allTasks: tasks,
    sprint: { name: "Sprint 9", goal: "Ship billing", endDate: "not-a-date" },
    epics: [{ id: "e1", title: "Billing epic", color: "#3b82f6", projectId: "proj-1" }],
    globalActivityLog: [{ id: "a1", user: "alice", action: "created task", details: { name: "Mine open" }, timestamp: new Date().toISOString() }],
    backlogSections: [{ id: 1, tasks: [{ id: "b1" }] }],
    currentProjectId: "proj-1",
    currentUser: "alice",
    dbReady: true,
    projects: [{ id: "proj-1", name: "Core" }],
    users: [], teams: [], spaces: [], templateRegistry: {}, permissionMatrix: {},
    workspaceSettings: { emptyStateHints: false },
    burndownSnapshots: [],
    completedSprints: [{ id: "cs1", name: "Sprint 8", completedPoints: 12, totalPoints: 15, completionRate: 80, doneTasks: 4, totalTasks: 5, completedAt: "2026-03-01T00:00:00Z" }],
    releases: [], testSuites: [], testCases: [], testRuns: [], testPlans: [], testSharedSteps: [],
    ...overrides,
  };
}

function listenForOpenedTasks() {
  const opened = jest.fn();
  const listener = (event) => opened(event.detail.task.id);
  window.addEventListener(OPEN_TASK_EVENT, listener);
  return { opened, cleanup: () => window.removeEventListener(OPEN_TASK_EVENT, listener) };
}

beforeEach(() => {
  mockSearch = "";
});

describe("DashboardPage", () => {
  it("renders the overview without crashing on an invalid sprint end date", () => {
    mockUseApp.mockReturnValue(appState());
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getAllByText("Sprint 9").length).toBeGreaterThan(0);
    expect(screen.getByText("No end date set")).toBeInTheDocument();
    expect(screen.getByTestId("sprint-health")).toHaveTextContent("No schedule");
    expect(screen.getByTestId("kpi-completed")).toHaveTextContent("33%");
    expect(screen.getByTestId("burndown-insufficient")).toBeInTheDocument();
  });

  it("opens tasks from My work and from a KPI drill-down", () => {
    mockUseApp.mockReturnValue(appState());
    const { opened, cleanup } = listenForOpenedTasks();
    render(<DashboardPage />);

    fireEvent.click(within(screen.getByTestId("my-work")).getByRole("button", { name: /Mine open/i }));
    expect(opened).toHaveBeenLastCalledWith("CY-1");

    fireEvent.click(screen.getByTestId("kpi-blocked"));
    const dialog = screen.getByRole("dialog", { name: /Blocked work items/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /Late fix/i }));
    expect(opened).toHaveBeenLastCalledWith("CY-4");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
  });

  it("surfaces overdue blocked work under Needs attention", () => {
    mockUseApp.mockReturnValue(appState());
    render(<DashboardPage />);
    const panel = screen.getByTestId("attention-panel");
    expect(within(panel).getByRole("button", { name: /Late fix/i })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("tab", { name: /Overdue/i }));
    expect(within(panel).getByText(/Due Jan 1/)).toBeInTheDocument();
  });

  it("switches to the merged report tabs", () => {
    mockUseApp.mockReturnValue(appState());
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Sprint" }));
    expect(screen.getByTestId("sprint-items")).toHaveTextContent("Late fix");
    expect(screen.getByTestId("priority-distribution")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Team" }));
    expect(screen.getByTestId("team-table")).toHaveTextContent("Alice");

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByTestId("sprint-history")).toHaveTextContent("Sprint 8");
  });

  it("honours ?tab= from the URL (old /reports links land on Sprint)", () => {
    mockSearch = "tab=sprint";
    mockUseApp.mockReturnValue(appState());
    render(<DashboardPage />);
    expect(screen.getByRole("tab", { name: "Sprint" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("sprint-items")).toBeInTheDocument();
  });

  it("shows the skeleton until data is ready", () => {
    mockUseApp.mockReturnValue(appState({ dbReady: false }));
    render(<DashboardPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });
});
