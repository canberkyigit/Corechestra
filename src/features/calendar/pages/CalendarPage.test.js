import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CalendarPage, { buildAgendaGroups } from "./CalendarPage";
import { TASK_TYPE_HEX } from "../../../shared/constants/taskMeta";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/components/Skeleton", () => ({
  CalendarSkeleton: () => <div data-testid="calendar-skeleton" />,
}));
jest.mock("../../board/components/TaskSidePanel", () => () => null);

describe("buildAgendaGroups", () => {
  const now = new Date(2026, 3, 15, 10, 0); // Wed Apr 15 2026

  it("puts past done tasks in Completed instead of This Week", () => {
    const groups = buildAgendaGroups([
      { id: "a", dueDate: "2026-04-10", status: "done" },
      { id: "b", dueDate: "2026-04-10", status: "todo" },
      { id: "c", dueDate: "2026-04-15", status: "todo" },
      { id: "d", dueDate: "2026-04-16", status: "todo" },
      { id: "e", dueDate: "2026-04-18", status: "todo" },
      { id: "f", dueDate: "2026-04-22", status: "todo" },
      { id: "g", dueDate: "2026-05-30", status: "todo" },
    ], now);

    const byKey = Object.fromEntries(groups.map((group) => [group.key, group.tasks.map((task) => task.id)]));
    expect(byKey).toEqual({
      overdue: ["b"],
      today: ["c"],
      tomorrow: ["d"],
      thisWeek: ["e"],
      nextWeek: ["f"],
      later: ["g"],
      completed: ["a"],
    });
  });

  it("has a colour for every real task type", () => {
    ["task", "bug", "feature", "defect", "userstory", "investigation", "epic", "test", "testset", "testexecution", "precondition"]
      .forEach((type) => expect(TASK_TYPE_HEX[type]).toMatch(/^#/));
  });
});

describe("CalendarPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the skeleton (not the empty state) before data is ready", () => {
    mockUseApp.mockReturnValue({ activeTasks: [], backlogSections: [], currentProjectId: "proj-1", updateTask: jest.fn(), dbReady: false });
    render(<CalendarPage />);
    expect(screen.getByTestId("calendar-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/No scheduled tasks/i)).not.toBeInTheDocument();
  });

  it("navigates week by week in week view", () => {
    mockUseApp.mockReturnValue({
      activeTasks: [{ id: "CY-1", title: "Ship", dueDate: "2026-04-15", projectId: "proj-1", status: "todo", priority: "high" }],
      backlogSections: [],
      currentProjectId: "proj-1",
      updateTask: jest.fn(),
      dbReady: true,
    });
    render(<CalendarPage />);

    fireEvent.click(screen.getByRole("button", { name: /Week/ }));
    const before = screen.getByTestId("calendar-range-label").textContent;
    expect(before).toMatch(/–/);
    fireEvent.click(screen.getByLabelText("Next week"));
    const after = screen.getByTestId("calendar-range-label").textContent;
    expect(after).not.toBe(before);
    fireEvent.click(screen.getByLabelText("Previous week"));
    expect(screen.getByTestId("calendar-range-label").textContent).toBe(before);
  });
});
