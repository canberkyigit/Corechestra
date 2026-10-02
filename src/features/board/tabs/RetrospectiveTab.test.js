import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import RetrospectiveTab from "./RetrospectiveTab";

const mockUseApp = jest.fn();
const mockUseProjectTasks = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/hooks/useProjectTasks", () => ({
  useProjectTasks: () => mockUseProjectTasks(),
}));

jest.mock("@uiw/react-md-editor", () => () => null);

describe("RetrospectiveTab", () => {
  it("uses project-scoped tasks for sprint statistics", () => {
    mockUseApp.mockReturnValue({
      retrospectiveItems: { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] },
      addRetroItem: jest.fn(),
      updateRetroItem: jest.fn(),
      deleteRetroItem: jest.fn(),
      voteRetroItem: jest.fn(),
      toggleRetroItem: jest.fn(),
      setRetroItemEditing: jest.fn(),
    });
    mockUseProjectTasks.mockReturnValue({
      projectActiveTasks: [{ id: "project-task", status: "done", storyPoint: 5, priority: "high" }],
    });

    render(<RetrospectiveTab />);
    fireEvent.click(screen.getByRole("button", { name: /^statistics$/i }));

    expect(screen.getByTestId("retro-stat-total")).toHaveTextContent(/^1\s*Total$/);
    expect(mockUseProjectTasks).toHaveBeenCalled();
  });
  it("toggles a retro item's resolved state and shows string story points summed numerically", () => {
    const toggleRetroItem = jest.fn();
    mockUseApp.mockReturnValue({
      retrospectiveItems: {
        wentWell: [{ id: 1, text: "Pairing", checked: false, score: 0 }],
        wentWrong: [],
        canImprove: [],
        actionItems: [],
      },
      addRetroItem: jest.fn(),
      updateRetroItem: jest.fn(),
      deleteRetroItem: jest.fn(),
      voteRetroItem: jest.fn(),
      toggleRetroItem,
      setRetroItemEditing: jest.fn(),
    });
    mockUseProjectTasks.mockReturnValue({
      projectActiveTasks: [
        { id: "a", status: "done", storyPoint: "3" },
        { id: "b", status: "todo", storyPoint: "5" },
      ],
    });

    render(<RetrospectiveTab />);
    fireEvent.click(screen.getByTitle("Mark as resolved"));
    expect(toggleRetroItem).toHaveBeenCalledWith("wentWell", 1);

    fireEvent.click(screen.getByRole("button", { name: /^statistics$/i }));
    expect(within(screen.getByTestId("retro-story-points")).getByText("8")).toBeInTheDocument();
  });

  it("builds the velocity chart from completed sprints instead of placeholder data", () => {
    mockUseApp.mockReturnValue({
      retrospectiveItems: { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] },
      completedSprints: [
        { id: "cs-2", name: "Sprint 2", totalPoints: 13, completedPoints: 13 },
        { id: "cs-1", name: "Sprint 1", totalPoints: 10, completedPoints: 8 },
      ],
      burndownSnapshots: [],
      sprint: { name: "Sprint 3", startDate: "2026-03-01", endDate: "2026-03-14" },
    });
    mockUseProjectTasks.mockReturnValue({ projectActiveTasks: [] });

    render(<RetrospectiveTab />);
    fireEvent.click(screen.getByRole("button", { name: /^charts$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^velocity$/i }));

    expect(screen.getByText("Sprint 1")).toBeInTheDocument();
    expect(screen.getByText("Sprint 2")).toBeInTheDocument();
    expect(screen.queryByText("Sprint 83")).not.toBeInTheDocument();
  });
});
