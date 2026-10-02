import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PlanningTab from "./PlanningTab";

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: jest.fn(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => ({ role: "member", isAdmin: false }),
}));

const { useApp } = jest.requireMock("../../../shared/context/AppContext");

const createAppValue = (overrides = {}) => ({
  activeTasks: [],
  setActiveTasks: jest.fn(),
  backlogSections: [],
  setBacklogSections: jest.fn(),
  sprint: {
    name: "Sprint 12",
    goal: "",
    startDate: "2026-03-23",
    endDate: "2026-03-29",
  },
  updateSprint: jest.fn(),
  burndownSnapshots: [],
  users: [
    { id: "u-1", username: "taro", name: "Taro Yamada", status: "active" },
    { id: "u-2", username: "richard", name: "Richard Roe", status: "active" },
    { id: "u-3", username: "richard", name: "Richard Roe", status: "active" },
    { id: "u-4", username: "taro", name: "Taro Yamada", status: "active" },
  ],
  projects: [
    { id: "proj-1", memberUsernames: ["taro", "richard"] },
  ],
  currentProjectId: "proj-1",
  ...overrides,
});

describe("PlanningTab", () => {
  beforeEach(() => {
    useApp.mockReturnValue(createAppValue());
  });

  it("shows each team member once in Team Capacity", () => {
    render(<PlanningTab />);

    expect(screen.getAllByText("Taro Yamada")).toHaveLength(1);
    expect(screen.getAllByText("Richard Roe")).toHaveLength(1);
    expect(screen.getByTestId("planning-total-capacity")).toHaveTextContent("16 SP");
  });

  it("hydrates Team Capacity from the persisted sprint", () => {
    useApp.mockReturnValue(createAppValue({
      sprint: {
        name: "Sprint 12",
        goal: "",
        startDate: "2026-03-23",
        endDate: "2026-03-29",
        teamCapacities: { "u-1": 40, "u-2": 90 },
      },
    }));

    render(<PlanningTab />);

    expect(screen.getAllByRole("slider").map((slider) => slider.value)).toEqual(["40", "90"]);
    expect(screen.getByTestId("planning-total-capacity")).toHaveTextContent("13 SP");
  });

  it("persists slider and reset changes through updateSprint", () => {
    const updateSprint = jest.fn();
    useApp.mockReturnValue(createAppValue({ updateSprint }));

    render(<PlanningTab />);

    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "50" } });

    const capacityUpdater = updateSprint.mock.calls[0][0];
    expect(capacityUpdater({ teamCapacities: { "u-2": 90 } })).toEqual({
      teamCapacities: { "u-1": 50, "u-2": 90 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset to 100%" }));
    expect(updateSprint).toHaveBeenLastCalledWith({
      teamCapacities: { "u-1": 100, "u-2": 100 },
    });
  });
  it("derives velocity from completed sprints", () => {
    useApp.mockReturnValue(createAppValue({
      completedSprints: [
        { id: "cs-2", name: "Sprint 11", totalPoints: 20, completedPoints: 18 },
        { id: "cs-1", name: "Sprint 10", totalPoints: 15, completedPoints: 12 },
      ],
    }));

    render(<PlanningTab />);

    expect(screen.getByTestId("kpi-velocity")).toHaveTextContent("15 SP");
    expect(screen.getByText("Sprint 10")).toBeInTheDocument();
    expect(screen.getByText("Sprint 11")).toBeInTheDocument();
  });

  it("resyncs the goal draft when the sprint changes", () => {
    const { rerender } = render(<PlanningTab />);
    expect(screen.getByPlaceholderText(/Define the sprint goal/i)).toHaveValue("");

    useApp.mockReturnValue(createAppValue({
      sprint: { id: "s-13", name: "Sprint 13", goal: "Ship billing" },
    }));
    rerender(<PlanningTab />);

    expect(screen.getByPlaceholderText(/Define the sprint goal/i)).toHaveValue("Ship billing");
  });

  it("creates a backlog section instead of dropping a task removed from the sprint", () => {
    const setBacklogSections = jest.fn();
    const task = { id: "CY-1", title: "Keep me", projectId: "proj-1", status: "todo" };
    useApp.mockReturnValue(createAppValue({
      activeTasks: [task],
      backlogSections: [],
      setBacklogSections,
    }));

    render(<PlanningTab />);
    fireEvent.click(screen.getByTitle("Remove from Sprint"));

    const updater = setBacklogSections.mock.calls[0][0];
    expect(updater([])).toEqual([expect.objectContaining({ title: "Backlog", tasks: [task] })]);
  });

  it("adds every selected backlog item to the sprint in one step", () => {
    const setActiveTasks = jest.fn();
    const setBacklogSections = jest.fn();
    const first = { id: "CY-10", title: "First", storyPoint: 3 };
    const second = { id: "CY-11", title: "Second", storyPoint: 5 };
    const third = { id: "CY-12", title: "Third", storyPoint: 2 };
    useApp.mockReturnValue(createAppValue({
      setActiveTasks,
      setBacklogSections,
      backlogSections: [{ id: 1, title: "Backlog", tasks: [first, second, third] }],
    }));

    render(<PlanningTab />);
    fireEvent.click(screen.getByLabelText("Select CY-10"));
    fireEvent.click(screen.getByLabelText("Select CY-12"));
    expect(screen.getByText("2 selected · 5 SP")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add to sprint/ }));

    expect(setActiveTasks.mock.calls[0][0]([])).toEqual([
      expect.objectContaining({ id: "CY-10", projectId: "proj-1", status: "todo" }),
      expect.objectContaining({ id: "CY-12", projectId: "proj-1", status: "todo" }),
    ]);
    expect(setBacklogSections.mock.calls[0][0]([{ id: 1, title: "Backlog", tasks: [first, second, third] }]))
      .toEqual([{ id: 1, title: "Backlog", tasks: [second] }]);
  });

  it("filters the backlog pool by search and quick filter", () => {
    useApp.mockReturnValue(createAppValue({
      backlogSections: [{
        id: 1,
        title: "Backlog",
        tasks: [
          { id: "CY-20", title: "Fix login bug", type: "bug", storyPoint: 2 },
          { id: "CY-21", title: "Billing page", type: "feature" },
        ],
      }],
    }));

    render(<PlanningTab />);
    fireEvent.change(screen.getByPlaceholderText("Search by title or key"), { target: { value: "billing" } });
    expect(screen.queryByText("Fix login bug")).not.toBeInTheDocument();
    expect(screen.getByText("Billing page")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search by title or key"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Quick filter"), { target: { value: "unestimated" } });
    expect(screen.queryByText("Fix login bug")).not.toBeInTheDocument();
    expect(screen.getByText("Billing page")).toBeInTheDocument();
  });

  it("opens tasks and estimation from planning rows", () => {
    const onTaskClick = jest.fn();
    const onPokerClick = jest.fn();
    const task = { id: "CY-30", title: "Needs points", projectId: "proj-1", status: "todo" };
    useApp.mockReturnValue(createAppValue({ activeTasks: [task] }));

    render(<PlanningTab onTaskClick={onTaskClick} onPokerClick={onPokerClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Needs points" }));
    expect(onTaskClick).toHaveBeenCalledWith(task);

    fireEvent.click(screen.getByTitle(/Not estimated/));
    expect(onPokerClick).toHaveBeenCalledWith(task);
  });

  it("summarises readiness and member load", () => {
    useApp.mockReturnValue(createAppValue({
      sprint: { id: "s-1", name: "Sprint 12", goal: "Ship billing" },
      activeTasks: [
        { id: "CY-40", title: "A", projectId: "proj-1", storyPoint: 12, assignedTo: "taro" },
        { id: "CY-41", title: "B", projectId: "proj-1", storyPoint: 3 },
      ],
    }));

    render(<PlanningTab />);

    expect(screen.getByTestId("readiness-goal")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("readiness-assigned")).toHaveAttribute("data-ok", "false");
    expect(screen.getByTestId("readiness-capacity")).toHaveAttribute("data-ok", "true");
    expect(screen.getByText("Overloaded")).toBeInTheDocument();
    expect(screen.getByText("Unassigned work")).toBeInTheDocument();
  });
});
