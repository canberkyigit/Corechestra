import React from "react";
import { render, screen } from "@testing-library/react";
import PlanningTab from "./PlanningTab";

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: jest.fn(),
}));

const { useApp } = jest.requireMock("../../../shared/context/AppContext");

describe("PlanningTab", () => {
  beforeEach(() => {
    useApp.mockReturnValue({
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
    });
  });

  it("shows each team member once in Team Capacity", () => {
    render(<PlanningTab />);

    expect(screen.getAllByText("Taro Yamada")).toHaveLength(1);
    expect(screen.getAllByText("Richard Roe")).toHaveLength(1);
    expect(screen.getByText("16 SP")).toBeInTheDocument();
  });
});
