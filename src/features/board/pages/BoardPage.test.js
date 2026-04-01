import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import BoardPage from "./BoardPage";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockUseBoardState = jest.fn();
const mockKanbanBoardSpy = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/hooks/useBoardState", () => ({
  useBoardState: (...args) => mockUseBoardState(...args),
}));

jest.mock("../components/KanbanBoard", () => (props) => {
  mockKanbanBoardSpy(props);
  return <div data-testid="kanban-board">{props.tasks.map((task) => task.title).join(", ")}</div>;
});

jest.mock("../components/TaskDetailModal", () => () => null);
jest.mock("../components/TaskSidePanel", () => () => null);
jest.mock("../components/PlanningPoker", () => () => null);
jest.mock("../../projects/components/SprintModal", () => () => null);
jest.mock("../../projects/components/FuturePlansModal", () => () => null);
jest.mock("../tabs/BacklogTab", () => () => null);
jest.mock("../tabs/RefinementTab", () => () => null);
jest.mock("../tabs/RetrospectiveTab", () => () => null);
jest.mock("../tabs/PlanningTab", () => () => null);
jest.mock("../tabs/BoardSettingsTab", () => () => null);
jest.mock("../tabs/AllSprintsTab", () => () => null);
jest.mock("../tabs/EpicsTab", () => () => null);
jest.mock("../tabs/SprintReviewTab", () => () => null);

function createAppMock(overrides = {}) {
  return {
    activeTasks: [
      { id: "1", title: "Fix login", projectId: "proj-1", assignedTo: "alice", status: "todo", priority: "high" },
      { id: "2", title: "Write docs", projectId: "proj-1", assignedTo: "bob", status: "done", priority: "low" },
    ],
    setActiveTasks: jest.fn(),
    allTasks: [],
    idToGlobalIndex: { "1": 0, "2": 1 },
    boardSettings: {
      taskViewMode: "panel",
      showBadges: true,
      showPriorityColors: true,
      showTaskIds: true,
      showSubtaskButtons: true,
    },
    createTask: jest.fn(),
    savePokerResult: jest.fn(),
    columns: [{ id: "todo", title: "To Do" }],
    updateBoardSettings: jest.fn(),
    currentProjectId: "proj-1",
    perProjectBoardFilters: {},
    setPerProjectBoardFilters: jest.fn(),
    teamMembers: [
      { value: "", label: "All Members" },
      { value: "alice", label: "Alice" },
      { value: "bob", label: "Bob" },
    ],
    dbReady: true,
    backlogSections: [{ id: 1, title: "Backlog" }],
    ...overrides,
  };
}

function createBoardStateMock(overrides = {}) {
  return {
    projectActiveTasks: [
      { id: "1", title: "Fix login", projectId: "proj-1", assignedTo: "alice", status: "todo", priority: "high" },
      { id: "2", title: "Write docs", projectId: "proj-1", assignedTo: "bob", status: "done", priority: "low" },
    ],
    projectMembers: [
      { value: "", label: "All Members" },
      { value: "alice", label: "Alice" },
      { value: "bob", label: "Bob" },
    ],
    filteredTasks: [
      { id: "1", title: "Fix login", projectId: "proj-1", assignedTo: "alice", status: "todo", priority: "high" },
    ],
    sprint: { id: "s1", name: "Sprint 1", status: "planned" },
    doneTasks: 1,
    sprintPct: 50,
    sprintDaysLeft: 3,
    ...overrides,
  };
}

describe("BoardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseApp.mockReturnValue(createAppMock());
    mockUseBoardState.mockReturnValue(createBoardStateMock());
  });

  it("passes filtered project tasks into the kanban board", () => {
    render(<BoardPage />);

    expect(screen.getByTestId("kanban-board")).toHaveTextContent("Fix login, Write docs");
    expect(mockKanbanBoardSpy).toHaveBeenCalledWith(expect.objectContaining({
      tasks: expect.arrayContaining([
        expect.objectContaining({ title: "Fix login" }),
        expect.objectContaining({ title: "Write docs" }),
      ]),
    }));
  });

  it("persists updated search text into board filters", () => {
    const setPerProjectBoardFilters = jest.fn();
    mockUseApp.mockReturnValue(createAppMock({ setPerProjectBoardFilters }));

    render(<BoardPage />);

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: "login" } });

    expect(setPerProjectBoardFilters).toHaveBeenLastCalledWith(expect.any(Function));
    const updater = setPerProjectBoardFilters.mock.calls.at(-1)[0];
    expect(updater({})).toEqual({
      "proj-1": {
        filterValue: "",
        memberValue: "",
        search: "login",
        viewMode: "kanban",
      },
    });
  });

  it("shows empty-state guidance when filters remove all tasks", () => {
    mockUseBoardState.mockReturnValue(createBoardStateMock({
      filteredTasks: [],
      projectActiveTasks: [],
    }));

    render(<BoardPage />);

    expect(screen.getByText(/No tasks in the active sprint/i)).toBeInTheDocument();
    expect(screen.getByText(/Add work to the active sprint or create a new task/i)).toBeInTheDocument();
  });

  it("shows sprint admin controls only for admins", () => {
    const { rerender } = render(<BoardPage />);

    expect(screen.getByRole("button", { name: /Start Sprint/i })).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ isAdmin: false });
    rerender(<BoardPage />);

    expect(screen.queryByRole("button", { name: /Start Sprint/i })).not.toBeInTheDocument();
  });

  it("shows active filter count and clears saved filters", () => {
    const setPerProjectBoardFilters = jest.fn();
    mockUseApp.mockReturnValue(createAppMock({
      setPerProjectBoardFilters,
      perProjectBoardFilters: {
        "proj-1": {
          filterValue: "bug",
          memberValue: "alice",
          search: "login",
          viewMode: "kanban",
        },
      },
    }));
    mockUseBoardState.mockReturnValue(createBoardStateMock({
      filteredTasks: [],
    }));

    render(<BoardPage />);

    expect(screen.getByText(/3 filters active/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Clear filters/i })[0]);

    const updater = setPerProjectBoardFilters.mock.calls.at(-1)[0];
    expect(updater({})).toEqual({
      "proj-1": {
        filterValue: "",
        memberValue: "",
        search: "",
        viewMode: "kanban",
      },
    });
  });
});
